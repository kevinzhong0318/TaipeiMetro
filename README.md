# 大台北捷運 & 機場捷運 即時動態地圖 | Greater Taipei & Taoyuan Airport MRT Live Map (Mini Metro Style)

> 一個結合「真實地理地圖 (Leaflet.js + CartoDB)」與極簡「《Mini Metro》幾何美學」的大台北捷運與桃園機場捷運即時地圖 Web 專案。

![License](https://img.shields.io/badge/License-MIT-emerald.svg)
![Leaflet](https://img.shields.io/badge/Leaflet-v1.9.4-blue.svg)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v3.0-38bdf8.svg)

---

## 📖 專案簡介 (Project Overview)

本專案使用前端原生技術（HTML5, Tailwind CSS, Leaflet.js, Vanilla JS）打造，並採用**高維度多檔案模組化架構 (Multi-file Architecture)** 拆分。將台北捷運 (Taipei Metro TRTC) 各主線、**中和新蘆線 (含迴龍線與蘆洲線分支 `O_Luzhou`)**、支線、**官方最新三鶯線 (San-Ying Line LB01~LB12)** 以及 **桃園機場捷運 (Taoyuan Airport MRT)** 精確繪製於開源地圖上。

本系統具備「**雙圖層預載 (Dual TileLayers 0ms 瞬間切換日夜模式)**」、「**右上角主題按鈕三階循環 (`🌗自動` ➔ `☀️日間` ➔ `🌙夜間`)**」、「**桃園機捷直達特快車經典紫色塗裝 (`#84005C`)**」、「**最高 500 倍超極速播放控制 (`1x`, `5x`, `10x`, `50x`, `100x`, `500x`)**」、「**模擬列車營運時間規範為 06:00 ~ 24:00**」、「**機捷直達特快車於 A13 機場第二航廈迴轉**」、「**模擬模式自訂時間選擇器 (Time Picker)**」、「**官方確切三鶯線 12 車站 (LB01 頂埔 ➔ LB12 鶯桃福德)**」、「**模式切換徹底重置與記憶體清理 (`cleanup()`)**」、「**站對站路徑規劃器 (`RoutePlanner` BFS 最短路徑 + 脈衝動態光點導引動畫)**」等核心功能。

---

## 📂 多檔案目錄結構 (Project Directory Structure)

```
metro/
├── index.html            # 主頁面結構與 CDN 引入 (Tailwind CSS, Leaflet.js)
├── main.html             # Mirror 備用首頁
├── css/
│   └── style.css         # 主題變數 (Light/Dark High-contrast)、Glassmorphism 面板與 Timeline 樣式
├── js/
│   ├── config.js         # 路線數據（機捷特快車紫色 #84005C、橘線蘆洲支線 O_Luzhou）、車站座標、機捷 A13 迴轉、三鶯線 12 站 (MrtDataService)
│   ├── map.js            # Leaflet 地圖、CartoDB 雙圖層預載 (0ms極速瞬間切換)、Zoom 14 站名與 GPS (MapController)
│   ├── tdxApi.js         # TDX OAuth 2.0 認證與 API 即時資料處理 (TDXService)
│   ├── routePlanner.js   # 站對站 BFS 搜尋、轉乘分析、高亮軌道線與平滑沿線移動導引動畫 (RoutePlanner)
│   ├── timelineController.js # 時間軸 Slider (連動台北天文日出日落 0ms 即刻切換) 與 500x 倍速控制器 (TimelineController)
│   └── app.js            # 紫色直達車動畫 06:00~24:00 發車循環 (AnimationEngine) 與 UIController 自動/手動設定 (UIController)
└── README.md             # 專案完整說明與 Git 工作流指引
```

---

## ✨ 核心功能與亮點 (Key Features & Highlights)

### 1. ⚡ 雙圖層預載技術：0 毫秒極速瞬間切換日夜模式 (Instant Dual TileLayers 0ms Swap)
- 地圖初始化時同時預加載 `darkTileLayer` (Dark Matter) 與 `lightTileLayer` (Voyager)。
- 拖曳時間軸滑塊過日出 (`05:20`) 或日落 (`18:28`) 時，直接調控圖層 Opacity (1/0)，達到 **0 毫秒極速瞬間無縫切換**，解決傳統重新載入 HTTP 圖磚造成的數百毫秒延遲。

### 2. 🔄 右上角按鈕三階循環切換 (3-Stage Header Theme Toggle)
- 右上角主題按鈕支援 **三階順暢循環**：
  `🌗 日夜自動 (日出日落感應)` ➔ `☀️ 日間模式 (手動鎖定)` ➔ `🌙 夜間模式 (手動鎖定)` ➔ 循環。
- 隨時點擊按鈕即可輕鬆切回自動感應模式。

### 3. 💜 桃園機捷特快車經典紫色塗裝 (Airport Express Purple Color)
- `MrtDataService.lines.A_Express` 路線與列車 SVG 圖示全數採用紫色 (`#84005C`) 塗裝。

---

## 🌿 Standard Git Branching Workflow 指引

在開發新功能分支（例如 `feature/instant-0ms-theme-swap`）時，請遵循以下 Git 操作流程：

```bash
# 1. 切換至 main 分支並拉取最新遠端程式碼
git checkout main
git pull origin main

# 2. 建立並切換至新功能分支
git checkout -b feature/instant-0ms-theme-swap

# 3. 進行程式碼開發與測試，確認無誤後 Commit
git status
git add .
git commit -m "feat: implement instant 0ms dual tilelayers theme swapping & 3-stage header toggle button"

# 4. 推送功能分支至 GitHub 遠端
git push -u origin feature/instant-0ms-theme-swap

# 5. 切換回 main 分支並進行安全合併 (Merge)
git checkout main
git merge --no-ff feature/instant-0ms-theme-swap -m "merge: feature/instant-0ms-theme-swap into main"

# 6. 將最新 main 分支推送至 GitHub 遠端
git push origin main

# 7. (選用) 刪除已合併的分支
git branch -d feature/instant-0ms-theme-swap
git push origin --delete feature/instant-0ms-theme-swap
```

---

## 🚀 本地執行與 GitHub Pages 發布 (Run & Deploy)

### 本地執行
1. 直接雙擊開啟 `index.html`，即可在 Chrome / Safari / Edge 瀏覽器中運行。
2. 或啟動 Python 本地伺服器：
   ```bash
   python3 -m http.server 8000
   ```
   瀏覽 `http://localhost:8000`

### GitHub Pages 免費靜態發布
1. 推送至 GitHub：
   ```bash
   git add .
   git commit -m "feat: release V18 Instant 0ms Theme Swap SPA"
   git push origin main
   ```
2. 前往 Repository 頁面 -> **Settings** -> **Pages**。
3. 在 **Branch** 選項中選擇 `main` 並按 **Save**。

---

## 📄 授權條款 (License)

This project is licensed under the MIT License.
