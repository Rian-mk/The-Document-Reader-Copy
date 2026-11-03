import React from 'react';
import clsx from 'clsx';
import { MdOutlinePerson, MdArrowBackIosNew } from 'react-icons/md';

export default function UserCard({ name, phone, onClick, className }) {
    const isInteractive = !!onClick;
    const Tag = isInteractive ? 'button' : 'div';

    return (
        <Tag type={isInteractive ? 'button' : undefined} onClick={onClick}
            className={clsx(
                "group flex w-full items-center gap-3 text-right select-none",
                isInteractive && "justify-between rounded-3xl border border-slate-800 bg-slate-900 p-4 shadow-lg transition hover:bg-slate-800/80 active:scale-[0.98]",
                className
            )}>
            <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-amber-300">
                    <MdOutlinePerson size={"1.5rem"} />
                </div>
                <div className="flex flex-col text-right">
                    <span className="font-bold leading-snug text-slate-50">
                        {name}
                    </span>
                    <span className="text-right font-medium text-slate-400">
                        {phone}
                    </span>
                </div>
            </div>
            {isInteractive && (
                <div className="shrink-0 text-slate-400 transition-colors group-hover:text-amber-300">
                    <MdArrowBackIosNew size={"1.25rem"} className="transition-transform duration-300 group-active:-translate-x-1" />
                </div>
            )}
        </Tag>
    );
}
