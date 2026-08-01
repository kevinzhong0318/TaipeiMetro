# 大台北捷運 & 機場捷運 即時動態地圖 | Greater Taipei & Taoyuan Airport MRT Live Map (Mini Metro Style)

> 一個結合「真實地理地圖 (Leaflet.js + CartoDB)」與極簡「《Mini Metro》幾何美學」的大台北捷運與桃園機場捷運即時地圖 Web 專案。

![License](https://img.shields.io/badge/License-MIT-emerald.svg)
![Leaflet](https://img.shields.io/badge/Leaflet-v1.9.4-blue.svg)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v3.0-38bdf8.svg)

---

## 📖 專案簡介 (Project Overview)

本專案使用前端原生技術（HTML5, Tailwind CSS, Leaflet.js, Vanilla JS）打造，並採用**高維度多檔案模組化架構 (Multi-file Architecture)** 拆分。將台北捷運 (Taipei Metro TRTC) 各主線、**中和新蘆線 (含迴龍線與蘆洲線分支 `O_Luzhou`)**、支線、**官方最新三鶯線 (San-Ying Line LB01~LB12)** 以及 **桃園機場捷運 (Taoyuan Airport MRT)** 精確繪製於開源地圖上。

本系統具備「**完全取消日夜自動模式 (純手動 ☀️日間 ↔ 🌙夜間 點擊切換)**」、「**桃園機捷直達特快車經典紫色塗裝 (`#84005C`)**」、「**最高 500 倍超極速播放控制 (`1x`, `5x`, `10x`, `50x`, `100x`, `500x`)**」、「**模擬列車營運時間規範為 06:00 ~ 24:00**」、「**機捷直達特快車於 A13 機場第二航廈迴轉**」、「**模擬模式自訂時間選擇器 (Time Picker)**」、「**官方確切三鶯線 12 車站 (LB01 頂埔 ➔ LB12 鶯桃福德)**」、「**模式切換徹底重置與記憶體清理 (`cleanup()`)**」、「**站對站路徑規劃器 (`RoutePlanner` BFS 最短路徑 + 脈衝動態光點導引動畫)**」等核心功能。

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
│   ├── tdxApi.js         # TDX OAuth 2.0 認證與 API 即時資料處理 (TDXService)
│   ├── routePlanner.js   # 站對站 BFS 搜尋、轉乘分析、高亮軌道線與平滑沿線移動導引動畫 (RoutePlanner)
│   ├── timelineController.js # 時間軸 Slider / Time Input 與 500x 倍速控制器 (TimelineController)
│   └── app.js            # 紫色直達車動畫 06:00~24:00 發車循環 (AnimationEngine) 與 UIController 控制器 (UIController)
└── README.md             # 專案完整說明與 Git 工作流指引
```

---

## ✨ 核心功能與亮點 (Key Features & Highlights)

### 1. ☀️/🌙 獨立直覺手動日夜切換 (Direct Manual Light/Dark Mode)
- 應使用者需求完全取消日夜自動模式。
- 點擊右上角 `☀️ 日間模式` / `🌙 夜間模式` 按鈕，即可一鍵流暢切換地圖底圖 (CARTO Voyager / CARTO Dark Matter) 與高對比 UI。
- 拖曳時間軸時主題完全保持不變，給予使用者全權主導權。

---

## 🌿 Standard Git Branching Workflow 指引

在開發新功能分支（例如 `feature/remove-auto-theme-mode-v22`）時，請遵循以下 Git 操作流程：

```bash
# 1. 切換至 main 分支並拉取最新遠端程式碼
git checkout main
git pull origin main

# 2. 建立並切換至新功能分支
git checkout -b feature/remove-auto-theme-mode-v22

# 3. 進行程式碼開發與測試，確認無誤後 Commit
git status
git add .
git commit -m "refactor: remove auto theme sensing system per user request"

# 4. 推送功能分支至 GitHub 遠端
git push -u origin feature/remove-auto-theme-mode-v22

# 5. 切換回 main 分支並進行安全合併 (Merge)
git checkout main
git merge --no-ff feature/remove-auto-theme-mode-v22 -m "merge: feature/remove-auto-theme-mode-v22 into main"

# 6. 將最新 main 分支推送至 GitHub 遠端
git push origin main

# 7. (選用) 刪除已合併的分支
git branch -d feature/remove-auto-theme-mode-v22
git push origin --delete feature/remove-auto-theme-mode-v22
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
   git commit -m "feat: release V22 Manual Day/Night Mode SPA"
   git push origin main
   ```
2. 前往 Repository 頁面 -> **Settings** -> **Pages**。
3. 在 **Branch** 選項中選擇 `main` 並按 **Save**。

---

## 📄 授權條款 (License)

This project is licensed under the MIT License.
