# 大台北捷運 & 機場捷運 即時動態地圖 | Greater Taipei & Taoyuan Airport MRT Live Map (Mini Metro Style)

> 一個結合「真實地理地圖 (Leaflet.js + CartoDB)」與極簡「《Mini Metro》幾何美學」的大台北捷運與桃園機場捷運即時地圖 Web 專案。

![License](https://img.shields.io/badge/License-MIT-emerald.svg)
![Leaflet](https://img.shields.io/badge/Leaflet-v1.9.4-blue.svg)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v3.0-38bdf8.svg)

---

## 📖 專案簡介 (Project Overview)

本專案使用前端原生技術（HTML5, Tailwind CSS, Leaflet.js, Vanilla JS）打造，並採用**高維度多檔案模組化架構 (Multi-file Architecture)** 拆分。將台北捷運 (Taipei Metro TRTC) 各主線、支線、**官方最新三鶯線 (San-Ying Line LB01~LB12)** 以及 **桃園機場捷運 (Taoyuan Airport MRT)** 精確繪製於開源地圖上。

本系統具備「**模擬模式自訂時間選擇器 (Time Picker)**」、「**時間線與 1x/2x/5x/10x 列車倍速播放列 (`TimelineController`)**」、「**官方確切三鶯線 12 車站 (LB01 頂埔 ➔ LB12 鶯桃福德)**」、「**模式切換徹底重置與記憶體清理 (`cleanup()`)**」、「**站對站路徑規劃器 (`RoutePlanner` BFS 最短路徑 + 脈衝動態光點導引動畫)**」、「**頭末班車端點站動態顯示 (Dynamic Terminus Names)**」與「**藍色流線型直達特快車 (定點停靠/跳站不停/3.5s 停靠)**」等核心功能。

---

## 📂 多檔案目錄結構 (Project Directory Structure)

```
metro/
├── index.html            # 主頁面結構與 CDN 引入 (Tailwind CSS, Leaflet.js)
├── main.html             # Mirror 備用首頁
├── css/
│   └── style.css         # 主題變數 (Light/Dark High-contrast)、Glassmorphism 面板與 Timeline 樣式
├── js/
│   ├── config.js         # 路線、車站座標、官方精確三鶯線 12 站、9 大幾何圖形與端點站 (MrtDataService)
│   ├── map.js            # Leaflet 地圖初始化、CartoDB 日夜圖層、Zoom 14 站名標籤與 GPS (MapController)
│   ├── tdxApi.js         # TDX OAuth 2.0 認證與 API 即時資料處理 (TDXService)
│   ├── routePlanner.js   # 站對站 BFS 搜尋、轉乘分析、高亮軌道線與平滑沿線移動導引動畫 (RoutePlanner)
│   ├── timelineController.js # 時間線 Slider、自訂時間選擇器與 1x/2x/5x/10x 倍速控制器 (TimelineController)
│   └── app.js            # 列車動畫循環 (AnimationEngine)、模式切換 cleanup() 重置與 UI 事件 (UIController)
└── README.md             # 專案完整說明與 Git 工作流指引
```

---

## ✨ 核心功能與亮點 (Key Features)

### 1. 🕒 模擬模式自訂時間選擇器與 1x/2x/5x/10x 倍速控制 (Timeline & Speed Controller)
- **自訂虛擬時間 (Time Picker / Slider)**：使用者可透過時間選取器或時間軸 Drag 隨意調整系統時間（例如選取 `08:30` 尖峰時段或 `01:30` 深夜收班時間）。
- **倍速播放控制 (1x, 2x, 5x, 10x)**：支援 `1x` 正常速度、`2x` 快進、`5x` 高速與 `10x` 極速，地圖上所有運行的列車將相應加速播放，方便觀看 24 小時全天候列車營運與交會。

### 2. 🚊 官方最新精確三鶯線 12 車站 (San-Ying Line Exact 12 Stations)
- 嚴格按照官方最新發布之 12 個車站名稱與正確地理順序設定：
  1. `LB01 頂埔` (與 BL01 板南線轉乘)
  2. `LB02 媽祖田`
  3. `LB03 長壽山`
  4. `LB04 橫溪`
  5. `LB05 龍埔`
  6. `LB06 三峽`
  7. `LB07 臺北大學`
  8. `LB08 鶯歌車站`
  9. `LB09 陶瓷老街`
  10. `LB10 國華`
  11. `LB11 永吉公園`
  12. `LB12 鶯桃福德`
- 路線套用湖水藍/水藍色 (LB Line)，並標示為試營運/建設中狀態。

### 3. 🧹 模式切換徹底重置 Bug 修正 (`cleanup()`)
- 解決切換 Mock 模式與 TDX API 模式時列車重複繪製或地圖卡死的 Bug。
- 實作完整的 `cleanup()` 機制：切換時徹底終止 `requestAnimationFrame` 動畫循環，清空 Marker 與 Polyline。

### 4. 🧭 捷運站對站路徑規劃與動態平滑光點導引 (Route Planner & Moving Pulse Animation)
- **廣度優先搜尋 (BFS)**：計算最短搭乘時間、總乘車站數與轉乘車站（例如：「在 忠孝復興 轉乘 文湖線」）。
- **光暈軌道與沿線移動光點**：在地圖畫出 `#38bdf8` 脈衝軌道線，並加上**沿著路線平滑移動的光點動畫**。

---

## 🌿 Standard Git Branching Workflow 指引

在開發新功能分支（例如 `feature/timeline-speed-sanying-fix`）時，請遵循以下 Git 操作流程：

```bash
# 1. 切換至 main 分支並拉取最新遠端程式碼
git checkout main
git pull origin main

# 2. 建立並切換至新功能分支
git checkout -b feature/timeline-speed-sanying-fix

# 3. 進行程式碼開發與測試，確認無誤後 Commit
git status
git add .
git commit -m "feat: add timeline speed controller (1x/2x/5x/10x), virtual time picker & official San-Ying line 12 stations update"

# 4. 推送功能分支至 GitHub 遠端
git push -u origin feature/timeline-speed-sanying-fix

# 5. 切換回 main 分支並進行安全合併 (Merge)
git checkout main
git merge --no-ff feature/timeline-speed-sanying-fix -m "merge: feature/timeline-speed-sanying-fix into main"

# 6. 將最新 main 分支推送至 GitHub 遠端
git push origin main

# 7. (選用) 刪除已合併的分支
git branch -d feature/timeline-speed-sanying-fix
git push origin --delete feature/timeline-speed-sanying-fix
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
   git commit -m "feat: release V9 Timeline Speed Controller & Official San-Ying Line SPA"
   git push origin main
   ```
2. 前往 Repository 頁面 -> **Settings** -> **Pages**。
3. 在 **Branch** 選項中選擇 `main` 並按 **Save**。

---

## 📄 授權條款 (License)

This project is licensed under the MIT License.
