/**
 * =========================================================================
 * js/tdxApi.js - 交通部 TDX API OAuth 2.0 認證、即時數據串接與異常偵測 (TDXService)
 * =========================================================================
 */
const TDXService = (function () {
    let clientId  = 'M11507108-c58329e5-3f1e-426a';
    let clientSecret = '4e74f084-927b-4f1e-9a37-4afa29696271';
    let mode = 'tdx';   // always default to 'tdx'
    let accessToken = '';
    let tokenExpiryTime = 0;

    let lastDataHash = '';
    let stagnantCount = 0;
    let anomalyStatus = { isAnomaly: false, reason: '', lastChecked: null };
    let lastLiveBoardData = null;   // 最近一次有效 LiveBoard 資料快取

    /* ── getters / setters ── */
    function getMode() { return mode; }
    function setMode(m) { mode = m; localStorage.setItem('tdx_mode', m); }
    function getCredentials() { return { clientId, clientSecret }; }
    function saveCredentials(id, sec) {
        clientId = id; clientSecret = sec;
        localStorage.setItem('tdx_client_id', id);
        localStorage.setItem('tdx_client_secret', sec);
    }
    function getAnomalyStatus() { return anomalyStatus; }
    function getLastLiveBoardData() { return lastLiveBoardData; }

    /* ── OAuth 2.0 Token ── */
    async function fetchAccessToken() {
        if (!clientId || !clientSecret) {
            anomalyStatus = { isAnomaly: true, reason: '未設定 Client ID / Secret', lastChecked: new Date() };
            return false;
        }
        if (accessToken && Date.now() < tokenExpiryTime - 60000) return true;

        try {
            const params = new URLSearchParams();
            params.append('grant_type', 'client_credentials');
            params.append('client_id', clientId);
            params.append('client_secret', clientSecret);

            const res = await fetch(
                'https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token',
                { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params }
            );
            if (res.ok) {
                const d = await res.json();
                accessToken = d.access_token;
                tokenExpiryTime = Date.now() + d.expires_in * 1000;
                anomalyStatus = { isAnomaly: false, reason: 'OAuth OK', lastChecked: new Date() };
                return true;
            }
            anomalyStatus = { isAnomaly: true, reason: `OAuth 失敗 (${res.status})`, lastChecked: new Date() };
        } catch (e) {
            console.error('TDX OAuth Error:', e);
            anomalyStatus = { isAnomaly: true, reason: `認證連線異常: ${e.message}`, lastChecked: new Date() };
        }
        return false;
    }

    /* ── LiveBoard fetchers ── */
    async function fetchLiveBoardTRTC() {
        if (!accessToken) { if (!(await fetchAccessToken())) return null; }
        try {
            const r = await fetch(
                'https://tdx.transportdata.tw/api/basic/v2/Rail/Metro/LiveBoard/TRTC?$top=1000&$format=JSON',
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            if (r.ok) return await r.json();
            if (r.status === 401) { accessToken = ''; await fetchAccessToken(); }
        } catch (e) { console.error('TRTC LiveBoard Error:', e); }
        return null;
    }

    async function fetchLiveBoardTYMC() {
        if (!accessToken) return null;
        try {
            const r = await fetch(
                'https://tdx.transportdata.tw/api/basic/v2/Rail/Metro/LiveBoard/TYMC?$top=300&$format=JSON',
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            if (r.ok) return await r.json();
        } catch (e) { console.error('TYMC LiveBoard Error:', e); }
        return null;
    }

    /* ── Anomaly detection ── */
    function detectAnomaly(trtcData, tymcData) {
        if (!trtcData && !tymcData)
            return { isAnomaly: true, reason: '⚠️ 無法連線 TDX API' };

        const combined = [
            ...(Array.isArray(trtcData) ? trtcData : []),
            ...(Array.isArray(tymcData) ? tymcData : [])
        ];
        if (combined.length === 0)
            return { isAnomaly: true, reason: '⚠️ API 回傳空資料' };

        if (!combined.some(i => (i.LineID || i.LineNo) && (i.StationID || i.StationName)))
            return { isAnomaly: true, reason: '⚠️ 欄位格式異常' };

        const hash = combined.slice(0, 50).map(i => `${i.LineID}_${i.StationID}_${i.Direction}_${i.EstimateTime}_${i.TrainStatus}`).join('|');
        if (hash && hash === lastDataHash) {
            stagnantCount++;
            if (stagnantCount >= 3) return { isAnomaly: true, reason: '⚠️ 數據停滯' };
        } else { stagnantCount = 0; lastDataHash = hash; }

        return { isAnomaly: false, reason: '🟢 TDX API 正常', data: combined };
    }

    /* ── Unified poll ── */
    async function pollLiveTrains() {
        if (mode !== 'tdx')
            return { isAnomaly: false, mode: 'mock', reason: '🟡 模擬數據運行中' };

        if (!(await fetchAccessToken()))
            return { isAnomaly: true, mode: 'fallback', reason: anomalyStatus.reason };

        const [trtc, tymc] = await Promise.all([fetchLiveBoardTRTC(), fetchLiveBoardTYMC()]);
        const result = detectAnomaly(trtc, tymc);

        if (!result.isAnomaly && result.data) {
            lastLiveBoardData = result.data;  // 快取有效資料
        }

        return { ...result, mode: result.isAnomaly ? 'fallback' : 'tdx' };
    }

    return {
        getMode, setMode, getCredentials, saveCredentials,
        fetchAccessToken, pollLiveTrains, getAnomalyStatus,
        getLastLiveBoardData
    };
})();
