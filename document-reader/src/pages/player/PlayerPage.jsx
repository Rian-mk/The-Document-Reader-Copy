import { useState, useEffect } from 'react'
import KaraokeBox from '@/components/player/KaraokeBox'
import ProgressBar from '@/components/player/ProgressBar'
import ControlsBar from '@/components/player/ControlsBar'
import SpeakingOrb from "@/components/player/SpeakingOrb";
import { CAPTURED_PIPELINE_KEY, READING_SPEED_KEY } from '@/constants/player'
import { getApiErrorMessage, ttsService } from "../../services/apiClient";
import useSpeechPlayer from '../../hooks/useSpeechPlayer'
import { toast } from "sonner"
import { ERROR_CODES, ERROR_MESSAGES } from '@/constants/error';
import { useNavigate } from 'react-router-dom';
import { MdPhotoCamera } from 'react-icons/md';


let lastCheckActiveSegment = 0;

export default function PlayerPage() {
    const navigate = useNavigate()
    const initialSpeed = Number.parseFloat(localStorage.getItem(READING_SPEED_KEY)) || 1.0

    const [speed, setSpeed] = useState(initialSpeed)
    const [isDownloading, setIsDownloading] = useState(true)
    const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0)

    const player = useSpeechPlayer();

    let pipelineData;
    try {
        pipelineData = JSON.parse(localStorage.getItem(CAPTURED_PIPELINE_KEY))
    } catch {
        navigate("/home", { replace: true })
        toast.error(ERROR_MESSAGES[ERROR_CODES.SENTENCE_AUDIO_DATA_INVALID])
    }

    const segments = pipelineData?.segments || []

    useEffect(() => {
        (async () => {
            let audioUrl;
            try {
                audioUrl = JSON.parse(localStorage.getItem(CAPTURED_PIPELINE_KEY)).audioUrl
            } catch {
                navigate("/home", { replace: true })
                return
            }

            let blob;
            try {
                blob = await ttsService.getAudioBlob(audioUrl);
                player.load(blob);
                setIsDownloading(false)
                player.setSpeed(initialSpeed);
                player.play();
            } catch (err) {
                toast.error(getApiErrorMessage(err))
            }

        })()
    }, [])

    useEffect(() => {
        player.error && toast.error(player.error)
    }, [player.error])

    useEffect(() => {
        if (!player.isPlaying || segments.length === 0 || Date.now() - 200 < lastCheckActiveSegment) {
            return
        }

        lastCheckActiveSegment = Date.now()

        let segmentsTime = 0

        segments.some((s, i) => {
            if (player.currentTime * 1000 > player.duration * 1000 - segments[segments.length - 1].durationMs) {
                setCurrentSegmentIndex(segments.length - 1)
                return true
            } else if (segmentsTime > player.currentTime * 1000) {
                setCurrentSegmentIndex(i - 1)
                return true
            }
            else {
                segmentsTime += s.durationMs
            }
        })
    }, [
        player.isPlaying,
        player.currentTime,
        currentSegmentIndex,
        segments,
    ])

    const handlePlayPause = () => {
        player.toggle()
    }

    const handleRestart = () => {
        setCurrentSegmentIndex(0)
        player.restart()
    }

    const handleSkipForward = () => {
        player.skip(+10)
    }

    const handleSkipBackward = () => {
        player.skip(-10)
    }

    const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0]
    const handleCycleSpeed = () => {
        const currentIndex = speedOptions.indexOf(speed)
        const nextIndex = (currentIndex + 1) % speedOptions.length
        const nextSpeed = speedOptions[nextIndex]
        setSpeed(nextSpeed)
        player.setSpeed(nextSpeed)
    }


    const progressPercent = (player.currentTime / player.duration || player.currentTime) * 100

    return (
        <div className="w-full flex flex-col flex-1 h-full select-none justify-between">
            <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    {isDownloading ? (
                        <span className="loading loading-spinner loading-md" />
                    ) : (
                        <SpeakingOrb isPlaying={player.isPlaying} />
                    )}

                    <span className="text-lg font-bold">
                        {isDownloading
                            ? "درحال بارگیری گفتار..."
                            : player.isPlaying
                                ? "در حال خواندن متن..."
                                : "پخش متوقف شد"}
                    </span>
                </div>

                <button
                    type="button"
                    onClick={() => { navigate("/camera/select-mode") }}
                    className="flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-800 bg-slate-900 px-4 text-sm font-bold text-slate-100 transition focus-visible:ring-4 focus-visible:ring-white/60 active:scale-95"
                >
                    <MdPhotoCamera />
                    <span>تصویربرداری دوباره</span>
                </button>
            </div>
            <KaraokeBox segments={segments} currentSegmentIndex={currentSegmentIndex} />

            <ProgressBar
                percent={progressPercent}
                onChange={(percent) => {
                    player.seekTo((percent / 100) * player.duration)
                }}
            />

            <ControlsBar
                speed={speed}
                isPlaying={player.isPlaying}
                onCycleSpeed={handleCycleSpeed}
                onRestart={handleRestart}
                onSkipBackward={handleSkipBackward}
                onSkipForward={handleSkipForward}
                onPlayPause={handlePlayPause}
            />
        </div>
    )
}
