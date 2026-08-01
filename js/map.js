/**
 * =========================================================================
 * js/map.js - Leaflet 地圖初始化、底圖日夜模式、Zoom >= 14 站名標籤與 GPS (MapController)
 * =========================================================================
 */
const MapController = (function() {
    const config = {
        center: [25.0478, 121.5170],
        zoom: 12.5,
        minZoom: 10,
        maxZoom: 18,
        tiles: {
            dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
            light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
        }
    };

    let map;
    let currentTileLayer;
    let isDarkMode = true;
    let polylines = {};
    let stationMarkers = {};
    let stationLabelMarkers = {};
    let userLocationMarker = null;
    let userAccuracyCircle = null;

    function init() {
        map = L.map('map', {
            center: config.center,
            zoom: config.zoom,
            minZoom: config.minZoom,
            maxZoom: config.maxZoom,
            zoomControl: false,
            attributionControl: false
        });

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        updateTileLayer();
        renderPolylines();
        renderStations();

        map.on('zoomend', handleZoomChange);
        handleZoomChange();
    }

    function updateTileLayer() {
        if (currentTileLayer) map.removeLayer(currentTileLayer);
        const tileUrl = isDarkMode ? config.tiles.dark : config.tiles.light;
        currentTileLayer = L.tileLayer(tileUrl, { subdomains: 'abcd', maxZoom: 19 }).addTo(map);
    }

    function toggleTheme() {
        isDarkMode = !isDarkMode;
        const htmlEl = document.documentElement;
        document.getElementById('themeIcon').innerText = isDarkMode ? '🌙' : '☀️';
        document.getElementById('themeText').innerText = isDarkMode ? '夜間模式' : '日間模式';

        if (isDarkMode) {
            htmlEl.classList.add('dark');
            htmlEl.classList.remove('light');
        } else {
            htmlEl.classList.add('light');
            htmlEl.classList.remove('dark');
        }
        updateTileLayer();
    }

    function purgeMapLayers() {
        Object.values(polylines).forEach(p => map.removeLayer(p));
        Object.values(stationMarkers).forEach(m => map.removeLayer(m));
        Object.values(stationLabelMarkers).forEach(l => map.removeLayer(l));
        polylines = {};
        stationMarkers = {};
        stationLabelMarkers = {};
        if (window.RoutePlanner) RoutePlanner.clearHighlight();
    }

    function renderPolylines() {
        const { lines, sequences, stations } = MrtDataService;
        Object.entries(sequences).forEach(([seqKey, stationCodes]) => {
            if (seqKey === "A_Express") return;
            const lineKey = seqKey.startsWith("O") ? "O" : seqKey;
            const lineConfig = lines[seqKey] || lines[lineKey];
            const latLngs = stationCodes.map(code => [stations[code].lat, stations[code].lng]);

            const options = {
                color: lineConfig.color,
                weight: lineConfig.weight,
                opacity: lineConfig.isBranch ? 0.7 : 0.9,
                lineCap: 'round',
                lineJoin: 'round'
            };
            if (lineConfig.dash) options.dashArray = lineConfig.dash;

            polylines[seqKey] = L.polyline(latLngs, options).addTo(map);
        });
    }

    function createStationSvgIcon(shapeKey, isInterchange, transferLines) {
        const shapeObj = MrtDataService.shapes[shapeKey] || MrtDataService.shapes.circle;
        let transferDotsHtml = '';

        if (isInterchange && transferLines.length > 1) {
            const dots = transferLines.map(lineKey => {
                const c = MrtDataService.lines[lineKey] ? MrtDataService.lines[lineKey].color : '#94a3b8';
                return `<span class="w-1.5 h-1.5 rounded-full inline-block shadow-sm" style="background:${c}"></span>`;
            }).join('');
            transferDotsHtml = `<div class="absolute -bottom-1.5 flex items-center justify-center gap-0.5 px-0.5 py-0.2 rounded-full bg-slate-900/80 border border-slate-700/80">${dots}</div>`;
        }

        const svgContent = `<div class="station-node" style="width:18px; height:18px;">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">${shapeObj.svg}</svg>
            ${transferDotsHtml}
        </div>`;

        return L.divIcon({ className: 'station-div-icon', html: svgContent, iconSize: [18, 18], iconAnchor: [9, 9] });
    }

    function renderStations() {
        const { stations } = MrtDataService;
        Object.entries(stations).forEach(([code, st]) => {
            const isInterchange = st.lines.length > 1;
            const icon = createStationSvgIcon(st.shape, isInterchange, st.lines);
            
            const marker = L.marker([st.lat, st.lng], { icon: icon, zIndexOffset: isInterchange ? 500 : 100 }).addTo(map);
            marker.on('click', () => UIController.selectStation(code));
            stationMarkers[code] = marker;

            const labelIcon = L.divIcon({
                className: 'station-text-label-icon',
                html: `<div class="station-text-label">${st.name} <span class="text-[9px] font-normal opacity-75">${code}</span></div>`,
                iconSize: [120, 20],
                iconAnchor: [60, 0]
            });
            stationLabelMarkers[code] = L.marker([st.lat, st.lng], { icon: labelIcon, zIndexOffset: 200 });
        });
    }

    function handleZoomChange() {
        const zoom = map.getZoom();
        document.getElementById('zoomIndicator').innerText = `Zoom: ${zoom.toFixed(1)}`;
        const showLabels = zoom >= 14;

        Object.values(stationLabelMarkers).forEach(labelMarker => {
            if (showLabels) labelMarker.addTo(map);
            else map.removeLayer(labelMarker);
        });
    }

    function locateUser() {
        if (!navigator.geolocation) {
            alert("您的瀏覽器不支援 GPS 定位功能。");
            return;
        }
        navigator.geolocation.getCurrentPosition(pos => {
            const { latitude, longitude, accuracy } = pos.coords;
            if (userLocationMarker) map.removeLayer(userLocationMarker);
            if (userAccuracyCircle) map.removeLayer(userAccuracyCircle);

            userAccuracyCircle = L.circle([latitude, longitude], {
                radius: accuracy,
                color: '#3b82f6',
                fillColor: '#3b82f6',
                fillOpacity: 0.15,
                weight: 1.5
            }).addTo(map);

            const pulseIcon = L.divIcon({
                className: 'user-gps-icon',
                html: `<div class="relative flex items-center justify-center">
                    <span class="animate-ping absolute inline-flex h-6 w-6 rounded-full bg-blue-400 opacity-75"></span>
                    <span class="relative inline-flex rounded-full h-4 w-4 bg-blue-600 border-2 border-white shadow-lg"></span>
                </div>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });

            userLocationMarker = L.marker([latitude, longitude], { icon: pulseIcon, zIndexOffset: 1200 }).addTo(map);
            map.flyTo([latitude, longitude], 15, { duration: 1.4 });
        }, err => {
            alert("無法取得您的 GPS 位置：" + err.message);
        }, { enableHighAccuracy: true, timeout: 10000 });
    }

    function resetView() { map.flyTo(config.center, config.zoom, { duration: 1.2 }); }
    function getMap() { return map; }
    function getPolylines() { return polylines; }

    return { init, toggleTheme, locateUser, resetView, getMap, getPolylines, purgeMapLayers, renderPolylines, renderStations };
})();
