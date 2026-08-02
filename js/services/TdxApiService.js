/**
 * =========================================================================
 * js/services/TdxApiService.js
 * 獨立 TDX API 服務 — 與 MockDataService 完全隔離，零共用邏輯
 * 負責 OAuth 2.0 認證、LiveBoard 輪詢、車輛編號解析、定位校正、Alert API、
 * 以及沿軌道線加減速平滑動態行駛 (Acceleration & Deceleration Animation)
 * =========================================================================
 */
const TdxApiService = (function () {
    /* ── 私有狀態 ── */
    let accessToken = '';
    let tokenExpiryTime = 0;
    let pollIntervalId = null;
    let initialized = false;

    let trains = [];
    let lineAlerts = [];
    let connectionStatus = { ok: false, reason: '', lastChecked: null };

    // 定位校正：追蹤每輛車的歷史狀態
    let trainPositionHistory = {};

    /* ── 常量 ── */
    const POLL_INTERVAL = 45000;   // 45 秒輪詢
    const TDX_AUTH_URL = 'https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token';
    const TDX_TRTC_LIVEBOARD = 'https://tdx.transportdata.tw/api/basic/v2/Rail/Metro/LiveBoard/TRTC?$top=1000&$format=JSON';
    const TDX_TYMC_LIVEBOARD = 'https://tdx.transportdata.tw/api/basic/v2/Rail/Metro/LiveBoard/TYMC?$top=300&$format=JSON';
    const TDX_TRTC_ALERT = 'https://tdx.transportdata.tw/api/basic/v2/Rail/Metro/Alert/TRTC?$top=50&$format=JSON';
    const TDX_TYMC_ALERT = 'https://tdx.transportdata.tw/api/basic/v2/Rail/Metro/Alert/TYMC?$top=50&$format=JSON';

    /* ══════════════════════════════════════════════
       OAuth 2.0 Token
       ══════════════════════════════════════════════ */
    const FIXED_CLIENT_ID = 'M11507108-c58329e5-3f1e-426a';
    const FIXED_CLIENT_SECRET = '4e74f084-927b-4f1e-9a37-4afa29696271';

    function _getCredentials() {
        return { clientId: FIXED_CLIENT_ID, clientSecret: FIXED_CLIENT_SECRET };
    }

    async function _fetchAccessToken() {
        if (accessToken && Date.now() < tokenExpiryTime - 60000) return true;

        try {
            const params = new URLSearchParams();
            params.append('grant_type', 'client_credentials');
            params.append('client_id', FIXED_CLIENT_ID);
            params.append('client_secret', FIXED_CLIENT_SECRET);

            const res = await fetch(TDX_AUTH_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params
            });

            if (res.ok) {
                const d = await res.json();
                accessToken = d.access_token;
                tokenExpiryTime = Date.now() + (d.expires_in || 86400) * 1000;
                connectionStatus = { ok: true, reason: 'OAuth OK', lastChecked: new Date() };
                return true;
            }

            connectionStatus = { ok: false, reason: `OAuth 失敗 (${res.status})`, lastChecked: new Date() };
        } catch (e) {
            console.error('[TdxApiService] OAuth Error:', e);
            connectionStatus = { ok: false, reason: `認證連線異常: ${e.message}`, lastChecked: new Date() };
        }
        return false;
    }

    /* ══════════════════════════════════════════════
       LiveBoard Fetchers
       ══════════════════════════════════════════════ */
    async function _fetchWithAuth(url) {
        if (!accessToken) {
            if (!(await _fetchAccessToken())) return null;
        }
        try {
            const r = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
            if (r.ok) return await r.json();
            if (r.status === 401) {
                accessToken = '';
                if (await _fetchAccessToken()) {
                    const r2 = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
                    if (r2.ok) return await r2.json();
                }
            } else if (r.status === 429) {
                console.warn(`[TdxApiService] API Rate Limit Exceeded (429): ${url}`);
                return null;
            }
            console.warn(`[TdxApiService] API 回應 status=${r.status}: ${url}`);
        } catch (e) {
            console.error(`[TdxApiService] Fetch Error (${url}):`, e);
        }
        return null;
    }

    async function _fetchLiveBoardTRTC() { return _fetchWithAuth(TDX_TRTC_LIVEBOARD); }
    async function _fetchLiveBoardTYMC() { return _fetchWithAuth(TDX_TYMC_LIVEBOARD); }

    /* ══════════════════════════════════════════════
       Alert API
       ══════════════════════════════════════════════ */
    async function _fetchAlerts() {
        try {
            const [trtcAlerts, tymcAlerts] = await Promise.all([
                _fetchWithAuth(TDX_TRTC_ALERT),
                _fetchWithAuth(TDX_TYMC_ALERT)
            ]);

            const alerts = [];

            if (Array.isArray(trtcAlerts)) {
                trtcAlerts.forEach(a => {
                    alerts.push({
                        lineKey: a.LineID || '',
                        lineName: _resolveLineName(a.LineID),
                        color: _resolveLineColor(a.LineID),
                        status: _classifyAlertStatus(a),
                        statusText: _extractAlertTitle(a),
                        detail: _extractAlertDetail(a)
                    });
                });
            }

            if (Array.isArray(tymcAlerts)) {
                tymcAlerts.forEach(a => {
                    alerts.push({
                        lineKey: a.LineID || 'A',
                        lineName: _resolveLineName(a.LineID || 'A'),
                        color: _resolveLineColor(a.LineID || 'A'),
                        status: _classifyAlertStatus(a),
                        statusText: _extractAlertTitle(a),
                        detail: _extractAlertDetail(a)
                    });
                });
            }

            return alerts;
        } catch (e) {
            console.warn('[TdxApiService] Alert API 讀取跳過:', e);
            return [];
        }
    }

    function _resolveLineName(lineId) {
        const info = MrtDataService.lines[lineId];
        return info ? info.name : lineId;
    }
    function _resolveLineColor(lineId) {
        const info = MrtDataService.lines[lineId];
        return info ? info.color : '#888';
    }
    function _classifyAlertStatus(alertItem) {
        const level = (alertItem.Level || alertItem.AlertLevel || '').toString().toLowerCase();
        const status = (alertItem.Status || '').toString();
        if (level === '3' || level === 'critical' || status === '3') return 'error';
        if (level === '2' || level === 'warning' || status === '2') return 'warn';
        if (level === '1' || level === 'info' || status === '1') return 'info';
        return 'warn';
    }
    function _extractAlertTitle(a) {
        if (a.AlertTitle) return typeof a.AlertTitle === 'object' ? (a.AlertTitle.Zh_tw || a.AlertTitle.En || '') : a.AlertTitle;
        if (a.Title) return typeof a.Title === 'object' ? (a.Title.Zh_tw || a.Title.En || '') : a.Title;
        return '營運異常通報';
    }
    function _extractAlertDetail(a) {
        if (a.AlertDescription) return typeof a.AlertDescription === 'object' ? (a.AlertDescription.Zh_tw || a.AlertDescription.En || '') : a.AlertDescription;
        if (a.Description) return typeof a.Description === 'object' ? (a.Description.Zh_tw || a.Description.En || '') : a.Description;
        return '';
    }

    /* ══════════════════════════════════════════════
       Anomaly Detection (偵測 API 異常)
       ══════════════════════════════════════════════ */
    function _detectAnomaly(trtcData, tymcData) {
        const combined = [
            ...(Array.isArray(trtcData) ? trtcData : []),
            ...(Array.isArray(tymcData) ? tymcData : [])
        ];

        // 若本次抓取無資料但之前已有列車在行駛，維持連線並以現有列車持續動畫
        if (combined.length === 0) {
            if (trains.length > 0) {
                return { isAnomaly: false, reason: '🟢 TDX API 正常 (維持即時運算)', data: null };
            }
            return { isAnomaly: true, reason: '⚠️ API 回傳無列車資料', data: null };
        }

        if (!combined.some(i => (i.LineID || i.LineNo) && (i.StationID || i.StationName))) {
            return { isAnomaly: true, reason: '⚠️ API 欄位格式異常', data: null };
        }

        return { isAnomaly: false, reason: '🟢 TDX API 連線正常', data: combined };
    }

    /* ══════════════════════════════════════════════
       LiveBoard → Train 物件轉換 (建立或同步列車)
       ══════════════════════════════════════════════ */
    function _syncLiveBoardToTrains(liveBoardArray) {
        if (!Array.isArray(liveBoardArray) || liveBoardArray.length === 0) return;

        const updatedTrainIds = new Set();
        let idx = 1;

        // 現有 trains map
        const trainMap = {};
        trains.forEach(t => { trainMap[t.id] = t; });

        liveBoardArray.forEach(item => {
            const lineId = item.LineID || item.LineNO || '';
            const stationId = item.StationID || '';
            const trainStatus = item.TrainStatus || 0;

            // 判斷車種（機場捷運直達車）
            let isExpress = false;
            if (lineId === 'A') {
                if (item.TrainType === 2) {
                    isExpress = true;
                } else {
                    const dest = item.DestinationStationID || item.DestinationStaionID || '';
                    if (dest === 'A13' || dest === 'A12') isExpress = true;
                }
            }

            const sequenceKey = isExpress ? 'A_Express' : (lineId === 'A' ? 'A' : lineId);
            const seq = MrtDataService.sequences[sequenceKey] || MrtDataService.sequences[lineId];
            if (!seq || seq.length < 2) return;

            const seqIdx = seq.indexOf(stationId);
            if (seqIdx < 0) return;

            const destId = item.DestinationStationID || item.DestinationStaionID || '';
            const destIdx = seq.indexOf(destId);

            // 前進行向推算
            let direction = 1;
            if (destIdx !== -1 && seqIdx !== -1) {
                direction = destIdx >= seqIdx ? 1 : -1;
            } else if (item.Direction === 1 || item.Direction === 0) {
                direction = item.Direction === 0 ? 1 : -1;
            }

            const lineKey = lineId.startsWith('A') ? 'A'
                          : lineId.startsWith('O') ? 'O'
                          : lineId.startsWith('V') ? 'V'
                          : lineId;

            // 唯一列車編號
            const trainNo = item.TrainNo || item.CarNo || item.VehicleID
                || `TDX-${lineKey}-${direction > 0 ? 'F' : 'R'}-${String(idx++).padStart(3, '0')}`;

            updatedTrainIds.add(trainNo);

            const station = MrtDataService.stations[stationId];
            if (!station) return;

            // 定位校正歷史
            const lastPos = trainPositionHistory[trainNo];
            let hasAnomaly = false;
            let anomalyLevel = null;

            if (lastPos) {
                if (lastPos.stationId === stationId && lastPos.trainStatus === trainStatus) {
                    lastPos.stagnantCount = (lastPos.stagnantCount || 0) + 1;
                    if (lastPos.stagnantCount >= 3) {
                        hasAnomaly = true;
                        anomalyLevel = lastPos.stagnantCount >= 5 ? 'error' : 'warn';
                        console.warn(`[Warn] Train #${trainNo} 定位停滯警告 — 於 [${stationId} ${station.name}] 位置連續未更新`);
                    }
                } else {
                    lastPos.stagnantCount = 0;
                }
            }
            trainPositionHistory[trainNo] = {
                stationId,
                trainStatus,
                stagnantCount: (lastPos && lastPos.stationId === stationId && lastPos.trainStatus === trainStatus)
                    ? (lastPos.stagnantCount || 0) + 1 : 0
            };

            const existingTrain = trainMap[trainNo];

            if (existingTrain) {
                // 已存在列車：平滑同步 station 和 direction，保留現有 smooth progress 動畫
                existingTrain.direction = direction;
                existingTrain.hasAnomaly = hasAnomaly;
                existingTrain.anomalyLevel = anomalyLevel;

                if (trainStatus === 1 || item.EstimateTime === 0) {
                    existingTrain.isDwelling = true;
                    existingTrain.dwellTimeRemaining = Math.max(existingTrain.dwellTimeRemaining, 3000);
                    existingTrain.segmentIndex = seqIdx;
                    existingTrain.progress = 0;
                } else {
                    // 若報告進站，將 segmentIndex 調至該站
                    if (Math.abs(existingTrain.segmentIndex - seqIdx) > 2) {
                        existingTrain.segmentIndex = Math.max(0, seqIdx - direction);
                        existingTrain.progress = 0.3;
                    }
                }
            } else {
                // 新列車：初始化加入
                let progress = 0;
                let isDwelling = false;
                let dwellTimeRemaining = 0;
                let segmentIndex = seqIdx;

                if (trainStatus === 1 || item.EstimateTime === 0) {
                    isDwelling = true;
                    dwellTimeRemaining = 3000;
                    progress = 0;
                } else {
                    const prevIdx = seqIdx - direction;
                    if (prevIdx >= 0 && prevIdx < seq.length) {
                        segmentIndex = prevIdx;
                        progress = 0.4;
                    }
                }

                let latLng = [station.lat, station.lng];
                const st1 = MrtDataService.stations[seq[segmentIndex]];
                const nextCode = seq[segmentIndex + direction] || seq[segmentIndex];
                const st2 = MrtDataService.stations[nextCode];
                if (st1 && st2) {
                    latLng = [
                        st1.lat + (st2.lat - st1.lat) * progress,
                        st1.lng + (st2.lng - st1.lng) * progress
                    ];
                }

                const newTrain = {
                    id: trainNo,
                    lineKey,
                    sequenceKey,
                    sequence: seq,
                    segmentIndex,
                    progress,
                    direction,
                    baseSpeed: isExpress ? 0.00035 : 0.00028,
                    isExpress,
                    isDwelling,
                    dwellTimeRemaining,
                    currentStationCode: stationId,
                    latLng,
                    angle: 0,
                    marker: null,
                    hasAnomaly,
                    anomalyLevel
                };

                trains.push(newTrain);
                trainMap[trainNo] = newTrain;
            }
        });
    }

    /* ══════════════════════════════════════════════
       加減速與 S 曲線補償動畫 (Acceleration & Deceleration Engine)
       ══════════════════════════════════════════════ */
    function _getSpeedFactor(p) {
        // p (progress): 0.0 ~ 1.0
        // 出站加速區間 (0.0 ~ 0.25)：速度從 35% 漸增至 100%
        // 中段巡航區間 (0.25 ~ 0.75)：保持 100% 巡航
        // 進站減速區間 (0.75 ~ 1.0)：速度從 100% 漸減至 25%
        if (p < 0.25) {
            return 0.35 + 0.65 * (p / 0.25);
        } else if (p > 0.75) {
            return 0.25 + 0.75 * ((1.0 - p) / 0.25);
        }
        return 1.0;
    }

    function _easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }

    /**
     * 每幀更新 TDX 列車沿軌道平滑行駛（包含離站加速、中段巡航、進站減速與停靠）
     */
    function update(delta, speedMult) {
        if (!initialized || trains.length === 0) return;

        trains.forEach(t => {
            // 車站停靠中
            if (t.isDwelling) {
                t.dwellTimeRemaining -= delta * speedMult;
                if (t.dwellTimeRemaining <= 0) {
                    t.isDwelling = false;
                    t.dwellTimeRemaining = 0;
                } else {
                    return; // 停靠未結束
                }
            }

            // 依據 S 曲線加減速區間計算當前幀位移量
            const speedFactor = _getSpeedFactor(t.progress);
            const baseSpeed = t.baseSpeed || (t.isExpress ? 0.00035 : 0.00028);

            t.progress += baseSpeed * speedFactor * speedMult * (delta / 16.6);

            // 到達下一個站點
            if (t.progress >= 1.0) {
                t.progress = 0;
                t.segmentIndex += t.direction;

                // 端點反轉
                if (t.segmentIndex >= t.sequence.length - 1) {
                    t.segmentIndex = t.sequence.length - 2;
                    t.direction = -1;
                } else if (t.segmentIndex < 0) {
                    t.segmentIndex = 0;
                    t.direction = 1;
                }

                const arrivedCode = t.sequence[t.segmentIndex];
                t.currentStationCode = arrivedCode;

                // 進入停靠
                t.isDwelling = true;
                t.dwellTimeRemaining = 3500;
            }

            // 座標與旋轉角度插值計算 (easeInOutQuad 緩和平滑處理)
            const code1 = t.sequence[t.segmentIndex];
            const code2 = t.sequence[t.segmentIndex + t.direction] || code1;
            const st1 = MrtDataService.stations[code1];
            const st2 = MrtDataService.stations[code2];

            if (st1 && st2) {
                const easedP = _easeInOutQuad(t.progress);
                const lat = st1.lat + (st2.lat - st1.lat) * easedP;
                const lng = st1.lng + (st2.lng - st1.lng) * easedP;
                t.latLng = [lat, lng];

                const dy = st2.lat - st1.lat;
                const dx = (st2.lng - st1.lng) * Math.cos(st1.lat * Math.PI / 180);
                t.angle = Math.atan2(dy, dx) * 180 / Math.PI;
            }
        });
    }

    /* ══════════════════════════════════════════════
       輪詢主邏輯
       ══════════════════════════════════════════════ */
    async function _doPoll() {
        if (!initialized) return;

        if (!(await _fetchAccessToken())) {
            connectionStatus = { ok: false, reason: '認證失敗', lastChecked: new Date() };
            return;
        }

        // 並行取得 TRTC / TYMC LiveBoard 實時數據
        const [trtc, tymc, alerts] = await Promise.all([
            _fetchLiveBoardTRTC(),
            _fetchLiveBoardTYMC(),
            _fetchAlerts()
        ]);

        const result = _detectAnomaly(trtc, tymc);

        if (!result.isAnomaly) {
            connectionStatus = { ok: true, reason: result.reason, lastChecked: new Date() };
            if (result.data) {
                _syncLiveBoardToTrains(result.data);
            }
        } else {
            connectionStatus = { ok: false, reason: result.reason, lastChecked: new Date() };
            console.warn(`[TdxApiService] ${result.reason}`);
        }

        // 更新路線 Alert 狀態
        if (alerts && alerts.length > 0) {
            lineAlerts = alerts;
        } else if (lineAlerts.length === 0) {
            lineAlerts = _buildDefaultAlerts();
        }
    }

    function _buildDefaultAlerts() {
        return Object.keys(MrtDataService.lines).map(key => ({
            lineKey: key,
            lineName: MrtDataService.lines[key].name,
            color: MrtDataService.lines[key].color,
            status: 'normal',
            statusText: '正常營運',
            detail: null
        }));
    }

    /* ── 營運時段 ── */
    function _isNighttime() {
        const d = new Date();
        const h = d.getHours();
        return h >= 0 && h < 6;
    }

    /* ══════════════════════════════════════════════
       公開介面
       ══════════════════════════════════════════════ */

    async function init() {
        cleanup();
        initialized = true;
        lineAlerts = _buildDefaultAlerts();

        console.log(
            '%c[TdxApiService] TDX API 服務已啟動 — OAuth 認證與平滑動畫加減速引擎',
            'color:#fff;background:#7C3AED;font-weight:bold;font-size:12px;padding:3px 8px;border-radius:6px;'
        );

        await _doPoll();
        pollIntervalId = setInterval(() => _doPoll(), POLL_INTERVAL);
    }

    function getTrains() { return trains; }
    function isNighttime() { return _isNighttime(); }
    function checkAndSyncNightState() {}

    function getTrainsByLine(lineKey) {
        return trains.filter(t => t.lineKey === lineKey || t.sequenceKey === lineKey);
    }

    function getLineAlerts() { return lineAlerts; }
    function getConnectionStatus() { return connectionStatus; }
    function saveCredentials() {}
    function getCredentials() { return _getCredentials(); }
    async function fetchAccessToken() { return _fetchAccessToken(); }

    function cleanup() {
        if (pollIntervalId) {
            clearInterval(pollIntervalId);
            pollIntervalId = null;
        }
        trains.forEach(t => { t._markedForRemoval = true; });
        trains = [];
        lineAlerts = [];
        accessToken = '';
        tokenExpiryTime = 0;
        trainPositionHistory = {};
        connectionStatus = { ok: false, reason: '', lastChecked: null };
        initialized = false;
        console.log('[TdxApiService] cleanup() — 所有 TDX 列車與輪詢定時器已銷毀');
    }

    return {
        init,
        update,
        getTrains,
        isNighttime,
        checkAndSyncNightState,
        getTrainsByLine,
        getLineAlerts,
        getConnectionStatus,
        saveCredentials,
        getCredentials,
        fetchAccessToken,
        cleanup
    };
})();
