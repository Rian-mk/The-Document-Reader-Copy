import React from 'react'
import { MdPlayArrow, MdPause } from 'react-icons/md'

export default function PlayPauseButton({ isPlaying, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex h-24 w-24 items-center justify-center rounded-full bg-amber-400 text-slate-950 transition focus-visible:ring-4 focus-visible:ring-white/60 active:scale-95"
        >
            {isPlaying ? (
                <MdPause size="3.2rem" />
            ) : (
                <MdPlayArrow size="3.2rem" className="translate-x-0.5" />
            )}
        </button>
    )
}
