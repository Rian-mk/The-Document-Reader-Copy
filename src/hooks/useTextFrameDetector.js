import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { CAMERA_GUIDANCE, ALL_GUIDANCE } from '@/constants/camera';
import { FramePreprocessor } from '@/utils/camera/preprocess';
import { analyzeTextMass } from '@/utils/camera/textMass';
import { assessImageQuality } from '@/utils/camera/qualityChecks';
import { FramingPolicy } from '@/utils/camera/framingPolicy';
import { VoiceGuide, unlockVoiceGuideAudio } from '@/utils/camera/voiceGuide';
import { TorchController, TORCH_STATE, createNullTorchAdapter } from '@/utils/camera/torch';
import {
    preloadAiEngine,
    runDetection,
    isAiEngineReady,
    getAiEngineState,
} from '@/utils/camera/aiEngine';

export const DEFAULT_DETECTOR_OPTIONS = {
    modelUrl: '/models/ppocr_det.onnx',
    inputLongSide: 736,
    intervalMs: 350,
    checkImageQuality: true,
    voice: true,
    active: true,
    torch: true,
    torchAdapter: null,
    torchOptions: {},
    policy: {},
    textMass: {},
};

export function useTextFrameDetector(frameSource, userOptions = {}) {

    const opts = useMemo(
        () => ({ ...DEFAULT_DETECTOR_OPTIONS, ...userOptions }),
        [JSON.stringify(userOptions)],
    );

    const [result, setResult] = useState({
        status: CAMERA_GUIDANCE.WAITING,
        ready: false,
        metrics: null,
        debug: null,
        engineState: getAiEngineState().state,
    });

    const optsRef = useRef(opts);
    const frameSourceRef = useRef(frameSource);
    const preprocessorRef = useRef(null);
    const policyRef = useRef(null);
    const voiceRef = useRef(null);
    const runningRef = useRef(false);
    const statusRef = useRef(CAMERA_GUIDANCE.WAITING);
    const torchRef = useRef(null);

    optsRef.current = opts;
    frameSourceRef.current = frameSource;

    if (!preprocessorRef.current) preprocessorRef.current = new FramePreprocessor();
    if (!policyRef.current) policyRef.current = new FramingPolicy(opts.policy);
    if (!voiceRef.current) voiceRef.current = new VoiceGuide();
    if (!torchRef.current) {
        torchRef.current = new TorchController(
            opts.torchAdapter ?? createNullTorchAdapter(),
            opts.torchOptions,
        );
    }

    const [torchUi, setTorchUi] = useState({
        state: TORCH_STATE.OFF,
        on: false,
        supported: true,
        manual: null,
    });

    const syncTorchUi = useCallback(() => {
        const controller = torchRef.current;
        if (!controller) return;
        setTorchUi((prev) => {
            const next = {
                state: controller.state,
                on: controller.isOn,
                supported: controller.supported !== false,
                manual: controller.manual,
            };
            const same =
                prev.state === next.state &&
                prev.on === next.on &&
                prev.supported === next.supported &&
                prev.manual === next.manual;
            return same ? prev : next;
        });
    }, []);

    useEffect(() => {
        Object.assign(policyRef.current.opts, opts.policy || {});
        Object.assign(torchRef.current.opts, opts.torchOptions || {});
        voiceRef.current.setEnabled(opts.voice !== false);
        torchRef.current.setEnabled(opts.torch !== false && opts.checkImageQuality !== false);
    }, [opts]);

    useEffect(() => {
        if (opts.active === false) voiceRef.current?.stop({ exceptIds: [CAMERA_GUIDANCE.CAPTURING.id, CAMERA_GUIDANCE.HOLD_STILL.id] });
    }, [opts.active]);

    useEffect(() => {
        let mounted = true;
        voiceRef.current.preload(ALL_GUIDANCE);

        preloadAiEngine(undefined, {
            modelUrl: opts.modelUrl,
            warmupLongSide: opts.inputLongSide,
        }).then((ok) => {
            if (!mounted) return;
            setResult((prev) => ({ ...prev, engineState: getAiEngineState().state }));
            if (!ok) {
                console.error('[useTextFrameDetector] AI engine unavailable:', getAiEngineState().error);
            }
        });

        return () => { mounted = false; };
    }, [opts.modelUrl, opts.inputLongSide]);

    useEffect(() => {
        runningRef.current = true;
        let timeoutId = null;

        const publish = (guidance, changed, metrics, debug) => {
            statusRef.current = guidance;
            setResult((prev) => {
                if (prev.status === guidance && prev.ready === (guidance === CAMERA_GUIDANCE.TARGET_FOUND)) {
                    return { ...prev, metrics, debug };
                }
                return {
                    status: guidance,
                    ready: guidance === CAMERA_GUIDANCE.TARGET_FOUND,
                    metrics,
                    debug,
                    engineState: getAiEngineState().state,
                };
            });
            if (changed && guidance !== CAMERA_GUIDANCE.TARGET_FOUND) voiceRef.current.speak(guidance, { force: true });
        };

        const pass = async () => {
            const o = optsRef.current;

            if (o.active === false) {
                await torchRef.current.update({ meanLuma: 0, glareRatio: 0 }, { cameraReady: false });
                return;
            }
            if (!isAiEngineReady()) return;

            const frame = await frameSourceRef.current?.();
            if (!frame) return;

            const { bitmap, width, height } = frame;
            let prepared;
            try {
                prepared = preprocessorRef.current.toTensor(bitmap, width, height, o.inputLongSide);
            } finally {
                bitmap.close?.();
            }

            const { probMap, width: outW, height: outH } = await runDetection(prepared.tensor);
            const metrics = analyzeTextMass(probMap, outW, outH, o.textMass);
            const quality = o.checkImageQuality ? assessImageQuality(prepared.imageData) : null;
            const torch = await torchRef.current.update(quality, {
                cameraReady: true,
                coverage: metrics.coverage,
            });
            if (torch.changed) {
                syncTorchUi();
                if (torch.reason === 'too_dark') {
                    voiceRef.current.speak(CAMERA_GUIDANCE.FLASH_ON, { force: true });
                } else if (torch.reason === 'glare_veto') {
                    voiceRef.current.speak(CAMERA_GUIDANCE.FLASH_OFF_GLARE, { force: true });
                }
            }
            const gatedQuality = quality && torch.isSettling
                ? { ...quality, isDark: false, hasGlare: false, isBlurry: false }
                : quality;

            const decision = policyRef.current.update(metrics, gatedQuality);
            publish(decision.guidance, decision.changed, metrics, {
                ...(decision.debug || {}),
                torch: torch.state,
                torchReason: torch.reason,
            });
        };

        const loop = async () => {
            if (!runningRef.current) return;
            const startedAt = Date.now();
            try {
                await pass();
            } catch (err) {
                console.warn('[useTextFrameDetector] frame dropped:', err);
            } finally {
                if (runningRef.current) {
                    const elapsed = Date.now() - startedAt;
                    const wait = Math.max(60, optsRef.current.intervalMs - elapsed);
                    timeoutId = setTimeout(loop, wait);
                }
            }
        };

        loop();

        return () => {
            runningRef.current = false;
            if (timeoutId) clearTimeout(timeoutId);
            voiceRef.current?.dispose({ exceptIds: [CAMERA_GUIDANCE.CAPTURING.id, CAMERA_GUIDANCE.HOLD_STILL.id] });
            torchRef.current?.forceOff();
        };
    }, []);

    const setTorchEnabled = useCallback((enabled) => {
        torchRef.current?.setEnabled(enabled);
    }, []);

    const setTorchManual = useCallback(async (on) => {
        const ok = (await torchRef.current?.setManual(on)) ?? false;
        syncTorchUi();
        return ok;
    }, [syncTorchUi]);

    const toggleTorch = useCallback(async () => {
        const ok = (await torchRef.current?.toggleManual()) ?? false;
        syncTorchUi();
        return ok;
    }, [syncTorchUi]);

    const resetDetector = useCallback(() => {
        policyRef.current?.reset();
        statusRef.current = CAMERA_GUIDANCE.WAITING;
        setResult((prev) => ({
            ...prev,
            status: CAMERA_GUIDANCE.WAITING,
            ready: false,
            metrics: null,
            debug: null,
        }));
    }, []);

    return {
        ...result,
        torchState: torchUi.state,
        torchOn: torchUi.on,
        torchSupported: torchUi.supported,
        torchManual: torchUi.manual,
        setTorchEnabled,
        setTorchManual,
        toggleTorch,
        resetDetector,
    };
}

export async function unlockGuidanceAudio() {
    return unlockVoiceGuideAudio();
}