import React from 'react'

export default function RestartButton({ onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-800 bg-slate-900 px-4 text-slate-100 transition focus-visible:ring-4 focus-visible:ring-white/60 active:scale-95 font-bold text-sm"
        >
            <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" width="20" height="20" viewBox="0 -960 960 960" fill="currentColor">
                <path d="M280-80 120-240l160-160 56 58-62 62h406v-160h80v240H274l62 62-56 58Zm-80-440v-240h486l-62-62 56-58 160 160-160 160-56-58 62-62H280v160h-80Z" />
            </svg>
            شروع از نخست
        </button>
    )
}
