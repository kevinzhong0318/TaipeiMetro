# 大台北捷運 & 機場捷運 即時動態地圖 | Greater Taipei & Taoyuan Airport MRT Live Map (Mini Metro Style)

> 一個結合「真實地理地圖 (Leaflet.js + CartoDB)」與極簡「《Mini Metro》幾何美學」的大台北捷運與桃園機場捷運即時地圖單頁應用程式 (Single Page Application)。

![License](https://img.shields.io/badge/License-MIT-emerald.svg)
![Leaflet](https://img.shields.io/badge/Leaflet-v1.9.4-blue.svg)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v3.0-38bdf8.svg)

---

## 📖 專案簡介 (Project Overview)

本專案使用前端原生技術（HTML5, Tailwind CSS, Leaflet.js, Vanilla JS）打造，將台北捷運 (Taipei Metro TRTC) 各主線、支線、三鶯線以及 **桃園機場捷運 (Taoyuan Airport MRT)**，依據地理座標精確繪製於開源地圖上。

本系統具備「**藍色流線型直達特快車 (定點停靠/過站不停)**」、「**列車到站 3.5 秒停靠載客動畫 (Dwell Time)**」、「**交通部 TDX API 實時串接選單 (OAuth 2.0 & localStorage)**」、「**Zoom >= 14 車站名稱動態懸浮**」與「**GPS 定位**」等核心功能。

全專案整合於單一獨立 `index.html` 檔案中，適合開箱即用與發布於 **GitHub Pages**。

---

## ✨ 核心功能與亮點 (Key Features)

### 1. 🚅 桃園機捷藍色直達特快車與停靠過站規則 (Blue Express Train & Skipping Rules)
- **藍色流線型直達車 (Blue Express `#0055AA`)**：
  - **外觀識別**：藍色流線型新幹線 SVG 車頭，搭配金黃色邊框與「直達」標誌。
  - **跳站不停靠**：直達車僅停靠 **A1 台北車站、A3 新北產業園區、A8 長庚醫院、A12 機場第一航廈、A13 機場第二航廈** 等大站。中途普通站（如 A2, A4, A5, A6, A7, A9 等）高速通過不安停。
- **紫色普通車 (Purple Commuter `#84005C`)**：採用標準幾何膠囊圖示，每站皆停靠。

### 2. ⏱️ 列車到站停靠 3.5 秒載客動畫 (Station Dwell Time Animation)
- 當列車行駛至「需停靠的車站」時，動畫引擎會暫停列車移動 3.5 秒，模擬乘客上下車。
- 停靠期間，列車卡片與 Drawer 面板標示 **「🟢 車站停靠載客中 (Dwell)」** 動態倒數標籤，停靠結束後繼續沿軌道平滑前行。

### 3. ⚙️ 實時 TDX API 串接設定選單 (TDX Real-time API Settings)
- Header 新增 **「⚙️ 設定 / Settings」** 按鈕開啟彈窗選單。
- 支援雙模式切換：
  - **模擬動態模式 (Mock Mode)**：預設開啟，高禎率動畫沿軌道平滑行駛與 3.5 秒停靠。
  - **真實 TDX API 模式 (TDX Real-time Mode)**：提供 Client ID & Client Secret 輸入欄位（持久化儲存於 `localStorage`），並透過 OAuth 2.0 (`https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token`) 自動取得 Access Token 串接交通部 TRTC / TYMC 即時位置。

### 4. 🔤 站名縮放動態顯示 (Dynamic Station Name on Zoom)
- **Zoom Level >= 14**：放大地圖至層級 14 以上時，自動在地圖上懸浮顯示中英文站名標籤，且樣式隨日夜模式動態轉化。
- **Zoom Level < 14**：縮小層級時自動隱藏標籤。

### 5. 📍 使用者 GPS 定位功能 (User Geolocation)
- 提供 **「定位我 / My Location」** 按鈕，結合 HTML5 Geolocation API 在地圖上標示**藍色脈衝定位點**與**精度範圍圓圈**，並平滑飛往 (FlyTo) 當前位置。

### 6. 📐 精緻 18px Mini Metro 車站幾何圖形 (9 大特色)
- 圓形 (Circle)、正方形 (Square)、三角形 (Triangle)、十字形 (Cross)、星形 (Star)、五角形 (Pentagon)、菱形 (Diamond)、體育館形 (Stadium)、倒鑽石形 (Inverted Diamond)。

---

## 🏗️ 模組化 JavaScript 架構 (Modular Code Structure)

- **`MapController`**：管理 Leaflet 地圖實例、CartoDB 底圖切換、Zoom 縮放監聽與 GPS 定位邏輯。
- **`MrtDataService`**：大台北捷運與桃園機捷路線、車站座標、9 大幾何圖形與直達車停靠大站對應矩陣。
- **`TDXService`**：OAuth 2.0 Access Token 取得、`localStorage` 儲存與 TDX API 位置輪詢。
- **`AnimationEngine`**：高禎率列車動畫循環、藍色直達車跳站邏輯與 3.5 秒到站停靠 (Dwell Time) 計時器。
- **`UIController`**：設定 Modal 彈窗、圖例 Modal 視窗、路線篩選選單與 Drawer 資訊面板。

---

## 🌿 Git Branching Workflow 開發流程指引

在開發新功能分支（例如 `feature/express-train-tdx`）時，請遵循以下 Git 操作流程：

```bash
# 1. 切換至 main 分支並拉取最新遠端程式碼
git checkout main
git pull origin main

# 2. 建立並切換至新功能分支
git checkout -b feature/express-train-tdx

# 3. 進行程式碼開發、測試確認無誤後 Commit
git status
git add .
git commit -m "feat: add blue express train, station dwell animation & TDX settings modal"

# 4. 推送功能分支至 GitHub 遠端
git push -u origin feature/express-train-tdx

# 5. 切換回 main 分支並進行安全合併 (Merge)
git checkout main
git merge --no-ff feature/express-train-tdx -m "merge: feature/express-train-tdx into main"

# 6. 將最新 main 分支推送至 GitHub 遠端
git push origin main

# 7. (選用) 刪除已合併的分支
git branch -d feature/express-train-tdx
git push origin --delete feature/express-train-tdx
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
   git commit -m "feat: release V4 Express Train & TDX API SPA"
   git push origin main
   ```
2. 前往 Repository 頁面 -> **Settings** -> **Pages**。
3. 在 **Branch** 選項中選擇 `main` 並按 **Save**。

---

## 📄 授權條款 (License)

This project is licensed under the MIT License.
