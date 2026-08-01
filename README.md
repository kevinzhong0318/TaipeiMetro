# 大台北捷運 & 機場捷運 即時動態地圖 | Greater Taipei & Taoyuan Airport MRT Live Map (Mini Metro Style)

> 一個結合「真實地理地圖 (Leaflet.js + CartoDB)」與極簡「《Mini Metro》幾何美學」的大台北捷運與桃園機場捷運即時地圖單頁應用程式 (Single Page Application)。

![License](https://img.shields.io/badge/License-MIT-emerald.svg)
![Leaflet](https://img.shields.io/badge/Leaflet-v1.9.4-blue.svg)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v3.0-38bdf8.svg)

---

## 📖 專案簡介 (Project Overview)

本專案使用前端原生技術（HTML5, Tailwind CSS, Leaflet.js, Vanilla JS）打造，將台北捷運 (Taipei Metro TRTC) 各主線、支線、**三鶯線 (San-Ying Line LB01~LB12)** 以及 **桃園機場捷運 (Taoyuan Airport MRT)**，依據地理座標精確繪製於開源地圖上。

本系統具備「**頭末班車端點站動態顯示 (Dynamic Terminus Names)**」、「**時間感知夜間營運狀態 (01:00~06:00 🌙 列車收班暫停)**」、「**捷運站對站路徑規劃器 (`RoutePlanner` 圖形 BFS 搜尋 + 光暈高亮畫線 + 轉乘指引)**」、「**基於 TDX API 真實資料驅動列車動畫**」、「**日間模式文字高對比度修正 (#0f172a)**」、「**三鶯線 12 站 (LB01 頂埔 ➔ LB12 鳳鳴)**」、「**藍色流線型直達特快車 (定點停靠/跳站不停/3.5s 停靠)**」與「**GPS 定位**」等核心功能。

全專案整合於單一獨立 `index.html` 檔案中，適合開箱即用與發布於 **GitHub Pages**。

---

## ✨ 核心功能與亮點 (Key Features)

### 1. 🕒 頭末班車方向動態端點站顯示 (Dynamic Terminus Names)
- 點擊任何車站時，底層 Drawer 資訊面板的「首末班車時刻表」**不再顯示無意義的「往東/往西」**，而是**動態代入該路線實際的端點站名稱**。
- 範例：點擊「忠孝復興 (BL15)」，明確顯示：
  - `往 頂埔 方向` (頭班車 06:00 | 末班車 24:00)
  - `往 南港展覽館 方向` (頭班車 06:00 | 末班車 00:15)

### 2. 🌙 時間感知夜間營運狀態 (Real-time Nighttime Sensing)
- 系統自動讀取當前真實系統時間：
  - **非營運時段（01:00 ~ 06:00）**：營運狀態列顯示 `🌙 目前為非營運時間（末班車已收班）`，地圖上列車自動進入收班暫停狀態，避免在半夜顯示動態列車行駛的錯誤畫面。
  - **常態營運時段（06:00 ~ 01:00）**：營運狀態列顯示 `🟢 全線正常營運`。

### 3. 🧭 捷運站對站路徑規劃器 (Origin-Destination Route Finder)
- **圖形搜尋演算法 (`RoutePlanner`)**：建構全路網相鄰節點圖 (Adjacency Graph)，採用廣度優先搜尋 (BFS) 找出起點至終點的最短搭乘與轉乘路徑。
- **光暈高亮畫線 (Glowing Polyline Highlight)**：在地圖上以高亮度天藍色脈衝線條高亮畫出建議搭乘路線。
- **完整轉乘指引**：計算預估車程時間、總乘車站數，並清楚列出轉乘車站（例如：「在 忠孝復興 轉乘 文湖線」）。

### 4. ☀️ 日間模式文字高對比度修正 (Light Mode Contrast Fix)
- 切換至「日間模式」時，所有地圖懸浮標籤 (`.station-text-label`)、Header 品牌抬頭、Drawer 資訊面板與 Modal 彈窗文字自動轉換為深色/黑灰色 (`#0f172a` / `#1e293b`)，並搭配 `var(--label-shadow)` 純白邊框，確保在淺色 CartoDB Positron 地圖上具備極佳的視覺對比度。

### 5. 🚊 正確載入三鶯線 12 個車站 (San-Ying Line Exact 12 Stations)
- 完整包含三鶯線 (LB/Y 線) 正確的 12 個車站與延伸區間，標註「建設中/試營運」：
  `LB01 頂埔` ➔ `LB02 媽祖田` ➔ `LB03 挖子` ➔ `LB04 橫溪` ➔ `LB05 三峽` ➔ `LB06 國家教育研究院` ➔ `LB07 台北大學` ➔ `LB08 鶯歌車站` ➔ `LB09 陶瓷老街` ➔ `LB10 國華` ➔ `LB11 鶯桃福德` ➔ `LB12 鳳鳴`。

---

## 🏗️ 模組化 JavaScript 架構 (Modular Code Structure)

- **`MapController`**：管理 Leaflet 地圖實例、CartoDB 底圖切換、Zoom 縮放監聽、GPS 定位與圖層清除重載 (`purgeMapLayers`)。
- **`RoutePlanner`**：建構全路網圖形 (Adjacency Graph)、搜尋最短站數與轉乘路徑，並在地圖上繪製脈衝光暈高亮軌道線。
- **`MrtDataService`**：大台北捷運、三鶯線 12 站與桃園機捷路線、車站座標、端點站名稱、9 大幾何圖形與直達車停靠大站對應矩陣。
- **`TDXService`**：OAuth 2.0 Access Token 取得、`localStorage` 儲存與 TDX API 位置輪詢。
- **`AnimationEngine`**：高禎率列車動畫循環、夜間收班發車控管、藍色直達車跳站邏輯與 3.5 秒到站停靠 (Dwell Time) 計時器。
- **`UIController`**：抬頭面板動態更新、端點站頭末班車時間表渲染、路徑規劃彈窗、設定 Modal 與 Drawer 資訊面板。

---

## 🌿 Standard Git Branching Workflow 指引

在開發新功能分支（例如 `feature/route-planner-night-schedule`）時，請遵循以下 Git 操作流程：

```bash
# 1. 切換至 main 分支並拉取最新遠端程式碼
git checkout main
git pull origin main

# 2. 建立並切換至新功能分支
git checkout -b feature/route-planner-night-schedule

# 3. 進行程式碼開發與測試，確認無誤後 Commit
git status
git add .
git commit -m "feat: add dynamic terminus names, nighttime operation sensing & route planner with glowing polyline"

# 4. 推送功能分支至 GitHub 遠端
git push -u origin feature/route-planner-night-schedule

# 5. 切換回 main 分支並進行安全合併 (Merge)
git checkout main
git merge --no-ff feature/route-planner-night-schedule -m "merge: feature/route-planner-night-schedule into main"

# 6. 將最新 main 分支推送至 GitHub 遠端
git push origin main

# 7. (選用) 刪除已合併的分支
git branch -d feature/route-planner-night-schedule
git push origin --delete feature/route-planner-night-schedule
```

---

## 🚀 本地執行與 GitHub Pages 發布 (Run & Deploy)

### 本地執行
1. 雙擊開啟 `index.html`，即可在 Chrome / Safari / Edge 瀏覽器中直接運行。
2. 或啟動 Python HTTP 伺服器：
   ```bash
   python3 -m http.server 8000
   ```
   瀏覽 `http://localhost:8000`

### GitHub Pages 免費靜態發布
1. 推送至 GitHub：
   ```bash
   git add .
   git commit -m "feat: release V7 Route Planner & Dynamic Terminus Schedule SPA"
   git push origin main
   ```
2. 前往 Repository 頁面 -> **Settings** -> **Pages**。
3. 在 **Branch** 選項中選擇 `main` 並按 **Save**。

---

## 📄 授權條款 (License)

This project is licensed under the MIT License.
