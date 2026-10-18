import React, { useEffect, useRef } from 'react'
import Segment from './Segment'

export default function KaraokeBox({ segments, className, currentSegmentIndex }) {
    const containerRef = useRef(null)

    useEffect(() => {
        const activeEl = containerRef.current?.querySelector(
            `[data-index="${currentSegmentIndex}"]`
        )
        activeEl?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, [currentSegmentIndex])

    return (
        <div
            ref={containerRef}
            className="mb-5 min-h-0 flex-1 overflow-y-auto rounded-3xl border border-gray-800 bg-slate-900 p-5 dir-rtl"
        >
            <p className="text-[26px] leading-[2.1] font-medium text-right">
                {segments.map((segment, idx) => (
                    <>
                        <Segment
                            key={idx}
                            index={idx}
                            segment={segment}
                            isActive={idx === currentSegmentIndex}
                        />
                    </>
                ))}
            </p>
        </div>
    )
}
