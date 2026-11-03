import React from 'react'
import clsx from 'clsx'
import { MdArrowForward } from 'react-icons/md'

const TYPES = {
    'success': 'bg-emerald-400',
    'info': 'bg-cyan-400',
    'danger': 'bg-red-400',
    'warning': 'bg-amber-400',
}

export default function ActionButton({ isActive, isLoading = false, hasArrow = true, type = 'warning', onClick, children }) {
    return (
        <button type="button" disabled={!isActive || isLoading} onClick={() => onClick()}
            className={clsx("col-span-3 flex h-16 w-full items-center justify-center gap-2 rounded-2xl text-xl font-bold focus-visible:ring-white/60 transition focus-visible:ring-4", isActive && !isLoading ? `${TYPES[type]} text-black active:scale-[0.98]` : "bg-gray-500  text-gray-800")}>
            {hasArrow && !isLoading && <MdArrowForward size={"1.75rem"} />}
            {isLoading && <span className="loading loading-spinner loading-md"></span>}
            {children}
        </button>
    )
}
