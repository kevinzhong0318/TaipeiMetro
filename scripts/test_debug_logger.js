/**
 * Node.js Terminal Demonstration Test Script for Tamsui-Xinyi Line (R-Line) Debug Logger
 */
const rLineStations = [
    { code: "R02", name: "象山" },
    { code: "R03", name: "台北101/世貿" },
    { code: "R04", name: "信義安和" },
    { code: "R05", name: "大安" },
    { code: "R06", name: "大安森林公園" },
    { code: "R07", name: "東門" },
    { code: "R08", name: "中正紀念堂" },
    { code: "R09", name: "台大醫院" },
    { code: "R10", name: "台北車站" },
    { code: "R11", name: "中山" },
    { code: "R12", name: "雙連" },
    { code: "R13", name: "民權西路" },
    { code: "R14", name: "圓山" },
    { code: "R15", name: "劍潭" },
    { code: "R16", name: "士林" },
    { code: "R17", name: "芝山" },
    { code: "R18", name: "明德" },
    { code: "R19", name: "石牌" },
    { code: "R20", name: "唭哩岸" },
    { code: "R21", name: "奇岩" },
    { code: "R22", name: "北投" },
    { code: "R23", name: "復興崗" },
    { code: "R24", name: "忠義" },
    { code: "R25", name: "關渡" },
    { code: "R26", name: "竹圍" },
    { code: "R27", name: "紅樹林" },
    { code: "R28", name: "淡水" }
];

function simulateTamsuiXinyiTrains() {
    const timestamp = new Date().toLocaleTimeString('zh-TW', { hour12: false });
    
    const mockTrains = [
        {
            id: "TR-R-101",
            direction: 1, // 往 淡水
            segmentIndex: 8, // R10 台北車站
            progress: 0.45,
            isDwelling: false,
            dwellTimeRemaining: 0
        },
        {
            id: "TR-R-102",
            direction: -1, // 往 象山
            segmentIndex: 11, // R13 雙連
            progress: 0,
            isDwelling: true,
            dwellTimeRemaining: 3500
        },
        {
            id: "TR-R-103",
            direction: 1, // 往 淡水
            segmentIndex: 21, // R22 北投
            progress: 0.80,
            isDwelling: false,
            dwellTimeRemaining: 0
        },
        {
            id: "TR-R-104",
            direction: -1, // 往 象山
            segmentIndex: 4, // R05 大安
            progress: 0.15,
            isDwelling: false,
            dwellTimeRemaining: 0
        }
    ];

    const tableData = mockTrains.map(t => {
        const currentStObj = rLineStations[t.segmentIndex];
        const nextIdx = t.direction > 0 ? t.segmentIndex + 1 : t.segmentIndex - 1;
        const nextStObj = rLineStations[nextIdx] || currentStObj;

        const directionLabel = t.direction > 0 ? "往 淡水 (R28)" : "往 象山 (R02)";
        let statusDesc = "";
        if (t.isDwelling) {
            statusDesc = `停靠於 [${currentStObj.code} ${currentStObj.name}] (3.5s)`;
        } else {
            statusDesc = `前往 [${nextStObj.code} ${nextStObj.name}] (進度: ${(t.progress * 100).toFixed(0)}%)`;
        }

        return {
            "列車 ID": t.id,
            "行駛方向": directionLabel,
            "當前位置與動態": statusDesc,
            "當前車站": `${currentStObj.name} (${currentStObj.code})`,
            "資料狀態": "🟢 演算法預估動態推算中",
            "時間戳記": timestamp
        };
    });

    console.log("\x1b[41m\x1b[37m\x1b[1m [DebugLogger] 淡水信義線 (R Line) 即時列車監控終端機日誌測試 \x1b[0m");
    console.log(`\x1b[36m🕒 系統時間: ${timestamp} | 在線列車數: ${tableData.length}\x1b[0m\n`);
    console.table(tableData);
}

simulateTamsuiXinyiTrains();
