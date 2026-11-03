import React from 'react';
import clsx from 'clsx';
import { MdArrowBackIosNew } from 'react-icons/md';

const TEXT_VARIANTS = {
    default: "text-slate-50",
    info: "text-cyan-400",
    danger: "text-red-400",
};

export default function MenuListItem({ icon, label, onClick, variant = "default", disabled = false, badge }) {
    return (
        <button type="button" disabled={disabled} onClick={onClick}
            className={clsx(
                "group flex w-full items-center justify-between gap-2 rounded-xl border px-4 py-3.5 transition select-none",
                disabled
                    ? "cursor-not-allowed border-dashed border-slate-800/80 bg-slate-900/40 text-slate-500"
                    : clsx("border-slate-800 bg-slate-900", TEXT_VARIANTS[variant] || TEXT_VARIANTS.default)
            )}>
            <div className="flex items-center gap-2.5">
                <span className={clsx("h-6 w-6 shrink-0", disabled && "text-slate-500")}>
                    {icon}
                </span>
                <span className="text-base font-bold">
                    {label}
                </span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
                {badge && (
                    <span className="rounded-md border border-slate-700/60 bg-slate-800 px-2 py-0.5 text-xs font-semibold text-slate-400">
                        {badge}
                    </span>
                )}
                <MdArrowBackIosNew size={"1.1rem"}
                    className={clsx("transition-transform duration-200", !disabled && "group-active:-translate-x-1", disabled && "text-slate-600")} />
            </div>
        </button>
    )
}
