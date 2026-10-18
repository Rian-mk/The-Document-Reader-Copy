import { useRef, useState, useEffect, useCallback } from "react";

export default function useSpeechPlayer({ defaultSpeed = 1 } = {}) {
    const audioRef = useRef(null);
    const objectUrlRef = useRef(null);

    const [isLoaded, setIsLoaded] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [speed, setSpeedState] = useState(defaultSpeed);
    const [error, setError] = useState(null);

    const ensureAudio = useCallback(() => {
        if (audioRef.current) return audioRef.current;

        const audio = new Audio();
        audio.preload = "auto";

        audio.addEventListener("play", () => {
            setIsPlaying(true);
        });

        audio.addEventListener("pause", () => {
            setIsPlaying(false);
        });

        audio.addEventListener("ended", () => {
            setIsPlaying(false);
            setCurrentTime(
                Number.isFinite(audio.duration) ? audio.duration : audio.currentTime,
            );
        });

        audio.addEventListener("loadedmetadata", () => {
            if (Number.isFinite(audio.duration)) {
                setDuration(audio.duration);
            }
            setIsLoaded(true);
        });

        audio.addEventListener("durationchange", () => {
            if (Number.isFinite(audio.duration)) {
                setDuration(audio.duration);
            } else if (audio.duration === Infinity) {
                audio.currentTime = 1e101;
                audio.addEventListener(
                    "timeupdate",
                    function fixDuration() {
                        audio.removeEventListener("timeupdate", fixDuration);
                        audio.currentTime = 0;
                        if (Number.isFinite(audio.duration)) {
                            setDuration(audio.duration);
                        }
                    },
                    { once: true },
                );
            }
        });

        audio.addEventListener("timeupdate", () => {
            setCurrentTime(audio.currentTime);
        });

        audio.addEventListener("error", (e) => {
            setIsPlaying(false);
            setError("خطا در پخش صدا. لطفاً دوباره تلاش کنید.");
        });

        audio.addEventListener("canplay", () => {
        });


        audioRef.current = audio;
        return audio;
    }, []);

    const load = useCallback(
        (blobOrFile) => {
            const audio = ensureAudio();

            if (objectUrlRef.current) {
                URL.revokeObjectURL(objectUrlRef.current);
                objectUrlRef.current = null;
            }

            audio.pause();
            setIsPlaying(false);
            setCurrentTime(0);
            setDuration(0);
            setIsLoaded(false);
            setError(null);

            if (!blobOrFile) {
                return;
            }

            const url = URL.createObjectURL(blobOrFile);
            objectUrlRef.current = url;
            audio.src = url;
            audio.playbackRate = speed;
            audio.load();
        },
        [ensureAudio, speed],
    );

    const play = useCallback(async () => {
        const audio = ensureAudio();

        if (!objectUrlRef.current) {
            return;
        }

        audio.play().catch((err) => {
            console.error('[Audio] Play failed:', err)
            setError('پخش صدا ممکن نیست. دوباره امتحان کنید.')
        })
    }, [ensureAudio]);

    const pause = useCallback(() => {
        audioRef.current?.pause();
    }, []);

    const toggle = useCallback(() => {
        if (audioRef.current?.paused) {
            play();
        } else {
            pause();
        }
    }, [play, pause]);

    const seekTo = useCallback((seconds) => {
        const audio = audioRef.current;
        if (!audio || !Number.isFinite(seconds)) return;

        const max = Number.isFinite(audio.duration) ? audio.duration : seconds;
        const target = Math.min(Math.max(seconds, 0), Math.max(max - 0.05, 0));

        audio.currentTime = target;
        setCurrentTime(target);
    }, []);

    const skip = useCallback(
        (seconds) => {
            const audio = audioRef.current;
            if (!audio) return;
            seekTo(audio.currentTime + seconds);
        },
        [seekTo],
    );

    const restart = useCallback(() => {
        seekTo(0);
        play();
    }, [seekTo, play]);

    const setSpeed = useCallback((value) => {
        const audio = ensureAudio();
        const clamped = Math.min(Math.max(value, 0.25), 4);
        audio.playbackRate = clamped;
        audio.preservesPitch = true;
        setSpeedState(clamped);
    }, [ensureAudio]);

    const getCurrentTime = useCallback(
        () => audioRef.current?.currentTime ?? 0,
        [],
    );

    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = "";
            }
            if (objectUrlRef.current) {
                URL.revokeObjectURL(objectUrlRef.current);
                objectUrlRef.current = null;
            }
            audioRef.current = null;
        };
    }, []);

    return {
        isLoaded,
        isPlaying,
        duration,
        currentTime,
        progress: duration > 0 ? currentTime / duration : 0,
        speed,
        error,

        load, play, pause,
        toggle,
        seekTo, skip, restart,
        setSpeed, getCurrentTime,
    };
}