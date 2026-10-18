import React from 'react'
import BackButton from './BackButton'

export default function Header({ title, backTo = null, showBack = true }) {
    return (
        <nav className="flex w-full bg-slate-900 p-3">
            <BackButton backTo={backTo} enable={showBack} />
            <h1 className="flex-1 text-center">
                {title}
            </h1>
        </nav>
    )
}
