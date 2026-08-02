/**
 * =========================================================================
 * js/tdxApi.js - 交通部 TDX API OAuth 2.0 認證、即時數據串接與異常自動偵測與備援服務 (TDXService)
 * 包含異常判定演算法：網路斷線/無數據/欄位異常/連續輪詢資料停滯 ➔ 自動觸發 fallback
 * =========================================================================
 */
const TDXService = (function() {
    let clientId = localStorage.getItem('tdx_client_id') || '';
    let clientSecret = localStorage.getItem('tdx_client_secret') || '';
    let mode = localStorage.getItem('tdx_mode') || 'mock'; // 'mock' | 'tdx'
    let accessToken = '';
    let tokenExpiryTime = 0;
    
    let lastDataHash = '';
    let stagnantCount = 0;
    let anomalyStatus = {
        isAnomaly: false,
        reason: '',
        lastChecked: null
    };

    function getMode() { return mode; }
    function setMode(m) { mode = m; localStorage.setItem('tdx_mode', m); }
    function getCredentials() { return { clientId, clientSecret }; }
    function saveCredentials(id, secret) {
        clientId = id; 
        clientSecret = secret;
        localStorage.setItem('tdx_client_id', id);
        localStorage.setItem('tdx_client_secret', secret);
    }

    /**
     * 透過 OAuth 2.0 Client Credentials Grant 取得權限 Access Token
     */
    async function fetchAccessToken() {
        if (!clientId || !clientSecret) {
            anomalyStatus = { isAnomaly: true, reason: '未設定 Client ID 或 Client Secret', lastChecked: new Date() };
            return false;
        }

        // 若 Token 仍在有效期內直接使用
        if (accessToken && Date.now() < tokenExpiryTime - 60000) {
            return true;
        }

        try {
            const params = new URLSearchParams();
            params.append('grant_type', 'client_credentials');
            params.append('client_id', clientId);
            params.append('client_secret', clientSecret);

            const res = await fetch('https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params
            });

            if (res.ok) {
                const data = await res.json();
                accessToken = data.access_token;
                tokenExpiryTime = Date.now() + (data.expires_in * 1000);
                anomalyStatus = { isAnomaly: false, reason: 'TDX API 認證正常', lastChecked: new Date() };
                return true;
            } else {
                const errText = await res.text();
                anomalyStatus = { isAnomaly: true, reason: `OAuth 認證失敗 (HTTP ${res.status}): ${errText}`, lastChecked: new Date() };
            }
        } catch (e) {
            console.error("TDX OAuth Auth Error:", e);
            anomalyStatus = { isAnomaly: true, reason: `認證連線異常: ${e.message}`, lastChecked: new Date() };
        }
        return false;
    }

    /**
     * 讀取台北捷運 (TRTC) 即時列車與到站資訊 LiveBoard API
     */
    async function fetchLiveBoardTRTC() {
        if (!accessToken) {
            const authed = await fetchAccessToken();
            if (!authed) return null;
        }

        try {
            const res = await fetch('https://tdx.transportdata.tw/api/basic/v2/Rail/Metro/LiveBoard/TRTC?$top=300&$format=JSON', {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            if (res.ok) return await res.json();
            if (res.status === 401) { // Token 效期逾時自動重試一次
                await fetchAccessToken();
            }
        } catch (e) {
            console.error("TRTC LiveBoard API Error:", e);
        }
        return null;
    }

    /**
     * 讀取桃園機場捷運 (TYMC) 即時列車 LiveBoard API
     */
    async function fetchLiveBoardTYMC() {
        if (!accessToken) return null;
        try {
            const res = await fetch('https://tdx.transportdata.tw/api/basic/v2/Rail/Metro/LiveBoard/TYMC?$top=100&$format=JSON', {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            if (res.ok) return await res.json();
        } catch (e) {
            console.error("TYMC LiveBoard API Error:", e);
        }
        return null;
    }

    /**
     * API 資料異常判定演算法：判定連線、資料空值、欄位缺失與資料停滯不前狀況
     */
    function detectAnomaly(trtcData, tymcData) {
        if (!trtcData && !tymcData) {
            return { isAnomaly: true, reason: '⚠️ 無法連線至 TDX API 或伺服器回應異常，已啟動預估動態模擬' };
        }

        const combinedData = [...(Array.isArray(trtcData) ? trtcData : []), ...(Array.isArray(tymcData) ? tymcData : [])];

        if (combinedData.length === 0) {
            return { isAnomaly: true, reason: '⚠️ API 回傳數據為空，已啟動預估動態模擬' };
        }

        // 檢查必要欄位完整性
        const hasValidFields = combinedData.some(item => (item.LineID || item.LineNo) && (item.StationID || item.StationName));
        if (!hasValidFields) {
            return { isAnomaly: true, reason: '⚠️ API 數據欄位格式異常，已啟動預估動態模擬' };
        }

        // 檢測資料是否停滯不前 (Stagnant Data Detection)
        const currentHash = combinedData.slice(0, 10).map(i => `${i.LineID}_${i.StationID}_${i.TrainNo || i.TripHeadsign}`).join('|');
        if (currentHash && currentHash === lastDataHash) {
            stagnantCount++;
            if (stagnantCount >= 3) { // 連續 3 次輪詢數據完全停滯
                return { isAnomaly: true, reason: '⚠️ 列車位置數據停滯不前，已啟動預估動態模擬' };
            }
        } else {
            stagnantCount = 0;
            lastDataHash = currentHash;
        }

        return { isAnomaly: false, reason: '🟢 TDX API 數據連線正常', data: combinedData };
    }

    /**
     * 綜合輪詢服務：發送請求並經由異常判定機制檢測
     */
    async function pollLiveTrains() {
        if (mode !== 'tdx') {
            return { isAnomaly: false, mode: 'mock', reason: '🟡 模擬數據運行中' };
        }

        const tokenSuccess = await fetchAccessToken();
        if (!tokenSuccess) {
            return { isAnomaly: true, mode: 'fallback', reason: anomalyStatus.reason || '⚠️ OAuth 驗證失敗，已啟動預估動態模擬' };
        }

        const [trtcData, tymcData] = await Promise.all([
            fetchLiveBoardTRTC(),
            fetchLiveBoardTYMC()
        ]);

        const checkResult = detectAnomaly(trtcData, tymcData);
        return {
            ...checkResult,
            mode: checkResult.isAnomaly ? 'fallback' : 'tdx'
        };
    }

    function getAnomalyStatus() { return anomalyStatus; }

    return {
        getMode,
        setMode,
        getCredentials,
        saveCredentials,
        fetchAccessToken,
        pollLiveTrains,
        detectAnomaly,
        getAnomalyStatus
    };
})();
