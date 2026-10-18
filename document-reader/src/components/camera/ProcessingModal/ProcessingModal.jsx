import React, { useEffect, useState } from "react"
import { Lottie } from "lottie-react";
import loadingAnimation from "@/assets/loading.json";
import "./style.css"

export default function ProcessingModal({
    isOpen,
    onComplete,
    onCancel,
}) {
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        if (isOpen) {
            const frame = requestAnimationFrame(() => setIsVisible(true))

            return () => {
                cancelAnimationFrame(frame)
            }
        } else {
            setIsVisible(false)
        }
    }, [isOpen, onComplete])

    if (!isOpen) return null

    return (
        <div
            role="alertdialog"
            aria-modal="true"
            aria-label="در حال پردازش تصویر"
            className={`fixed inset-0 z-50 flex h-full w-full items-center justify-center px-4 transition-all duration-500 ${isVisible ? "bg-black/60 backdrop-blur-md opacity-100" : "bg-black/0 backdrop-blur-none opacity-0"}`}>
            <div className={`relative flex w-full max-w-[320px] flex-col items-center gap-4 overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-900/90 px-6 py-8 shadow-2xl shadow-black/80 transition-all duration-500 ${isVisible ? "scale-100 opacity-100" : "scale-0 opacity-0"}`}>
                <div className="pointer-events-none absolute inset-x-0 -top-16 mx-auto h-32 w-72 rounded-full bg-indigo-400/15 blur-2xl" />

                <div className="relative flex h-28 items-center justify-center overflow-hidden rounded-2xl">
                    <Lottie
                        src={loadingAnimation}
                        speed="1"
                        className="pointer-events-none h-full w-full shrink-0 scale-150"
                        loop
                        autoplay
                    />
                </div>

                <div className="flex w-full flex-col items-center gap-1.5">
                    <div className="inline-flex h-[1.5em] flex-col overflow-hidden text-xl font-extrabold text-slate-100">
                        <div className="animate-word-slide flex flex-col transition-transform">
                            <span className="flex h-[1.5em] items-center justify-center whitespace-nowrap text-slate-200">
                                بهبود کیفیت تصویر
                            </span>
                            <span className="flex h-[1.5em] items-center justify-center whitespace-nowrap text-slate-300">
                                پردازش با هوش مصنوعی
                            </span>
                            <span className="flex h-[1.5em] items-center justify-center whitespace-nowrap text-slate-200">
                                تبدیل تصویر به متن و گفتار
                            </span>
                            <span className="flex h-[1.5em] items-center justify-center whitespace-nowrap text-slate-200">
                                بهبود کیفیت تصویر
                            </span>
                        </div>
                    </div>
                </div>

                <p className="sr-only" role="status" aria-live="assertive">
                    تصویر گرفته شد و در حال پردازش است. راهنمای صوتی دوربین موقتاً خاموش است.
                </p>

                {onCancel && (
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation()
                            onCancel()
                        }}
                        aria-label="لغو پردازش و گرفتن عکس جدید"
                        className="mt-1 flex py-2.5 w-full items-center justify-center rounded-2xl bg-rose-500/90 px-4 text-lg font-extrabold text-slate-950 transition-colors active:bg-rose-400"
                    >
                        لغو و عکس جدید
                    </button>
                )}
            </div>
        </div>
    )
}