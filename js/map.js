/**
 * =========================================================================
 * js/map.js - Leaflet 地圖初始化、固定風格與手動切換 (Light/Dark)、Zoom 14 站名與 GPS 定位
 * 地圖底圖不會隨日出日落或時間推進而自動變更，保持視覺高度穩定
 * =========================================================================
 */
const MapController = (function() {
    let map = null;
    let currentTheme = 'dark'; // 'dark' | 'light'
    let tileLayer = null;
    let stationMarkers = {};
    let stationTextLabels = {};
    let polylines = {};
    let userLocationMarker = null;

    const tiles = {
        dark: {
            url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        },
        light: {
            url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        }
    };

    function init() {
        map = L.map('map', {
            center: [25.0463, 121.5175], // 台北車站中心
            zoom: 12.5,
            zoomControl: false,
            attributionControl: false
        });

        // Add Zoom Control to bottom right
        L.control.zoom({ position: 'bottomright' }).addTo(map);

        tileLayer = L.tileLayer(tiles.dark.url, {
            attribution: tiles.dark.attribution,
            maxZoom: 19
        }).addTo(map);

        renderPolylines();
        renderStations();
        bindMapEvents();
    }

    function renderPolylines() {
        const { lines, sequences, stations } = MrtDataService;

        Object.keys(sequences).forEach(seqKey => {
            const lineKey = seqKey.startsWith("A") ? (seqKey === "A_Express" ? "A_Express" : "A") : (seqKey.startsWith("O") ? "O" : seqKey);
            const lineInfo = lines[seqKey] || lines[lineKey];
            if (!lineInfo) return;

            const latLngs = sequences[seqKey].map(code => {
                const st = stations[code];
                return [st.lat, st.lng];
            });

            const polylineOptions = {
                color: lineInfo.color,
                weight: lineInfo.weight,
                opacity: 0.9,
                lineCap: 'round',
                lineJoin: 'round'
            };

            if (lineInfo.dash) {
                polylineOptions.dashArray = lineInfo.dash;
            }

            const poly = L.polyline(latLngs, polylineOptions).addTo(map);
            polylines[seqKey] = poly;
        });
    }

    function renderStations() {
        const { stations, shapes, lines } = MrtDataService;

        Object.entries(stations).forEach(([code, st]) => {
            const primaryLineKey = st.lines[0];
            const primaryLine = lines[primaryLineKey];
            const shapeObj = shapes[st.shape] || shapes.circle;

            // Scaled down SVG Marker (18x18px)
            const iconHtml = `<div class="station-node" style="color:${primaryLine.color}" title="${st.name} (${code})">
                <svg width="18" height="18" viewBox="0 0 18 18">${shapeObj.svg}</svg>
            </div>`;

            const stationIcon = L.divIcon({
                className: 'station-div-icon',
                html: iconHtml,
                iconSize: [18, 18],
                iconAnchor: [9, 9]
            });

            const marker = L.marker([st.lat, st.lng], { icon: stationIcon, zIndexOffset: 900 }).addTo(map);
            marker.on('click', () => {
                UIController.selectStation(code);
            });

            stationMarkers[code] = marker;

            // Dynamic Station Text Label (Default Hidden, Visible Zoom >= 14)
            const labelHtml = `<div class="station-text-label" id="label-${code}">${st.name}</div>`;
            const labelIcon = L.divIcon({
                className: 'station-text-label-icon',
                html: labelHtml,
                iconSize: [80, 20],
                iconAnchor: [40, -4]
            });

            const labelMarker = L.marker([st.lat, st.lng], { icon: labelIcon, zIndexOffset: 500 });
            stationTextLabels[code] = labelMarker;
        });

        checkZoomAndToggleLabels();
    }

    function bindMapEvents() {
        map.on('zoomend', () => {
            const zoom = map.getZoom();
            document.getElementById('zoomIndicator').innerText = `Zoom: ${zoom.toFixed(1)}`;
            checkZoomAndToggleLabels();
        });
    }

    function checkZoomAndToggleLabels() {
        const currentZoom = map.getZoom();
        const shouldShow = currentZoom >= 14;

        Object.values(stationTextLabels).forEach(labelMarker => {
            if (shouldShow) {
                if (!map.hasLayer(labelMarker)) labelMarker.addTo(map);
            } else {
                if (map.hasLayer(labelMarker)) map.removeLayer(labelMarker);
            }
        });
    }

    function toggleTheme() {
        const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(nextTheme);
    }

    function applyTheme(theme) {
        currentTheme = theme;
        tileLayer.setUrl(tiles[theme].url);

        const htmlEl = document.documentElement;
        const themeIcon = document.getElementById('themeIcon');
        const themeText = document.getElementById('themeText');

        if (theme === 'light') {
            htmlEl.classList.remove('dark');
            htmlEl.classList.add('light');
            if (themeIcon) themeIcon.innerText = '☀️';
            if (themeText) themeText.innerText = '日間模式';
        } else {
            htmlEl.classList.remove('light');
            htmlEl.classList.add('dark');
            if (themeIcon) themeIcon.innerText = '🌙';
            if (themeText) themeText.innerText = '夜間模式';
        }
    }

    // 不會隨日出日落或時間推進自動更換地圖底圖，地圖視覺保持穩定
    function updateAutoTheme(dateObj) {
        // No auto-switching of map tiles based on sunrise/sunset
    }

    function locateUser() {
        if (!navigator.geolocation) {
            alert('您的瀏覽器不支援 Geolocation GPS 定位功能。');
            return;
        }

        const btn = document.getElementById('btnLocationToggle');
        btn.classList.add('animate-pulse');

        navigator.geolocation.getCurrentPosition(
            (position) => {
                btn.classList.remove('animate-pulse');
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                if (userLocationMarker) {
                    map.removeLayer(userLocationMarker);
                }

                const userIcon = L.divIcon({
                    className: 'user-gps-icon',
                    html: `<div class="relative flex items-center justify-center">
                        <span class="animate-ping absolute inline-flex h-6 w-6 rounded-full bg-blue-400 opacity-75"></span>
                        <span class="relative inline-flex rounded-full h-4 w-4 bg-blue-600 border-2 border-white shadow-lg"></span>
                    </div>`,
                    iconSize: [24, 24],
                    iconAnchor: [12, 12]
                });

                userLocationMarker = L.marker([lat, lng], { icon: userIcon, zIndexOffset: 1000 }).addTo(map);
                map.flyTo([lat, lng], 15, { duration: 1.5 });
                userLocationMarker.bindPopup(`<b>📍 您當前的位置</b><br>GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}`).openPopup();
            },
            (error) => {
                btn.classList.remove('animate-pulse');
                alert(`無法取得 GPS 位置：${error.message}`);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }

    function resetView() {
        map.flyTo([25.0463, 121.5175], 12.5, { duration: 1.2 });
    }

    function purgeMapLayers() {
        Object.values(stationMarkers).forEach(m => map.removeLayer(m));
        Object.values(stationTextLabels).forEach(m => map.removeLayer(m));
        Object.values(polylines).forEach(p => map.removeLayer(p));
        if (userLocationMarker) map.removeLayer(userLocationMarker);

        stationMarkers = {};
        stationTextLabels = {};
        polylines = {};
        userLocationMarker = null;
    }

    return {
        init,
        getMap: () => map,
        getPolylines: () => polylines,
        toggleTheme,
        updateAutoTheme,
        locateUser,
        resetView,
        renderPolylines,
        renderStations,
        purgeMapLayers
    };
})();
