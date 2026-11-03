import React from "react";

export default function SplashScreen({ progress, statusText }) {
    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-slate-950 p-8 text-white select-none">
            <div className="my-auto flex flex-col items-center gap-4">
                <h1 className="text-xl font-bold tracking-tight">خوانا</h1>
            </div>

            <div className="w-full max-w-xs space-y-3 pb-8">
                <div className="flex justify-between text-xs text-slate-300">
                    <span className="truncate">{statusText}</span>
                    <span className="font-mono font-bold text-amber-400">{progress}%</span>
                </div>

                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                        className="h-full bg-amber-400 transition-all duration-300 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>
        </div>
    );
}