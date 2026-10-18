import React from 'react';
import { MdArrowBackIosNew, MdOutlineDescription, MdOutlineEditNote } from 'react-icons/md';

// One row of the history list. Mirrors the MenuListItem card language
// (rounded-xl / border-slate-800 / bg-slate-900 / px-4 py-3.5). The row body
// opens the document (like MenuListItem navigates) and the trailing pencil
// button renames it via PATCH /history/{ocrId}/title.
export default function HistoryListItem({
    title,
    fileName,
    createdAtLabel,
    onClick,
    onRename,
    isBusy = false,
}) {
    return (
        <div className="flex w-full items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3.5 select-none">
            <button type="button" onClick={onClick} disabled={isBusy}
                className="group flex min-w-0 flex-1 items-center gap-2.5 text-right">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-amber-300">
                    <MdOutlineDescription size={"1.25rem"} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1 text-right">
                    <span className="truncate text-base font-bold text-slate-50">
                        {title}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                        {fileName && (
                            <>
                                <span className="truncate">{fileName}</span>
                                <span aria-hidden="true" className="shrink-0 text-slate-600">•</span>
                            </>
                        )}
                        <span className="shrink-0">{createdAtLabel}</span>
                    </span>
                </div>
                {isBusy
                    ? <span className="loading loading-spinner loading-md shrink-0 text-amber-400"></span>
                    : <MdArrowBackIosNew size={"1.1rem"}
                        className="shrink-0 text-slate-400 transition-transform duration-200 group-active:-translate-x-1" />}
            </button>
            <button type="button" onClick={onRename} disabled={isBusy}
                aria-label={`تغییر عنوان ${title}`}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-400 transition hover:text-amber-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50">
                <MdOutlineEditNote size={"1.25rem"} />
            </button>
        </div>
    );
}
