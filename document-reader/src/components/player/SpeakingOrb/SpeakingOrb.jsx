import React from 'react'
import clsx from 'clsx'
import './style.css'

export default function SpeakingOrb({ isPlaying }) {
    return (
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
            {isPlaying && (
                <>
                    <span className="absolute inset-0 rounded-full border-2 border-amber-400 animate-pulse-ripple-1"></span>
                    <span className="absolute inset-0 rounded-full border-2 border-amber-400 animate-pulse-ripple-2"></span>
                    <span className="absolute inset-0 rounded-full border-2 border-amber-400 animate-pulse-ripple-3"></span>
                </>
            )}
            <span
                className={clsx(
                    'relative z-10 h-4.5 w-4.5 rounded-full transition-colors duration-300',
                    isPlaying ? 'bg-amber-400' : 'bg-slate-600'
                )}
            ></span>
        </div>
    )
}
