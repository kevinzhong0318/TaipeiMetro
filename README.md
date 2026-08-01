# 大台北捷運 & 機場捷運 即時動態地圖 | Greater Taipei & Taoyuan Airport MRT Live Map (Mini Metro Style)

> 一個結合「真實地理地圖 (Leaflet.js + CartoDB)」與極簡「《Mini Metro》幾何美學」的大台北捷運與桃園機場捷運即時地圖單頁應用程式 (Single Page Application)。

![License](https://img.shields.io/badge/License-MIT-emerald.svg)
![Leaflet](https://img.shields.io/badge/Leaflet-v1.9.4-blue.svg)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v3.0-38bdf8.svg)

---

## 📖 專案簡介 (Project Overview)

本專案使用前端原生技術（HTML5, Tailwind CSS, Leaflet.js, Vanilla JS）打造，將台北捷運 (Taipei Metro TRTC) 各主線、支線、三鶯線以及 **桃園機場捷運 (Taoyuan Airport MRT)**，依據地理座標精確繪製於開源地圖上。

車站依據周邊地標特色劃分為 **9 大 Mini Metro 幾何視覺圖形**，並結合「**Zoom >= 14 車站名稱動態懸浮**」、「**瀏覽器 GPS 即時定位**」以及「**桃園機捷直達特快車 (流線尖頭 SVG 車廂)**」動態運轉。全程式碼採用命名清晰的模組化 JavaScript 架構 (`MapController`, `MrtDataService`, `AnimationEngine`, `UIController`) 撰寫。

全專案整合於單一獨立 `index.html` 檔案中，適合開箱即用與發布於 **GitHub Pages**。

---

## ✨ 核心功能與亮點 (Key Features)

### 1. 🔤 站名縮放動態顯示 (Dynamic Station Name on Zoom)
- **視覺簡潔化**：地圖預設縮小狀態下隱藏站名標籤，避免線條擁擠混亂。
- **Zoom Level >= 14**：放大地圖至層級 14 以上時，自動在地圖上懸浮顯示中英文站名標籤，且樣式隨日夜模式動態轉化。
- **Zoom Level < 14**：縮小層級時再度自動隱藏標籤。

### 2. 📍 使用者 GPS 定位功能 (User Geolocation)
- Header 控制列提供 **「定位我 / My Location」** 按鈕。
- 結合 HTML5 Geolocation API 取得當前 GPS 座標，在地圖上標示**藍色脈衝定位點**與**精度範圍圓圈**。
- 地圖中心會平滑飛往 (FlyTo) 定位點並設定適當縮放。

### 3. 🚅 桃園機場捷運與直達特快車 (Taoyuan Airport MRT & Bullet Express)
- **紫線 (A Line)**：收錄 A1 台北車站、A2 三重、A3 新北產業園區、A8 長庚醫院、A12 第一航廈、A13 第二航廈、A18 高鐵桃園站、A22 老街溪等車站。
- **直達特快車與普通車雙軌運轉**：
  - **普通車**：採用標準幾何膠囊列車圖示沿線行駛。
  - **直達特快車**：採用特殊**流線型尖頭新幹線/高速列車頭 SVG 車廂**與「直達」標誌，顯眼易區分。

### 4. 🌙 日間 / 夜間模式切換 (Day / Dark Mode)
- 地圖底圖使用 CartoDB 開源底圖：
  - 日間模式：`CartoDB Positron`
  - 夜間模式：`CartoDB Dark Matter`
- UI 面板、站名標籤與 SVG 圖形邊框動態隨主題響應。

### 5. 📐 精緻 18px Mini Metro 車站幾何圖形
- **圓形 (Circle)**：住宅區（古亭、江子翠、木柵）
- **正方形 (Square)**：主要轉乘/鐵路大站（台北車站、板橋、南港）
- **三角形 (Triangle)**：商圈/購物中心（西門、中山、忠孝復興、林口 Outlet）
- **十字形 (Cross)**：醫院與醫療園區（台大醫院、石牌、長庚醫院 A8）
- **星形 (Star)**：景點/觀光區（淡水、動物園、台北101/世貿）
- **五角形 (Pentagon)**：國際機場專用（松山機場 BR12、機捷航廈 A12/A13）
- **菱形 (Diamond)**：公園/綠地風景區（大安森林公園、象山、老街溪 A22）
- **橢圓形/體育館形 (Stadium)**：大學文教區 (公館、輔大) 與體育園區 (小巨蛋、機捷體大 A7)
- **倒鑽石形 (Inverted Diamond)**：金融/商業園區（南京復興、松江南京）

---

## 🏗️ 模組化 JavaScript 架構 (Modular Code Structure)

本專案採用結構化的 JavaScript 模組設計：
- **`MapController`**：管理 Leaflet 地圖實例、CartoDB 底圖切換、Zoom 縮放監聽與 GPS 定位邏輯。
- **`MrtDataService`**：大台北捷運與桃園機捷路線、車站座標與 9 大幾何圖形資料矩陣。
- **`AnimationEngine`**：高禎率列車動畫循環、向量角度旋轉與直達車 (Bullet Express) SVG 渲染。
- **`UIController`**：圖例 Modal 視窗、路線篩選選單、車站與列車資訊抽屜 Drawer 面板。
- **`TDX_API_STUB`**：交通部 TDX 運輸資料流通服務 OAuth2 與即時位置 API 說明。

---

## 🌿 Git Branching Workflow 開發流程指引

在開發新功能時，建議遵循標準 Git 分支工作流 (Git Branching Workflow)：

```bash
# 1. 確保位於 main 分支並同步最新程式碼
git checkout main
git pull origin main

# 2. 建立並切換至新功能分支 (例如：feature/airport-mrt-express)
git checkout -b feature/airport-mrt-express

# 3. 進行程式碼修改與功能測試

# 4. 檢視修改狀態並 Commit 變更
git status
git add .
git commit -m "feat: add Taoyuan Airport MRT line, bullet express train & zoom labels"

# 5. 上傳新功能分支至 GitHub 遠端
git push -u origin feature/airport-mrt-express

# 6. 測試確認無誤後，切換回 main 分支並安全合併 (Merge)
git checkout main
git merge --no-ff feature/airport-mrt-express -m "merge: feature/airport-mrt-express into main"

# 7. 推送最新 main 分支至遠端
git push origin main

# 8. (選用) 刪除已合併的功能分支
git branch -d feature/airport-mrt-express
git push origin --delete feature/airport-mrt-express
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
   git commit -m "feat: release V3 Metro & Airport MRT Live Map"
   git push origin main
   ```
2. 前往 Repository 頁面 -> **Settings** -> **Pages**。
3. 在 **Branch** 選項中選擇 `main` 並按 **Save**。

---

## 📄 授權條款 (License)

This project is licensed under the MIT License.
