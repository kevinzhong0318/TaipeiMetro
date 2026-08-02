/**
 * =========================================================================
 * js/app.js - 列車發車動畫循環 (AnimationEngine)、API 異常檢測自動備援 (Fallback)、UI 控制與模式 Cleanup
 * =========================================================================
 */

/**
 * -------------------------------------------------------------------------
 * 1. AnimationEngine: 列車動畫循環、06:00~24:00 發車與 TDX API 異常自動接管備援演算法
 * -------------------------------------------------------------------------
 */
const AnimationEngine = (function() {
    let trainObjects = [];
    let lastTimestamp = 0;
    let lineVisibility = {};
    let animFrameId = null;
    let apiPollIntervalId = null;

    Object.keys(MrtDataService.lines).forEach(k => lineVisibility[k] = true);

    function isNighttime() {
        const currentDate = TimelineController.getCurrentTimeDate();
        const hour = currentDate.getHours();
        // 規範營運時間為 06:00 ~ 24:00 (非營運時間為 00:00 ~ 06:00)
        return hour >= 0 && hour < 6;
    }

    function checkAndSyncNightState() {
        const night = isNighttime();
        if (night && trainObjects.length > 0) {
            // 深夜 00:00~06:00 收班：清空列車
            cleanup();
        } else if (!night && trainObjects.length === 0) {
            // 06:00~24:00 營運時段：若無列車則即刻發車
            spawnTrains();
        }
    }

    function init() {
        cleanup();
        spawnTrains();
        animFrameId = requestAnimationFrame(animate);
        startApiPolling();
    }

    /**
     * 取得淡水信義線 (R Line / 紅線) 當前所有在線運行列車 (專供 TamsuiXinyiDebugLogger 除錯用)
     */
    function getTamsuiXinyiTrains() {
        return trainObjects.filter(t => t.lineKey === 'R' || t.sequenceKey === 'R');
    }

    /**
     * 啟動背景 TDX API 輪詢與異常自動檢測
     */
    function startApiPolling() {
        if (apiPollIntervalId) clearInterval(apiPollIntervalId);

        apiPollIntervalId = setInterval(async () => {
            if (TDXService.getMode() === 'tdx') {
                const pollResult = await TDXService.pollLiveTrains();
                updateApiStatusBadge(pollResult);

                // 當檢測到 API 數據異常或斷線時，接管切換至動態預估模擬備援，保證列車不卡死或消失
                if (pollResult.isAnomaly || pollResult.mode === 'fallback') {
                    if (trainObjects.length === 0 && !isNighttime()) {
                        spawnTrains();
                    }
                }
            }
        }, 15000); // 每 15 秒輪詢檢查 API 狀態
    }

    function updateApiStatusBadge(pollResult) {
        const badge = document.getElementById('dataSourceBadge');
        if (!badge) return;

        if (pollResult.mode === 'mock') {
            badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span> 🟡 模擬數據運行中`;
            badge.className = "text-xs font-normal text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20";
        } else if (pollResult.isAnomaly || pollResult.mode === 'fallback') {
            badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span> ⚠️ 部分路線 API 數據異常，已啟動預估動態模擬`;
            badge.className = "text-xs font-semibold text-rose-300 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/30 shadow-sm";
        } else {
            badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> 🟢 TDX API 連線正常`;
            badge.className = "text-xs font-normal text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20";
        }
    }

    function spawnTrains() {
        if (isNighttime()) return; // 00:00 ~ 06:00 夜間非營運時段不發車

        const trainConfigs = [
            { line: "BR", speed: 0.0003, count: 3 },
            { line: "R",  speed: 0.00025, count: 4 },
            { line: "G",  speed: 0.00028, count: 3 },
            { line: "O",  speed: 0.00026, count: 3 },
            { line: "O_Luzhou", speed: 0.00026, count: 2 },
            { line: "BL", speed: 0.00024, count: 4 },
            { line: "Y",  speed: 0.00032, count: 3 },
            { line: "LB", speed: 0.00035, count: 2 },
            { line: "A",  speed: 0.00025, count: 3, isCommuter: true },
            { line: "A_Express", speed: 0.00042, count: 2, isExpress: true }
        ];

        let trainIdCounter = 101;

        trainConfigs.forEach(config => {
            const seq = MrtDataService.sequences[config.line];
            if (!seq) return;
            const lineKey = config.line.startsWith("A") ? "A" : (config.line.startsWith("O") ? "O" : config.line);
            const lineInfo = MrtDataService.lines[config.line] || MrtDataService.lines[lineKey];

            for (let i = 0; i < config.count; i++) {
                const direction = i % 2 === 0 ? 1 : -1;
                const startSeg = Math.floor((i / config.count) * (seq.length - 1));
                const initialProgress = (i * 0.35) % 1.0;

                const trainObj = {
                    id: config.isExpress ? `EX-A-${trainIdCounter++}` : `TR-${config.line}-${trainIdCounter++}`,
                    lineKey: lineKey,
                    sequenceKey: config.line,
                    sequence: seq,
                    segmentIndex: startSeg,
                    progress: initialProgress,
                    direction: direction,
                    baseSpeed: config.speed + (Math.random() * 0.00008),
                    isExpress: !!config.isExpress,
                    isDwelling: false,
                    dwellTimeRemaining: 0,
                    currentStationCode: null,
                    latLng: [MrtDataService.stations[seq[startSeg]].lat, MrtDataService.stations[seq[startSeg]].lng],
                    angle: 0,
                    marker: null
                };

                trainObj.marker = createTrainMarker(trainObj, lineInfo.color);
                trainObjects.push(trainObj);
            }
        });

        document.getElementById('activeTrainCount').innerText = trainObjects.length;
    }

    function createTrainMarker(train, color) {
        let html = '';
        let size = [24, 12];
        let anchor = [12, 6];

        if (train.isExpress) {
            size = [32, 13];
            anchor = [16, 6.5];
            html = `<div class="express-bullet-train" id="train-pill-${train.id}">
                <div class="relative flex items-center">
                    <svg width="32" height="13" viewBox="0 0 32 13" fill="none">
                        <path d="M2,6.5 C2,3.5 5,1 10,1 L26,1 C29,1 31,3.5 31,6.5 C31,9.5 29,12 26,12 L10,12 C5,12 2,9.5 2,6.5 Z" fill="#84005C" stroke="#FFD100" stroke-width="1.5"/>
                        <path d="M12,4 L24,4 A2,2 0 0,1 26,6 L26,7 A2,2 0 0,1 24,9 L12,9 Z" fill="#ffffff" opacity="0.9"/>
                        <circle cx="28" cy="6.5" r="1.5" fill="#FFD100"/>
                    </svg>
                    <span class="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[8px] font-bold bg-purple-950 text-amber-300 border border-amber-400/50 px-1 py-0 rounded leading-none shadow">直達</span>
                </div>
            </div>`;
        } else {
            html = `<div class="train-pill" style="background:${color};" id="train-pill-${train.id}">
                <div class="train-light"></div>
                <div class="train-arrow" style="transform: rotate(${train.direction < 0 ? '180deg' : '0deg'});"></div>
            </div>`;
        }

        const icon = L.divIcon({ className: 'train-div-icon', html: html, iconSize: size, iconAnchor: anchor });
        const marker = L.marker(train.latLng, { icon: icon, zIndexOffset: train.isExpress ? 950 : 800 }).addTo(MapController.getMap());
        marker.on('click', () => UIController.showTrainDrawer(train));
        return marker;
    }

    function animate(timestamp) {
        if (!lastTimestamp) lastTimestamp = timestamp;
        const delta = Math.min(timestamp - lastTimestamp, 64);
        lastTimestamp = timestamp;

        // 每禎自動檢查營運/深夜時段切換
        checkAndSyncNightState();

        const speedMult = TimelineController.getSpeedMultiplier();

        if (!isNighttime()) {
            trainObjects.forEach(t => {
                if (!lineVisibility[t.lineKey]) {
                    t.marker.setOpacity(0);
                    return;
                } else {
                    t.marker.setOpacity(1);
                }

                if (t.isDwelling) {
                    t.dwellTimeRemaining -= delta * speedMult;
                    if (t.dwellTimeRemaining <= 0) {
                        t.isDwelling = false;
                        t.dwellTimeRemaining = 0;
                    } else {
                        return;
                    }
                }

                t.progress += t.baseSpeed * speedMult * (delta / 16.6);

                if (t.progress >= 1.0) {
                    t.progress = 0;
                    t.segmentIndex += t.direction;

                    if (t.segmentIndex >= t.sequence.length - 1) {
                        t.segmentIndex = t.sequence.length - 2;
                        t.direction = -1;
                    } else if (t.segmentIndex < 0) {
                        t.segmentIndex = 0;
                        t.direction = 1;
                    }

                    const arrivedStationCode = t.sequence[t.segmentIndex];
                    t.currentStationCode = arrivedStationCode;

                    if (t.isExpress) {
                        if (MrtDataService.expressStops.includes(arrivedStationCode)) {
                            t.isDwelling = true;
                            t.dwellTimeRemaining = 3500;
                        }
                    } else {
                        t.isDwelling = true;
                        t.dwellTimeRemaining = 3500;
                    }
                }

                const idx1 = t.segmentIndex;
                const idx2 = t.segmentIndex + t.direction;
                const code1 = t.sequence[idx1];
                const code2 = t.sequence[idx2] || t.sequence[idx1];

                const st1 = MrtDataService.stations[code1];
                const st2 = MrtDataService.stations[code2];

                if (st1 && st2) {
                    const lat = st1.lat + (st2.lat - st1.lat) * t.progress;
                    const lng = st1.lng + (st2.lng - st1.lng) * t.progress;
                    t.latLng = [lat, lng];
                    t.marker.setLatLng(t.latLng);

                    const dy = st2.lat - st1.lat;
                    const dx = (st2.lng - st1.lng) * Math.cos(st1.lat * Math.PI / 180);
                    const angleDeg = Math.atan2(dy, dx) * 180 / Math.PI;
                    t.angle = angleDeg;

                    const pillEl = document.getElementById(`train-pill-${t.id}`);
                    if (pillEl) {
                        pillEl.style.transform = `rotate(${-angleDeg}deg)`;
                    }
                }
            });
        }

        animFrameId = requestAnimationFrame(animate);
    }

    /**
     * 模式切換時徹底清除舊動畫禎與 Marker，防範重複繪製與記憶體洩漏
     */
    function cleanup() {
        if (animFrameId) {
            cancelAnimationFrame(animFrameId);
            animFrameId = null;
        }
        if (apiPollIntervalId) {
            clearInterval(apiPollIntervalId);
            apiPollIntervalId = null;
        }

        const map = MapController.getMap();
        trainObjects.forEach(t => {
            if (t.marker && map) map.removeLayer(t.marker);
        });
        trainObjects = [];
        lastTimestamp = 0;
        document.getElementById('activeTrainCount').innerText = "0";
    }

    function restartEngine() {
        cleanup();
        spawnTrains();
        animFrameId = requestAnimationFrame(animate);
        startApiPolling();
    }

    function setLineVisibility(lineKey, visible) { lineVisibility[lineKey] = visible; }

    return { init, setLineVisibility, cleanup, restartEngine, isNighttime, checkAndSyncNightState, getTamsuiXinyiTrains };
})();

/**
 * -------------------------------------------------------------------------
 * 2. UIController: 介面事件控制、動態端點班表與 Reset 機制
 * -------------------------------------------------------------------------
 */
const UIController = (function() {
    function init() {
        document.getElementById('btnThemeToggle').addEventListener('click', MapController.toggleTheme);
        document.getElementById('btnLocationToggle').addEventListener('click', MapController.locateUser);
        document.getElementById('btnResetView').addEventListener('click', MapController.resetView);

        // Filter Panel Toggle
        const btnFilter = document.getElementById('btnFilterToggle');
        const filterPanel = document.getElementById('filterPanel');
        btnFilter.addEventListener('click', () => {
            filterPanel.classList.toggle('-translate-x-[350px]');
            filterPanel.classList.toggle('opacity-0');
        });
        document.getElementById('btnCloseFilter').addEventListener('click', () => {
            filterPanel.classList.add('-translate-x-[350px]');
            filterPanel.classList.add('opacity-0');
        });

        // Legend Modal Toggle
        const legendModal = document.getElementById('legendModal');
        document.getElementById('btnLegendToggle').addEventListener('click', openLegendModal);
        document.getElementById('btnCloseLegendModal').addEventListener('click', closeLegendModal);
        legendModal.addEventListener('click', (e) => { if (e.target === legendModal) closeLegendModal(); });

        // Settings Modal Toggle
        const settingsModal = document.getElementById('settingsModal');
        document.getElementById('btnSettingsToggle').addEventListener('click', openSettingsModal);
        document.getElementById('btnCloseSettingsModal').addEventListener('click', closeSettingsModal);
        settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) closeSettingsModal(); });

        // Route Planner Modal Toggle
        const routeModal = document.getElementById('routePlannerModal');
        document.getElementById('btnRoutePlannerToggle').addEventListener('click', openRoutePlannerModal);
        document.getElementById('btnCloseRoutePlannerModal').addEventListener('click', closeRoutePlannerModal);
        routeModal.addEventListener('click', (e) => { if (e.target === routeModal) closeRoutePlannerModal(); });

        document.getElementById('btnCloseDrawer').addEventListener('click', closeDrawer);

        initSettingsForm();
        populateFilterPanel();
        populateLegendModal();
        initRoutePlannerForm();
    }

    function selectStation(code) {
        const st = MrtDataService.stations[code];
        if (!st) return;

        const primaryLineKey = st.lines[0];
        const lineInfo = MrtDataService.lines[primaryLineKey];

        const brandIcon = document.getElementById('brandIcon');
        brandIcon.style.background = lineInfo.color;

        const titleEl = document.getElementById('brandTitle');
        titleEl.innerHTML = `<span class="text-[11px] font-medium opacity-85 block">目前選擇車站</span>${lineInfo.name} - ${st.name} <span class="font-mono text-xs opacity-75">(${code})</span>`;

        showStationDrawer(code);
    }

    function initSettingsForm() {
        const creds = TDXService.getCredentials();
        const mode = TDXService.getMode();

        document.getElementById('tdxClientId').value = creds.clientId;
        document.getElementById('tdxClientSecret').value = creds.clientSecret;

        const modeMock = document.getElementById('modeMock');
        const modeTdx = document.getElementById('modeTdx');
        const credBlock = document.getElementById('tdxCredentialsBlock');

        if (mode === 'tdx') {
            modeTdx.checked = true;
            credBlock.classList.remove('hidden');
        } else {
            modeMock.checked = true;
            credBlock.classList.add('hidden');
        }

        modeMock.addEventListener('change', () => credBlock.classList.add('hidden'));
        modeTdx.addEventListener('change', () => credBlock.classList.remove('hidden'));

        document.getElementById('btnSaveSettings').addEventListener('click', async () => {
            const selectedMode = modeTdx.checked ? 'tdx' : 'mock';
            const id = document.getElementById('tdxClientId').value.trim();
            const secret = document.getElementById('tdxClientSecret').value.trim();

            TDXService.setMode(selectedMode);
            TDXService.saveCredentials(id, secret);

            const badge = document.getElementById('dataSourceBadge');

            if (selectedMode === 'tdx') {
                const statusEl = document.getElementById('tdxAuthStatus');
                statusEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span> 連線與驗證 OAuth Token 中...`;
                badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span> 🔴 連線驗證中`;
                badge.className = "text-xs font-normal text-rose-300 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20";
                
                const success = await TDXService.fetchAccessToken();
                if (success) {
                    statusEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400"></span> <span class="text-emerald-400 font-bold">驗證成功！已取得 OAuth2 Access Token</span>`;
                    badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> 🟢 TDX API 連線正常`;
                    badge.className = "text-xs font-normal text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20";
                    alert("成功連線至交通部 TDX API！圖層與動畫已重整加載。");
                } else {
                    statusEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-rose-500"></span> <span class="text-rose-400 font-bold">認證失敗或 API 異常，已自動啟動預估動態模擬</span>`;
                    badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span> ⚠️ 部分路線 API 數據異常，已啟動預估動態模擬`;
                    badge.className = "text-xs font-semibold text-rose-300 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/30 shadow-sm";
                    alert("TDX API 認證或連線異常，系統已自動為您啟動動態模擬備援！");
                }
            } else {
                badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span> 🟡 模擬數據運行中`;
                badge.className = "text-xs font-normal text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20";
                alert("已切換為模擬動態模式 (Mock Mode)，圖層與動畫已重整。");
            }

            MapController.purgeMapLayers();
            MapController.renderPolylines();
            MapController.renderStations();
            AnimationEngine.restartEngine();

            closeSettingsModal();
        });
    }

    function initRoutePlannerForm() {
        const startSelect = document.getElementById('routeStartSelect');
        const endSelect = document.getElementById('routeEndSelect');
        const { stations } = MrtDataService;

        const optionsHtml = Object.entries(stations).map(([code, st]) => {
            return `<option value="${code}">${st.name} (${code})</option>`;
        }).join('');

        startSelect.innerHTML = optionsHtml;
        endSelect.innerHTML = optionsHtml;

        startSelect.value = "BL12"; // 台北車站
        endSelect.value = "R03";   // 台北101

        document.getElementById('btnSwapRouteStations').addEventListener('click', () => {
            const tmp = startSelect.value;
            startSelect.value = endSelect.value;
            endSelect.value = tmp;
        });

        document.getElementById('btnExecuteRouteSearch').addEventListener('click', () => {
            const startCode = startSelect.value;
            const endCode = endSelect.value;

            if (startCode === endCode) {
                alert("起點站與終點站不能相同！");
                return;
            }

            const result = RoutePlanner.findShortestPath(startCode, endCode);
            if (result) {
                RoutePlanner.drawRouteHighlight(result.path);
                
                document.getElementById('routeEstTime').innerText = `預估約 ${result.estimatedMinutes} 分鐘`;
                document.getElementById('routeStationCount').innerText = `${result.stationCount} 站`;

                if (result.transfers.length === 0) {
                    document.getElementById('routeTransfers').innerText = "直達車（無需轉乘）";
                } else {
                    const transferText = result.transfers.map(t => `在 [${t.stationName}] 轉乘 ${MrtDataService.lines[t.toLine].name}`).join('；');
                    document.getElementById('routeTransfers').innerText = transferText;
                }

                document.getElementById('routeResultCard').classList.remove('hidden');
                document.getElementById('btnClearRouteHighlight').classList.remove('hidden');
                closeRoutePlannerModal();
            }
        });

        document.getElementById('btnClearRouteHighlight').addEventListener('click', () => {
            RoutePlanner.clearHighlight();
            document.getElementById('routeResultCard').classList.add('hidden');
            document.getElementById('btnClearRouteHighlight').classList.add('hidden');
        });
    }

    function populateFilterPanel() {
        const container = document.getElementById('lineFilterContainer');
        container.innerHTML = Object.entries(MrtDataService.lines).map(([key, info]) => {
            const trialTag = info.isTrial ? '<span class="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.2 rounded ml-auto font-mono">試營運</span>' : '';
            const branchTag = info.isBranch ? '<span class="text-[10px] bg-gray-500/20 opacity-75 border border-gray-500/30 px-1.5 py-0.2 rounded ml-auto font-mono">支線</span>' : '';
            const expressTag = info.isExpress ? '<span class="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.2 rounded ml-auto font-mono">紫色直達</span>' : '';

            return `<label class="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-500/10 hover:bg-gray-500/20 cursor-pointer text-xs transition-all">
                <input type="checkbox" checked value="${key}" class="line-checkbox rounded text-emerald-500 focus:ring-0">
                <span class="w-3 h-3 rounded-full inline-block" style="background:${info.color}"></span>
                <span class="font-medium truncate">${info.name}</span>
                ${trialTag}${branchTag}${expressTag}
            </label>`;
        }).join('');

        document.querySelectorAll('.line-checkbox').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const lineKey = e.target.value;
                const checked = e.target.checked;
                AnimationEngine.setLineVisibility(lineKey, checked);

                const polylines = MapController.getPolylines();
                const map = MapController.getMap();

                Object.keys(polylines).forEach(seqKey => {
                    if (seqKey === lineKey || seqKey.startsWith(lineKey)) {
                        if (checked) polylines[seqKey].addTo(map);
                        else map.removeLayer(polylines[seqKey]);
                    }
                });
            });
        });
    }

    function populateLegendModal() {
        const grid = document.getElementById('legendModalShapeGrid');
        grid.innerHTML = Object.entries(MrtDataService.shapes).map(([key, s]) => {
            return `<div class="flex items-start gap-3 p-3 rounded-2xl bg-gray-500/10 border border-gray-500/15">
                <div class="w-8 h-8 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                    <svg width="18" height="18" viewBox="0 0 18 18">${s.svg}</svg>
                </div>
                <div>
                    <div class="font-bold text-sm">${s.label}</div>
                    <div class="text-xs text-emerald-400 font-medium">${s.desc}</div>
                </div>
            </div>`;
        }).join('');
    }

    function openLegendModal() { document.getElementById('legendModal').classList.remove('opacity-0', 'pointer-events-none'); }
    function closeLegendModal() { document.getElementById('legendModal').classList.add('opacity-0', 'pointer-events-none'); }
    function openSettingsModal() { document.getElementById('settingsModal').classList.remove('opacity-0', 'pointer-events-none'); }
    function closeSettingsModal() { document.getElementById('settingsModal').classList.add('opacity-0', 'pointer-events-none'); }
    function openRoutePlannerModal() { document.getElementById('routePlannerModal').classList.remove('opacity-0', 'pointer-events-none'); }
    function closeRoutePlannerModal() { document.getElementById('routePlannerModal').classList.add('opacity-0', 'pointer-events-none'); }

    function showStationDrawer(code) {
        const st = MrtDataService.stations[code];
        if (!st) return;

        const primaryLineKey = st.lines[0];
        const primaryLineInfo = MrtDataService.lines[primaryLineKey];
        const shapeObj = MrtDataService.shapes[st.shape] || MrtDataService.shapes.circle;
        
        const iconEl = document.getElementById('drawerIcon');
        iconEl.style.background = primaryLineInfo.color;
        iconEl.innerHTML = `<svg width="20" height="20" viewBox="0 0 18 18" fill="none">${shapeObj.svg}</svg>`;

        document.getElementById('drawerTitle').innerText = `${st.name} (${code})`;
        document.getElementById('drawerSubtitle').innerText = `${st.nameEn} · ${shapeObj.label}`;

        const isExpressStop = MrtDataService.expressStops.includes(code);
        const expressBadge = st.lines.includes("A") 
            ? (isExpressStop ? '<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-900 text-amber-300 border border-amber-400/50">⚡ 直達車停靠站</span>' : '<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-600 text-gray-300">普通車停靠站 (直達過站不停)</span>')
            : '';

        const lineChips = st.lines.map(lk => {
            const info = MrtDataService.lines[lk];
            return `<span class="px-2 py-0.5 rounded-md text-[11px] font-bold text-white shadow-sm" style="background:${info.color}">${info.name}</span>`;
        }).join(' ');

        const scheduleCardsHtml = st.lines.map(lineKey => {
            const lineInfo = MrtDataService.lines[lineKey];
            if (!lineInfo) return '';
            const termini = lineInfo.termini || ["起點站", "端點站"];
            const startTerminus = termini[0];
            const endTerminus = termini[1];

            return `<div class="bg-gray-500/10 border border-gray-500/15 p-2.5 rounded-xl space-y-1.5">
                <div class="font-bold text-xs flex items-center gap-1.5" style="color:${lineInfo.color}">
                    <span class="w-2 h-2 rounded-full" style="background:${lineInfo.color}"></span>
                    <span>${lineInfo.name} 首末班車時刻</span>
                </div>
                <div class="grid grid-cols-2 gap-2 text-[11px]">
                    <div class="bg-gray-900/40 p-1.5 rounded-lg border border-gray-700/50">
                        <div class="font-bold text-emerald-400">往 ${endTerminus} 方向</div>
                        <div>頭班車：<span class="font-mono font-bold">06:00</span></div>
                        <div>末班車：<span class="font-mono font-bold">24:00</span></div>
                    </div>
                    <div class="bg-gray-900/40 p-1.5 rounded-lg border border-gray-700/50">
                        <div class="font-bold text-blue-400">往 ${startTerminus} 方向</div>
                        <div>頭班車：<span class="font-mono font-bold">06:00</span></div>
                        <div>末班車：<span class="font-mono font-bold">00:15</span></div>
                    </div>
                </div>
            </div>`;
        }).join('');

        const isNight = AnimationEngine.isNighttime();
        const opStatusTag = isNight 
            ? `<span class="text-indigo-300 font-bold">🌙 目前為非營運時間 (00:00~06:00 末班車已收班)</span>`
            : `<span class="text-emerald-400 font-bold">🟢 全線營運正常 (06:00~24:00) · 班距 3-5 分鐘</span>`;

        document.getElementById('drawerBody').innerHTML = `
            <div class="flex items-center gap-2 mb-2">${lineChips} ${expressBadge}</div>
            <div class="opacity-90">地標類型：<span class="text-emerald-400 font-medium">${shapeObj.desc}</span></div>
            <div class="opacity-90">營運狀態：${opStatusTag}</div>
            
            <div class="border-t border-gray-500/20 pt-2.5 mt-2">
                <div class="font-bold text-[11px] opacity-75 mb-1.5 flex items-center justify-between">
                    <span>🕒 動態端點站頭末班車時間 (First & Last Train Schedule)</span>
                    <span class="text-[10px] text-blue-400 font-mono">TDX / TRTC</span>
                </div>
                <div class="space-y-2">
                    ${scheduleCardsHtml}
                </div>
            </div>

            <div class="border-t border-gray-500/20 pt-2">
                <div class="font-bold text-[11px] opacity-75 mb-1.5">預計列車即時倒數 (Live Arrival)</div>
                <div class="space-y-1.5">
                    <div class="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
                        <span class="font-medium text-emerald-400">往 ${primaryLineInfo.termini ? primaryLineInfo.termini[1] : '端點站'} 方向</span>
                        <span class="font-mono font-bold text-emerald-400">${isNight ? '末班車已駛離' : '約 2 分鐘'}</span>
                    </div>
                    <div class="flex items-center justify-between bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-xl">
                        <span class="font-medium text-blue-400">往 ${primaryLineInfo.termini ? primaryLineInfo.termini[0] : '起點站'} 方向</span>
                        <span class="font-mono font-bold text-blue-400">${isNight ? '末班車已駛離' : '約 4 分鐘'}</span>
                    </div>
                </div>
            </div>
        `;

        openDrawer();
    }

    function showTrainDrawer(train) {
        const lineInfo = MrtDataService.lines[train.sequenceKey] || MrtDataService.lines[train.lineKey];
        const iconEl = document.getElementById('drawerIcon');
        iconEl.style.background = train.isExpress ? "#84005C" : lineInfo.color;
        iconEl.innerHTML = train.isExpress 
            ? `<span class="text-amber-300 font-bold text-xs">直達</span>`
            : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M12 2C7 2 4 3.5 4 8.5V16c0 1.5 1 2.5 2.5 2.5L5 20.5h14l-1.5-2c1.5 0 2.5-1 2.5-2.5V8.5C20 3.5 17 2 12 2z"/><circle cx="8" cy="14" r="1.5"/><circle cx="16" cy="14" r="1.5"/></svg>`;

        const typeTitle = train.isExpress ? "桃園機捷 紫色直達特快車" : "普通車";
        document.getElementById('drawerTitle').innerText = `列車 ${train.id} (${typeTitle})`;
        document.getElementById('drawerSubtitle').innerText = `${lineInfo.name} · ${train.isExpress ? '極速 100 km/h (僅停 A1, A3, A8, A12, A13 於 A13 迴轉)' : '每站皆停'}`;

        const statusTag = train.isDwelling 
            ? `<span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/40 dwell-badge">🟢 車站停靠載客中 (${(train.dwellTimeRemaining / 1000).toFixed(1)}s)</span>`
            : `<span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">⚡ 沿線區間行駛中</span>`;

        const currentCode = train.sequence[train.segmentIndex];
        const nextCode = train.sequence[train.segmentIndex + train.direction] || currentCode;

        document.getElementById('drawerBody').innerHTML = `
            <div class="flex items-center justify-between bg-gray-500/10 p-2.5 rounded-xl border border-gray-500/20">
                <span class="opacity-90">運行狀態</span>
                ${statusTag}
            </div>
            <div class="space-y-1.5 opacity-90 mt-2">
                <div>當前位置：<span class="font-bold">${MrtDataService.stations[currentCode].name} (${currentCode})</span></div>
                <div>前進行向：<span class="font-bold">➔ ${MrtDataService.stations[nextCode].name} (${nextCode})</span></div>
                <div>車廂類型：<span class="text-purple-400 font-bold">${train.isExpress ? '⚡ 紫色流線型直達車 (A01 台北車站 ↔ A13 機場第二航廈迴轉)' : '紫色普通車 (每站皆停)'}</span></div>
            </div>
        `;

        openDrawer();
    }

    function openDrawer() { document.getElementById('infoDrawer').classList.remove('translate-y-96', 'opacity-0'); }
    function closeDrawer() { document.getElementById('infoDrawer').classList.add('translate-y-96', 'opacity-0'); }

    return { init, selectStation, showStationDrawer, showTrainDrawer };
})();

// Application Main Entry Point Initialization
window.addEventListener('DOMContentLoaded', () => {
    MapController.init();
    TimelineController.init();
    AnimationEngine.init();
    UIController.init();
    if (window.TamsuiXinyiDebugLogger) {
        TamsuiXinyiDebugLogger.init();
    }
});
