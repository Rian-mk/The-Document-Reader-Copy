import { useCallback, useState, useRef, useEffect } from "react"

import { pipelineService } from "@/services/apiClient"
import {
    CAPTURED_PIPELINE_KEY,
    CAPTURED_TEXT_KEY
} from "@/constants/player"
const isCancelError = (err) =>
    err?.code === "ERR_CANCELED" ||
    err?.name === "CanceledError" ||
    err?.name === "AbortError" ||
    err?.__CANCEL__ === true
export default function useDocumentToSpeech() {
    const [isUploading, setIsUploading] = useState(false)
    const [error, setError] = useState(null)
    const abortRef = useRef(null)
    const cancelledRef = useRef(false)

    // Abort any in-flight request when the hook unmounts
    useEffect(() => {
        return () => {
            abortRef.current?.abort()
        }
    }, [])

    const handleCapture = useCallback(async (blob, onComplete) => {
        if (!blob) return

        // Cancel any previous in-flight request before starting a new one
        abortRef.current?.abort()

        const controller = new AbortController()
        abortRef.current = controller

        const file = blob instanceof File
            ? blob
            : new File(
                [blob],
                `capture-${Date.now()}.jpg`,
                {
                    type: blob.type || "image/jpeg"
                }
            )

        cancelledRef.current = false
        try {
            setError(null)
            setIsUploading(true)
            const result =
                await pipelineService.documentToSpeech(file, { signal: controller.signal })

            // If this request was cancelled (e.g. user navigated away or took a new photo), bail out
            if (controller.signal.aborted) return

            localStorage.setItem(
                CAPTURED_TEXT_KEY,
                result?.text || ""
            )
            localStorage.setItem(
                CAPTURED_PIPELINE_KEY,
                JSON.stringify(result)
            )
            onComplete?.()
        } catch (err) {
            if (controller.signal.aborted) return
            console.error("API/pipeline failed:", err)
            setError(err)
        } finally {
            if (abortRef.current === controller) {
                abortRef.current = null;
                setIsUploading(false);
            }
        }
    }, [])

    const cancel = useCallback(() => {
        cancelledRef.current = true
        abortRef.current?.abort()
        abortRef.current = null
        setError(null)
        setIsUploading(false)
    }, [])
    const reset = useCallback(() => setError(null), [])

    useEffect(() => () => {
        cancelledRef.current = true
        abortRef.current?.abort()
    }, [])
    return {
        handleCapture,
        cancel,
        reset,
        isUploading,
        error
    }
}