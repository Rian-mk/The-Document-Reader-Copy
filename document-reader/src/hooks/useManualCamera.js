import { useCallback, useEffect, useMemo, useRef } from 'react';
import { CameraPreview } from '@capacitor-community/camera-preview';
import { CAMERA_GUIDANCE } from '@/constants/camera';
import { useCameraCore } from '@/hooks/useCameraCore';
import { useTorch } from '@/hooks/useTorch';
import { createCapacitorTorchAdapter } from '@/utils/camera/torch';
import { VoiceGuide } from '@/utils/camera/voiceGuide';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

async function getBase64FromWebPath(webPath) {
    const response = await fetch(webPath);
    const blob = await response.blob();

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = () => {
            resolve(reader.result);
        };
        reader.readAsDataURL(blob);
    });
}

export default function useManualCamera(onCapture, options = {}) {
    const { suspended = false, voiceFeedback = true } = options;
    const cameraBase = useCameraCore(onCapture, { suspended });
    const torchAdapter = useMemo(() => createCapacitorTorchAdapter(CameraPreview), []);
    const previewLive = Boolean(
        cameraBase.previewStarted &&
        cameraBase.isCameraOn &&
        !cameraBase.isProcessing &&
        !suspended,
    );
    const torch = useTorch(torchAdapter, { active: previewLive });
    const voiceRef = useRef(null);
    if (!voiceRef.current) voiceRef.current = new VoiceGuide();

    useEffect(() => {
        voiceRef.current?.setEnabled(voiceFeedback);
    }, [voiceFeedback]);

    useEffect(() => {
        voiceRef.current?.speak(CAMERA_GUIDANCE.MANUAL_READY, { force: true });
    }, []);

    useEffect(() => {
        if (suspended) voiceRef.current?.stop({ exceptIds: [CAMERA_GUIDANCE.CAPTURING.id, CAMERA_GUIDANCE.HOLD_STILL.id] });
    }, [suspended]);

    useEffect(() => () => voiceRef.current?.dispose(), []);

    const toggleTorch = useCallback(async () => {
        const wasOn = torch.on;
        const ok = await torch.toggle();
        if (!ok) return false;
        voiceRef.current.speak(
            wasOn ? CAMERA_GUIDANCE.FLASH_MANUAL_OFF : CAMERA_GUIDANCE.FLASH_MANUAL_ON,
            { force: true },
        );
        return true;
    }, [torch]);

    const capturePhoto = useCallback(async () => {
        voiceRef.current?.speak(CAMERA_GUIDANCE.CAPTURING, { force: true });
        return cameraBase.capturePhoto();
    }, [cameraBase]);

    const pickMedia = useCallback(async () => {
        try {
            const photo = await Camera.getPhoto({
                source: CameraSource.Photos,
                resultType: CameraResultType.Uri,
            });

            if (photo?.webPath) {
                const base64Data = await getBase64FromWebPath(photo.webPath);
                return cameraBase.capturePhoto(true, base64Data);
            }
        } catch (err) {
            const message = err?.code ? `[${err.code}] ${err.message}` : err?.message || err;
            console.error('getPhoto from gallery failed:', message);
        }
    }, [cameraBase]);

    return {
        ...cameraBase,
        capturePhoto,
        status: CAMERA_GUIDANCE.MANUAL_READY,
        torchOn: torch.on,
        torchSupported: torch.supported,
        torchBusy: torch.busy,
        toggleTorch,
        pickMedia
    };
}
