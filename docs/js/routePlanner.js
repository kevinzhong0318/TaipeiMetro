/**
 * =========================================================================
 * js/routePlanner.js - 站對站路徑規劃 (RoutePlanner)
 * 包含圖形搜尋 BFS 演算法、轉乘分析、高亮軌道 Polyline 與「沿路線移動導引動畫」
 * =========================================================================
 */
const RoutePlanner = (function() {
    let adjacencyGraph = {};
    let routePolyline = null;
    let guideMarker = null;
    let guideAnimFrameId = null;

    function buildGraph() {
        adjacencyGraph = {};
        const { sequences } = MrtDataService;

        Object.values(sequences).forEach(seq => {
            for (let i = 0; i < seq.length - 1; i++) {
                const u = seq[i];
                const v = seq[i + 1];

                if (!adjacencyGraph[u]) adjacencyGraph[u] = new Set();
                if (!adjacencyGraph[v]) adjacencyGraph[v] = new Set();

                adjacencyGraph[u].add(v);
                adjacencyGraph[v].add(u);
            }
        });
    }

    function findShortestPath(startCode, endCode) {
        if (startCode === endCode) return { path: [startCode], transfers: [], stationCount: 0, estimatedMinutes: 0 };
        if (!adjacencyGraph[startCode]) buildGraph();

        const queue = [[startCode]];
        const visited = new Set([startCode]);

        while (queue.length > 0) {
            const path = queue.shift();
            const curr = path[path.length - 1];

            if (curr === endCode) {
                return analyzePathDetails(path);
            }

            const neighbors = adjacencyGraph[curr] || [];
            for (const n of neighbors) {
                if (!visited.has(n)) {
                    visited.add(n);
                    queue.push([...path, n]);
                }
            }
        }
        return null;
    }

    function analyzePathDetails(path) {
        const { stations, lines } = MrtDataService;
        let currentLine = null;
        const transfers = [];

        for (let i = 0; i < path.length - 1; i++) {
            const u = path[i];
            const v = path[i + 1];
            const commonLines = stations[u].lines.filter(l => stations[v].lines.includes(l));
            const segLine = commonLines[0] || stations[u].lines[0];

            if (currentLine && currentLine !== segLine) {
                transfers.push({ stationCode: u, stationName: stations[u].name, fromLine: currentLine, toLine: segLine });
            }
            currentLine = segLine;
        }

        const stationCount = path.length - 1;
        const estimatedMinutes = Math.round(stationCount * 2.2 + transfers.length * 4);

        return { path, transfers, stationCount, estimatedMinutes };
    }

    function drawRouteHighlight(pathCodes) {
        clearHighlight();
        const { stations } = MrtDataService;
        const map = MapController.getMap();

        const latLngs = pathCodes.map(code => [stations[code].lat, stations[code].lng]);

        routePolyline = L.polyline(latLngs, {
            color: '#38bdf8',
            weight: 8,
            opacity: 0.9,
            lineCap: 'round',
            lineJoin: 'round',
            className: 'pulse-live'
        }).addTo(map);

        map.fitBounds(routePolyline.getBounds(), { padding: [60, 60], maxZoom: 15 });

        // Start Moving Guidance Pulse Animation Along Polyline
        startGuidanceAnimation(latLngs);
    }

    function startGuidanceAnimation(latLngs) {
        const map = MapController.getMap();
        if (latLngs.length < 2) return;

        const icon = L.divIcon({
            className: 'route-guide-icon',
            html: `<div class="route-guide-pulse"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8]
        });

        guideMarker = L.marker(latLngs[0], { icon: icon, zIndexOffset: 1100 }).addTo(map);

        let segIdx = 0;
        let progress = 0;
        let speed = 0.008;

        function step() {
            progress += speed;
            if (progress >= 1.0) {
                progress = 0;
                segIdx++;
                if (segIdx >= latLngs.length - 1) {
                    segIdx = 0; // Loop moving guidance animation
                }
            }

            const p1 = latLngs[segIdx];
            const p2 = latLngs[segIdx + 1];

            if (p1 && p2) {
                const lat = p1[0] + (p2[0] - p1[0]) * progress;
                const lng = p1[1] + (p2[1] - p1[1]) * progress;
                guideMarker.setLatLng([lat, lng]);
            }

            guideAnimFrameId = requestAnimationFrame(step);
        }

        guideAnimFrameId = requestAnimationFrame(step);
    }

    function clearHighlight() {
        const map = MapController.getMap();
        if (guideAnimFrameId) {
            cancelAnimationFrame(guideAnimFrameId);
            guideAnimFrameId = null;
        }
        if (guideMarker && map) {
            map.removeLayer(guideMarker);
            guideMarker = null;
        }
        if (routePolyline && map) {
            map.removeLayer(routePolyline);
            routePolyline = null;
        }
    }

    return { buildGraph, findShortestPath, drawRouteHighlight, clearHighlight };
})();
