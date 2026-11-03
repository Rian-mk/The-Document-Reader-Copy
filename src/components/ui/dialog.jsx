import React from "react";

export function Dialog({ open, onOpenChange, children }) {
    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    onOpenChange?.(false);
                }
            }}
        >
            {children}
        </div>
    );
}

export function DialogContent({ children, className = "", ...props }) {
    return (
        <div
            role="dialog"
            aria-modal="true"
            className={`w-full rounded-2xl border p-5 shadow-xl ${className}`}
            onMouseDown={(event) => event.stopPropagation()}
            {...props}
        >
            {children}
        </div>
    );
}

export function DialogHeader({ children, className = "", ...props }) {
    return (
        <div className={`mb-4 ${className}`} {...props}>
            {children}
        </div>
    );
}

export function DialogTitle({ children, className = "", ...props }) {
    return (
        <h2 className={`text-lg font-bold ${className}`} {...props}>
            {children}
        </h2>
    );
}

export function DialogFooter({ children, className = "", ...props }) {
    return (
        <div className={`mt-5 ${className}`} {...props}>
            {children}
        </div>
    );
}