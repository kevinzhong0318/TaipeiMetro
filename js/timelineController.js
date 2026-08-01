/**
 * =========================================================================
 * js/timelineController.js - 自訂時間選擇器與列車 1x/2x/5x/10x/25x/50x 倍速播放控制器
 * =========================================================================
 */
const TimelineController = (function() {
    let isCustomMode = false;       // 是否開啟自訂/虛擬時間模式
    let speedMultiplier = 1;        // 預設 1x 速度 multiplier (1, 2, 5, 10, 25, 50)
    let virtualMinuteOfDay = 480;   // 預設 08:00 AM (8 * 60 = 480 分鐘)
    let lastTickTime = Date.now();
    let tickIntervalId = null;

    function init() {
        bindEvents();
        startVirtualClock();
    }

    function bindEvents() {
        const timeInput = document.getElementById('virtualTimeInput');
        const timeSlider = document.getElementById('timelineSlider');
        const speedButtons = document.querySelectorAll('.speed-btn');

        if (timeInput) {
            timeInput.addEventListener('change', (e) => {
                const val = e.target.value; // "HH:MM"
                if (val) {
                    const [h, m] = val.split(':').map(Number);
                    virtualMinuteOfDay = h * 60 + m;
                    isCustomMode = true;
                    if (timeSlider) timeSlider.value = virtualMinuteOfDay;
                    updateUI();
                    if (window.AnimationEngine) window.AnimationEngine.checkAndSyncNightState();
                }
            });
        }

        if (timeSlider) {
            timeSlider.addEventListener('input', (e) => {
                virtualMinuteOfDay = parseInt(e.target.value, 10);
                isCustomMode = true;
                if (timeInput) {
                    const h = String(Math.floor(virtualMinuteOfDay / 60)).padStart(2, '0');
                    const m = String(virtualMinuteOfDay % 60).padStart(2, '0');
                    timeInput.value = `${h}:${m}`;
                }
                updateUI();
                if (window.AnimationEngine) window.AnimationEngine.checkAndSyncNightState();
            });
        }

        speedButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const spd = parseInt(btn.dataset.speed, 10);
                setSpeed(spd);

                speedButtons.forEach(b => {
                    b.classList.remove('bg-emerald-500', 'text-white', 'font-bold');
                    b.classList.add('bg-gray-500/20', 'text-gray-300');
                });
                btn.classList.remove('bg-gray-500/20', 'text-gray-300');
                btn.classList.add('bg-emerald-500', 'text-white', 'font-bold');
            });
        });

        const btnRealtimeReset = document.getElementById('btnRealtimeReset');
        if (btnRealtimeReset) {
            btnRealtimeReset.addEventListener('click', () => {
                isCustomMode = false;
                setSpeed(1);
                updateUI();
                if (window.AnimationEngine) window.AnimationEngine.checkAndSyncNightState();
            });
        }
    }

    function setSpeed(mult) {
        speedMultiplier = mult;
    }

    function getSpeedMultiplier() {
        return speedMultiplier;
    }

    function isCustomTime() {
        return isCustomMode;
    }

    function getCurrentTimeDate() {
        if (!isCustomMode) {
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

            if (isCustomMode) {
                // If custom time mode and Nx speed, advance virtual minute
                virtualMinuteOfDay += (deltaMs / 1000) * speedMultiplier * 0.2;
                if (virtualMinuteOfDay >= 1440) virtualMinuteOfDay = 0;

                const slider = document.getElementById('timelineSlider');
                const input = document.getElementById('virtualTimeInput');
                if (slider) slider.value = Math.floor(virtualMinuteOfDay);
                if (input) {
                    const h = String(Math.floor(virtualMinuteOfDay / 60)).padStart(2, '0');
                    const m = String(Math.floor(virtualMinuteOfDay % 60)).padStart(2, '0');
                    input.value = `${h}:${m}`;
                }
            }
            updateUI();
        }, 500);
    }

    function updateUI() {
        const currentDate = getCurrentTimeDate();
        const clockEl = document.getElementById('systemClock');
        if (clockEl) {
            clockEl.innerText = currentDate.toLocaleTimeString('zh-TW', { hour12: false });
        }

        const hour = currentDate.getHours();

        // 呼叫地圖控制器的日夜模式自動感知（若是 Auto 模式，06:00~18:00 切換淺色底圖，其餘為深色）
        if (window.MapController) {
            window.MapController.updateAutoTheme(hour);
        }

        // Nighttime sensing check (01:00 ~ 06:00 非營運時段)
        const isNight = hour >= 1 && hour < 6;
        const badgeEl = document.getElementById('systemOpBadge');
        const textEl = document.getElementById('systemOpText');

        if (badgeEl && textEl) {
            if (isNight) {
                badgeEl.className = "text-xs font-semibold text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-full border border-indigo-500/30 flex items-center gap-1 shrink-0";
                textEl.innerText = "🌙 目前為非營運時間 (末班車已收班)";
                const countEl = document.getElementById('activeTrainCount');
                if (countEl) countEl.innerText = "0 (收班)";
            } else {
                badgeEl.className = "text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1 shrink-0";
                textEl.innerText = `🟢 全線正常營運 (${speedMultiplier}x 倍速)`;
            }
        }
    }

    return { init, setSpeed, getSpeedMultiplier, isCustomTime, getCurrentTimeDate };
})();
