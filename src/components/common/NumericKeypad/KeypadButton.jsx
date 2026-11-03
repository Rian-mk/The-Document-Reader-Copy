import React from 'react'
import clsx from 'clsx'

export default function KeypadButton({ onPushKey, value, isActive = true, children }) {
    return (
        <button type="button" onClick={() => onPushKey?.(value)} disabled={!isActive}
            className={clsx("key-btn select-none touch-manipulation flex h-16 items-center justify-center rounded-2xl bg-slate-900 text-2xl font-bold transition focus-visible:ring-4 focus-visible:ring-white/60 ", isActive ? "active:bg-slate-700 active:scale-[.95]" : "text-gray-700")}>
            {children}
        </button>
    )

}
