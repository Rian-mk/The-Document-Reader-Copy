import React from 'react'
import { MdCheckCircleOutline, MdErrorOutline, MdInfoOutline, MdWarningAmber } from 'react-icons/md';
import { toast, Toaster } from "sonner";

const TOAST_ICONS = {
    success: <MdCheckCircleOutline />,
    error: <MdErrorOutline />,
    info: <MdInfoOutline />,
    warning: <MdWarningAmber />,
}

const TOAST_STYLES = {
    default: '!bg-slate-800 !text-white !border-none',
    success: '!bg-emerald-400 !text-black !border-none',
    error: '!bg-red-400 !text-white !border-none',
    info: '!bg-slate-800 !text-white !border-none',
    warning: '!bg-amber-400 !text-black !border-none',
}

export default function Toast() {
    return (
        <Toaster offset="16px" position="bottom-center"
            icons={TOAST_ICONS}
            toastOptions={{
                style: {
                    bottom: '48px',
                },
                className: "font-sans flex items-center w-screen",
                classNames: TOAST_STYLES,
            }} />
    )
}
