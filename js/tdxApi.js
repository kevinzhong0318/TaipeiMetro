/**
 * =========================================================================
 * js/tdxApi.js - 交通部 TDX API OAuth 2.0 認證與即時資料串接服務 (TDXService)
 * =========================================================================
 */
const TDXService = (function() {
    let clientId = localStorage.getItem('tdx_client_id') || '';
    let clientSecret = localStorage.getItem('tdx_client_secret') || '';
    let mode = localStorage.getItem('tdx_mode') || 'mock';
    let accessToken = '';

    function getMode() { return mode; }
    function setMode(m) { mode = m; localStorage.setItem('tdx_mode', m); }
    function getCredentials() { return { clientId, clientSecret }; }
    function saveCredentials(id, secret) {
        clientId = id; clientSecret = secret;
        localStorage.setItem('tdx_client_id', id);
        localStorage.setItem('tdx_client_secret', secret);
    }

    async function fetchAccessToken() {
        if (!clientId || !clientSecret) return false;
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
                return true;
            }
        } catch (e) {
            console.error("TDX Auth Error:", e);
        }
        return false;
    }

    async function fetchLiveBoard(lineCode) {
        if (!accessToken) return null;
        try {
            const res = await fetch(`https://tdx.transportdata.tw/api/basic/v2/Rail/Metro/LiveBoard/TRTC?$format=JSON`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            if (res.ok) return await res.json();
        } catch (e) {
            console.error("TDX LiveBoard Fetch Error:", e);
        }
        return null;
    }

    return { getMode, setMode, getCredentials, saveCredentials, fetchAccessToken, fetchLiveBoard };
})();
