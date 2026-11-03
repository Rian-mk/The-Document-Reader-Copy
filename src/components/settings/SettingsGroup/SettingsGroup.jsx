import clsx from 'clsx'
import React from 'react'

export default function SettingsGroup({ className = "", title, children }) {
    return (
        <div className="flex flex-col gap-4">
            <div className={clsx("flex items-center gap-4", className)}>
                <h2 className="shrink-0 font-bold text-cyan-400">{title}</h2>
                <div className="h-px w-full bg-slate-800"></div>
            </div>
            <>
                {children}
            </>
        </div>
    )
}
