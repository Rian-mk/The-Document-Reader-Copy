import React from 'react'

// Both directions share the same button shell; only the arrow path
// (a distinct icon, not a mirror of the other one) changes.
const ICON_PATHS = {
    backward:
        'M339.5-108.5q-65.5-28.5-114-77t-77-114Q120-365 120-440h80q0 117 81.5 198.5T480-160q117 0 198.5-81.5T760-440q0-117-81.5-198.5T480-720h-6l62 62-56 58-160-160 160-160 56 58-62 62h6q75 0 140.5 28.5t114 77q48.5 48.5 77 114T840-440q0 75-28.5 140.5t-77 114q-48.5 48.5-114 77T480-80q-75 0-140.5-28.5ZM380-320v-60h120v-40H380v-140h180v60H440v40h80q17 0 28.5 11.5T560-420v60q0 17-11.5 28.5T520-320H380Z',
    forward:
        'M339.5-108.5q-65.5-28.5-114-77t-77-114Q120-365 120-440t28.5-140.5q28.5-65.5 77-114t114-77Q405-800 480-800h6l-62-62 56-58 160 160-160 160-56-58 62-62h-6q-117 0-198.5 81.5T200-440q0 117 81.5 198.5T480-160q117 0 198.5-81.5T760-440h80q0 75-28.5 140.5t-77 114q-48.5 48.5-114 77T480-80q-75 0-140.5-28.5ZM380-320v-60h120v-40H380v-140h180v60H440v40h80q17 0 28.5 11.5T560-420v60q0 17-11.5 28.5T520-320H380Z',
}

export default function SkipButton({ direction, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex aspect-square h-16 items-center justify-center rounded-2xl border border-gray-800 bg-slate-900 px-3 transition focus-visible:ring-4 focus-visible:ring-white/60 active:scale-95 text-slate-100"
        >
            <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" width="36" height="36" viewBox="0 -960 960 960" fill="currentColor">
                <path d={ICON_PATHS[direction]} />
            </svg>
        </button>
    )
}
