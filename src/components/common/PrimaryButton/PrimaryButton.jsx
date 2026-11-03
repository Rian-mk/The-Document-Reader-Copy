import React from 'react';
import clsx from 'clsx';
import { NoiseOverlay } from '../../effects/NoiseOverlay';
import { SpotlightOverlay } from '../../effects/SpotlightOverlay';
import { MdArrowBackIosNew } from 'react-icons/md';

const COLOR_VARIANTS = {
    emerald: "bg-emerald-500",
    amber: "bg-amber-300",
    cyan: "bg-cyan-300",
    indigo: "bg-indigo-500  "
};

export default function ActionCard({ type = "amber", icon, title, subtitle, onClick, isSquare, className }) {
    return (
        <button type="button" onClick={onClick}
            className={clsx("group relative flex w-full flex-col overflow-hidden rounded-[2.5rem] p-6 shadow-xl select-none transition-transform active:scale-[0.98] duration-300", COLOR_VARIANTS[type] || COLOR_VARIANTS.amber, icon && " justify-end", isSquare && "aspect-square", className)}>

            <NoiseOverlay />
            <SpotlightOverlay />

            {icon && (
                <div aria-hidden="true"
                    className="pointer-events-none absolute -top-4 -left-12 text-black/10 transition-transform duration-300 group-active:scale-105">
                    {icon}
                </div>
            )}

            <div className="relative z-10 flex w-full">
                <div className={clsx("flex w-full gap-1 text-right", icon ? "items-end" : "items-center")}>
                    <div className={clsx("flex flex-1 flex-col transition-transform duration-300 group-active:scale-[1.05]", !subtitle && "justify-center")}>
                        <h2 className={clsx("text-[2.75rem] font-black leading-none tracking-tight text-slate-900", subtitle && "mb-3")}>
                            {title}
                        </h2>
                        {subtitle && (
                            <p className="max-w-60 text-[1.35rem] font-bold leading-tight text-slate-900/80">
                                {subtitle}
                            </p>
                        )}
                    </div>
                    <MdArrowBackIosNew size={"2.5rem"} className="shrink-0 text-slate-900/80 transition-transform duration-300 group-active:-translate-x-2" />
                </div>
            </div>
        </button>
    );
}