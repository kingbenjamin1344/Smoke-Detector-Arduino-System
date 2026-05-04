/**
 * Smoke Sense Emergency Audio System
 * Uses Web Audio API to generate a repeating synthetic siren sound.
 * Each "wail" is a short oscillator node that is started/stopped cleanly,
 * avoiding the WebAudio scheduling drift that plagued the old approach.
 */

const EmergencyAudio = {
    audioCtx: null,
    isPlaying: false,
    _intervalId: null,
    _toneCount: 0,
    _lastToneTime: 0,

    init() {
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            console.log('[EmergencyAudio] Audio context created - state:', this.audioCtx.state);
        }
        // Resume a suspended context (required after user interaction)
        if (this.audioCtx.state === 'suspended') {
            console.log('[EmergencyAudio] Resuming suspended audio context');
            this.audioCtx.resume();
        }
        console.log('[EmergencyAudio] Audio context state:', this.audioCtx.state);
    },

    _playTone() {
        if (!this.isPlaying) {
            console.warn('[EmergencyAudio] ⚠️ _playTone called but isPlaying is FALSE - interval should be cleared!');
            if (this._intervalId) {
                console.warn('[EmergencyAudio] Clearing orphaned interval:', this._intervalId);
                clearInterval(this._intervalId);
                this._intervalId = null;
            }
            return;
        }
        
        if (!this.audioCtx) {
            console.error('[EmergencyAudio] ❌ No audio context!');
            return;
        }

        // Check if audio context got suspended
        if (this.audioCtx.state === 'suspended') {
            console.warn('[EmergencyAudio] ⚠️ Audio context suspended - attempting to resume');
            this.audioCtx.resume();
        }

        this._toneCount++;
        this._lastToneTime = Date.now();
        
        if (this._toneCount % 5 === 0) {
            console.log('[EmergencyAudio] 🔊 Tone #', this._toneCount, '| isPlaying:', this.isPlaying, '| intervalId:', this._intervalId, '| ctx state:', this.audioCtx.state);
        }

        try {
            const osc  = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();

            osc.type = 'square';
            const now = this.audioCtx.currentTime;

            // Wail: sweep 440 → 880 → 440 Hz over 1 second
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.5);
            osc.frequency.exponentialRampToValueAtTime(440, now + 1.0);

            // Fade out at the end to avoid clicks
            gain.gain.setValueAtTime(0.18, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.95);

            osc.connect(gain);
            gain.connect(this.audioCtx.destination);

            osc.start(now);
            osc.stop(now + 1.0);
        } catch (e) {
            console.error('[EmergencyAudio] ❌ Error playing tone:', e);
        }
    },

    playSiren() {
        if (this.isPlaying) {
            console.log('[EmergencyAudio] playSiren called but already playing - intervalId:', this._intervalId);
            return;
        }
        console.log('[EmergencyAudio] 🚨 Starting siren...');
        this.init();
        
        // Attempt to resume context before playing
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }

        this.isPlaying = true;
        this._toneCount = 0;
        this._lastToneTime = Date.now();

        // Play first tone immediately
        this._playTone();
        
        // Set up interval for continuous play
        this._intervalId = setInterval(() => {
            if (!this.isPlaying) {
                console.warn('[EmergencyAudio] ⚠️ Interval running but isPlaying is FALSE - clearing interval');
                clearInterval(this._intervalId);
                this._intervalId = null;
                return;
            }
            
            // Check if tones are actually playing (Self-Healing)
            const timeSinceLastTone = Date.now() - this._lastToneTime;
            if (timeSinceLastTone > 2500) {
                console.warn('[EmergencyAudio] ⚠️ Siren stalled! Forced restart...');
                this._toneCount = 0;
                this._playTone();
            } else {
                this._playTone();
            }
        }, 1000);
        
        console.log('[EmergencyAudio] ✓ Siren started - intervalId:', this._intervalId, '| isPlaying:', this.isPlaying);
    },

    stopSiren() {
        console.log('[EmergencyAudio] 🛑 stopSiren called - isPlaying:', this.isPlaying, '| intervalId:', this._intervalId, '| toneCount:', this._toneCount);
        this.isPlaying = false;
        if (this._intervalId) {
            clearInterval(this._intervalId);
            console.log('[EmergencyAudio] ✓ Interval', this._intervalId, 'cleared');
            this._intervalId = null;
        }
        this._toneCount = 0;
        this._lastToneTime = 0;
    }
};

window.EmergencyAudio = EmergencyAudio;
