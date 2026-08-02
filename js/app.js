/**
 * =========================================================================
 * js/app.js - AnimationEngine (精簡版) + 應用程式啟動入口
 * 職責：管理 activeService 引用、Leaflet marker 渲染、模式切換
 * 數據源邏輯已完全委託給 MockDataService / TdxApiService
 * =========================================================================
 */

/**
 * -------------------------------------------------------------------------
 * AnimationEngine — 列車渲染引擎
 * 不包含任何 Mock 或 TDX 邏輯，僅負責：
 *   1. 管理 activeService（MockDataService 或 TdxApiService）
 *   2. requestAnimationFrame 動畫迴圈
 *   3. Leaflet marker 建立/更新/移除
 *   4. 路線可見度控制
 * -------------------------------------------------------------------------
 */
const AnimationEngine = (function () {
    let activeService = null;
    let currentMode = 'mock';   // 'mock' | 'tdx'
    let animFrameId = null;
    let lastTimestamp = 0;
    let lineVisibility = {};
    let markerMap = {};   // trainId -> L.marker

    // 初始化路線可見度
    Object.keys(MrtDataService.lines).forEach(k => lineVisibility[k] = true);

    /* ══════════════════════════════════════════════
       模式切換 — 完全銷毀舊 Service，啟動新 Service
       ══════════════════════════════════════════════ */
    function switchMode(mode) {
        console.log(`[AnimationEngine] switchMode: ${currentMode} → ${mode}`);

        // 1. 停止動畫
        if (animFrameId) {
            cancelAnimationFrame(animFrameId);
            animFrameId = null;
        }

        // 2. 清除所有 markers
        _purgeAllMarkers();

        // 3. 銷毀當前 Service
        if (activeService) {
            activeService.cleanup();
            activeService = null;
        }

        // 4. 啟動新 Service
        currentMode = mode;
        localStorage.setItem('tdx_mode', mode);

        if (mode === 'tdx') {
            activeService = TdxApiService;
        } else {
            activeService = MockDataService;
        }

        activeService.init();

        // 5. 重建地圖圖層
        MapController.purgeMapLayers();
        MapController.renderPolylines();
        MapController.renderStations();

        // 6. 重啟動畫
        lastTimestamp = 0;
        animFrameId = requestAnimationFrame(animate);

        // 7. 更新 UI
        _updateTrainCount();
        UIController.updateDataSourceBadge(mode, mode === 'tdx' ? TdxApiService.getConnectionStatus() : null);
        UIController.updateLineStatusPanel();
    }

    /* ══════════════════════════════════════════════
       初始化（首次啟動）
       ══════════════════════════════════════════════ */
    function init() {
        // 讀取上次儲存的模式
        const savedMode = localStorage.getItem('tdx_mode') || 'mock';
        currentMode = savedMode;

        if (savedMode === 'tdx') {
            activeService = TdxApiService;
        } else {
            activeService = MockDataService;
        }

        activeService.init();

        lastTimestamp = 0;
        animFrameId = requestAnimationFrame(animate);

        _updateTrainCount();

        console.log(
            `%c[AnimationEngine] 啟動完成 — 模式: ${currentMode}`,
            'color:#fff;background:#6366F1;font-weight:bold;font-size:12px;padding:3px 8px;border-radius:6px;'
        );
    }

    /* ══════════════════════════════════════════════
       動畫主迴圈
       ══════════════════════════════════════════════ */
    function animate(timestamp) {
        if (!lastTimestamp) lastTimestamp = timestamp;
        const delta = Math.min(timestamp - lastTimestamp, 64);
        lastTimestamp = timestamp;

        if (!activeService) {
            animFrameId = requestAnimationFrame(animate);
            return;
        }

        // 時段同步
        activeService.checkAndSyncNightState();

        // 取得速度倍率
        const speedMult = TimelineController.getSpeedMultiplier();

        // 讓 Service 更新列車位置（Mock 模式需要逐幀推進）
        activeService.update(delta, speedMult);

        // 取得最新列車陣列
        const trains = activeService.getTrains();

        // 渲染 markers
        _syncMarkers(trains);

        // 更新車輛數
        _updateTrainCount();

        animFrameId = requestAnimationFrame(animate);
    }

    /* ══════════════════════════════════════════════
       Marker 同步引擎
       ══════════════════════════════════════════════ */
    function _syncMarkers(trains) {
        const map = MapController.getMap();
        if (!map) return;

        const currentIds = new Set();

        trains.forEach(t => {
            currentIds.add(t.id);

            // 路線可見度
            const visible = lineVisibility[t.lineKey] !== false;

            if (t.marker) {
                // 已有 marker — 更新位置
                if (visible) {
                    t.marker.setLatLng(t.latLng);
                    t.marker.setOpacity(1);
                } else {
                    t.marker.setOpacity(0);
                }

                // 旋轉
                const pillEl = document.getElementById(`train-pill-${t.id}`);
                if (pillEl) pillEl.style.transform = `rotate(${-t.angle}deg)`;

                // 異常外框
                _applyAnomalyClass(t);

            } else {
                // 新列車 — 建立 marker
                t.marker = _createTrainMarker(t);
                markerMap[t.id] = t.marker;

                if (!visible) t.marker.setOpacity(0);
            }
        });

        // 移除已不存在的列車 marker
        Object.keys(markerMap).forEach(id => {
            if (!currentIds.has(id)) {
                map.removeLayer(markerMap[id]);
                delete markerMap[id];
            }
        });

        // 清除標記移除的列車
        trains.forEach(t => {
            if (t._markedForRemoval) {
                if (t.marker && map.hasLayer(t.marker)) {
                    map.removeLayer(t.marker);
                }
                t.marker = null;
                delete markerMap[t.id];
            }
        });
    }

    function _createTrainMarker(train) {
        const lineKey = train.sequenceKey || train.lineKey;
        const lineInfo = MrtDataService.lines[lineKey] || MrtDataService.lines[train.lineKey];
        const color = lineInfo ? lineInfo.color : '#888';

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

        const icon = L.divIcon({
            className: `train-div-icon ${train.hasAnomaly ? (train.anomalyLevel === 'error' ? 'train-anomaly-error' : 'train-anomaly-warn') : ''}`,
            html: html,
            iconSize: size,
            iconAnchor: anchor
        });

        const marker = L.marker(train.latLng, {
            icon: icon,
            zIndexOffset: train.isExpress ? 950 : 800
        }).addTo(MapController.getMap());

        // Tooltip 顯示車輛編號
        marker.bindTooltip(`<div class="text-xs font-mono font-bold">${train.id}</div><div class="text-[10px] opacity-80">${(MrtDataService.lines[train.sequenceKey] || MrtDataService.lines[train.lineKey] || {}).name || ''}</div>`, {
            direction: 'top',
            offset: [0, -8],
            className: 'train-tooltip'
        });

        marker.on('click', () => UIController.showTrainDrawer(train));

        return marker;
    }

    function _applyAnomalyClass(train) {
        if (!train.marker) return;
        const el = train.marker.getElement();
        if (!el) return;

        el.classList.remove('train-anomaly-warn', 'train-anomaly-error');
        if (train.hasAnomaly) {
            el.classList.add(train.anomalyLevel === 'error' ? 'train-anomaly-error' : 'train-anomaly-warn');
        }
    }

    /* ══════════════════════════════════════════════
       輔助方法
       ══════════════════════════════════════════════ */
    function _purgeAllMarkers() {
        const map = MapController.getMap();
        Object.values(markerMap).forEach(m => {
            if (map && map.hasLayer(m)) map.removeLayer(m);
        });
        markerMap = {};
    }

    function _updateTrainCount() {
        const countEl = document.getElementById('activeTrainCount');
        if (countEl && activeService) {
            countEl.innerText = activeService.getTrains().length;
        }
    }

    function setLineVisibility(lineKey, visible) {
        lineVisibility[lineKey] = visible;
    }

    function cleanup() {
        if (animFrameId) {
            cancelAnimationFrame(animFrameId);
            animFrameId = null;
        }
        _purgeAllMarkers();
        if (activeService) {
            activeService.cleanup();
            activeService = null;
        }
        lastTimestamp = 0;
        const countEl = document.getElementById('activeTrainCount');
        if (countEl) countEl.innerText = '0';
    }

    function restartEngine() {
        cleanup();
        init();
    }

    function getMode() { return currentMode; }
    function getActiveService() { return activeService; }

    function getTrainObjects() {
        return activeService ? activeService.getTrains() : [];
    }

    /**
     * 取得淡水信義線 (R Line) 列車（供 debugLogger 使用）
     */
    function getTamsuiXinyiTrains() {
        if (!activeService) return [];
        return activeService.getTrainsByLine('R');
    }

    /**
     * 判斷是否為夜間非營運時段（委託給 activeService）
     */
    function isNighttime() {
        return activeService ? activeService.isNighttime() : false;
    }

    function checkAndSyncNightState() {
        if (activeService) activeService.checkAndSyncNightState();
    }

    return {
        init,
        switchMode,
        setLineVisibility,
        cleanup,
        restartEngine,
        getMode,
        getActiveService,
        getTrainObjects,
        getTamsuiXinyiTrains,
        isNighttime,
        checkAndSyncNightState
    };
})();


/* ═══════════════════════════════════════════════════
   Application Main Entry Point
   ═══════════════════════════════════════════════════ */
window.addEventListener('DOMContentLoaded', () => {
    MapController.init();
    TimelineController.init();
    AnimationEngine.init();
    UIController.init();

    // 延遲啟動 debugLogger（等列車 spawn 完畢）
    if (window.TamsuiXinyiDebugLogger) {
        TamsuiXinyiDebugLogger.init();
    }

    // 首次更新 Badge
    const mode = AnimationEngine.getMode();
    UIController.updateDataSourceBadge(mode, mode === 'tdx' ? TdxApiService.getConnectionStatus() : null);
});
