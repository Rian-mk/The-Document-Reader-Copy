export const TORCH_STATE = Object.freeze({
    UNSUPPORTED: 'unsupported',
    OFF: 'off',
    TURNING_ON: 'turning_on',
    ON: 'on',
    PROBING: 'probing',
    BLOCKED: 'blocked',
    MANUAL: 'manual',
});

export const DEFAULT_TORCH_OPTIONS = {
    onBelowLuma: 46,
    offAboveLuma: 95,
    overexposeAbove: 215,
    settleMs: 800,
    minOnMs: 4000,
    minOffMs: 2500,
    ambientProbeMs: 25000,
    probeFrames: 2,
    maxOnMs: 180000,
    coolDownMs: 20000,
    cameraWarmupMs: 600,
    retryMs: 1500,
    glareIncreaseVeto: 0.035,
    glareAbsoluteVeto: 0.25,
    coverageDropRatio: 0.6,
    verifyFrames: 3,
};

export function isTransientTorchError(err) {
    const msg = String(err?.message ?? err ?? '').toLowerCase();
    return (
        msg.includes('not running') ||
        msg.includes('not started') ||
        msg.includes('not initialized') ||
        msg.includes('not ready') ||
        msg.includes('camera is closed') ||
        msg.includes('no session') ||
        msg.includes('session') ||
        msg.includes('busy') ||
        msg.includes('in use')
    );
}

export function createCapacitorTorchAdapter(CameraPreview) {
    let supported = null;

    return {
        async isSupported() {
            if (supported !== null) return supported;
            try {
                const res = await CameraPreview.getSupportedFlashModes();
                const modes = res?.result ?? res ?? [];
                if (Array.isArray(modes) && modes.length) {
                    supported = modes.includes('torch');
                    return supported;
                }
                return true;
            } catch (err) {
                if (isTransientTorchError(err)) throw err;
                console.warn('[torch] getSupportedFlashModes unavailable:', err);
                return true;
            }
        },
        async set(on) {
            await CameraPreview.setFlashMode({ flashMode: on ? 'torch' : 'off' });
        },
    };
}

export function createWebTorchAdapter(getVideoTrack) {
    return {
        async isSupported() {
            const track = getVideoTrack();
            if (!track) throw new Error('camera not ready');
            if (!track.getCapabilities) return false;
            try {
                return Boolean(track.getCapabilities().torch);
            } catch {
                return false;
            }
        },
        async set(on) {
            const track = getVideoTrack();
            if (!track) throw new Error('camera not ready');
            await track.applyConstraints({ advanced: [{ torch: on }] });
        },
    };
}

export function createNullTorchAdapter() {
    return { isSupported: async () => false, set: async () => { } };
}

export class TorchController {
    constructor(adapter, options = {}) {
        this.adapter = adapter || createNullTorchAdapter();
        this.opts = { ...DEFAULT_TORCH_OPTIONS, ...options };
        this.enabled = true;
        this.supported = null;
        this.state = TORCH_STATE.OFF;
        this.changedAt = 0;
        this.blockedUntil = 0;
        this.retryAfter = 0;
        this.probeStartedAt = 0;
        this.lastProbeAt = 0;
        this.busy = false;
        this.baseline = null;
        this.samples = [];
        this.everOn = false;
        this.cameraReadySince = 0;
        this.manual = null;
        this.ledOn = false;
    }

    async setEnabled(enabled) {
        const wasEnabled = this.enabled;
        this.enabled = enabled;
        if (!enabled && wasEnabled && this.everOn && this.manual !== true) {
            await this.forceOff();
        }
    }

    async setManual(on) {
        this.manual = on;
        this.samples = [];
        if (on === null) {
            this.state = this.ledOn ? TORCH_STATE.ON : TORCH_STATE.OFF;
            this.changedAt = Date.now();
            this.lastProbeAt = Date.now();
            return true;
        }
        const ok = await this._apply(on);
        if (ok) {
            this.state = TORCH_STATE.MANUAL;
            this.changedAt = Date.now();
        }
        return ok;
    }

    async toggleManual() {
        return this.setManual(!this.ledOn);
    }

    get isOn() {
        if (this.state === TORCH_STATE.MANUAL) return this.ledOn;
        return (
            this.state === TORCH_STATE.ON ||
            this.state === TORCH_STATE.TURNING_ON ||
            this.state === TORCH_STATE.PROBING
        );
    }

    get isSettling() {
        return this.state === TORCH_STATE.TURNING_ON || this.state === TORCH_STATE.PROBING;
    }

    async update(quality, context = {}) {
        const now = Date.now();
        const cameraReady = context.cameraReady !== false;
        const coverage = typeof context.coverage === 'number' ? context.coverage : null;
        const noChange = (reason = null) => ({
            state: this.state,
            isOn: this.isOn,
            isSettling: this.isSettling,
            changed: false,
            reason,
        });

        if (!quality || this.busy) return noChange();

        if (!cameraReady) {
            this.cameraReadySince = 0;
            this.ledOn = false;
            if (this.state !== TORCH_STATE.UNSUPPORTED && this.state !== TORCH_STATE.MANUAL) {
                this.state = TORCH_STATE.OFF;
                this.changedAt = now;
            }
            return noChange('camera_not_ready');
        }
        if (this.cameraReadySince === 0) this.cameraReadySince = now;
        if (now - this.cameraReadySince < this.opts.cameraWarmupMs) return noChange('camera_warmup');

        if (this.manual !== null) {
            if (this.manual && !this.ledOn) await this._apply(true);
            return noChange('manual');
        }

        if (!this.enabled) return noChange('disabled');
        if (now < this.retryAfter) return noChange('retry_backoff');

        if (this.supported === null) {
            try {
                this.supported = await this.adapter.isSupported();
            } catch {
                this.retryAfter = now + this.opts.retryMs;
                return noChange('probe_retry');
            }
            if (!this.supported) this.state = TORCH_STATE.UNSUPPORTED;
        }
        if (!this.supported) return noChange('unsupported');

        const o = this.opts;
        const sinceChange = now - this.changedAt;

        if (this.state === TORCH_STATE.BLOCKED) {
            if (now >= this.blockedUntil) {
                this.state = TORCH_STATE.OFF;
                this.changedAt = now;
            }
            return noChange('blocked');
        }

        if (this.state === TORCH_STATE.TURNING_ON) {
            if (sinceChange < o.settleMs) return noChange('settling');

            this.samples.push({ ...quality, coverage });
            if (this.samples.length < o.verifyFrames) return noChange('verifying');

            const avgGlare = mean(this.samples.map((s) => s.glareRatio));
            const covSamples = this.samples.map((s) => s.coverage).filter((c) => c !== null);
            const avgCoverage = covSamples.length ? mean(covSamples) : null;
            this.samples = [];

            const baseGlare = this.baseline?.glareRatio ?? 0;
            const baseCoverage = this.baseline?.coverage ?? null;

            const glareRose = avgGlare - baseGlare > o.glareIncreaseVeto;
            const textLost =
                baseCoverage !== null &&
                avgCoverage !== null &&
                baseCoverage > 0.01 &&
                avgCoverage < baseCoverage * o.coverageDropRatio;
            const blownOut = avgGlare > o.glareAbsoluteVeto;

            if (glareRose && (textLost || blownOut)) {
                await this._apply(false);
                this.state = TORCH_STATE.BLOCKED;
                this.blockedUntil = now + o.coolDownMs;
                this.changedAt = now;
                return { state: this.state, isOn: false, isSettling: false, changed: true, reason: 'glare_veto' };
            }

            this.state = TORCH_STATE.ON;
            this.lastProbeAt = now;
            return { state: this.state, isOn: true, isSettling: false, changed: true, reason: 'confirmed' };
        }

        if (this.state === TORCH_STATE.PROBING) {
            if (now - this.probeStartedAt < o.settleMs) return noChange('probe_settling');

            this.samples.push(quality);
            if (this.samples.length < o.probeFrames) return noChange('probe_sampling');

            const ambient = mean(this.samples.map((s) => s.meanLuma));
            this.samples = [];
            this.lastProbeAt = now;

            if (ambient > o.offAboveLuma) {
                this.state = TORCH_STATE.OFF;
                this.changedAt = now;
                return { state: this.state, isOn: false, isSettling: false, changed: true, reason: 'ambient_bright' };
            }

            const ok = await this._apply(true);
            if (!ok) {
                this.state = TORCH_STATE.OFF;
                this.changedAt = now;
                return noChange('probe_reapply_failed');
            }
            this.state = TORCH_STATE.ON;
            return noChange('still_dark');
        }

        if (this.state === TORCH_STATE.ON) {
            if (sinceChange > o.maxOnMs) {
                await this._apply(false);
                this.state = TORCH_STATE.BLOCKED;
                this.blockedUntil = now + o.coolDownMs;
                this.changedAt = now;
                return { state: this.state, isOn: false, isSettling: false, changed: true, reason: 'thermal_limit' };
            }
            if (sinceChange < o.minOnMs) return noChange('min_on');

            if (quality.meanLuma > o.overexposeAbove) {
                await this._apply(false);
                this.state = TORCH_STATE.OFF;
                this.changedAt = now;
                return { state: this.state, isOn: false, isSettling: false, changed: true, reason: 'overexposed' };
            }

            if (o.ambientProbeMs > 0 && now - this.lastProbeAt > o.ambientProbeMs) {
                const ok = await this._apply(false);
                if (ok) {
                    this.state = TORCH_STATE.PROBING;
                    this.probeStartedAt = now;
                    this.samples = [];
                    return noChange('probing');
                }
            }
            return noChange('still_needed');
        }

        if (this.changedAt !== 0 && sinceChange < o.minOffMs) return noChange('min_off');
        if (quality.meanLuma >= o.onBelowLuma) return noChange('light_enough');
        if (quality.glareRatio > o.glareAbsoluteVeto) return noChange('already_glaring');

        this.baseline = {
            meanLuma: quality.meanLuma,
            glareRatio: quality.glareRatio,
            coverage,
        };
        this.samples = [];

        const ok = await this._apply(true);
        if (!ok) return noChange('set_failed');

        this.state = TORCH_STATE.TURNING_ON;
        this.changedAt = now;
        return { state: this.state, isOn: true, isSettling: true, changed: true, reason: 'too_dark' };
    }

    async forceOff() {
        if (this.state === TORCH_STATE.UNSUPPORTED) return;
        if (this.everOn) await this._apply(false);
        this.state = TORCH_STATE.OFF;
        this.changedAt = Date.now();
        this.samples = [];
    }

    async _apply(on) {
        this.busy = true;
        try {
            await this.adapter.set(on);
            this.ledOn = on;
            if (on) this.everOn = true;
            return true;
        } catch (err) {
            if (isTransientTorchError(err)) {
                this.retryAfter = Date.now() + this.opts.retryMs;
                console.warn('[torch] transient failure, will retry:', err?.message ?? err);
                return false;
            }
            console.warn('[torch] unsupported, disabling:', err?.message ?? err);
            this.supported = false;
            this.state = TORCH_STATE.UNSUPPORTED;
            return false;
        } finally {
            this.busy = false;
        }
    }
}

function mean(values) {
    if (!values.length) return 0;
    let s = 0;
    for (const v of values) s += v;
    return s / values.length;
}