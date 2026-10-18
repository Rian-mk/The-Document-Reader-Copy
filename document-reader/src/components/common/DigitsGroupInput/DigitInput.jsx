import React from 'react'
import clsx from 'clsx';

export default function DigitInput({ digit, isOccupied, type }) {
    return (
        <div className={clsx("flex h-14 w-full min-w-0 flex-1 items-center justify-center rounded-xl bg-slate-900 text-xl font-bold  transition", isOccupied ? "ring-amber-400 text-white ring-2" : "text-slate-600")}>
            {isOccupied ? digit : "•"}
        </div>
    )
}
