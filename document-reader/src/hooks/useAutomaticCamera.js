import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { CameraPreview } from '@capacitor-community/camera-preview';
import { CAMERA_GUIDANCE } from '@/constants/camera';
import { createCameraPreviewFrameSource } from '@/utils/camera/frameSource';
import { createCapacitorTorchAdapter } from '@/utils/camera/torch';
import { VoiceGuide } from '@/utils/camera/voiceGuide';
import { useTextFrameDetector } from './useTextFrameDetector';
import { useCameraCore } from '@/hooks/useCameraCore';
import { verifyFinalPhotoFraming } from '@/utils/camera/finalFrameCheck';
import { saveDebugLog } from '@/utils/camera/debugCapture';

const CAPTURE_COOLDOWN_MS = 2500;

export default function useAutomaticCamera(onCapture, options = {}) {
    const {
        suspended = false,
        voiceFeedback = true,
        autoFlashlight = true,
        detectorOptions = {},
    } = options;

    const detectorRef = useRef(null);

    const validateFrame = useCallback(async (dataUrl) => {
        const result = await verifyFinalPhotoFraming(dataUrl, {
            inputLongSide: 736,
            textMassOptions: detectorOptions.textMass,
            policyOptions: detectorOptions.policy,
        });
        saveDebugLog('verify', {
            ok: result.ok,
            skipped: Boolean(result.skipped),
            error: result.error?.message || result.error || null,
            metrics: result.metrics ? {
                hasText: result.metrics.hasText,
                edgeRun: result.metrics.edgeRun,
                bboxArea: result.metrics.bboxArea,
                coverage: result.metrics.coverage,
                bbox: result.metrics.bbox,
            } : null,
        });
        if (result.skipped || result.ok) return true;
        detectorRef.current?.resetDetector?.();
        return false;
    }, [detectorOptions]);

    const cameraBase = useCameraCore(onCapture, { suspended, onValidateFrame: validateFrame });
    const [autoCaptureCount, setAutoCaptureCount] = useState(0);

    const capturingRef = useRef(false);
    const lastCaptureAtRef = useRef(0);
    const voiceRef = useRef(null);
    if (!voiceRef.current) voiceRef.current = new VoiceGuide();

    const frameSource = useMemo(
        () => createCameraPreviewFrameSource(CameraPreview, { quality: 80, decodeLongSide: 1280 }),
        [],
    );

    const torchAdapter = useMemo(() => createCapacitorTorchAdapter(CameraPreview), []);

    const previewLive = Boolean(
        cameraBase.previewStarted &&
        cameraBase.isCameraOn &&
        !cameraBase.isProcessing &&
        !suspended,
    );

    const detector = useTextFrameDetector(frameSource, {
        modelUrl: '/models/ppocr_det.onnx',
        inputLongSide: 736,
        intervalMs: 350,
        voice: voiceFeedback,
        torch: autoFlashlight,
        torchAdapter,
        active: previewLive,
        ...detectorOptions,
    });
    detectorRef.current = detector;

    useEffect(() => {
        voiceRef.current?.setEnabled(voiceFeedback);
    }, [voiceFeedback]);

    useEffect(() => {
        voiceRef.current?.speak(CAMERA_GUIDANCE.WAITING, { force: true });
    }, []);

    useEffect(() => {
        if (suspended) voiceRef.current?.stop({ exceptIds: [CAMERA_GUIDANCE.CAPTURING.id, CAMERA_GUIDANCE.HOLD_STILL.id] });
    }, [suspended]);

    const capturePhotoRef = useRef(cameraBase.capturePhoto);
    capturePhotoRef.current = cameraBase.capturePhoto;
    const canShootRef = useRef(false);
    canShootRef.current = Boolean(
        cameraBase.previewStarted &&
        cameraBase.isCameraOn &&
        !cameraBase.isProcessing &&
        !suspended,
    );

    useEffect(() => {
        if (!detector.ready) return;
        if (capturingRef.current || !canShootRef.current) return;
        if (Date.now() - lastCaptureAtRef.current < CAPTURE_COOLDOWN_MS) return;

        capturingRef.current = true;
        lastCaptureAtRef.current = Date.now();

        setTimeout(() => { voiceRef.current.speak(CAMERA_GUIDANCE.CAPTURING, { force: false }); }, 1500);

        Promise.resolve(capturePhotoRef.current?.())
            .catch((err) => console.error('[useAutomaticCamera] capture failed:', err))
            .finally(() => {
                capturingRef.current = false;
                setAutoCaptureCount((n) => n + 1);
            });
    }, [detector.ready]);

    useEffect(() => () => voiceRef.current?.dispose({ exceptIds: [CAMERA_GUIDANCE.CAPTURING.id, CAMERA_GUIDANCE.HOLD_STILL.id] }), []);

    const captureNow = useCallback(async () => {
        if (capturingRef.current || !canShootRef.current) return;
        capturingRef.current = true;
        lastCaptureAtRef.current = Date.now();
        try {
            await capturePhotoRef.current?.();
        } finally {
            capturingRef.current = false;
        }
    }, []);

    return {
        ...cameraBase,
        status: detector.status,
        ready: detector.ready,
        metrics: detector.metrics,
        debug: detector.debug,
        engineState: detector.engineState,
        torchOn: detector.torchOn,
        torchState: detector.torchState,
        torchSupported: detector.torchSupported,
        torchManual: detector.torchManual,
        torchAutoEnabled: autoFlashlight,
        setTorchEnabled: detector.setTorchEnabled,
        toggleTorch: detector.toggleTorch,
        setTorchManual: detector.setTorchManual,
        autoCaptureCount,
        captureNow,
    };
}