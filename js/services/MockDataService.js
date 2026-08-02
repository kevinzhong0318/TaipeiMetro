/**
 * =========================================================================
 * js/services/MockDataService.js
 * 獨立模擬數據服務 — 與 TdxApiService 完全隔離，零共用邏輯
 * 負責生成模擬列車、沿軌道動畫行駛、直達車跳站、06:00~24:00 營運
 * =========================================================================
 */
const MockDataService = (function () {
    /* ── 私有狀態 ── */
    let trains = [];
    let trainIdCounter = 1;
    let initialized = false;

    /* ── 列車生成配置 ── */
    const TRAIN_CONFIGS = [
        { line: 'BR',        speed: 0.0003,  count: 24, isExpress: false },
        { line: 'R',         speed: 0.00025, count: 28, isExpress: false },
        { line: 'G',         speed: 0.00028, count: 22, isExpress: false },
        { line: 'O',         speed: 0.00026, count: 22, isExpress: false },
        { line: 'O_Luzhou',  speed: 0.00026, count: 10, isExpress: false },
        { line: 'BL',        speed: 0.00024, count: 28, isExpress: false },
        { line: 'Y',         speed: 0.00032, count: 12, isExpress: false },
        { line: 'LB',        speed: 0.00035, count: 8,  isExpress: false },
        { line: 'A',         speed: 0.00025, count: 16, isExpress: false },
        { line: 'A_Express', speed: 0.00042, count: 8,  isExpress: true  },
        { line: 'V',         speed: 0.0003,  count: 6,  isExpress: false },
        { line: 'V_Blue',    speed: 0.0003,  count: 6,  isExpress: false },
        { line: 'K',         speed: 0.0003,  count: 5,  isExpress: false }
    ];

    /* ── 營運時段判定 ── */
    function _isNighttime() {
        const d = TimelineController.getCurrentTimeDate();
        const h = d.getHours();
        return h >= 0 && h < 6;
    }

    /* ── 車輛編號生成 ── */
    function _generateTrainId(config) {
        const num = String(trainIdCounter++).padStart(3, '0');
        if (config.isExpress) return `MOCK-EX-${num}`;
        return `MOCK-${config.line}-${num}`;
    }

    /* ── 生成所有列車 ── */
    function _spawnTrains() {
        if (_isNighttime()) return;

        trainIdCounter = 1;
        trains = [];

        TRAIN_CONFIGS.forEach(config => {
            const seq = MrtDataService.sequences[config.line];
            if (!seq || seq.length < 2) return;

            const lineKey = config.line.startsWith('A') ? 'A'
                          : config.line.startsWith('O') ? 'O'
                          : config.line.startsWith('V') ? 'V'
                          : config.line;
            const lineInfo = MrtDataService.lines[config.line] || MrtDataService.lines[lineKey];
            if (!lineInfo) return;

            for (let i = 0; i < config.count; i++) {
                const direction = i % 2 === 0 ? 1 : -1;
                const startSeg = Math.floor((i / config.count) * (seq.length - 1));
                const initialProgress = (i * 0.35) % 1.0;

                const startStation = MrtDataService.stations[seq[startSeg]];
                if (!startStation) continue;

                trains.push({
                    id: _generateTrainId(config),
                    lineKey: lineKey,
                    sequenceKey: config.line,
                    sequence: seq,
                    segmentIndex: startSeg,
                    progress: initialProgress,
                    direction: direction,
                    baseSpeed: config.speed + (Math.random() * 0.00008),
                    isExpress: config.isExpress,
                    isDwelling: false,
                    dwellTimeRemaining: 0,
                    currentStationCode: seq[startSeg],
                    latLng: [startStation.lat, startStation.lng],
                    angle: 0,
                    marker: null,
                    hasAnomaly: false,
                    anomalyLevel: null   // null | 'warn' | 'error'
                });
            }
        });
    }

    /* ── 每幀更新列車位置 ── */
    function update(delta, speedMult) {
        if (_isNighttime()) {
            if (trains.length > 0) {
                // 深夜收班：清空
                trains.forEach(t => { t._markedForRemoval = true; });
                trains = [];
            }
            return;
        }

        // 若營運時段但無列車，重新發車
        if (trains.length === 0) _spawnTrains();

        trains.forEach(t => {
            // 停靠載客中
            if (t.isDwelling) {
                t.dwellTimeRemaining -= delta * speedMult;
                if (t.dwellTimeRemaining <= 0) {
                    t.isDwelling = false;
                    t.dwellTimeRemaining = 0;
                } else {
                    return; // 仍在停靠
                }
            }

            // 推進距離
            t.progress += t.baseSpeed * speedMult * (delta / 16.6);

            if (t.progress >= 1.0) {
                t.progress = 0;
                t.segmentIndex += t.direction;

                // 邊界反轉
                if (t.segmentIndex >= t.sequence.length - 1) {
                    t.segmentIndex = t.sequence.length - 2;
                    t.direction = -1;
                } else if (t.segmentIndex < 0) {
                    t.segmentIndex = 0;
                    t.direction = 1;
                }

                const arrivedCode = t.sequence[t.segmentIndex];
                t.currentStationCode = arrivedCode;

                // 直達車跳站邏輯
                if (t.isExpress) {
                    if (MrtDataService.expressStops.includes(arrivedCode)) {
                        t.isDwelling = true;
                        t.dwellTimeRemaining = 3500;
                    }
                    // 非停靠站不停
                } else {
                    t.isDwelling = true;
                    t.dwellTimeRemaining = 3500;
                }
            }

            // 計算插值座標
            const code1 = t.sequence[t.segmentIndex];
            const code2 = t.sequence[t.segmentIndex + t.direction] || code1;
            const st1 = MrtDataService.stations[code1];
            const st2 = MrtDataService.stations[code2];

            if (st1 && st2) {
                const lat = st1.lat + (st2.lat - st1.lat) * t.progress;
                const lng = st1.lng + (st2.lng - st1.lng) * t.progress;
                t.latLng = [lat, lng];

                // 角度計算
                const dy = st2.lat - st1.lat;
                const dx = (st2.lng - st1.lng) * Math.cos(st1.lat * Math.PI / 180);
                t.angle = Math.atan2(dy, dx) * 180 / Math.PI;
            }
        });
    }

    /* ── 公開介面 ── */

    /**
     * 初始化 MockDataService — 生成模擬列車
     */
    function init() {
        cleanup();
        _spawnTrains();
        initialized = true;
        console.log(
            '%c[MockDataService] 模擬數據服務已啟動 — 列車數: ' + trains.length,
            'color:#fff;background:#F59E0B;font-weight:bold;font-size:12px;padding:3px 8px;border-radius:6px;'
        );
    }

    /**
     * 取得所有列車物件
     */
    function getTrains() {
        return trains;
    }

    /**
     * 判斷是否為夜間非營運時段
     */
    function isNighttime() {
        return _isNighttime();
    }

    /**
     * 同步夜間/營運時段切換
     */
    function checkAndSyncNightState() {
        const night = _isNighttime();
        if (night && trains.length > 0) {
            trains.forEach(t => { t._markedForRemoval = true; });
            trains = [];
        } else if (!night && trains.length === 0 && initialized) {
            _spawnTrains();
        }
    }

    /**
     * 取得特定路線的列車（供 debugLogger 使用）
     */
    function getTrainsByLine(lineKey) {
        return trains.filter(t => t.lineKey === lineKey || t.sequenceKey === lineKey);
    }

    /**
     * 取得路線營運狀態（模擬模式固定回傳全線正常）
     */
    function getLineAlerts() {
        return Object.keys(MrtDataService.lines).map(key => ({
            lineKey: key,
            lineName: MrtDataService.lines[key].name,
            color: MrtDataService.lines[key].color,
            status: 'normal',
            statusText: '正常營運',
            detail: null
        }));
    }

    /**
     * 徹底銷毀 — 清空所有列車，標記需移除 marker
     */
    function cleanup() {
        trains.forEach(t => { t._markedForRemoval = true; });
        trains = [];
        trainIdCounter = 1;
        initialized = false;
        console.log('[MockDataService] cleanup() — 所有模擬列車已銷毀');
    }

    return {
        init,
        update,
        getTrains,
        isNighttime,
        checkAndSyncNightState,
        getTrainsByLine,
        getLineAlerts,
        cleanup
    };
})();
