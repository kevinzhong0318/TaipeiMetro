/**
 * =========================================================================
 * js/timelineController.js - 即時時間與模擬控制 (TimelineController)
 * =========================================================================
 */
const TimelineController = (function() {
    let tickIntervalId = null;
    let mode = 'mock'; // 'mock' or 'tdx'
    let isCustomMode = false;
    let virtualMinuteOfDay = 480;
    let speedMultiplier = 1;
    let lastTickTime = Date.now();

    function init() {
        bindEvents();
        startVirtualClock();
    }

    function bindEvents() {
        const timeSlider = document.getElementById('timelineSlider');
        const speedButtons = document.querySelectorAll('.speed-btn');

        if (timeSlider) {
            timeSlider.addEventListener('input', (e) => {
                virtualMinuteOfDay = parseInt(e.target.value, 10);
                isCustomMode = true;
                updateUI();
                if (window.AnimationEngine) window.AnimationEngine.checkAndSyncNightState();
            });
        }

        speedButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const spd = parseInt(btn.dataset.speed, 10);
                speedMultiplier = spd;

                speedButtons.forEach(b => {
                    b.classList.remove('bg-emerald-500', 'text-white', 'font-bold');
                    b.classList.add('bg-gray-500/20', 'text-gray-300');
                });
                btn.classList.remove('bg-gray-500/20', 'text-gray-300');
                btn.classList.add('bg-emerald-500', 'text-white', 'font-bold');
            });
        });
    }

    function setMode(newMode) {
        mode = newMode;
        const mockControls = document.getElementById('mockModeControls');
        if (mode === 'mock') {
            mockControls.classList.remove('hidden');
            mockControls.classList.add('flex');
            isCustomMode = true;
        } else {
            mockControls.classList.add('hidden');
            mockControls.classList.remove('flex');
            isCustomMode = false;
            speedMultiplier = 1;
        }
        updateUI();
    }

    function getSpeedMultiplier() {
        return speedMultiplier;
    }

    function getCurrentTimeDate() {
        if (!isCustomMode || mode === 'tdx') {
            return new Date();
        } else {
            const d = new Date();
            const h = Math.floor(virtualMinuteOfDay / 60);
            const m = Math.floor(virtualMinuteOfDay % 60);
            d.setHours(h, m, 0, 0);
            return d;
        }
    }

    function startVirtualClock() {
        if (tickIntervalId) clearInterval(tickIntervalId);
        lastTickTime = Date.now();

        tickIntervalId = setInterval(() => {
            const now = Date.now();
            const deltaMs = now - lastTickTime;
            lastTickTime = now;

            if (mode === 'mock' && isCustomMode) {
                virtualMinuteOfDay += (deltaMs / 1000) * (speedMultiplier / 60) * 1.5;
                if (virtualMinuteOfDay >= 1440) virtualMinuteOfDay = 0;

                const slider = document.getElementById('timelineSlider');
                if (slider) slider.value = Math.floor(virtualMinuteOfDay);
            }
            updateUI();
        }, 150);
    }

    function updateUI() {
        const currentDate = getCurrentTimeDate();
        const timeString = currentDate.toLocaleTimeString('zh-TW', { hour12: false });
        
        const clockEl = document.getElementById('systemClock');
        if (clockEl) {
            clockEl.innerText = timeString;
        }

        const bottomClock = document.getElementById('bottomRealtimeClock');
        if (bottomClock) {
            bottomClock.innerText = timeString;
        }

        const hour = currentDate.getHours();
        const isNight = hour >= 0 && hour < 6;
        const badgeEl = document.getElementById('systemOpBadge');
        const textEl = document.getElementById('systemOpText');

        if (badgeEl && textEl) {
            if (isNight) {
                badgeEl.className = "text-xs font-semibold text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-full border border-indigo-500/30 flex items-center gap-1 shrink-0";
                textEl.innerText = "🌙 目前為非營運時間 (00:00~06:00 末班車已收班)";
                const countEl = document.getElementById('activeTrainCount');
                if (countEl) countEl.innerText = "0";
            } else {
                badgeEl.className = "text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1 shrink-0";
                textEl.innerText = mode === 'mock' 
                    ? `🟢 模擬營運中 (${speedMultiplier}x)` 
                    : `🟢 全線正常營運 06:00~24:00 (即時動態同步中)`;
            }
        }
    }

    return { init, setMode, getSpeedMultiplier, getCurrentTimeDate };
})();
