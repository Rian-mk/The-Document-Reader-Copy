import clsx from 'clsx'
import React from 'react'

export default function SettingsItem({ isCol = true, title, subtitle, children }) {
    return (
        <div className={clsx("flex w-full", isCol ? "flex-col gap-2" : "items-center justify-between gap-3")}>
            <div>
                <label className="text-base font-bold text-slate-100">{title}</label>
                <p className="text-sm leading-relaxed text-slate-400">
                    {subtitle}
                </p>
            </div>
            {children}
        </div>
    )
}
