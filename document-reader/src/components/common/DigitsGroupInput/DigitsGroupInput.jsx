import React, { useState } from 'react'
import DigitInput from './DigitInput'
import clsx from 'clsx'

export default function DigitsGroupInput({ digits, value, className }) {
    return (
        <div className={clsx("mb-5 flex w-full flex-row gap-2 [direction:ltr]", className)}>
            {Array.from({ length: digits }, (_, index) => (
                <DigitInput key={`digit-${index}`} digit={value[index]} isOccupied={index < value.length} />
            ))}
        </div>
    )
}
