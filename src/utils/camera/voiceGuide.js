const DEFAULTS = {
    basePath: '/voices',
    extension: 'opus',
    minGapMs: 250,
    repeatMs: 2800,
    lang: 'fa-IR',
    haptics: true,
    ttsFallback: true,
};

let audioUnlocked = false;
let ttsOwner = null;

export async function unlockVoiceGuideAudio() {
    if (audioUnlocked) return true;
    try {
        const a = new Audio();
        a.muted = true;
        a.src =
            'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YQAAAAA=';
        await a.play();
        a.pause();
        audioUnlocked = true;
    } catch {
        audioUnlocked = false;
    }
    try {
        window.speechSynthesis?.resume?.();
    } catch { /* noop */ }
    return audioUnlocked;
}

export const isVoiceGuideAudioUnlocked = () => audioUnlocked;

export class VoiceGuide {
    constructor(options = {}) {
        this.opts = { ...DEFAULTS, ...options };
        this.audio = null;
        this.playing = null;
        this.playingPriority = -1;
        this.lastSpokenId = null;
        this.lastSpokenAt = 0;
        this.freeAt = 0;
        this.unavailable = new Set();
        this.unlocked = audioUnlocked;
        this.enabled = true;
    }

    async unlock() {
        this.unlocked = await unlockVoiceGuideAudio();
        return this.unlocked;
    }

    setEnabled(enabled) {
        const next = enabled !== false;
        if (this.enabled === next) return;
        this.enabled = next;
        if (!next) this.stop();
    }

    preload(guidances = []) {
        for (const g of guidances) {
            if (!g?.id) continue;
            const a = new Audio(this._url(g.id));
            a.preload = 'auto';
            a.addEventListener('error', () => this.unavailable.add(g.id), { once: true });
        }
    }

    speak(guidance, options = {}) {
        if (!guidance) return;
        const now = Date.now();
        const priority = guidance.priority ?? 0;
        const isRepeat = guidance.id === this.lastSpokenId;

        if (this.playing && priority <= this.playingPriority && !options.force) return;
        if (!this.playing && now < this.freeAt && priority <= 0 && !options.force) return;
        if (isRepeat && now - this.lastSpokenAt < this.opts.repeatMs && !options.force) return;

        this._vibrate(guidance);

        if (!this.enabled) {
            this.lastSpokenId = guidance.id;
            this.lastSpokenAt = now;
            this.freeAt = now + this.opts.minGapMs;
            return;
        }

        this._play(guidance, priority, now);
    }

    _play(guidance, priority, now) {
        this._stopAudio();

        this.lastSpokenId = guidance.id;
        this.lastSpokenAt = now;
        this.playing = guidance;
        this.playingPriority = priority;

        if (this.unavailable.has(guidance.id)) {
            this._speakTts(guidance);
            return;
        }

        const audio = new Audio(this._url(guidance.id));
        this.audio = audio;

        const finish = () => {
            if (this.audio === audio) {
                this.audio = null;
                this.playing = null;
                this.playingPriority = -1;
                this.freeAt = Date.now() + this.opts.minGapMs;
            }
        };
        audio.addEventListener('ended', finish, { once: true });
        audio.addEventListener('error', () => {
            this.unavailable.add(guidance.id);
            finish();
            this._speakTts(guidance);
        }, { once: true });

        audio.play().catch((err) => {
            console.warn('[voiceGuide] audio play rejected:', err?.name || err);
            finish();
            this._speakTts(guidance);
        });
    }

    _speakTts(guidance) {
        if (!this.opts.ttsFallback) return;
        const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
        if (!synth || !guidance.message) return;
        try {
            synth.cancel();
            ttsOwner = this;
            const utterance = new SpeechSynthesisUtterance(guidance.message);
            utterance.lang = this.opts.lang;
            utterance.rate = 1.05;
            utterance.onend = () => {
                if (ttsOwner === this) ttsOwner = null;
                this.playing = null;
                this.playingPriority = -1;
                this.freeAt = Date.now() + this.opts.minGapMs;
            };
            synth.speak(utterance);
        } catch (err) {
            console.warn('[voiceGuide] TTS failed:', err);
        }
    }

    _vibrate(guidance) {
        if (!this.opts.haptics || !guidance.vibrate) return;
        try {
            navigator.vibrate?.(guidance.vibrate);
        } catch { /* noop */ }
    }

    _stopAudio() {
        if (!this.audio) return;
        try {
            this.audio.pause();
            this.audio.currentTime = 0;
        } catch { /* noop */ }
        this.audio = null;
    }

    stop(options = {}) {
        const { exceptIds = null } = options;
        if (exceptIds && exceptIds?.includes(this.playing?.id)) return false;

        this._stopAudio();
        try {
            if (ttsOwner === this) {
                window.speechSynthesis?.cancel();
                ttsOwner = null;
            }
        } catch { /* noop */ }
        this.playing = null;
        this.playingPriority = -1;
        return true;
    }

    dispose(options) {
        this.stop(options);
        this.lastSpokenId = null;
    }

    _url(id) {
        return `${this.opts.basePath}/${id}.${this.opts.extension}`;
    }
}

export class FramingSonar {
    constructor() {
        this.ctx = null;
        this.osc = null;
        this.gain = null;
    }

    start() {
        if (this.ctx) return;
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        this.ctx = new Ctx();
        this.osc = this.ctx.createOscillator();
        this.gain = this.ctx.createGain();
        this.osc.type = 'sine';
        this.osc.frequency.value = 220;
        this.gain.gain.value = 0;
        this.osc.connect(this.gain).connect(this.ctx.destination);
        this.osc.start();
    }

    update(quality) {
        if (!this.ctx) return;
        const q = Math.max(0, Math.min(1, quality));
        const now = this.ctx.currentTime;
        this.osc.frequency.linearRampToValueAtTime(220 + q * 660, now + 0.12);
        this.gain.gain.linearRampToValueAtTime(0.04 + q * 0.05, now + 0.12);
    }

    stop() {
        try {
            this.osc?.stop();
            this.ctx?.close();
        } catch { /* noop */ }
        this.ctx = null;
        this.osc = null;
        this.gain = null;
    }
}