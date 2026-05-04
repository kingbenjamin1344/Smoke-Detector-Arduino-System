/**
 * Smoke Sense Global System Monitor
 * Handles Audio, WebSockets, and Alert State across ALL pages.
 */

const SystemAlerts = {
    audioArmed: false,
    pendingAlertPlay: false,
    alertCheckInterval: null,
    socket: null,
    ALERT_STATE_KEY: 'smokeSenseAlertState',
    DEVICE_CACHE_KEY: 'smokeSenseDeviceCache',
    
    // Safety persistence
    lastDangerSeen: 0,
    CLEAR_SAFETY_BUFFER: 5000, 

    init() {
        console.log('[SystemAlerts] 🚀 Global Monitor Starting...');
        
        // 1. Proactive Audio Unlock (Try to grab permission from any past interaction)
        this.setupAudioArming();
        this.tryProactiveResume();

        // 2. State & Connection
        this.resumeFromStoredState();
        this.initWebSocket();
        this.startPeriodicCheck();
        this.checkCurrentSystemState();

        // 3. Constant Watchdog for Siren
        this.startSirenWatchdog();
    },

    tryProactiveResume() {
        // Many browsers allow audio if the user has interacted with the domain before
        if (window.EmergencyAudio) {
            window.EmergencyAudio.init();
            if (window.EmergencyAudio.audioCtx) {
                window.EmergencyAudio.audioCtx.resume().then(() => {
                    if (window.EmergencyAudio.audioCtx.state === 'running') {
                        console.log('[SystemAlerts] ✓ Proactive audio unlock successful!');
                        this.audioArmed = true;
                    }
                }).catch(() => {});
            }
        }
    },

    setupAudioArming() {
        const armHandler = () => {
            if (window.EmergencyAudio) {
                window.EmergencyAudio.init();
                if (window.EmergencyAudio.audioCtx) {
                    window.EmergencyAudio.audioCtx.resume().then(() => {
                        if (window.EmergencyAudio.audioCtx.state === 'running') {
                            this.audioArmed = true;
                            if (this.pendingAlertPlay) {
                                this.pendingAlertPlay = false;
                                this.startSiren();
                                this.hideGlobalAlertBanner();
                            }
                        }
                    });
                }
            }
        };
        // Listen to everything globally to unlock audio as early as possible
        window.addEventListener('mousedown', armHandler, { once: false, capture: true });
        window.addEventListener('keydown', armHandler, { once: false, capture: true });
        window.addEventListener('touchstart', armHandler, { once: false, capture: true });
        window.addEventListener('scroll', armHandler, { once: false, capture: true });
    },

    startSirenWatchdog() {
        // Every 1 second, if we should be playing, make sure we ARE playing
        setInterval(() => {
            const state = this.getAlertState();
            if (state && state.isActive) {
                if (this.audioArmed) {
                    if (window.EmergencyAudio && !window.EmergencyAudio.isPlaying) {
                        console.warn('[SystemAlerts] Watchdog: Siren should be playing but is not. Restarting...');
                        this.startSiren();
                    }
                } else {
                    // If we aren't armed yet but have danger, try to "auto-resume" 
                    // (Some modern browsers allow this if site engagement is high)
                    this.tryProactiveResume();
                }
            }
        }, 1000);
    },

    saveLiveDeviceData(deviceId, status, smokeLevel) {
        try {
            const cache = this.getGlobalDeviceCache();
            cache[String(deviceId)] = {
                status: status,
                smoke_level: smokeLevel,
                updated_at: Date.now()
            };
            localStorage.setItem(this.DEVICE_CACHE_KEY, JSON.stringify(cache));
        } catch (e) { console.error('[SystemAlerts] Cache Save Error:', e); }
    },

    getGlobalDeviceCache() {
        try {
            const stored = localStorage.getItem(this.DEVICE_CACHE_KEY);
            if (!stored) return {};
            return JSON.parse(stored);
        } catch (e) { return {}; }
    },

    getLiveDeviceData(deviceId) {
        const cache = this.getGlobalDeviceCache();
        const data = cache[String(deviceId)];
        if (data && Date.now() - data.updated_at < 60000) return data;
        return null;
    },

    saveAlertState(isActive) {
        localStorage.setItem(this.ALERT_STATE_KEY, JSON.stringify({
            isActive: isActive,
            timestamp: Date.now()
        }));
    },

    getAlertState() {
        try {
            const stored = localStorage.getItem(this.ALERT_STATE_KEY);
            if (!stored) return null;
            const state = JSON.parse(stored);
            if (Date.now() - state.timestamp < 10 * 60 * 1000) return state;
            return null;
        } catch (e) { return null; }
    },

    clearAlertState() {
        localStorage.removeItem(this.ALERT_STATE_KEY);
    },

    resumeFromStoredState() {
        const state = this.getAlertState();
        if (state && state.isActive) {
            this.lastDangerSeen = Date.now();
            this.pendingAlertPlay = true;
            if (this.audioArmed) {
                this.startSiren();
            } else {
                this.showGlobalAlertBanner();
            }
        }
    },

    initWebSocket() {
        this.socket = new WebSocket('ws://localhost:8080');
        this.socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'alert' || data.type === 'DEVICE_UPDATE') {
                    this.saveLiveDeviceData(data.device_id, data.status, data.smoke_level);
                    this.handleRealtimeUpdate(data);
                }
            } catch (e) { console.error('[SystemAlerts] WS Parse Error:', e); }
        };
        this.socket.onclose = () => setTimeout(() => this.initWebSocket(), 1000);
    },

    async checkCurrentSystemState() {
        try {
            const res = await fetch('http://localhost:5000/api/devices');
            const devices = await res.json();
            const hasDanger = devices.some(d => d.status === 'Danger');
            if (hasDanger) {
                this.handleDangerDetected();
            } else {
                this.handleSystemClearCheck();
            }
        } catch (e) { console.error('[SystemAlerts] State Check Failed:', e); }
    },

    startPeriodicCheck() {
        if (this.alertCheckInterval) clearInterval(this.alertCheckInterval);
        this.alertCheckInterval = setInterval(() => this.checkCurrentSystemState(), 3000);
    },

    handleRealtimeUpdate(data) {
        if (data.status === 'Danger') {
            this.handleDangerDetected();
        } else if (data.status === 'Warning') {
            this.updateGlobalStatusUI(false, true); 
        } else {
            this.handleSystemClearCheck();
        }
        if (typeof window.onSystemUpdate === 'function') {
            window.onSystemUpdate(data);
        }
    },

    handleDangerDetected() {
        this.lastDangerSeen = Date.now();
        this.saveAlertState(true);
        this.updateGlobalStatusUI(true);
        
        // Always try to forcefully start the siren first
        this.startSiren();
        
        // Wait a tiny bit to see if the browser allowed it (AudioContext became 'running')
        setTimeout(() => {
            if (window.EmergencyAudio && window.EmergencyAudio.audioCtx && window.EmergencyAudio.audioCtx.state === 'running') {
                this.audioArmed = true;
                this.pendingAlertPlay = false;
                this.hideGlobalAlertBanner();
                console.log('[SystemAlerts] ✓ Auto-Siren bypass successful!');
            } else {
                console.warn('[SystemAlerts] ⚠️ Browser blocked Auto-Siren. Setup manual banner.');
                this.pendingAlertPlay = true;
                this.showGlobalAlertBanner();
            }
        }, 200);
    },

    handleSystemClearCheck() {
        const timeSinceDanger = Date.now() - this.lastDangerSeen;
        if (timeSinceDanger > this.CLEAR_SAFETY_BUFFER) {
            if (window.EmergencyAudio && window.EmergencyAudio.isPlaying) {
                window.EmergencyAudio.stopSiren();
            }
            this.clearAlertState();
            this.pendingAlertPlay = false;
            this.hideGlobalAlertBanner();
            this.updateGlobalStatusUI(false);
        }
    },

    startSiren() {
        if (window.EmergencyAudio) {
            window.EmergencyAudio.playSiren();
        }
    },

    showGlobalAlertBanner() {
        // If we are already armed, we don't need a banner
        if (this.audioArmed) return;
        if (document.getElementById('globalAlertBanner')) return;
        
        const b = document.createElement('div');
        b.id = 'globalAlertBanner';
        b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:10000;background:#d32f2f;color:white;padding:15px;text-align:center;font-weight:700;cursor:pointer;box-shadow:0 10px 30px rgba(0,0,0,0.5);font-size:16px;display:flex;align-items:center;justify-content:center;gap:12px;animation:pulse-red-bg 1s infinite;';
        b.innerHTML = `<i class="fas fa-exclamation-triangle"></i> <span>SMOKE ALERT ACTIVE! CLICK TO START SIREN</span> <i class="fas fa-exclamation-triangle"></i>`;
        b.onclick = () => {
            if (window.EmergencyAudio) {
                window.EmergencyAudio.init();
                window.EmergencyAudio.audioCtx.resume().then(() => {
                    this.audioArmed = true;
                    this.pendingAlertPlay = false;
                    this.startSiren();
                    this.hideGlobalAlertBanner();
                });
            }
        };
        document.body.prepend(b);
    },

    hideGlobalAlertBanner() {
        const b = document.getElementById('globalAlertBanner');
        if (b) b.remove();
    },

    updateGlobalStatusUI(isDanger, isWarning = false) {
        const statusBar = document.getElementById('systemStatus');
        const statusLabel = document.getElementById('statusLabel');
        if (!statusBar || !statusLabel) return;

        if (isDanger) {
            statusBar.className = 'system-status-bar danger';
            statusLabel.innerHTML = '<i class="fas fa-exclamation-triangle"></i> EMERGENCY ALERT ACTIVE';
        } else if (isWarning) {
            statusBar.className = 'system-status-bar warning';
            statusLabel.innerHTML = '<i class="fas fa-exclamation-circle"></i> SENSOR WARNING DETECTED';
        } else {
            statusBar.className = 'system-status-bar armed';
            statusLabel.innerHTML = '<i class="fas fa-shield-alt"></i> SYSTEM ARMED & MONITORING';
        }
    }
};

SystemAlerts.init();
document.addEventListener('DOMContentLoaded', () => {
    const isDanger = SystemAlerts.getAlertState()?.isActive;
    SystemAlerts.updateGlobalStatusUI(isDanger);
});
window.SystemAlerts = SystemAlerts;
