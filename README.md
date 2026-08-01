# 大台北捷運 & 機場捷運 即時動態地圖 | Greater Taipei & Taoyuan Airport MRT Live Map (Mini Metro Style)

> 一個結合「真實地理地圖 (Leaflet.js + CartoDB)」與極簡「《Mini Metro》幾何美學」的大台北捷運與桃園機場捷運即時地圖 Web 專案。

![License](https://img.shields.io/badge/License-MIT-emerald.svg)
![Leaflet](https://img.shields.io/badge/Leaflet-v1.9.4-blue.svg)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v3.0-38bdf8.svg)

---

## 📖 專案簡介 (Project Overview)

本專案使用前端原生技術（HTML5, Tailwind CSS, Leaflet.js, Vanilla JS）打造，並採用**高維度多檔案模組化架構 (Multi-file Architecture)** 拆分。將台北捷運 (Taipei Metro TRTC) 各主線、**中和新蘆線 (含迴龍線與蘆洲線分支 `O_Luzhou`)**、支線、**官方最新三鶯線 (San-Ying Line LB01~LB12)** 以及 **桃園機場捷運 (Taoyuan Airport MRT)** 精確繪製於開源地圖上。

本系統具備「**修復橘線大橋頭至蘆洲支線 (`O_Luzhou`) 軌道線與列車運行**」、「**機捷藍色直達特快車於 A13 機場第二航廈迴轉**」、「**最高 50 倍極速播放控制 (`1x`, `2x`, `5x`, `10x`, `25x`, `50x`)**」、「**日夜模式自動時間感應 vs 手動鎖定切換**」、「**模擬模式自訂時間選擇器 (Time Picker)**」、「**官方確切三鶯線 12 車站 (LB01 頂埔 ➔ LB12 鶯桃福德)**」、「**模式切換徹底重置與記憶體清理 (`cleanup()`)**」、「**站對站路徑規劃器 (`RoutePlanner` BFS 最短路徑 + 脈衝動態光點導引動畫)**」等核心功能。

---

## 📂 多檔案目錄結構 (Project Directory Structure)

```
metro/
├── index.html            # 主頁面結構與 CDN 引入 (Tailwind CSS, Leaflet.js)
├── main.html             # Mirror 備用首頁
├── css/
│   └── style.css         # 主題變數 (Light/Dark High-contrast)、Glassmorphism 面板與 Timeline 樣式
├── js/
│   ├── config.js         # 路線數據（含橘線蘆洲支線 O_Luzhou）、車站座標、機捷 A13 迴轉、三鶯線 12 站 (MrtDataService)
│   ├── map.js            # Leaflet 地圖初始化、CartoDB 日夜圖層 (Auto/Manual)、Zoom 14 站名與 GPS (MapController)
│   ├── tdxApi.js         # TDX OAuth 2.0 認證與 API 即時資料處理 (TDXService)
│   ├── routePlanner.js   # 站對站 BFS 搜尋、轉乘分析、高亮軌道線與平滑沿線移動導引動畫 (RoutePlanner)
│   ├── timelineController.js # 時間線 Slider、自訂時間選擇器與 1x/2x/5x/10x/25x/50x 倍速控制器 (TimelineController)
│   └── app.js            # 列車動畫倍速循環 (AnimationEngine) 與 cleanup() 重置 (UIController)
└── README.md             # 專案完整說明與 Git 工作流指引
```

---

## ✨ 核心功能與修復亮點 (Key Features & Fixes)

### 1. 🍊 橘線大橋頭至蘆洲支線軌道與列車發車修復 (Orange Line Luzhou Branch Fix)
- 補齊 `MrtDataService.lines.O_Luzhou` 定義，正確在地圖上繪製 `O12 大橋頭` ➔ `O50 三重國小` ➔ `O51 三和國中` ➔ `O52 徐匯中學` ➔ `O53 三民高中` ➔ `O54 蘆洲` 之橘色軌道線。
- 發車引擎 `AnimationEngine` 納入蘆洲線營運列車，讓橘線雙分叉（迴龍與蘆洲）均有即時列車流暢行駛。

### 2. ⚡ 機捷藍色直達特快車於 A13 第二航廈迴轉 (Express Train Turnaround at A13)
- 藍色流線型特快車路線序列設定為 `A01 台北車站` ↔ `A13 機場第二航廈`。

### 3. 🚀 時間倍率最高開放至 50 倍極速 (Up to 50x Speed Control)
- 倍速控制器支援 **1x**, **2x**, **5x**, **10x**, **25x**, **50x** 快速觀看全天候列車營運與交會流向。

---

## 🌿 Standard Git Branching Workflow 指引

在開發新功能分支（例如 `feature/fix-luzhou-branch`）時，請遵循以下 Git 操作流程：

```bash
# 1. 切換至 main 分支並拉取最新遠端程式碼
git checkout main
git pull origin main

# 2. 建立並切換至新功能分支
git checkout -b feature/fix-luzhou-branch

# 3. 進行程式碼開發與測試，確認無誤後 Commit
git status
git add .
git commit -m "fix: resolve Orange Line Luzhou branch (O12 to O54) polyline rendering & train spawning issue"

# 4. 推送功能分支至 GitHub 遠端
git push -u origin feature/fix-luzhou-branch

# 5. 切換回 main 分支並進行安全合併 (Merge)
git checkout main
git merge --no-ff feature/fix-luzhou-branch -m "merge: feature/fix-luzhou-branch into main"

# 6. 將最新 main 分支推送至 GitHub 遠端
git push origin main

# 7. (選用) 刪除已合併的分支
git branch -d feature/fix-luzhou-branch
git push origin --delete feature/fix-luzhou-branch
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
   git commit -m "feat: release V12 Luzhou Branch Fix SPA"
   git push origin main
   ```
2. 前往 Repository 頁面 -> **Settings** -> **Pages**。
3. 在 **Branch** 選項中選擇 `main` 並按 **Save**。

---

## 📄 授權條款 (License)

This project is licensed under the MIT License.
