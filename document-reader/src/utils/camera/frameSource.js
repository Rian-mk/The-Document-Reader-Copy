import { saveDebugFrame } from './debugCapture';

const DEFAULT_DECODE_LONG_SIDE = 800;
const SAMPLE_SAVE_INTERVAL_MS = 2000;

function singleFlight(fn) {
    let inFlight = false;
    return async (...args) => {
        if (inFlight) return null;
        inFlight = true;
        try {
            return await fn(...args);
        } finally {
            inFlight = false;
        }
    };
}

function decodeSize(width, height, longSide) {
    const scale = Math.min(1, longSide / Math.max(width, height));
    return {
        width: Math.max(32, Math.round(width * scale)),
        height: Math.max(32, Math.round(height * scale)),
    };
}

export function createVideoFrameSource(videoRef, options = {}) {
    const longSide = options.decodeLongSide ?? DEFAULT_DECODE_LONG_SIDE;

    return singleFlight(async () => {
        const video = videoRef.current;
        if (!video || video.readyState < 2) return null;
        const sourceWidth = video.videoWidth;
        const sourceHeight = video.videoHeight;
        if (!sourceWidth || !sourceHeight) return null;

        const target = decodeSize(sourceWidth, sourceHeight, longSide);
        const bitmap = await createImageBitmap(video, {
            resizeWidth: target.width,
            resizeHeight: target.height,
            resizeQuality: 'low',
        });
        return { bitmap, width: bitmap.width, height: bitmap.height, sourceWidth, sourceHeight };
    });
}

export function createCameraPreviewFrameSource(CameraPreview, options = {}) {
    const quality = options.quality ?? 30;
    const longSide = options.decodeLongSide ?? DEFAULT_DECODE_LONG_SIDE;
    let lastSavedAt = 0;

    return singleFlight(async () => {
        try {
            const sample = await CameraPreview.captureSample({ quality });
            if (!sample?.value) return null;

            const blob = await base64ToBlob(sample.value);
            const probe = await createImageBitmap(blob);
            const sourceWidth = probe.width;
            const sourceHeight = probe.height;

            const now = Date.now();
            if (now - lastSavedAt > SAMPLE_SAVE_INTERVAL_MS) {
                lastSavedAt = now;
                saveDebugFrame(sample.value, 'sample', sourceWidth, sourceHeight);
            }

            const target = decodeSize(sourceWidth, sourceHeight, longSide);
            if (target.width === sourceWidth && target.height === sourceHeight) {
                return { bitmap: probe, width: sourceWidth, height: sourceHeight, sourceWidth, sourceHeight };
            }

            probe.close();
            const bitmap = await createImageBitmap(blob, {
                resizeWidth: target.width,
                resizeHeight: target.height,
                resizeQuality: 'low',
            });
            return { bitmap, width: bitmap.width, height: bitmap.height, sourceWidth, sourceHeight };
        } catch (err) {
            return null;
        }
    });
}

async function base64ToBlob(base64, mime = 'image/jpeg') {
    const res = await fetch(`data:${mime};base64,${base64}`);
    return res.blob();
}
