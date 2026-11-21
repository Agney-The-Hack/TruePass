/**
 * AudioFeedback - Web Audio API Sound Generator
 * Generates sound effects in-browser with zero external asset dependencies.
 */
class SoundEffects {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }

    _initContext() {
        if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioCtx();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setEnabled(val) {
        this.enabled = !!val;
    }

    // Pleasant ascending chime when a known person is recognized
    playSuccess() {
        if (!this.enabled) return;
        try {
            this._initContext();
            if (!this.ctx) return;
            const now = this.ctx.currentTime;

            // Note 1: E5 (659.25Hz)
            const osc1 = this.ctx.createOscillator();
            const gain1 = this.ctx.createGain();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(659.25, now);
            gain1.gain.setValueAtTime(0.08, now);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
            osc1.connect(gain1);
            gain1.connect(this.ctx.destination);
            osc1.start(now);
            osc1.stop(now + 0.18);

            // Note 2: B5 (987.77Hz)
            const osc2 = this.ctx.createOscillator();
            const gain2 = this.ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(987.77, now + 0.09);
            gain2.gain.setValueAtTime(0.1, now + 0.09);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
            osc2.connect(gain2);
            gain2.connect(this.ctx.destination);
            osc2.start(now + 0.09);
            osc2.stop(now + 0.32);
        } catch (e) {
            console.debug('Audio not allowed yet:', e);
        }
    }

    // Soft alert tone for unknown face
    playAlert() {
        if (!this.enabled) return;
        try {
            this._initContext();
            if (!this.ctx) return;
            const now = this.ctx.currentTime;

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(320, now);
            osc.frequency.exponentialRampToValueAtTime(220, now + 0.22);
            gain.gain.setValueAtTime(0.06, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.22);
        } catch (e) {}
    }

    // Camera shutter snapshot sound
    playShutter() {
        if (!this.enabled) return;
        try {
            this._initContext();
            if (!this.ctx) return;
            const now = this.ctx.currentTime;

            // White noise burst
            const bufferSize = this.ctx.sampleRate * 0.05;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const output = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1;
            }

            const whiteNoise = this.ctx.createBufferSource();
            whiteNoise.buffer = buffer;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.setValueAtTime(1000, now);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

            whiteNoise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            whiteNoise.start(now);
        } catch (e) {}
    }
}

window.soundEffects = new SoundEffects();
