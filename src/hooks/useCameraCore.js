import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { CameraPreview } from "@capacitor-community/camera-preview";
import { NativeSettings, AndroidSettings, IOSSettings } from "capacitor-native-settings";
import { App } from "@capacitor/app";
import { saveDebugFrameFromDataUrl } from "@/utils/camera/debugCapture";

let cameraOpChain = Promise.resolve();
function enqueueCameraOp(op) {
    const result = cameraOpChain.then(() => op());
    cameraOpChain = result.catch(() => { });
    return result;
}

const PREVIEW_OPTIONS = () => ({
    position: "rear",
    toBack: true,
    width: window.screen.width,
    height: window.screen.height,
    x: 0,
    y: 0,
    className: "camera-preview-container",
});

const handleCameraStartError = (err) => {
    const message = err?.message?.toLowerCase() || "";
    if (message.includes("onsaveinstancestate") || message.includes("state loss") || message.includes("stateloss")) {
        return;
    }
    if (message.includes("permission") || message.includes("denied") || message.includes("not authorized")) {
        toast.error("دسترسی به دوربین رد شد. در حال انتقال به تنظیمات...");
        setTimeout(async () => {
            try {
                await NativeSettings.open({
                    optionAndroid: AndroidSettings.ApplicationDetails,
                    optionIOS: IOSSettings.App,
                });
            } catch (e) {
                console.error("Failed to open settings:", e);
            }
        }, 1500);
        return;
    }
    if (message.includes("hardware") || message.includes("unavailable") || message.includes("not found")) {
        toast.error("دوربین در دسترس نیست یا توسط برنامه دیگری اشغال شده است.");
        return;
    }
    toast.error("خطا در راه‌اندازی دوربین. لطفاً دوباره تلاش کنید.");
};

export function useCameraCore(onCapture, options = {}) {
    const { suspended = false, onValidateFrame = null } = options;

    const onValidateFrameRef = useRef(onValidateFrame);
    onValidateFrameRef.current = onValidateFrame;

    const [isCameraOn, setIsCameraOn] = useState(false);
    const [isBusy, setIsBusy] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [previewStarted, setPreviewStarted] = useState(false);
    const [lastFrame, setLastFrame] = useState(null);

    const suspendedRef = useRef(suspended);
    suspendedRef.current = suspended;
    const isMountedRef = useRef(false);
    const desiredOnRef = useRef(false);
    const sessionOnRef = useRef(false);
    const reconcilingRef = useRef(false);
    const capturingRef = useRef(false);

    const runStart = useCallback(() => enqueueCameraOp(async () => {
        if (!isMountedRef.current || !desiredOnRef.current) return true;
        try {
            await CameraPreview.start(PREVIEW_OPTIONS());
            sessionOnRef.current = true;
        } catch (err) {
            const message = err?.message?.toLowerCase() || "";
            if (message.includes("onsaveinstancestate") || message.includes("state loss") || message.includes("stateloss")) {
                return false;
            }
            if (message.includes("already started") || message.includes("already running")) {
                try { await CameraPreview.stop(); } catch { /* noop */ }
                try {
                    await CameraPreview.start(PREVIEW_OPTIONS());
                    sessionOnRef.current = true;
                } catch (retryErr) {
                    if (isMountedRef.current) handleCameraStartError(retryErr);
                    return false;
                }
            } else {
                if (isMountedRef.current) handleCameraStartError(err);
                return false;
            }
        }
        if (isMountedRef.current) {
            setPreviewStarted(true);
            setIsCameraOn(true);
        }
        return true;
    }), []);

    const runStop = useCallback(() => enqueueCameraOp(async () => {
        try {
            await CameraPreview.stop();
        } catch (err) {
            const message = err?.message?.toLowerCase() || "";
            if (
                !message.includes("not started") &&
                !message.includes("not running") &&
                !message.includes("already stopped") &&
                isMountedRef.current
            ) {
                toast.error("خطا در خاموش کردن دوربین.");
            }
        }
        sessionOnRef.current = false;
        if (isMountedRef.current) {
            setIsCameraOn(false);
            setPreviewStarted(false);
        }
        return true;
    }), []);

    const reconcile = useCallback(async () => {
        if (reconcilingRef.current) return;
        reconcilingRef.current = true;
        if (isMountedRef.current) setIsBusy(true);
        try {
            for (let attempt = 0; attempt < 4; attempt++) {
                const want = desiredOnRef.current && isMountedRef.current;
                if (want === sessionOnRef.current) break;
                const ok = want ? await runStart() : await runStop();
                if (!ok) break;
            }
        } finally {
            reconcilingRef.current = false;
            if (isMountedRef.current) setIsBusy(false);
        }
    }, [runStart, runStop]);

    const startCamera = useCallback(() => {
        desiredOnRef.current = true;
        return reconcile();
    }, [reconcile]);

    const stopCamera = useCallback(() => {
        desiredOnRef.current = false;
        return reconcile();
    }, [reconcile]);

    const capturePhoto = useCallback(async (chooseFromGallery = false, photoBase64 = "") => {
        if (capturingRef.current || suspendedRef.current || (!chooseFromGallery && !sessionOnRef.current)) return;
        capturingRef.current = true;
        setIsProcessing(true);
        try {
            let result;
            let dataUrl;

            if (!chooseFromGallery) {
                result = await enqueueCameraOp(() => CameraPreview.capture({ quality: 90 }));
                dataUrl = `data:image/jpeg;base64,${result.value}`;
                saveDebugFrameFromDataUrl(dataUrl, 'final');

                if (onValidateFrameRef.current) {
                    const isValid = await onValidateFrameRef.current(dataUrl);
                    if (!isValid) {
                        setLastFrame(dataUrl);
                        return;
                    }
                }
            } else {
                dataUrl = photoBase64
            }

            setLastFrame(dataUrl);

            const blob = await fetch(dataUrl).then(res => res.blob());

            if (!isMountedRef.current) return;
            onCapture?.(blob);
        } catch (err) {
            console.error("Capture failed:", err);
            toast.error("خطا در ثبت تصویر.");
        } finally {
            capturingRef.current = false;
            setIsProcessing(false);
        }
    }, [onCapture]);

    const clearLastFrame = useCallback(() => setLastFrame(null), []);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            desiredOnRef.current = false;
            setIsProcessing(false);
            enqueueCameraOp(async () => {
                await CameraPreview.stop().catch(() => { });
            });
        };
    }, []);

    useEffect(() => {
        if (suspended) stopCamera();
        else startCamera();
    }, [suspended, startCamera, stopCamera]);

    useEffect(() => {
        let resumeTimer = null;
        const listener = App.addListener("appStateChange", (state) => {
            if (resumeTimer) {
                clearTimeout(resumeTimer);
                resumeTimer = null;
            }
            if (!state.isActive) {
                stopCamera();
                return;
            }
            resumeTimer = setTimeout(() => {
                resumeTimer = null;
                if (!suspendedRef.current && isMountedRef.current) startCamera();
            }, 300);
        });
        return () => {
            if (resumeTimer) clearTimeout(resumeTimer);
            listener.then((handler) => handler.remove());
        };
    }, [startCamera, stopCamera]);

    return {
        isCameraOn,
        isBusy,
        isProcessing,
        previewStarted,
        lastFrame,
        clearLastFrame,
        startCamera,
        stopCamera,
        capturePhoto,
    };
}