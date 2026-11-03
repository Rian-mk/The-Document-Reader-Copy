import { FramePreprocessor } from './preprocess';
import { runDetection, isAiEngineReady } from './aiEngine';
import { analyzeTextMass, DEFAULT_TEXT_MASS_OPTIONS } from './textMass';
import { DEFAULT_POLICY } from './framingPolicy';

const preprocessor = new FramePreprocessor();

function staticFramingOk(metrics, opts) {
    if (!metrics || !metrics.hasText) return false;

    for (const edge of ['left', 'right', 'top', 'bottom']) {
        if (metrics.edgeRun[edge] >= opts.cutEnter) return false;
    }

    if (metrics.bboxArea < opts.minBboxArea || metrics.coverage < opts.minCoverage) return false;
    if (metrics.bboxArea > opts.maxBboxArea) return false;

    const m = opts.safeMargin;
    const slack = {
        left: metrics.bbox.x0,
        right: 1 - metrics.bbox.x1,
        top: metrics.bbox.y0,
        bottom: 1 - metrics.bbox.y1,
    };
    for (const edge of ['left', 'right', 'top', 'bottom']) {
        if (slack[edge] < m) return false;
    }

    return true;
}

export async function verifyFinalPhotoFraming(dataUrl, options = {}) {
    const { inputLongSide = 736, textMassOptions = {}, policyOptions = {} } = options;

    if (!isAiEngineReady()) return { ok: true, skipped: true };

    try {
        const blob = await fetch(dataUrl).then((res) => res.blob());
        const bitmap = await createImageBitmap(blob);
        let prepared;
        try {
            prepared = preprocessor.toTensor(bitmap, bitmap.width, bitmap.height, inputLongSide);
        } finally {
            bitmap.close?.();
        }

        const { probMap, width, height } = await runDetection(prepared.tensor);
        const metrics = analyzeTextMass(probMap, width, height, { ...DEFAULT_TEXT_MASS_OPTIONS, ...textMassOptions });
        const ok = staticFramingOk(metrics, { ...DEFAULT_POLICY, ...policyOptions });

        return { ok, metrics };
    } catch (err) {
        console.warn('[finalFrameCheck] verification failed:', err);
        return { ok: true, skipped: true, error: err };
    }
}
