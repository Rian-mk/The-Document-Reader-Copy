import * as ort from 'onnxruntime-web';
import { planInputSize } from './preprocess';

const STATE = {
    IDLE: 'idle',
    LOADING: 'loading',
    READY: 'ready',
    FAILED: 'failed',
};

let session = null;
let state = STATE.IDLE;
let lastError = null;
let loadPromise = null;
let inputName = null;
let outputName = null;

export const AI_ENGINE_STATE = STATE;

export function getAiSession() {
    return session;
}
export function getAiEngineState() {
    return { state, error: lastError, inputName, outputName };
}
export function isAiEngineReady() {
    return state === STATE.READY && session !== null;
}

export function preloadAiEngine(onProgress, options = {}) {
    const {
        modelUrl = '/models/ppocr_det.onnx',
        warmupLongSide = 736,
        warmupFrame = { width: 1080, height: 1920 },
    } = options;

    if (state === STATE.READY) {
        onProgress?.('آماده به کار', 100);
        return Promise.resolve(true);
    }
    if (loadPromise) return loadPromise;

    state = STATE.LOADING;
    lastError = null;

    loadPromise = (async () => {
        try {
            onProgress?.('در حال بارگذاری مدل…', 20);

            const hardware = (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 2;
            const isolated = typeof crossOriginIsolated !== 'undefined' && crossOriginIsolated;
            ort.env.wasm.numThreads = isolated ? Math.min(4, Math.max(1, hardware - 1)) : 1;
            ort.env.wasm.simd = true;

            const providers = [];
            if (typeof navigator !== 'undefined' && navigator.gpu) providers.push('webgpu');
            providers.push('wasm');

            onProgress?.('در حال آماده‌سازی مدل هوش مصنوعی…', 55);
            session = await ort.InferenceSession.create(modelUrl, {
                executionProviders: providers,
                graphOptimizationLevel: 'all',
                enableCpuMemArena: false,
            });

            inputName = session.inputNames[0];
            outputName = session.outputNames[0];

            onProgress?.('پیکربندی شتاب‌دهنده…', 85);
            const { width, height } = planInputSize(warmupFrame.width, warmupFrame.height, warmupLongSide);
            const dummy = new ort.Tensor('float32', new Float32Array(3 * width * height), [1, 3, height, width]);
            await session.run({ [inputName]: dummy });

            state = STATE.READY;
            onProgress?.('آماده به کار', 100);
            return true;
        } catch (err) {
            session = null;
            state = STATE.FAILED;
            lastError = err;
            console.error('[aiEngine] failed to initialise ONNX session:', err);
            onProgress?.('موتور هوش مصنوعی بارگزاری نشد', 100);
            return false;
        } finally {
            loadPromise = null;
        }
    })();

    return loadPromise;
}

export async function runDetection(tensor) {
    if (!session) throw new Error('AI session is not ready');
    const outputs = await session.run({ [inputName]: tensor });
    const output = outputs[outputName];
    const dims = output.dims; // [1, 1, H, W]
    const height = dims[dims.length - 2];
    const width = dims[dims.length - 1];
    return { probMap: output.data, width, height };
}

export async function disposeAiEngine() {
    try {
        await session?.release?.();
    } catch { }
    session = null;
    state = STATE.IDLE;
    inputName = null;
    outputName = null;
}
