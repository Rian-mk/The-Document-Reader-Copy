import React from 'react'
import KeypadButton from './KeypadButton'
import { MdOutlineBackspace } from 'react-icons/md'

export default function NumericKeypad({ isActive, onPushKey, onRemoveDigit }) {
    return (
        <div className="grid w-full grid-cols-3 gap-3 [direction:ltr]">
            {
                [1, 2, 3, 4, 5, 6, 7, 8, 9, -1, 0].map(n => {
                    if (n < 0) {
                        return <div key="empty-slot"></div>
                    }
                    return <KeypadButton key={`number-${n}`} value={n} onPushKey={onPushKey} isActive={isActive}> {n} </KeypadButton>
                })
            }
            <KeypadButton onPushKey={onRemoveDigit} isActive={isActive}>
                <MdOutlineBackspace />
            </KeypadButton>
        </div>
    )
}
