/**
 * =========================================================================
 * js/debugLogger.js - 淡水信義線 (R Line / 紅線) 列車即時除錯輸出日誌器 (TamsuiXinyiDebugLogger)
 * 包含：
 * 1. 瀏覽器 DevTools Console 即時表格輸出 (console.table)
 * 2. 網頁端右下角即時除錯終端機 HUD (Floating On-screen Debug Terminal)
 * 3. 模組化匯出供 Node.js 終端機測試執行
 * =========================================================================
 */
const TamsuiXinyiDebugLogger = (function() {
    let intervalId = null;
    let isEnabled = true;
    let logIntervalMs = 5000; // 每 5 秒輸出一次快照

    function init() {
        if (intervalId) clearInterval(intervalId);
        
        // 1. 立即於 0 秒執行第一次輸出（免除 5 秒等待）
        logTamsuiXinyiTrains();

        // 2. 啟動每 5 秒定時循環
        intervalId = setInterval(logTamsuiXinyiTrains, logIntervalMs);

        // 3. 初始化網頁端即時終端機 HUD 介面
        initTerminalUI();

        console.log(
            "%c[DebugLogger] 淡水信義線 (R Line) 即時列車監控日誌器已成功啟動！(每 5 秒自動輸出終端機快照)",
            "color: #ffffff; background: #E3002C; font-weight: bold; font-size: 13px; padding: 6px 12px; border-radius: 6px; shadow: 0 2px 8px rgba(227,0,44,0.4);"
        );
    }

    function getFormattedLogData() {
        if (!window.AnimationEngine) return [];
        const trains = window.AnimationEngine.getTamsuiXinyiTrains();
        if (!trains || trains.length === 0) return [];

        const timestamp = new Date().toLocaleTimeString('zh-TW', { hour12: false });
        const mode = window.TDXService ? TDXService.getMode() : 'mock';
        const anomalyStatus = window.TDXService ? TDXService.getAnomalyStatus() : { isAnomaly: false };

        let dataStatusText = "🟢 演算法預估推算中";
        if (mode === 'tdx') {
            dataStatusText = anomalyStatus.isAnomaly ? "⚠️ TDX API 異常 (模擬中)" : "🟢 TDX API 實時連線";
        }

        return trains.map(t => {
            const seq = t.sequence;
            const currentCode = seq[t.segmentIndex];
            const nextCode = seq[t.segmentIndex + t.direction] || currentCode;

            const currentSt = (window.MrtDataService && MrtDataService.stations[currentCode]) ? MrtDataService.stations[currentCode].name : currentCode;
            const nextSt = (window.MrtDataService && MrtDataService.stations[nextCode]) ? MrtDataService.stations[nextCode].name : nextCode;

            const directionLabel = t.direction > 0 ? "往 淡水 (R28)" : "往 象山 (R02)";

            let statusDesc = "";
            if (t.isDwelling) {
                statusDesc = `停靠於 [${currentCode} ${currentSt}] (${(t.dwellTimeRemaining / 1000).toFixed(1)}s)`;
            } else {
                statusDesc = `前往 [${nextCode} ${nextSt}] (進度: ${(t.progress * 100).toFixed(0)}%)`;
            }

            return {
                "列車 ID": t.id,
                "行駛方向": directionLabel,
                "當前位置與動態": statusDesc,
                "當前車站": `${currentSt} (${currentCode})`,
                "資料狀態": dataStatusText,
                "時間戳": timestamp
            };
        });
    }

    function logTamsuiXinyiTrains() {
        if (!isEnabled) return;

        const tableData = getFormattedLogData();
        if (tableData.length === 0) return;

        const timestamp = new Date().toLocaleTimeString('zh-TW', { hour12: false });

        // 直接輸出 clear、亮眼 console.log 與 console.table (不使用 collapsed 隱藏)
        console.log(`%c[淡水信義線 R-Line 列車監控快照] 🕒 ${timestamp} | 在線列車數: ${tableData.length}`, "color: #E3002C; font-weight: bold; font-size: 12px; border-bottom: 2px solid #E3002C; padding-bottom: 2px;");
        console.table(tableData);

        // 同步更新網頁浮動終端機 UI
        updateTerminalUI(tableData, timestamp);
    }

    /**
     * 網頁端右下角浮動終端機 HUD (Floating Terminal Overlay)
     */
    function initTerminalUI() {
        if (document.getElementById('debugTerminalContainer')) return;

        const container = document.createElement('div');
        container.id = 'debugTerminalContainer';
        container.className = 'fixed bottom-16 right-3 sm:right-6 z-[1200] pointer-events-auto transition-all duration-300 transform translate-y-0';
        container.innerHTML = `
            <div class="glass-panel rounded-2xl p-3 w-[340px] sm:w-[460px] shadow-2xl border border-rose-500/40 bg-gray-950/90 text-white font-mono text-[11px] space-y-2">
                <div class="flex items-center justify-between border-b border-rose-500/30 pb-2">
                    <div class="flex items-center gap-2 font-bold text-rose-400">
                        <span class="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                        <span>🖥️ 淡水信義線 (R Line) 即時除錯終端機</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <button id="btnToggleTerminalCollapse" class="text-[10px] bg-rose-500/20 hover:bg-rose-500/30 px-2 py-0.5 rounded text-rose-300 transition-all">縮小/展開</button>
                    </div>
                </div>

                <div id="debugTerminalBody" class="max-h-48 overflow-y-auto space-y-1.5 pr-1 text-[11px]">
                    <div class="text-gray-400 italic">正在載入淡水信義線列車即時數據...</div>
                </div>

                <div class="border-t border-gray-800 pt-1.5 flex items-center justify-between text-[10px] opacity-75">
                    <span>更新頻率: 每 5 秒</span>
                    <span class="text-emerald-400">系統即時監控中</span>
                </div>
            </div>
        `;

        document.body.appendChild(container);

        document.getElementById('btnToggleTerminalCollapse').addEventListener('click', () => {
            const body = document.getElementById('debugTerminalBody');
            body.classList.toggle('hidden');
        });
    }

    function updateTerminalUI(tableData, timestamp) {
        const body = document.getElementById('debugTerminalBody');
        if (!body) return;

        const rowsHtml = tableData.map(t => {
            return `<div class="bg-gray-900/80 p-2 rounded-xl border border-gray-800 space-y-0.5">
                <div class="flex items-center justify-between text-rose-400 font-bold">
                    <span>🚆 ${t["列車 ID"]} (${t["行駛方向"]})</span>
                    <span class="text-[9px] text-gray-400 font-mono">${t["時間戳"]}</span>
                </div>
                <div class="text-emerald-300 font-medium">📍 ${t["當前位置與動態"]}</div>
                <div class="text-[10px] text-gray-400">模式：${t["資料狀態"]}</div>
            </div>`;
        }).join('');

        body.innerHTML = rowsHtml;
    }

    function setEnabled(enabled) {
        isEnabled = enabled;
        console.log(`[DebugLogger] 淡水信義線除錯日誌器狀態變更為: ${enabled ? '啟用' : '停用'}`);
    }

    return { init, logTamsuiXinyiTrains, getFormattedLogData, setEnabled };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TamsuiXinyiDebugLogger;
}
