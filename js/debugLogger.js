/**
 * =========================================================================
 * js/debugLogger.js - 淡水信義線 (R Line / 紅線) 列車即時除錯輸出日誌器 (TamsuiXinyiDebugLogger)
 * 在 DevTools Console / 終端機環境中以彩色群組與 console.table 格式化印出除錯資訊
 * =========================================================================
 */
const TamsuiXinyiDebugLogger = (function() {
    let intervalId = null;
    let isEnabled = true;
    let logIntervalMs = 5000; // 每 5 秒於控制台印出一次除錯快照

    function init() {
        if (intervalId) clearInterval(intervalId);
        intervalId = setInterval(logTamsuiXinyiTrains, logIntervalMs);
        console.log("%c[DebugLogger] 淡水信義線 (R Line) 即時列車監控日誌器已啟動 (每 5 秒自動輸出控制台)", "color: #E3002C; font-weight: bold; font-size: 13px; background: rgba(227, 0, 44, 0.1); padding: 4px 8px; border-radius: 6px;");
    }

    function logTamsuiXinyiTrains() {
        if (!isEnabled || !window.AnimationEngine) return;

        const trains = window.AnimationEngine.getTamsuiXinyiTrains();
        if (!trains || trains.length === 0) return;

        const timestamp = new Date().toLocaleTimeString('zh-TW', { hour12: false });
        const mode = TDXService.getMode();
        const anomalyStatus = TDXService.getAnomalyStatus();

        let dataStatusText = "🟢 演算法預估動態推算中";
        if (mode === 'tdx') {
            dataStatusText = anomalyStatus.isAnomaly ? "⚠️ TDX API 異常 (降級模擬中)" : "🟢 TDX API 實時數據連線中";
        }

        console.groupCollapsed(`%c[淡水信義線 R-Line 列車監控] 🕒 ${timestamp} | 數據狀態: ${dataStatusText} | 在線列車數: ${trains.length}`, "color: #E3002C; font-weight: bold; font-size: 12px;");

        const tableData = trains.map(t => {
            const seq = t.sequence;
            const currentCode = seq[t.segmentIndex];
            const nextCode = seq[t.segmentIndex + t.direction] || currentCode;

            const currentSt = MrtDataService.stations[currentCode] ? MrtDataService.stations[currentCode].name : currentCode;
            const nextSt = MrtDataService.stations[nextCode] ? MrtDataService.stations[nextCode].name : nextCode;

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
                "更新時間": timestamp
            };
        });

        console.table(tableData);
        console.groupEnd();
    }

    function setEnabled(enabled) {
        isEnabled = enabled;
        console.log(`[DebugLogger] 淡水信義線除錯日誌器狀態變更為: ${enabled ? '啟用' : '停用'}`);
    }

    return { init, logTamsuiXinyiTrains, setEnabled };
})();
