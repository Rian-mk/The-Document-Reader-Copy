import React from 'react'
import SpeedButton from './SpeedButton'
import RestartButton from './RestartButton'
import SkipButton from './SkipButton'
import PlayPauseButton from './PlayPauseButton'

export default function ControlsBar({
    speed,
    isPlaying,
    onCycleSpeed,
    onRestart,
    onSkipBackward,
    onSkipForward,
    onPlayPause,
}) {
    return (
        <>
            <div className="mb-3 flex shrink-0 items-center justify-between w-full dir-rtl">
                <SpeedButton speed={speed} onClick={onCycleSpeed} />
                <RestartButton onClick={onRestart} />
            </div>

            <div className="flex shrink-0 items-center justify-center gap-5 w-full">
                <SkipButton direction="forward" onClick={onSkipBackward} />
                <PlayPauseButton isPlaying={isPlaying} onClick={onPlayPause} />
                <SkipButton direction="backward" onClick={onSkipForward} />
            </div>
        </>
    )
}
