import React from 'react'

export default function ProgressBar({ percent, onChange }) {
    return (
        <div className="mb-4 shrink-0 w-full px-1">
            <div className="relative h-2 rounded-full bg-slate-800">
                <div
                    className="absolute inset-y-0 right-0 rounded-tr-full rounded-br-full bg-amber-400"
                    style={{ width: `${percent}%` }}
                />

                <div
                    className="absolute top-1/2 size-5 -translate-y-1/2 rounded-full translate-x-2 bg-amber-400 shadow-md"
                    style={{ right: `${percent}%` }}
                />

                <input
                    type="range"
                    min="0"
                    max="100"
                    step="0.1"
                    value={percent}
                    onChange={(e) => onChange(Number(e.target.value))}
                    dir="rtl"
                    className="absolute inset-0 z-10 h-5 w-full cursor-pointer opacity-0"
                />
            </div>
        </div>
    )
}