import { CAMERA_GUIDANCE, OPPOSITE_GUIDANCE } from '@/constants/camera';

export const DEFAULT_POLICY = {
    cutEnter: 0.16,
    cutExit: 0.08,
    safeMargin: 0.035,
    minBboxArea: 0.14,
    minCoverage: 0.045,
    maxBboxArea: 0.93,
    commandLatchMs: 1100,
    switchConfirmFrames: 2,
    flipConfirmFrames: 3,
    goodHoldMs: 700,
    stillnessThreshold: 0.02,
    stillnessWindow: 4,
    noTextGraceMs: 1200,
    oscillationWindow: 5,
    oscillationLimit: 3,
};

export class FramingPolicy {
    constructor(userOptions = {}) {
        this.opts = { ...DEFAULT_POLICY, ...userOptions };
        this.reset();
    }

    reset() {
        this.cut = { left: false, right: false, top: false, bottom: false };
        this.current = CAMERA_GUIDANCE.WAITING;
        this.currentSince = 0;
        this.goodSince = null;
        this.startedAt = null;
        this.history = [];
        this.bboxHistory = [];
        this.escalateUntil = 0;
        this.pending = null;
    }

    update(metrics, quality = null, now = Date.now()) {
        if (this.startedAt === null) this.startedAt = now;

        const opts = this.opts;
        const decision = this._decide(metrics, quality, now);

        const isBootstrapping =
            this.current === CAMERA_GUIDANCE.WAITING || this.current === CAMERA_GUIDANCE.NO_TEXT;
        const canBypass = decision.guidance === CAMERA_GUIDANCE.TARGET_FOUND || isBootstrapping;

        let guidance = decision.guidance;

        if (guidance === this.current) {
            this.pending = null;
        } else if (!canBypass) {
            const isFlip = OPPOSITE_GUIDANCE[this.current.id] === guidance.id;
            const required = isFlip ? opts.flipConfirmFrames : opts.switchConfirmFrames;

            if (this.pending?.id === guidance.id) this.pending.count += 1;
            else this.pending = { id: guidance.id, count: 1 };

            const latched = now - this.currentSince < opts.commandLatchMs;
            if (latched || this.pending.count < required) {
                guidance = this.current;
            } else {
                this.pending = null;
            }
        } else {
            this.pending = null;
        }

        const changed = guidance !== this.current;
        if (changed) {
            this.current = guidance;
            this.currentSince = now;
            this.history.push({ id: guidance.id, at: now });
            if (this.history.length > opts.oscillationWindow) this.history.shift();
        }

        return {
            guidance,
            ready: guidance === CAMERA_GUIDANCE.TARGET_FOUND,
            changed,
            debug: decision.debug,
        };
    }

    _decide(metrics, quality, now) {
        const opts = this.opts;

        if (!metrics || !metrics.hasText) {
            this.goodSince = null;
            this.bboxHistory.length = 0;
            const waited = now - this.startedAt;
            return {
                guidance: waited < opts.noTextGraceMs ? CAMERA_GUIDANCE.WAITING : CAMERA_GUIDANCE.NO_TEXT,
                debug: { reason: 'no_text' },
            };
        }

        for (const edge of ['left', 'right', 'top', 'bottom']) {
            const run = metrics.edgeRun[edge];
            if (this.cut[edge]) {
                if (run < opts.cutExit) this.cut[edge] = false;
            } else if (run >= opts.cutEnter) {
                this.cut[edge] = true;
            }
        }
        const cut = this.cut;
        const cutCount = Number(cut.left) + Number(cut.right) + Number(cut.top) + Number(cut.bottom);

        this._pushBbox(metrics.bbox);
        const motion = this._motion();
        const isStill = motion !== null && motion <= opts.stillnessThreshold;

        const debug = {
            cut: { ...cut },
            coverage: +metrics.coverage.toFixed(3),
            bboxArea: +metrics.bboxArea.toFixed(3),
            edgeRun: metrics.edgeRun,
            motion: motion === null ? null : +motion.toFixed(4),
            isStill,
        };

        const notGood = (guidance, reason) => {
            this.goodSince = null;
            return { guidance, debug: { ...debug, reason } };
        };

        if ((cut.left && cut.right) || (cut.top && cut.bottom)) {
            return notGood(CAMERA_GUIDANCE.MOVE_FARTHER, 'opposite_edges_cut');
        }
        if (metrics.bboxArea > opts.maxBboxArea && cutCount >= 1) {
            return notGood(CAMERA_GUIDANCE.MOVE_FARTHER, 'bbox_fills_frame');
        }

        if (now < this.escalateUntil) {
            return notGood(CAMERA_GUIDANCE.MOVE_FARTHER, 'oscillation_escalated');
        }
        if (this._isOscillating()) {
            this.escalateUntil = now + 2500;
            this.history.length = 0;
            return notGood(CAMERA_GUIDANCE.MOVE_FARTHER, 'oscillation');
        }

        if (cutCount > 0) {
            const worst = (['left', 'right', 'top', 'bottom'])
                .filter((e) => cut[e])
                .sort((a, b) => metrics.edgeRun[b] - metrics.edgeRun[a])[0];
            return notGood(EDGE_TO_GUIDANCE[worst], `cut_${worst}`);
        }

        if (metrics.bboxArea < opts.minBboxArea || metrics.coverage < opts.minCoverage) {
            return notGood(CAMERA_GUIDANCE.MOVE_CLOSER, 'too_far');
        }

        const m = opts.safeMargin;
        const slack = {
            left: metrics.bbox.x0,
            right: 1 - metrics.bbox.x1,
            top: metrics.bbox.y0,
            bottom: 1 - metrics.bbox.y1,
        };
        const tight = (['left', 'right', 'top', 'bottom'])
            .filter((e) => slack[e] < m)
            .sort((a, b) => slack[a] - slack[b])[0];
        if (tight) {
            const opposite = { left: 'right', right: 'left', top: 'bottom', bottom: 'top' }[tight];
            if (slack[opposite] < m) {
                return notGood(CAMERA_GUIDANCE.MOVE_FARTHER, 'both_sides_tight');
            }
            return notGood(EDGE_TO_GUIDANCE[tight], `tight_${tight}`);
        }

        if (quality) {
            if (quality.isDark) return notGood(CAMERA_GUIDANCE.TOO_DARK, 'dark');
            if (quality.hasGlare) return notGood(CAMERA_GUIDANCE.GLARE, 'glare');
            if (quality.isBlurry) return notGood(CAMERA_GUIDANCE.BLURRY, 'blurry');
        }

        if (this.goodSince === null) this.goodSince = now;
        const heldMs = now - this.goodSince;

        if (heldMs >= opts.goodHoldMs && isStill) {
            return { guidance: CAMERA_GUIDANCE.TARGET_FOUND, debug: { ...debug, reason: 'ready', heldMs } };
        }
        return {
            guidance: CAMERA_GUIDANCE.HOLD_STILL,
            debug: { ...debug, reason: isStill ? 'holding' : 'shaking', heldMs },
        };
    }

    _pushBbox(bbox) {
        this.bboxHistory.push(bbox);
        if (this.bboxHistory.length > this.opts.stillnessWindow) this.bboxHistory.shift();
    }

    _motion() {
        const h = this.bboxHistory;
        if (h.length < 2) return null;
        let total = 0;
        for (let i = 1; i < h.length; i++) {
            const a = h[i - 1];
            const b = h[i];
            total +=
                (Math.abs(a.x0 - b.x0) + Math.abs(a.x1 - b.x1) + Math.abs(a.y0 - b.y0) + Math.abs(a.y1 - b.y1)) / 4;
        }
        return total / (h.length - 1);
    }

    _isOscillating() {
        const h = this.history;
        if (h.length < this.opts.oscillationLimit + 1) return false;
        let flips = 0;
        for (let i = 1; i < h.length; i++) {
            if (OPPOSITE_GUIDANCE[h[i - 1].id] === h[i].id) flips++;
        }
        return flips >= this.opts.oscillationLimit;
    }
}

const EDGE_TO_GUIDANCE = {
    left: CAMERA_GUIDANCE.MOVE_LEFT,
    right: CAMERA_GUIDANCE.MOVE_RIGHT,
    top: CAMERA_GUIDANCE.MOVE_UP,
    bottom: CAMERA_GUIDANCE.MOVE_DOWN,
};