import React from 'react'
import clsx from 'clsx'

function Segment({ segment, index, isActive }) {
    return (
        <span
            data-index={index}
            className={clsx(
                'transition-all duration-200 mx-1 inline-block',
                isActive
                    ? 'bg-amber-400 text-slate-900 rounded-xl px-2 font-black scale-105'
                    : 'text-slate-100'
            )}
        >
            {segment.text}
        </span>
    )
}

export default React.memo(Segment)
