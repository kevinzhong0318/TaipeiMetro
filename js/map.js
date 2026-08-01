/**
 * =========================================================================
 * js/map.js - Leaflet 地圖初始化、雙圖層預載 (0ms極速瞬間切換)、台北天文精確日出日落自動切換日夜模式
 * 拖曳左下角時間軸時，一到當日台北日出/日落時間點 0 毫秒即刻瞬間切換淺色/深色模式
 * =========================================================================
 */
const MapController = (function() {
    let map = null;
    let currentTheme = 'dark'; // 'dark' | 'light'
    let themeMode = 'auto';    // 'auto' (日出日落自動感應) | 'light' (手動日間) | 'dark' (手動夜間)
    let darkTileLayer = null;
    let lightTileLayer = null;
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

    /**
     * 根據台北地理座標 (25.0463° N, 121.5175° E) 與日期，精確計算當天日出與日落時間
     */
    function getTaipeiSunriseSunset(dateObj) {
        const d = dateObj || new Date();
        const start = new Date(d.getFullYear(), 0, 0);
        const diff = d - start;
        const oneDay = 1000 * 60 * 60 * 24;
        const dayOfYear = Math.floor(diff / oneDay);

        const lat = 25.0463;
        const lng = 121.5175;
        const rad = Math.PI / 180;

        const dec = 23.45 * Math.sin(2 * Math.PI * (284 + dayOfYear) / 365) * rad;
        const cosHa = -Math.tan(lat * rad) * Math.tan(dec);
        const ha = Math.acos(Math.max(-1, Math.min(1, cosHa)));

        const lngCorrection = (120 - lng) * 4 / 60; // 台北 UTC+8 赤經修正
        const sunriseHour = 12 - (ha * 180 / Math.PI) / 15 + lngCorrection;
        const sunsetHour = 12 + (ha * 180 / Math.PI) / 15 + lngCorrection;

        const srMin = Math.round(sunriseHour * 60);
        const ssMin = Math.round(sunsetHour * 60);

        const srH = String(Math.floor(srMin / 60)).padStart(2, '0');
        const srM = String(srMin % 60).padStart(2, '0');
        const ssH = String(Math.floor(ssMin / 60)).padStart(2, '0');
        const ssM = String(ssMin % 60).padStart(2, '0');

        return {
            sunriseMinutes: srMin,
            sunsetMinutes: ssMin,
            sunriseFormatted: `${srH}:${srM}`,
            sunsetFormatted: `${ssH}:${ssM}`
        };
    }

    function init() {
        map = L.map('map', {
            center: [25.0463, 121.5175], // 台北車站中心
            zoom: 12.5,
            zoomControl: false,
            attributionControl: false
        });

        // Add Zoom Control to bottom right
        L.control.zoom({ position: 'bottomright' }).addTo(map);

        // 預先加載雙圖層（Dark Matter 與 Voyager），實現 0 毫秒極速瞬間無縫切換
        darkTileLayer = L.tileLayer(tiles.dark.url, { attribution: tiles.dark.attribution, maxZoom: 19, opacity: 1 }).addTo(map);
        lightTileLayer = L.tileLayer(tiles.light.url, { attribution: tiles.light.attribution, maxZoom: 19, opacity: 0 }).addTo(map);

        renderPolylines();
        renderStations();
        bindMapEvents();

        // 初始自動感應主題
        updateAutoTheme(new Date());
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

    /**
     * 右上角主題按鈕：三階循環切換【🌗 日夜自動感應 ➔ ☀️ 日間模式 ➔ 🌙 夜間模式】
     */
    function toggleTheme() {
        if (themeMode === 'auto') {
            themeMode = 'light';
            applyTheme('light');
        } else if (themeMode === 'light') {
            themeMode = 'dark';
            applyTheme('dark');
        } else {
            themeMode = 'auto';
            if (window.TimelineController) {
                updateAutoTheme(TimelineController.getCurrentTimeDate());
            } else {
                updateAutoTheme(new Date());
            }
        }
    }

    /**
     * 0 毫秒極速切換地圖與 UI 主題 (透明度無縫淡入淡出)
     */
    function applyTheme(theme) {
        currentTheme = theme;

        if (darkTileLayer && lightTileLayer) {
            if (theme === 'light') {
                lightTileLayer.setOpacity(1);
                darkTileLayer.setOpacity(0);
            } else {
                darkTileLayer.setOpacity(1);
                lightTileLayer.setOpacity(0);
            }
        }

        const htmlEl = document.documentElement;
        const themeIcon = document.getElementById('themeIcon');
        const themeText = document.getElementById('themeText');

        if (theme === 'light') {
            htmlEl.classList.remove('dark');
            htmlEl.classList.add('light');
            if (themeIcon) themeIcon.innerText = themeMode === 'auto' ? '🌗' : '☀️';
            if (themeText) themeText.innerText = themeMode === 'auto' ? '日間模式 (自動)' : '日間模式 (手動)';
        } else {
            htmlEl.classList.remove('light');
            htmlEl.classList.add('dark');
            if (themeIcon) themeIcon.innerText = themeMode === 'auto' ? '🌗' : '🌙';
            if (themeText) themeText.innerText = themeMode === 'auto' ? '夜間模式 (自動)' : '夜間模式 (手動)';
        }
    }

    /**
     * 依據時間軸虛擬時間與當天台北日出日落，0 毫秒即刻瞬間切換淺色 (Light) 或深色 (Dark) 地圖
     */
    function updateAutoTheme(dateObj) {
        const d = dateObj || new Date();
        const sunInfo = getTaipeiSunriseSunset(d);

        const sunInfoEl = document.getElementById('taipeiSunInfoText');
        if (sunInfoEl) {
            sunInfoEl.innerText = `🌅 今日日出 ${sunInfo.sunriseFormatted} · 🌇 日落 ${sunInfo.sunsetFormatted}`;
        }

        if (themeMode !== 'auto') return; // 若為手動鎖定模式則不自動變更

        const currentMinutes = d.getHours() * 60 + d.getMinutes();

        // 精確判定當前時間是否介於日出與日落時間之間
        const isDaytime = currentMinutes >= sunInfo.sunriseMinutes && currentMinutes < sunInfo.sunsetMinutes;
        const targetTheme = isDaytime ? 'light' : 'dark';

        if (targetTheme !== currentTheme) {
            applyTheme(targetTheme);
        }
    }

    function setThemeMode(mode) {
        themeMode = mode; // 'auto' | 'light' | 'dark'
        const badge = document.getElementById('themeModeBadge');
        if (badge) {
            badge.innerText = mode === 'auto' ? '日出日落自動感應' : (mode === 'light' ? '日間手動鎖定' : '夜間手動鎖定');
        }
    }

    function getThemeMode() { return themeMode; }

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
        getTaipeiSunriseSunset,
        setThemeMode,
        getThemeMode,
        locateUser,
        resetView,
        renderPolylines,
        renderStations,
        purgeMapLayers
    };
})();
