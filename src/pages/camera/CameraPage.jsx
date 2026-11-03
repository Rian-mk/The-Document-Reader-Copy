import { useEffect, useRef, useCallback } from 'react'
import clsx from 'clsx'
import ProcessingModal from '@/components/camera/ProcessingModal'
import { useLocation, useNavigate } from 'react-router-dom'
import { CAMERA_TYPES, SEVERITY } from '@/constants/camera'
import useAutomaticCamera from "@/hooks/useAutomaticCamera"
import useManualCamera from "@/hooks/useManualCamera"
import useDocumentToSpeech from "@/hooks/useDocumentToSpeech"
import useAppSettings from "@/hooks/useAppSettings"
import "./style.css"
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/services/apiClient'
import { MdFlashlightOff, MdFlashlightOn, MdPhotoLibrary } from 'react-icons/md'

const CAMERA_GUIDANCE_STYLES = {
    [SEVERITY.INFO]: {
        bg: "bg-cyan-400",
        text: "text-slate-950"
    },
    [SEVERITY.WARNING]: {
        bg: "bg-amber-400",
        text: "text-slate-950"
    },
    [SEVERITY.SUCCESS]: {
        bg: "bg-lime-400",
        text: "text-slate-950"
    }
}

const styleFor = (status) =>
    CAMERA_GUIDANCE_STYLES[status?.severity] ?? CAMERA_GUIDANCE_STYLES[SEVERITY.INFO]


export default function CameraPage() {
    const navigate = useNavigate()
    const location = useLocation().state
    const cameraTypeRequest = location?.type
    const { handleCapture, cancel, isUploading, error } = useDocumentToSpeech();
    const { voiceFeedback, autoFlashlight } = useAppSettings();

    useEffect(() => {
        if (!error) return
        toast.error(getApiErrorMessage(error))
    }, [error])


    useEffect(() => {
        document.documentElement.classList.add("camera-active");
        document.body.classList.add("camera-active");
        return () => {
            document.documentElement.classList.remove("camera-active");
            document.body.classList.remove("camera-active");
        }
    }, [])

    const onComplete = () => { navigate('/player') }

    const shared = {
        isUploading,
        onCancelUpload: cancel,
        voiceFeedback,
        onCapture: (blob) => { handleCapture(blob, onComplete) },
    }

    return (
        <>
            {cameraTypeRequest == CAMERA_TYPES.automatic ?
                <AutomaticCameraView {...shared} autoFlashlight={autoFlashlight} />
                :
                <ManualCameraView {...shared} />}
        </>
    )
}

function FlashButton({ on, supported, busy, onToggle, onLongPress, auto }) {
    const timerRef = useRef(null)
    const longPressedRef = useRef(false)

    const clearTimer = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current)
            timerRef.current = null
        }
    }, [])

    const handlePointerDown = useCallback(() => {
        if (!onLongPress) return
        longPressedRef.current = false
        timerRef.current = setTimeout(() => {
            longPressedRef.current = true
            onLongPress()
        }, 600)
    }, [onLongPress])

    useEffect(() => clearTimer, [clearTimer])

    if (!supported) return null

    const label = on ? 'خاموش کردن چراغ' : 'روشن کردن چراغ'

    return (
        <button
            type="button"
            disabled={busy}
            onPointerDown={handlePointerDown}
            onPointerUp={clearTimer}
            onPointerCancel={clearTimer}
            onPointerLeave={clearTimer}
            onClick={(event) => {
                // Critical: the parent element is the shutter.
                event.stopPropagation()
                event.preventDefault()
                clearTimer()
                if (longPressedRef.current) {
                    longPressedRef.current = false
                    return
                }
                onToggle()
            }}
            className={clsx(
                "flex-none flex items-center justify-center min-h-[64px] min-w-[80px] text-3xl transition-colors",
                on ? "bg-amber-400 text-slate-950" : "bg-slate-800 text-slate-50",
                busy && "opacity-60"
            )}
        >
            <span aria-hidden="true">{on ? <MdFlashlightOff /> : <MdFlashlightOn />}</span>
        </button>
    )
}

function FrozenFrame({ src }) {
    if (!src) return null
    return (
        <img
            src={src}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
    )
}

function StatusBar({ status }) {
    const style = styleFor(status)
    return (
        <div
            role="status"
            aria-live="polite"
            className={clsx(
                "flex flex-1 items-center justify-center px-1 py-2 text-center text-xl font-bold",
                style.bg,
                style.text
            )}
        >
            {status?.message}
        </div>
    )
}

function GalleryButton({ className, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={
                clsx("flex-none flex items-center justify-center p-5 aspect-square rounded-full text-3xl transition-colors bg-amber-400 text-slate-950", className)
            }
        >
            <span aria-hidden="true"><MdPhotoLibrary /></span>
        </button>
    )
}

function ManualCameraView({ isUploading, onCancelUpload, voiceFeedback, onCapture }) {
    const {
        status,
        isProcessing,
        capturePhoto,
        lastFrame,
        clearLastFrame,
        torchOn,
        torchSupported,
        torchBusy,
        toggleTorch,
        pickMedia
    } = useManualCamera(onCapture, { suspended: isUploading, voiceFeedback });

    const busy = isProcessing || isUploading

    useEffect(() => {
        if (!busy) clearLastFrame()
    }, [busy, clearLastFrame])

    const handleCancel = useCallback(() => {
        onCancelUpload()
        clearLastFrame()
    }, [onCancelUpload, clearLastFrame])

    return <>
        <ProcessingModal
            isOpen={busy}
            onCancel={handleCancel}
        />
        <div className="relative flex flex-col w-full h-full">
            <FrozenFrame src={busy ? lastFrame : null} />
            <div
                className='relative flex-1'
                onClick={() => { if (!busy) capturePhoto() }}

            >
                <GalleryButton
                    onClick={(e) => {
                        e.stopPropagation();
                        if (!busy) {
                            pickMedia();
                        }
                    }}
                    className="absolute bottom-3 left-3" />
            </div>
            <div className="relative flex-none flex items-stretch">
                <FlashButton
                    on={torchOn}
                    supported={torchSupported}
                    busy={torchBusy}
                    onToggle={toggleTorch}
                />
                <StatusBar status={status} />
            </div>
        </div>

    </>
}

function AutomaticCameraView({ isUploading, onCancelUpload, voiceFeedback, autoFlashlight, onCapture }) {
    const {
        status,
        isProcessing,
        lastFrame,
        clearLastFrame,
        torchOn,
        torchSupported,
        torchManual,
        toggleTorch,
        setTorchManual,
    } = useAutomaticCamera(onCapture, {
        suspended: isUploading,
        voiceFeedback,
        autoFlashlight,
    });

    const busy = isProcessing || isUploading

    useEffect(() => {
        if (!busy) clearLastFrame()
    }, [busy, clearLastFrame])

    const handleCancel = useCallback(() => {
        onCancelUpload()
        clearLastFrame()
    }, [onCancelUpload, clearLastFrame])

    return <>
        <ProcessingModal
            isOpen={busy}
            onCancel={handleCancel}
        />
        <div className="relative flex flex-col w-full h-full">
            <FrozenFrame src={busy ? lastFrame : null} />
            <div className='relative flex-1'></div>
            <div className="relative flex-none flex items-stretch">
                <FlashButton
                    auto
                    on={torchOn}
                    supported={torchSupported}
                    onToggle={toggleTorch}
                    onLongPress={torchManual === null ? undefined : () => setTorchManual(null)}
                />
                <StatusBar status={status} />
            </div>
        </div>
    </>
}
