/**
 * =========================================================================
 * js/uiController.js - 介面事件控制、Modal 管理、路線狀態看板、Train Drawer
 * 從 app.js 中提取為獨立檔案
 * =========================================================================
 */
const UIController = (function () {

    /* ══════════════════════════════════════════════
       初始化
       ══════════════════════════════════════════════ */
    function init() {
        document.getElementById('btnThemeToggle').addEventListener('click', MapController.toggleTheme);
        document.getElementById('btnLocationToggle').addEventListener('click', MapController.locateUser);
        document.getElementById('btnResetView').addEventListener('click', MapController.resetView);

        _initFilterPanel();
        _initLegendModal();
        _initSettingsModal();
        _initRoutePlannerModal();
        _initTrainStatsModal();
        _initLineStatusPanel();

        document.getElementById('btnCloseDrawer').addEventListener('click', _closeDrawer);
    }

    /* ══════════════════════════════════════════════
       Filter Panel（路線篩選）
       ══════════════════════════════════════════════ */
    function _initFilterPanel() {
        const btnFilter = document.getElementById('btnFilterToggle');
        const filterPanel = document.getElementById('filterPanel');

        btnFilter.addEventListener('click', () => {
            filterPanel.classList.toggle('-translate-x-[350px]');
            filterPanel.classList.toggle('opacity-0');
        });
        document.getElementById('btnCloseFilter').addEventListener('click', () => {
            filterPanel.classList.add('-translate-x-[350px]', 'opacity-0');
        });

        _populateFilterPanel();
    }

    function _populateFilterPanel() {
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

    /* ══════════════════════════════════════════════
       Legend Modal（圖例）
       ══════════════════════════════════════════════ */
    function _initLegendModal() {
        const legendModal = document.getElementById('legendModal');
        document.getElementById('btnLegendToggle').addEventListener('click', () => _openModal('legendModal'));
        document.getElementById('btnCloseLegendModal').addEventListener('click', () => _closeModal('legendModal'));
        legendModal.addEventListener('click', (e) => { if (e.target === legendModal) _closeModal('legendModal'); });
        _populateLegendModal();
    }

    function _populateLegendModal() {
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

    /* ══════════════════════════════════════════════
       Settings Modal（數據源設定）
       ══════════════════════════════════════════════ */
    function _initSettingsModal() {
        const settingsModal = document.getElementById('settingsModal');
        document.getElementById('btnSettingsToggle').addEventListener('click', () => _openModal('settingsModal'));
        document.getElementById('btnCloseSettingsModal').addEventListener('click', () => _closeModal('settingsModal'));
        settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) _closeModal('settingsModal'); });

        _initSettingsForm();
    }

    function _initSettingsForm() {
        const currentMode = AnimationEngine.getMode();
        const modeMock = document.getElementById('modeMock');
        const modeTdx = document.getElementById('modeTdx');

        if (modeTdx && modeMock) {
            if (currentMode === 'tdx') {
                modeTdx.checked = true;
            } else {
                modeMock.checked = true;
            }
        }

        document.getElementById('btnSaveSettings').addEventListener('click', async () => {
            const selectedMode = (modeTdx && modeTdx.checked) ? 'tdx' : 'mock';
            TimelineController.setMode(selectedMode);

            const badge = document.getElementById('dataSourceBadge');

            if (selectedMode === 'tdx') {
                badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span> 🔴 連線驗證中`;
                badge.className = 'text-xs font-normal text-rose-300 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20 flex items-center gap-1 shrink-0';

                const success = await TdxApiService.fetchAccessToken();
                if (success) {
                    badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> 🟢 TDX API 連線正常`;
                    badge.className = 'text-xs font-normal text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1 shrink-0';
                } else {
                    badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span> ⚠️ API 認證失敗`;
                    badge.className = 'text-xs font-semibold text-rose-300 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/30 shadow-sm flex items-center gap-1 shrink-0';
                }
            } else {
                badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span> 🟡 模擬數據運行中`;
                badge.className = 'text-xs font-normal text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 flex items-center gap-1 shrink-0';
            }

            // 完全切換模式 — 銷毀舊 Service，啟動新 Service
            AnimationEngine.switchMode(selectedMode);

            _closeModal('settingsModal');
        });
    }

    /* ══════════════════════════════════════════════
       Route Planner Modal
       ══════════════════════════════════════════════ */
    function _initRoutePlannerModal() {
        const routeModal = document.getElementById('routePlannerModal');
        document.getElementById('btnRoutePlannerToggle').addEventListener('click', () => _openModal('routePlannerModal'));
        document.getElementById('btnCloseRoutePlannerModal').addEventListener('click', () => _closeModal('routePlannerModal'));
        routeModal.addEventListener('click', (e) => { if (e.target === routeModal) _closeModal('routePlannerModal'); });

        _initRoutePlannerForm();
    }

    function _initRoutePlannerForm() {
        const startSelect = document.getElementById('routeStartSelect');
        const endSelect = document.getElementById('routeEndSelect');
        const { stations } = MrtDataService;

        const optionsHtml = Object.entries(stations).map(([code, st]) => {
            return `<option value="${code}">${st.name} (${code})</option>`;
        }).join('');

        startSelect.innerHTML = optionsHtml;
        endSelect.innerHTML = optionsHtml;
        startSelect.value = 'BL12';
        endSelect.value = 'R03';

        document.getElementById('btnSwapRouteStations').addEventListener('click', () => {
            const tmp = startSelect.value;
            startSelect.value = endSelect.value;
            endSelect.value = tmp;
        });

        document.getElementById('btnExecuteRouteSearch').addEventListener('click', () => {
            const startCode = startSelect.value;
            const endCode = endSelect.value;

            if (startCode === endCode) { alert('起點站與終點站不能相同！'); return; }

            const result = RoutePlanner.findShortestPath(startCode, endCode);
            if (result) {
                RoutePlanner.drawRouteHighlight(result.path);
                document.getElementById('routeEstTime').innerText = `預估約 ${result.estimatedMinutes} 分鐘`;
                document.getElementById('routeStationCount').innerText = `${result.stationCount} 站`;

                if (result.transfers.length === 0) {
                    document.getElementById('routeTransfers').innerText = '直達車（無需轉乘）';
                } else {
                    const transferText = result.transfers.map(t =>
                        `在 [${t.stationName}] 轉乘 ${MrtDataService.lines[t.toLine].name}`
                    ).join('；');
                    document.getElementById('routeTransfers').innerText = transferText;
                }

                document.getElementById('routeResultCard').classList.remove('hidden');
                document.getElementById('btnClearRouteHighlight').classList.remove('hidden');
                _closeModal('routePlannerModal');
            }
        });

        document.getElementById('btnClearRouteHighlight').addEventListener('click', () => {
            RoutePlanner.clearHighlight();
            document.getElementById('routeResultCard').classList.add('hidden');
            document.getElementById('btnClearRouteHighlight').classList.add('hidden');
        });
    }

    /* ══════════════════════════════════════════════
       Train Stats Modal（營運車輛統計）
       ══════════════════════════════════════════════ */
    function _initTrainStatsModal() {
        const trainStatsModal = document.getElementById('trainStatsModal');
        document.getElementById('btnTrainStatsToggle').addEventListener('click', _showTrainStatsModal);
        document.getElementById('btnCloseTrainStatsModal').addEventListener('click', () => _closeModal('trainStatsModal'));
        trainStatsModal.addEventListener('click', (e) => { if (e.target === trainStatsModal) _closeModal('trainStatsModal'); });
    }

    function _showTrainStatsModal() {
        const allTrains = AnimationEngine.getTrainObjects();
        const stats = {};
        let total = 0;

        allTrains.forEach(t => {
            if (!stats[t.lineKey]) stats[t.lineKey] = 0;
            stats[t.lineKey]++;
            total++;
        });

        let tableHtml = `<table class="w-full text-sm text-left text-gray-300">
            <thead class="text-xs text-gray-400 bg-gray-700/30 uppercase border-b border-gray-600/50">
                <tr>
                    <th class="px-4 py-2">路線名稱</th>
                    <th class="px-4 py-2 text-right">在線車輛數</th>
                </tr>
            </thead>
            <tbody>`;

        Object.entries(MrtDataService.lines).forEach(([key, info]) => {
            const count = stats[key] || 0;
            if (count > 0 || !info.isBranch) {
                tableHtml += `
                <tr class="border-b border-gray-700/50 hover:bg-gray-600/20">
                    <td class="px-4 py-2 flex items-center gap-2 font-medium">
                        <span class="w-3 h-3 rounded-full" style="background:${info.color}"></span>
                        ${info.name}
                    </td>
                    <td class="px-4 py-2 text-right font-mono font-bold">${count}</td>
                </tr>`;
            }
        });

        tableHtml += `
            <tr class="font-bold text-emerald-400 bg-gray-800/50">
                <td class="px-4 py-3">總計</td>
                <td class="px-4 py-3 text-right font-mono text-base">${total}</td>
            </tr>
            </tbody>
        </table>`;

        document.getElementById('trainStatsTableContainer').innerHTML = tableHtml;
        _openModal('trainStatsModal');
    }

    /* ══════════════════════════════════════════════
       Line Status Panel（路線營運狀態看板）
       ══════════════════════════════════════════════ */
    function _initLineStatusPanel() {
        const btn = document.getElementById('btnLineStatusToggle');
        const panel = document.getElementById('lineStatusPanel');
        if (!btn || !panel) return;

        btn.addEventListener('click', () => {
            panel.classList.toggle('hidden');
        });

        // 每 15 秒更新路線狀態
        updateLineStatusPanel();
        setInterval(updateLineStatusPanel, 15000);
    }

    function updateLineStatusPanel() {
        const container = document.getElementById('lineStatusContent');
        if (!container) return;

        const activeService = AnimationEngine.getActiveService();
        if (!activeService) return;

        const alerts = activeService.getLineAlerts();
        if (!alerts || alerts.length === 0) return;

        // Group by unique lineKey, show unique lines only
        const seen = new Set();
        const uniqueAlerts = [];
        alerts.forEach(a => {
            if (!seen.has(a.lineKey)) {
                seen.add(a.lineKey);
                uniqueAlerts.push(a);
            }
        });

        // Also add missing lines with normal status
        Object.entries(MrtDataService.lines).forEach(([key, info]) => {
            if (!seen.has(key)) {
                uniqueAlerts.push({
                    lineKey: key,
                    lineName: info.name,
                    color: info.color,
                    status: 'normal',
                    statusText: '正常營運',
                    detail: null
                });
            }
        });

        container.innerHTML = uniqueAlerts.map(a => {
            let icon = '🟢';
            let badgeClass = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
            if (a.status === 'warn' || a.status === 'info') {
                icon = '🟡';
                badgeClass = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
            } else if (a.status === 'error') {
                icon = '🔴';
                badgeClass = 'text-rose-400 bg-rose-500/10 border-rose-500/20 line-status-alert';
            }

            const detailHtml = a.detail
                ? `<div class="line-status-detail hidden text-[10px] opacity-80 mt-1 pl-5 border-l-2 border-gray-500/30">${a.detail}</div>`
                : '';

            return `<div class="line-status-item px-3 py-1.5 rounded-xl hover:bg-gray-500/10 transition-all cursor-pointer" data-line="${a.lineKey}" onclick="UIController.toggleAlertDetail(this)">
                <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:${a.color}"></span>
                    <span class="text-xs font-medium truncate flex-1">${a.lineName}</span>
                    <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${badgeClass}">${icon} ${a.statusText}</span>
                </div>
                ${detailHtml}
            </div>`;
        }).join('');
    }

    function toggleAlertDetail(el) {
        const detail = el.querySelector('.line-status-detail');
        if (detail) detail.classList.toggle('hidden');
    }

    /* ══════════════════════════════════════════════
       Station Drawer（車站資訊抽屜）
       ══════════════════════════════════════════════ */
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
        const expressBadge = st.lines.includes('A')
            ? (isExpressStop
                ? '<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-900 text-amber-300 border border-amber-400/50">⚡ 直達車停靠站</span>'
                : '<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-600 text-gray-300">普通車停靠站 (直達過站不停)</span>')
            : '';

        const lineChips = st.lines.map(lk => {
            const info = MrtDataService.lines[lk];
            return `<span class="px-2 py-0.5 rounded-md text-[11px] font-bold text-white shadow-sm" style="background:${info.color}">${info.name}</span>`;
        }).join(' ');

        const scheduleCardsHtml = st.lines.map(lineKey => {
            const lineInfo = MrtDataService.lines[lineKey];
            if (!lineInfo) return '';
            const termini = lineInfo.termini || ['起點站', '端點站'];
            return `<div class="bg-gray-500/10 border border-gray-500/15 p-2.5 rounded-xl space-y-1.5">
                <div class="font-bold text-xs flex items-center gap-1.5" style="color:${lineInfo.color}">
                    <span class="w-2 h-2 rounded-full" style="background:${lineInfo.color}"></span>
                    <span>${lineInfo.name} 首末班車時刻</span>
                </div>
                <div class="grid grid-cols-2 gap-2 text-[11px]">
                    <div class="bg-gray-900/40 p-1.5 rounded-lg border border-gray-700/50">
                        <div class="font-bold text-emerald-400">往 ${termini[1]} 方向</div>
                        <div>頭班車：<span class="font-mono font-bold">06:00</span></div>
                        <div>末班車：<span class="font-mono font-bold">24:00</span></div>
                    </div>
                    <div class="bg-gray-900/40 p-1.5 rounded-lg border border-gray-700/50">
                        <div class="font-bold text-blue-400">往 ${termini[0]} 方向</div>
                        <div>頭班車：<span class="font-mono font-bold">06:00</span></div>
                        <div>末班車：<span class="font-mono font-bold">00:15</span></div>
                    </div>
                </div>
            </div>`;
        }).join('');

        const activeService = AnimationEngine.getActiveService();
        const isNight = activeService ? activeService.isNighttime() : false;
        const opStatusTag = isNight
            ? `<span class="text-indigo-300 font-bold">🌙 目前為非營運時間 (00:00~06:00 末班車已收班)</span>`
            : `<span class="text-emerald-400 font-bold">🟢 全線營運正常 (06:00~24:00) · 班距 3-5 分鐘</span>`;

        document.getElementById('drawerBody').innerHTML = `
            <div class="flex items-center gap-2 mb-2">${lineChips} ${expressBadge}</div>
            <div class="opacity-90">地標類型：<span class="text-emerald-400 font-medium">${shapeObj.desc}</span></div>
            <div class="opacity-90">營運狀態：${opStatusTag}</div>
            <div class="border-t border-gray-500/20 pt-2.5 mt-2">
                <div class="font-bold text-[11px] opacity-75 mb-1.5 flex items-center justify-between">
                    <span>🕒 動態端點站頭末班車時間</span>
                    <span class="text-[10px] text-blue-400 font-mono">TDX / TRTC</span>
                </div>
                <div class="space-y-2">${scheduleCardsHtml}</div>
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
        _openDrawer();
    }

    /* ══════════════════════════════════════════════
       Train Drawer（列車資訊抽屜）
       ══════════════════════════════════════════════ */
    function showTrainDrawer(train) {
        const lineInfo = MrtDataService.lines[train.sequenceKey] || MrtDataService.lines[train.lineKey];
        const iconEl = document.getElementById('drawerIcon');
        iconEl.style.background = train.isExpress ? '#84005C' : lineInfo.color;
        iconEl.innerHTML = train.isExpress
            ? `<span class="text-amber-300 font-bold text-xs">直達</span>`
            : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M12 2C7 2 4 3.5 4 8.5V16c0 1.5 1 2.5 2.5 2.5L5 20.5h14l-1.5-2c1.5 0 2.5-1 2.5-2.5V8.5C20 3.5 17 2 12 2z"/><circle cx="8" cy="14" r="1.5"/><circle cx="16" cy="14" r="1.5"/></svg>`;

        const typeTitle = train.isExpress ? '桃園機捷 紫色直達特快車' : '普通車';
        document.getElementById('drawerTitle').innerText = `列車 ${train.id} (${typeTitle})`;
        document.getElementById('drawerSubtitle').innerText = `${lineInfo.name} · ${train.isExpress ? '極速 100 km/h (僅停 A1, A3, A8, A12, A13 於 A13 迴轉)' : '每站皆停'}`;

        const statusTag = train.isDwelling
            ? `<span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/40 dwell-badge">🟢 車站停靠載客中 (${(train.dwellTimeRemaining / 1000).toFixed(1)}s)</span>`
            : `<span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">⚡ 沿線區間行駛中</span>`;

        // 異常狀態顯示
        let anomalyTag = '';
        if (train.hasAnomaly) {
            if (train.anomalyLevel === 'error') {
                anomalyTag = `<div class="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 mt-1">🔴 定位嚴重異常 — 連續多次位置未更新</div>`;
            } else {
                anomalyTag = `<div class="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 mt-1">🟡 定位偏移警告 — 位置數據疑似停滯</div>`;
            }
        }

        const currentCode = train.sequence[train.segmentIndex];
        const nextCode = train.sequence[train.segmentIndex + train.direction] || currentCode;

        document.getElementById('drawerBody').innerHTML = `
            <div class="flex items-center justify-between bg-gray-500/10 p-2.5 rounded-xl border border-gray-500/20">
                <span class="opacity-90">運行狀態</span>
                ${statusTag}
            </div>
            ${anomalyTag}
            <div class="space-y-1.5 opacity-90 mt-2">
                <div>車輛編號：<span class="font-bold text-purple-300 font-mono">${train.id}</span></div>
                <div>當前位置：<span class="font-bold">${MrtDataService.stations[currentCode]?.name || currentCode} (${currentCode})</span></div>
                <div>前進行向：<span class="font-bold">➔ ${MrtDataService.stations[nextCode]?.name || nextCode} (${nextCode})</span></div>
                <div>車廂類型：<span class="text-purple-400 font-bold">${train.isExpress ? '⚡ 紫色流線型直達車 (A01 台北車站 ↔ A13 機場第二航廈迴轉)' : '普通車 (每站皆停)'}</span></div>
            </div>
        `;
        _openDrawer();
    }

    /* ══════════════════════════════════════════════
       Drawer / Modal Utilities
       ══════════════════════════════════════════════ */
    function _openDrawer() { document.getElementById('infoDrawer').classList.remove('translate-y-96', 'opacity-0'); }
    function _closeDrawer() { document.getElementById('infoDrawer').classList.add('translate-y-96', 'opacity-0'); }

    function _openModal(id) { document.getElementById(id).classList.remove('opacity-0', 'pointer-events-none'); }
    function _closeModal(id) { document.getElementById(id).classList.add('opacity-0', 'pointer-events-none'); }

    /* ══════════════════════════════════════════════
       Data Source Badge 更新
       ══════════════════════════════════════════════ */
    function updateDataSourceBadge(mode, status) {
        const badge = document.getElementById('dataSourceBadge');
        if (!badge) return;

        if (mode === 'mock') {
            badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span> <span>🟡 模擬數據運行中</span>`;
            badge.className = 'text-xs font-normal text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 flex items-center gap-1 shrink-0';
        } else if (status && !status.ok) {
            badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span> <span>⚠️ ${status.reason || 'API 異常'}</span>`;
            badge.className = 'text-xs font-semibold text-rose-300 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/30 shadow-sm flex items-center gap-1 shrink-0';
        } else {
            badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> <span>🟢 TDX API 連線正常</span>`;
            badge.className = 'text-xs font-normal text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1 shrink-0';
        }
    }

    /* ══════════════════════════════════════════════
       公開介面
       ══════════════════════════════════════════════ */
    return {
        init,
        selectStation,
        showStationDrawer,
        showTrainDrawer,
        showTrainStatsModal: _showTrainStatsModal,
        updateLineStatusPanel,
        updateDataSourceBadge,
        toggleAlertDetail
    };
})();
