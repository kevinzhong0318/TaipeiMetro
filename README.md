# 大台北捷運 & 機場捷運 即時動態地圖 | Greater Taipei & Taoyuan Airport MRT Live Map (Mini Metro Style)

> 一個結合「真實地理地圖 (Leaflet.js + CartoDB)」、「交通部 TDX API OAuth 2.0 即時串接」、「API 數據異常自動檢測與動態模擬備援機制 (Anomaly Fallback)」、「淡水信義線 (R Line) 列車即時 Console 除錯日誌器 (`TamsuiXinyiDebugLogger`)」，以及極簡「《Mini Metro》幾何美學」的大台北捷運與桃園機場捷運即時 Web 專案。

![License](https://img.shields.io/badge/License-MIT-emerald.svg)
![Leaflet](https://img.shields.io/badge/Leaflet-v1.9.4-blue.svg)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v3.0-38bdf8.svg)
![TDX API](https://img.shields.io/badge/TDX_API-v2.0-84005C.svg)

---

## 📖 專案簡介 (Project Overview)

本專案使用前端原生技術（HTML5, Tailwind CSS, Leaflet.js, Vanilla JS）打造，並採用**高維度多檔案模組化架構 (Multi-file Architecture)** 拆分。將台北捷運 (Taipei Metro TRTC) 各主線、**中和新蘆線 (含迴龍線與蘆洲線分支 `O_Luzhou`)**、支線、**官方最新三鶯線 (San-Ying Line LB01~LB12)** 以及 **桃園機場捷運 (Taoyuan Airport MRT)** 精確繪製於開源地圖上。

本系統具備「**淡水信義線 (R Line) DevTools/終端機列車即時 Console 除錯日誌器**」、「**交通部 TDX OAuth 2.0 API 串接**」、「**API 數據異常偵測與列車預估行駛動畫無縫接管 (列車永不卡死/消失)**」、「**純手動 ☀️日間 ↔ 🌙夜間 地圖底圖切換**」、「**桃園機捷直達特快車經典紫色塗裝 (`#84005C`) 於 A13 迴轉**」、「**最高 500 倍超極速播放控制 (`1x`, `5x`, `10x`, `50x`, `100x`, `500x`)**」、「**模擬列車營運時間規範為 06:00 ~ 24:00**」、「**模擬模式自訂時間選擇器 (Time Picker)**」、「**官方確切三鶯線 12 車站 (LB01 頂埔 ➔ LB12 鶯桃福德)**」、「**模式切換徹底重置與記憶體清理 (`cleanup()`)**」、「**站對站路徑規劃器 (`RoutePlanner` BFS 最短路徑 + 脈衝動態光點導引動畫)**」等核心功能。

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
│   ├── map.js            # Leaflet 地圖、CARTO 底圖 (☀️日間 Voyager / 🌙夜間 Dark Matter 切換)、Zoom 14 站名與 GPS (MapController)
│   ├── tdxApi.js         # TDX OAuth 2.0 認證、LiveBoard 輪詢與 API 數據異常檢測/備援判定 (TDXService)
│   ├── routePlanner.js   # 站對站 BFS 搜尋、轉乘分析、高亮軌道線與平滑沿線移動導引動畫 (RoutePlanner)
│   ├── timelineController.js # 時間軸 Slider / Time Input 與 500x 倍速控制器 (TimelineController)
│   ├── debugLogger.js    # 淡水信義線 (R Line) 列車即時 Console 除錯日誌器 (TamsuiXinyiDebugLogger)
│   └── app.js            # 紫色直達車動畫 06:00~24:00 發車循環、API 異常自動接管備援 (AnimationEngine) 與 UIController (UIController)
└── README.md             # 專案完整說明與 Git 工作流指引
```

---

## ✨ 核心功能與亮點 (Key Features & Highlights)

### 1. 🖥️ 淡水信義線 (R Line) 終端機即時除錯輸出 (`js/debugLogger.js`)
- **專屬監控機制 (`TamsuiXinyiDebugLogger`)**：開啟瀏覽器 DevTools (F12 ➔ Console) 即每 5 秒自動印出最新列車狀態快照。
- **格式化 Console 表格**：
  - **列車 ID**：`TR-R-101`
  - **行駛方向**：`往 淡水 (R28)` / `往 象山 (R02)`
  - **當前位置與動態**：`停靠於 [R10 台北車站]` / `前往 [R11 中山] (進度: 45%)`
  - **資料狀態與時間**：`10:00:05 | TDX API 實時數據` 或 `演算法預估推算中`

### 2. 🌐 交通部 TDX API 完整串接與 OAuth 2.0 驗證
- **OAuth 2.0 認證**：支援在前端設定 Modal 輸入 Client ID 與 Client Secret，發送 POST 請求至 TDX 驗證伺服器取得 Bearer Access Token。
- **LiveBoard API**：即時輪詢 TRTC (台北捷運) 與 TYMC (桃園機捷) 之 `/Rail/Metro/LiveBoard` 資料。

### 3. 🛡️ API 資料異常判定與動態模擬無縫接管 (Anomaly Detection & Fallback)
- **異常判定機制**：
  - 網路連線失敗或 HTTP 非 200 回應。
  - API 回傳陣列為空值。
  - 必要數據欄位缺失（如 `LineID`、`StationID`）。
  - 連續 3 次輪詢資料時間戳與列車位置停滯不前 (Stagnant Data)。
- **動態備援接管**：
  - 當檢測到 API 異常時，系統**絕不讓畫面上的列車卡死或消失**；而是自動切換至動態預估模擬模式 (`AnimationEngine`)，依據系統時間與預設班表順暢推算列車位置並補全動畫。
- **視覺警示標籤**：
  - 狀態列提示：`<span class="text-rose-300">⚠️ 部分路線 API 數據異常，已啟動預估動態模擬</span>`。

---

## 🌿 Standard Git Branching Workflow 指引

在開發新功能分支（例如 `feature/tamsui-xinyi-debug-logger`）時，請遵循以下 Git 操作流程：

```bash
# 1. 切換至 main 主線分支並拉取最新遠端程式碼
git checkout main
git pull origin main

# 2. 建立並切換至新功能開發分支
git checkout -b feature/tamsui-xinyi-debug-logger

# 3. 進行程式碼開發與測試，確認無誤後提交 Commit
git status
git add .
git commit -m "feat: add Tamsui-Xinyi Line (R-Line) live console debug logger module"

# 4. 推送功能分支至 GitHub 遠端
git push -u origin feature/tamsui-xinyi-debug-logger

# 5. 切換回 main 主線分支並進行安全合併 (Merge)
git checkout main
git merge --no-ff feature/tamsui-xinyi-debug-logger -m "merge: feature/tamsui-xinyi-debug-logger into main"

# 6. 將最新 main 主線分支推送至 GitHub 遠端
git push origin main

# 7. (選用) 刪除已合併的功能分支
git branch -d feature/tamsui-xinyi-debug-logger
git push origin --delete feature/tamsui-xinyi-debug-logger
```

---

## 🚀 本地執行與 GitHub Pages 發布 (Run & Deploy)

### 本地執行
1. 直接雙擊開啟 `index.html`，即可在 Chrome / Safari / Edge 瀏覽器中運行。
2. 開啟瀏覽器 DevTools (按 F12 鍵或 `Cmd+Option+I`)，切換至 **Console** 頁籤觀看淡水信義線即時列車資訊表格。
3. 或啟動 Python 本地伺服器：
   ```bash
   python3 -m http.server 8000
   ```
   瀏覽 `http://localhost:8000`

### GitHub Pages 免費靜態發布
1. 推送至 GitHub：
   ```bash
   git add .
   git commit -m "feat: release Tamsui-Xinyi Line Console Debug Logger & TDX API SPA"
   git push origin main
   ```
2. 前往 Repository 頁面 -> **Settings** -> **Pages**。
3. 在 **Branch** 選項中選擇 `main` 並按 **Save**。

---

## 📄 授權條款 (License)

This project is licensed under the MIT License.
