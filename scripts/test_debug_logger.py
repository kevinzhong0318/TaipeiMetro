#!/usr/bin/env python3
import datetime

r_stations = [
    ("R02", "象山"), ("R03", "台北101/世貿"), ("R04", "信義安和"), ("R05", "大安"),
    ("R06", "大安森林公園"), ("R07", "東門"), ("R08", "中正紀念堂"), ("R09", "台大醫院"),
    ("R10", "台北車站"), ("R11", "中山"), ("R12", "雙連"), ("R13", "民權西路"),
    ("R14", "圓山"), ("R15", "劍潭"), ("R16", "士林"), ("R17", "芝山"),
    ("R18", "明德"), ("R19", "石牌"), ("R20", "唭哩岸"), ("R21", "奇岩"),
    ("R22", "北投"), ("R23", "復興崗"), ("R24", "忠義"), ("R25", "關渡"),
    ("R26", "竹圍"), ("R27", "紅樹林"), ("R28", "淡水")
]

now_str = datetime.datetime.now().strftime("%H:%M:%S")

trains = [
    {
        "id": "TR-R-101",
        "direction": "往 淡水 (R28)",
        "location": "前往 [R11 中山] (進度: 45%)",
        "station": "台北車站 (R10)",
        "status": "🟢 演算法預估動態推算中",
        "time": now_str
    },
    {
        "id": "TR-R-102",
        "direction": "往 象山 (R02)",
        "location": "停靠於 [R13 雙連] (3.5s)",
        "station": "雙連 (R13)",
        "status": "🟢 演算法預估動態推算中",
        "time": now_str
    },
    {
        "id": "TR-R-103",
        "direction": "往 淡水 (R28)",
        "location": "前往 [R23 復興崗] (進度: 80%)",
        "station": "北投 (R22)",
        "status": "🟢 演算法預估動態推算中",
        "time": now_str
    },
    {
        "id": "TR-R-104",
        "direction": "往 象山 (R02)",
        "location": "前往 [R04 信義安和] (進度: 15%)",
        "station": "大安 (R05)",
        "status": "🟢 演算法預估動態推算中",
        "time": now_str
    }
]

print("\033[41m\033[37m\033[1m [DebugLogger] 淡水信義線 (R Line) 即時列車監控終端機日誌測試展示 \033[0m")
print(f"\033[36m🕒 系統時間: {now_str} | 在線列車數: {len(trains)}\033[0m\n")

print(f"{'列車 ID':<10} | {'行駛方向':<15} | {'當前位置與動態':<30} | {'當前車站':<18} | {'資料狀態':<25} | {'時間戳記'}")
print("-" * 115)
for t in trains:
    print(f"{t['id']:<10} | {t['direction']:<15} | {t['location']:<30} | {t['station']:<18} | {t['status']:<25} | {t['time']}")
print("-" * 115)
