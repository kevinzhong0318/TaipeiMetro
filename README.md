# 台北捷運即時地圖 | Taipei Metro Real-Time Map (Mini Metro Style)

> 一個結合「真實地理地圖 (Leaflet.js + CartoDB)」與極簡「《Mini Metro》幾何美學」的台北捷運即時地圖單頁應用程式 (Single Page Application)。

![License](https://img.shields.io/badge/License-MIT-emerald.svg)
![Leaflet](https://img.shields.io/badge/Leaflet-v1.9.4-blue.svg)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v3.0-38bdf8.svg)

---

## 📖 專案簡介 (Project Overview)

本專案使用前端原生技術（HTML5, Tailwind CSS, Leaflet.js, Vanilla JS）打造，將台北捷運 (Taipei Metro TRTC) 各主線、支線與三鶯線，依據地理座標精確繪製於開源地圖上。車站則依據周邊地標特色，劃分為 **9 大 Mini Metro 幾何視覺圖形**，並搭配沿路線平滑行駛的動態膠囊列車，呈現極致流暢且現代化的捷運動態地圖。

全專案整合於單一獨立 `index.html` 檔案中，無需任何 Node.js、npm 或打包工具，適合開箱即用與發布於 **GitHub Pages**。

---

## ✨ 核心功能與亮點 (Key Features)

### 1. 🌙 日間 / 夜間模式動態切換 (Day / Dark Mode)
- **開源 CartoDB 底圖**：
  - 日間模式：`CartoDB Positron`
  - 夜間模式：`CartoDB Dark Matter`
- UI 介面（頂部導覽列、側邊欄、Modal 彈窗、車站 SVG 邊框）隨日夜模式動態轉化。

### 2. 📐 精緻 18px 車站幾何圖形 (Mini Metro Geometric Shapes)
為避免地圖縮放時圖示過大遮蔽路線，車站圖形微調縮放至 **18x18px**（轉乘大站為 20x20px），依據車站周邊特色劃分：
- **圓形 (Circle)**：住宅社區區（如：古亭、江子翠、景安）
- **正方形 (Square)**：主要轉乘/鐵路大站（如：台北車站、板橋、南港）
- **三角形 (Triangle)**：商圈/購物中心（如：西門、中山、忠孝復興）
- **十字形 (Cross)**：醫院與醫療園區（如：台大醫院、石牌、亞東醫院）
- **星形 (Star)**：景點/觀光區（如：淡水、動物園、台北101/世貿）
- **五角形 (Pentagon)**：國際機場專用（松山機場）
- **菱形 (Diamond)**：公園/綠地風景區（如：大安森林公園、象山、新店）
- **橢圓形/體育館形 (Stadium)**：大學/文教區 (公館、輔大) 與體育館 (台北小巨蛋)
- **倒鑽石形 (Inverted Diamond)**：金融/商業園區（如：南京復興、松江南京）

### 3. 📖 獨立圖例說明 Modal (Shape Legend Modal)
- 點擊 Header **「圖例說明 / Legend」** 按鈕彈出極致設計感的 Modal 視窗。
- 完整列出 9 大形狀名稱、代表特色與實例站名。
- 底部附帶設計靈感參考外連（包含 Dinosaur Polo Club《Mini Metro》官方網頁、Rail Island 參考網站與交通部 TDX 服務）。

### 4. 🚊 膠囊列車動態模擬與互動 Popup
- 採用 `requestAnimationFrame` 進行雙向高禎率座標內插平滑移動，並根據經緯度向量角自動旋轉行進車頭。
- 點擊「車站」或「列車」可開啟側邊 Drawer 面板，即時查看預計到站時間、列車擁擠度等級 (1-4 級色塊) 與營運狀況。

### 5. 🚏 主線完整性、支線與三鶯線「試營運」標誌
- 包含文湖 (BR)、淡水信義 (R)、松山新店 (G)、中和新蘆 (O)、板南 (BL)、環狀 (Y) 與三鶯線 (LB)。
- 三鶯線特別標註 **「試營運 (Trial Operation)」** 徽章。
- 新北投支線 (R22A) 與小碧潭支線 (G03A) 採用半透明與虛線區隔。

---

## 🛠️ 使用之開源技術 (Tech Stack)

- **UI & Layout**: [Tailwind CSS CDN](https://tailwindcss.com/) + CSS Glassmorphism
- **Web Map Engine**: [Leaflet.js 1.9.4](https://leafletjs.com/)
- **Map Tiles**: [CartoDB Positron & Dark Matter Basemaps](https://carto.com/attributions)
- **Typography**: Google Fonts ([Noto Sans TC](https://fonts.google.com/specimen/Noto+Sans+TC), [Oswald](https://fonts.google.com/specimen/Oswald), [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono))

---

## 🚀 本地執行方式 (Local Usage)

### 方法 A：直接在瀏覽器雙擊開啟（最快速）
1. 將本專案下載或 Clone 到本機。
2. 雙擊開啟 `index.html`，即可在 Chrome / Safari / Edge / Firefox 瀏覽器中直接運行。

### 方法 B：啟動 Python HTTP 伺服器
```bash
cd /path/to/metro
python3 -m http.server 8000
```
開啟瀏覽器前往 `http://localhost:8000` 即可預覽。

---

## 🌐 GitHub Pages 靜態發布教學 (GitHub Pages Deployment)

1. 將本專案推送到您的 GitHub 儲存庫 (Repository)：
   ```bash
   git init
   git add .
   git commit -m "feat: initial commit of Taipei Metro Live Map"
   git branch -M main
   git remote add origin https://github.com/your-username/taipei-metro-live.git
   git push -u origin main
   ```
2. 進入 GitHub 儲存庫頁面 -> 點擊 **Settings**。
3. 點選左側 **Pages** 選項。
4. 在 **Build and deployment** 下方的 **Branch** 選擇 `main` 並儲存。
5. 等待數秒後，即可獲得免費的線上展示網址（例如：`https://your-username.github.io/taipei-metro-live/`）！

---

## 🔌 交通部 TDX API 整合說明 (TDX API Integration Stub)

如欲切換至真實交通部 TDX API 即時列車位置：
1. 前往 [TDX 運輸資料流通服務](https://tdx.transportdata.tw/) 申請免費 Client ID 與 Client Secret。
2. 程式碼末端 `TDX_API_STUB` 區塊中已預留 OAuth2 Token 與 `/v2/Rail/Metro/TrainLocation/TRTC` 介接說明。

---

## 📄 授權條款 (License)

This project is licensed under the MIT License.
