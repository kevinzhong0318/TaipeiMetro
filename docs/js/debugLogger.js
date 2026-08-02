/**
 * =========================================================================
 * js/debugLogger.js - 淡水信義線 (R Line / 紅線) 列車即時除錯輸出
 * 功能：
 *   1. 瀏覽器 DevTools Console 每 5 秒印出 console.table
 *   2. 網頁右下角即時終端機 HUD 面板
 * =========================================================================
 */
const TamsuiXinyiDebugLogger = (function () {
    let intervalId = null;
    let isEnabled = true;
    const LOG_INTERVAL = 5000;

    /* ---------- public ---------- */
    function init() {
        if (intervalId) clearInterval(intervalId);
        // 延遲 1 秒等列車 spawn 完畢後再做第一次輸出
        setTimeout(() => {
            logOnce();
            intervalId = setInterval(logOnce, LOG_INTERVAL);
        }, 1200);
        createHUD();
        console.log(
            '%c[DebugLogger] 淡水信義線 (R Line) 即時列車監控已啟動 — 每 5 秒輸出',
            'color:#fff;background:#E3002C;font-weight:bold;font-size:13px;padding:4px 10px;border-radius:6px;'
        );
    }

    /* ---------- core ---------- */
    function logOnce() {
        if (!isEnabled) return;
        const rows = buildRows();
        if (rows.length === 0) return;

        const ts = now();
        // Console
        console.log(
            `%c[淡水信義線 R-Line] 🕒 ${ts}  列車數: ${rows.length}`,
            'color:#E3002C;font-weight:bold;font-size:12px;border-bottom:2px solid #E3002C;padding-bottom:2px;'
        );
        console.table(rows);

        // HUD
        renderHUD(rows, ts);
    }

    function buildRows() {
        if (!window.AnimationEngine) return [];
        const trains = AnimationEngine.getTamsuiXinyiTrains();
        if (!trains || trains.length === 0) return [];

        const ts = now();
        const modeLabel = dataLabel();

        return trains.map(t => {
            const seq = t.sequence;
            const curCode = seq[t.segmentIndex] || seq[0];
            const nextIdx = t.segmentIndex + t.direction;
            const nextCode = seq[nextIdx] || curCode;
            const curName = stName(curCode);
            const nextName = stName(nextCode);
            const dir = t.direction > 0 ? '往 淡水 ↑' : '往 象山 ↓';

            let pos;
            if (t.isDwelling) {
                pos = `■ 停靠 ${curCode} ${curName} (${(t.dwellTimeRemaining / 1000).toFixed(1)}s)`;
            } else {
                pos = `→ 前往 ${nextCode} ${nextName} (${(t.progress * 100).toFixed(0)}%)`;
            }

            return {
                '列車ID': t.id,
                '方向': dir,
                '位置': pos,
                '站名': `${curName}(${curCode})`,
                '模式': modeLabel,
                '時間': ts
            };
        });
    }

    /* ---------- helpers ---------- */
    function now() { return new Date().toLocaleTimeString('zh-TW', { hour12: false }); }
    function stName(code) {
        return (window.MrtDataService && MrtDataService.stations[code])
            ? MrtDataService.stations[code].name : code;
    }
    function dataLabel() {
        if (!window.TDXService) return '模擬';
        const m = TDXService.getMode();
        if (m !== 'tdx') return '🟡 模擬推算';
        const a = TDXService.getAnomalyStatus();
        return a.isAnomaly ? '⚠️ API 異常/模擬' : '🟢 TDX 實時';
    }

    /* ---------- HUD ---------- */
    function createHUD() {
        if (document.getElementById('dbgHUD')) return;
        const el = document.createElement('div');
        el.id = 'dbgHUD';
        el.style.cssText = `
            position:fixed;bottom:70px;right:12px;z-index:1200;
            width:420px;max-width:calc(100vw - 24px);
            background:rgba(10,10,18,0.92);border:1px solid rgba(227,0,44,0.45);
            border-radius:16px;padding:10px 12px;
            font-family:'JetBrains Mono',monospace;font-size:11px;color:#e0e0e0;
            box-shadow:0 4px 24px rgba(0,0,0,0.5);
            pointer-events:auto;
        `;
        el.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(227,0,44,0.3);padding-bottom:6px;margin-bottom:6px;">
                <span style="color:#E3002C;font-weight:bold;">🖥 淡水信義線 即時除錯終端</span>
                <button id="dbgHUDToggle" style="color:#E3002C;background:rgba(227,0,44,0.15);border:none;padding:2px 8px;border-radius:6px;cursor:pointer;font-size:10px;">收合</button>
            </div>
            <div id="dbgHUDBody" style="max-height:200px;overflow-y:auto;">
                <span style="color:#666;">等待列車數據…</span>
            </div>
            <div style="border-top:1px solid #222;margin-top:6px;padding-top:4px;display:flex;justify-content:space-between;font-size:10px;color:#666;">
                <span>每 5 秒更新</span><span style="color:#34d399;">● 監控中</span>
            </div>`;
        document.body.appendChild(el);
        document.getElementById('dbgHUDToggle').addEventListener('click', () => {
            const b = document.getElementById('dbgHUDBody');
            b.style.display = b.style.display === 'none' ? '' : 'none';
        });
    }

    function renderHUD(rows, ts) {
        const body = document.getElementById('dbgHUDBody');
        if (!body) return;
        body.innerHTML = rows.map(r => `
            <div style="background:rgba(30,30,40,0.8);border:1px solid #222;border-radius:10px;padding:6px 8px;margin-bottom:4px;">
                <div style="display:flex;justify-content:space-between;color:#E3002C;font-weight:bold;">
                    <span>🚆 ${r['列車ID']}  ${r['方向']}</span>
                    <span style="color:#555;font-size:9px;">${r['時間']}</span>
                </div>
                <div style="color:#34d399;margin-top:2px;">📍 ${r['位置']}</div>
                <div style="color:#666;font-size:10px;">模式：${r['模式']}</div>
            </div>
        `).join('');
    }

    function setEnabled(v) { isEnabled = v; }

    return { init, logOnce, setEnabled };
})();
