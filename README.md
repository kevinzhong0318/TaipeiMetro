# 大台北捷運 & 機場捷運 即時動態地圖 | Greater Taipei & Taoyuan Airport MRT Live Map

> 結合真實地理地圖 (Leaflet.js + CartoDB)、交通部 TDX API OAuth 2.0 即時串接、**Mock 與 TDX 完全解耦雙軌架構**、車輛編號追蹤與定位校正、路線營運狀態看板、以及極簡《Mini Metro》幾何美學的大台北捷運與桃園機場捷運即時 Web 專案。

![License](https://img.shields.io/badge/License-MIT-emerald.svg)
![Leaflet](https://img.shields.io/badge/Leaflet-v1.9.4-blue.svg)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v3.0-38bdf8.svg)
![TDX API](https://img.shields.io/badge/TDX_API-v2.0-84005C.svg)

---

## 📖 專案簡介 (Project Overview)

本專案使用前端原生技術（HTML5, Tailwind CSS CDN, Leaflet.js, Vanilla JS）打造，採用**完全解耦 (Fully Decoupled)** 的雙軌資料架構設計，將模擬數據服務 (`MockDataService`) 與 TDX API 服務 (`TdxApiService`) 徹底分離為兩個獨立模組，確保切換模式時不會發生資料混亂或殘留。

涵蓋路線：
- 台北捷運 (TRTC)：文湖線、淡水信義線、松山新店線、中和新蘆線 (含蘆洲支線)、板南線、環狀線
- 支線：新北投支線、小碧潭支線
- 桃園機場捷運 (TYMC)：**普通車 (每站停靠)** 與 **紫色直達特快車 (跳站停靠)**
- 輕軌：淡海輕軌 (綠山線/藍海線)、安坑輕軌
- 三鶯線 (建設中，12 站)

---

## 📂 多檔案目錄結構 (Project Architecture)

```
metro/
├── index.html                     # 主入口（含路線狀態看板 UI）
├── css/
│   └── style.css                  # 主題變數、Glassmorphism、異常外框、狀態看板樣式
├── js/
│   ├── config.js                  # 路線/車站/形狀靜態數據 (MrtDataService)
│   ├── map.js                     # Leaflet 地圖控制器 (MapController)
│   ├── services/
│   │   ├── MockDataService.js     # 獨立模擬數據服務（列車生成/跳站/動畫/發車時段）
│   │   └── TdxApiService.js       # 獨立 TDX API 服務（OAuth/LiveBoard/Alert/定位校正）
│   ├── routePlanner.js            # BFS 站對站路徑規劃 (RoutePlanner)
│   ├── timelineController.js      # 時間軸 Slider / 500x 倍速控制器 (TimelineController)
│   ├── uiController.js            # 介面控制器 (UIController) — Modal/Drawer/狀態看板
│   ├── debugLogger.js             # 淡水信義線 R Line 即時除錯日誌 (TamsuiXinyiDebugLogger)
│   └── app.js                     # AnimationEngine 渲染引擎 + 應用程式入口
└── README.md                      # 本說明文件
```

---

## 🔑 核心架構設計 (Architecture Design)

### Mock 與 TDX 完全解耦

```
┌──────────────────┐    switchMode('mock')    ┌──────────────────────┐
│  AnimationEngine │ ◄───────────────────────► │  MockDataService     │
│  (純渲染引擎)     │                           │  · init()            │
│                  │    switchMode('tdx')      │  · update(delta,spd) │
│  · animate()     │ ◄───────────────────────► │  · getTrains()       │
│  · _syncMarkers()│                           │  · cleanup()         │
│  · _createMarker │                           └──────────────────────┘
└──────────────────┘                           ┌──────────────────────┐
                                               │  TdxApiService       │
                                               │  · init()            │
                                               │  · getTrains()       │
                                               │  · getLineAlerts()   │
                                               │  · cleanup()         │
                                               └──────────────────────┘
```

- **禁止降級/混合備援**：切換模式時，`AnimationEngine.switchMode()` 會完全銷毀 (`cleanup()`) 當前 Service 的所有列車、定時器與狀態，再初始化另一邊
- **統一介面**：兩個 Service 均實現 `init()`, `update()`, `getTrains()`, `cleanup()`, `getLineAlerts()` 等方法
- **零共用程式碼**：兩個 Service 檔案之間無任何 import 或引用

---

## ✨ 核心功能與亮點

### 1. 🏷️ 車輛編號與實時定位校正

- **車號顯示**：每輛列車的 Tooltip 與 Drawer 均顯示車輛編號
  - Mock 模式：`MOCK-BR-001`、`MOCK-EX-025` (直達車)
  - TDX 模式：從 API 回傳的 `TrainNo`/`CarNo` 欄位解析
- **定位異常偵測**：TDX 模式下自動偵測列車位置停滯
  - 連續 2 次輪詢未更新 → Console 印出 `[Warn] Train #xxx 定位異常/偏移`
  - 連續 4 次以上 → 紅色外框 (`train-anomaly-error`)
  - 2~3 次 → 黃色外框 (`train-anomaly-warn`)

### 2. 🚄 桃園機場捷運特快車精確區分

| 車種 | 停靠站 | 視覺樣式 |
|------|--------|----------|
| 直達特快車 | A1 台北車站、A3 新北產業園區、A8 長庚醫院、A12 第一航廈、A13 第二航廈 | 紫色流線車廂 (`#84005C`) + 金色邊框 + 「直達」標籤 |
| 普通車 | A1~A22 全線每站停靠 | 紫色標準藥丸車廂 |

### 3. 📊 路線營運狀態看板

- 介面頂部可展開的「路線狀態看板」，顯示所有路線當前營運狀況
- TDX 模式下自動呼叫 Alert API 取得即時異常資訊
- 狀態標籤：🟢 正常營運 / 🟡 局部限速 / 🔴 延誤中
- 可點擊查看 Alert 詳細訊息

### 4. 🌐 TDX API OAuth 2.0 完整串接

- 前端 Settings Modal 設定 Client ID / Secret（儲存至 `localStorage`，不寫入原始碼）
- 60 秒間隔自動輪詢 TRTC + TYMC LiveBoard API
- 數據異常偵測（空資料、欄位缺失、數據停滯）

### 5. 🖥️ 淡水信義線 Console 即時除錯

- 每 5 秒自動印出 R Line 列車狀態 `console.table`
- 網頁右下角 HUD 面板即時顯示

### 6. 🎮 模擬模式功能

- 06:00~24:00 營運時段自動發車/收班
- 時間軸 Slider 自由拖曳
- 1x / 5x / 10x / 50x / 100x / 500x 倍速控制
- 直達車跳站 + 每站 3.5 秒停靠

### 7. 🗺️ 站對站路徑規劃

- BFS 最短路徑演算法
- 轉乘分析與預估時間
- 地圖高亮路徑 + 脈衝光點導引動畫

### 8. 🌗 日間/夜間地圖切換

- 手動切換 ☀️ 日間 (CARTO Voyager) / 🌙 夜間 (CARTO Dark Matter) 底圖
- UI 面板同步主題切換

---

## 🌿 Git 分支開發工作流 (Standard Git Branching Workflow)

### 功能分支開發

```bash
# 1. 確保在最新的 main 分支上
git checkout main
git pull origin main

# 2. 建立並切換至新功能開發分支
git checkout -b feature/your-feature-name

# 3. 進行開發、測試，確認無誤後提交
git status
git add .
git commit -m "feat: describe your changes"

# 4. 推送功能分支至遠端
git push -u origin feature/your-feature-name

# 5. 在 GitHub 上建立 Pull Request 進行 Code Review
# 或直接在本地合併：
git checkout main
git merge --no-ff feature/your-feature-name -m "merge: feature/your-feature-name into main"

# 6. 推送合併後的 main
git push origin main

# 7. (選用) 刪除已合併的功能分支
git branch -d feature/your-feature-name
git push origin --delete feature/your-feature-name
```

### 分支命名規範

| 前綴 | 用途 | 範例 |
|------|------|------|
| `feature/` | 新功能開發 | `feature/line-status-panel` |
| `fix/` | Bug 修復 | `fix/train-marker-cleanup` |
| `refactor/` | 程式碼重構 | `refactor/decouple-mock-tdx` |
| `docs/` | 文件更新 | `docs/update-readme` |

---

## 🚀 本地執行 (Run Locally)

### 方法一：直接開啟
直接在瀏覽器中開啟 `index.html`

### 方法二：本地伺服器
```bash
# Python
python3 -m http.server 8000

# Node.js (http-server)
npx http-server . -p 8000

# 瀏覽 http://localhost:8000
```

### 方法三：VS Code Live Server
安裝 Live Server 擴充套件，右鍵 `index.html` → Open with Live Server

---

## 🔧 TDX API 設定

1. 前往 [TDX 運輸資料流通服務](https://tdx.transportdata.tw/) 免費申請帳號
2. 取得 Client ID 與 Client Secret
3. 開啟地圖 → 點擊「⚙️ 設定」按鈕
4. 選擇「TDX Real-time Mode」
5. 輸入 Client ID 與 Secret
6. 點擊「儲存並重新加載」

---

## 📄 授權條款 (License)

This project is licensed under the MIT License.
