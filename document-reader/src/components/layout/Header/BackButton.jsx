import React from 'react'
import { useNavigate } from 'react-router-dom';

export default function BackButton({ backTo = null, enable = true }) {
    const navigate = useNavigate();

    const handleBack = backTo ?
        // A logical parent is defined for this route — always navigate there.
        // replace keeps the history stack clean (no stale entries pile up),
        // so the browser/hardware back never lands on a dead page.
        function () { navigate(backTo, { replace: true }) } :
        // Fallback for routes without a defined parent:
        // step back in history, or go to /home when the page was opened
        // directly (no in-app history).
        function () {
            if (window.history.state && window.history.state.idx > 0) {
                navigate(-1);
            } else {
                navigate("/home", { replace: true });
            }
        }


    return (
        <button type="button" onClick={handleBack} disabled={!enable}
            className="transition-opacity duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 text-slate-100">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                <path d="M9 18l6-6-6-6" />
            </svg>
        </button>
    )
}
