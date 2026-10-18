import React from 'react'
import clsx from 'clsx'

function Word({ word, index, isActive }) {
    return (
        <span
            data-index={index}
            className={clsx(
                'word transition-all duration-200 mx-1 inline-block',
                isActive
                    ? 'bg-amber-400 text-slate-900 rounded-xl px-2 font-black scale-105'
                    : 'text-slate-100'
            )}
        >
            {word}
        </span>
    )
}

// React.memo skips re-rendering a word whose props haven't changed.
// Since `word` and `index` never change for a given position, only the
// two words whose `isActive` actually flips (old + new) re-render on
// every tick, instead of the whole list.
export default React.memo(Word)
