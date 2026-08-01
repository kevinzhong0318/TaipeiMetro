# 大台北捷運 & 機場捷運 即時動態地圖 | Greater Taipei & Taoyuan Airport MRT Live Map (Mini Metro Style)

> 一個結合「真實地理地圖 (Leaflet.js + CartoDB)」與極簡「《Mini Metro》幾何美學」的大台北捷運與桃園機場捷運即時地圖單頁應用程式 (Single Page Application)。

![License](https://img.shields.io/badge/License-MIT-emerald.svg)
![Leaflet](https://img.shields.io/badge/Leaflet-v1.9.4-blue.svg)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v3.0-38bdf8.svg)

---

## 📖 專案簡介 (Project Overview)

本專案使用前端原生技術（HTML5, Tailwind CSS, Leaflet.js, Vanilla JS）打造，將台北捷運 (Taipei Metro TRTC) 各主線、支線、**三鶯線 (San-Ying Line LB01~LB12)** 以及 **桃園機場捷運 (Taoyuan Airport MRT)**，依據地理座標精確繪製於開源地圖上。

本系統具備「**日間模式文字高對比度修正 (#0f172a)**」、「**正確三鶯線 12 站 (LB01 頂埔 ➔ LB12 鳳鳴)**」、「**全線營運狀況動態燈號 (🟢 全線正常營運)**」、「**車站頭末班車時間表 (First & Last Train Schedule)**」、「**藍色流線型直達特快車 (定點停靠/跳站不停)**」、「**列車到站 3.5 秒停靠載客動畫 (Dwell Time)**」、「**Zoom >= 14 車站名稱動態懸浮**」與「**GPS 定位**」等核心功能。

全專案整合於單一獨立 `index.html` 檔案中，適合開箱即用與發布於 **GitHub Pages**。

---

## ✨ 核心功能與亮點 (Key Features)

### 1. ☀️ 日間模式文字高對比度修正 (Light Mode Contrast Fix)
- 切換至「日間模式」時，所有地圖懸浮標籤 (`.station-text-label`)、Header 品牌抬頭、Drawer 資訊面板與 Modal 彈窗文字自動轉換為深色/黑灰色 (`#0f172a` / `#1e293b`)，並搭配 `var(--label-shadow)` 純白邊框，確保在淺色 CartoDB Positron 地圖上具備極佳的視覺對比度與無障礙閱讀體驗。

### 2. 🚊 正確載入三鶯線 12 個車站 (San-Ying Line Exact 12 Stations)
- 完整包含三鶯線 (LB/Y 線) 正確的 12 個車站與延伸區間，標註「建設中/試營運」：
  `LB01 頂埔` ➔ `LB02 媽祖田` ➔ `LB03 挖子` ➔ `LB04 橫溪` ➔ `LB05 三峽` ➔ `LB06 國家教育研究院` ➔ `LB07 台北大學` ➔ `LB08 鶯歌車站` ➔ `LB09 陶瓷老街` ➔ `LB10 國華` ➔ `LB11 鶯桃福德` ➔ `LB12 鳳鳴`。

### 3. 🟢 全線營運狀況與 API 連線燈號 (System Operation & API Status)
- Header 面板即時顯示系統營運狀況與 API 串接燈號：
  - **營運狀態列**：`🟢 全線正常營運` / `🟡 局部延誤` / `🔴 系統維護中`
  - **API 連線狀態**：`🟢 已連線至 TDX 交通部 API` / `🟡 模擬數據運行中` / `🔴 API 驗證失敗`

### 4. 🕒 車站首末班車時間表 (First & Last Train Schedule)
- 點擊任何車站時，底層 Drawer 資訊面板除了顯示即時列車到站倒數外，更清楚列出該站往雙向端點站與起點站的 **頭班車時間 (06:00)** 與 **末班車時間 (24:00 / 00:15)**。

### 5. 🚅 桃園機捷藍色直達特快車與 3.5s 停靠機制
- 藍色直達車僅停靠 **A1 台北車站、A3 新北產業園區、A8 長庚醫院、A12 第一航廈、A13 第二航廈** 等大站並原地暫停 3.5 秒；其餘中途站高速過站。

---

## 🏗️ 模組化 JavaScript 架構 (Modular Code Structure)

- **`MapController`**：管理 Leaflet 地圖實例、CartoDB 底圖切換、Zoom 縮放監聽、GPS 定位與圖層清除重載 (`purgeMapLayers`)。
- **`MrtDataService`**：大台北捷運、三鶯線 12 站與桃園機捷路線、車站座標、9 大幾何圖形與直達車停靠大站對應矩陣。
- **`TDXService`**：OAuth 2.0 Access Token 取得、`localStorage` 儲存與 TDX API 位置輪詢。
- **`AnimationEngine`**：高禎率列車動畫循環、藍色直達車跳站邏輯、3.5 秒到站停靠 (Dwell Time) 計時器與清空重載 (`restartEngine`)。
- **`UIController`**：抬頭面板動態更新、頭末班車時間表渲染、設定 Modal 彈窗、圖例 Modal 視窗與 Drawer 資訊面板。

---

## 🌿 Git Branching Workflow 開發流程指引

在開發新功能分支（例如 `feature/sanying-line-schedule`）時，請遵循以下 Git 操作流程：

```bash
# 1. 切換至 main 分支並拉取最新遠端程式碼
git checkout main
git pull origin main

# 2. 建立並切換至新功能分支
git checkout -b feature/sanying-line-schedule

# 3. 進行程式碼開發與測試，確認無誤後 Commit
git status
git add .
git commit -m "feat: fix light mode text contrast, update San-Ying line 12 stations & first/last train schedules"

# 4. 推送功能分支至 GitHub 遠端
git push -u origin feature/sanying-line-schedule

# 5. 切換回 main 分支並進行安全合併 (Merge)
git checkout main
git merge --no-ff feature/sanying-line-schedule -m "merge: feature/sanying-line-schedule into main"

# 6. 將最新 main 分支推送至 GitHub 遠端
git push origin main

# 7. (選用) 刪除已合併的分支
git branch -d feature/sanying-line-schedule
git push origin --delete feature/sanying-line-schedule
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
   git commit -m "feat: release V6 Light Mode Fix & San-Ying Line Schedule SPA"
   git push origin main
   ```
2. 前往 Repository 頁面 -> **Settings** -> **Pages**。
3. 在 **Branch** 選項中選擇 `main` 並按 **Save**。

---

## 📄 授權條款 (License)

This project is licensed under the MIT License.
