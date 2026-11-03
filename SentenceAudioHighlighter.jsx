import { useEffect, useRef, useState } from "react";
import {
  formatTtsAudioDuration,
  getApiErrorMessage,
  ttsService,
} from "../services/apiClient";

const hasPlayableSentenceAudio = (value) =>
  Array.isArray(value?.segments) &&
  value.segments.length > 0 &&
  value.segments.every(
    (segment) =>
      typeof segment?.audioBase64 === "string" && segment.audioBase64.length > 0,
  );

// پاسخ Pipeline فقط متن و مدت را دارد. صوت فقط در صورت نیاز از sentenceAudioUrl گرفته می‌شود.
export default function SentenceAudioHighlighter({
  pipelineResponse = null,
  sentenceAudioUrlOrTtsId,
  activeClassName = "tts-sentence-active",
}) {
  const audioRef = useRef(null);
  const playbackControllerRef = useRef(null);
  const [response, setResponse] = useState(() =>
    hasPlayableSentenceAudio(pipelineResponse) ? pipelineResponse : null,
  );
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    playbackControllerRef.current?.abort();
    audioRef.current?.pause();
    setResponse(
      hasPlayableSentenceAudio(pipelineResponse) ? pipelineResponse : null,
    );
    setActiveIndex(-1);
  }, [pipelineResponse]);

  useEffect(
    () => () => {
      playbackControllerRef.current?.abort();
      audioRef.current?.pause();
    },
    [],
  );

  const prepare = async () => {
    if (hasPlayableSentenceAudio(pipelineResponse)) {
      setResponse(pipelineResponse);
      setActiveIndex(-1);
      return;
    }

    const audioSource =
      sentenceAudioUrlOrTtsId ||
      pipelineResponse?.sentenceAudioUrl ||
      pipelineResponse?.ttsId;

    if (!audioSource) {
      setError("شناسه یا آدرس صوت جمله‌ها موجود نیست.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await ttsService.getSentenceAudio(audioSource);
      setResponse(result);
      setActiveIndex(-1);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  const play = async () => {
    if (!response || !audioRef.current || playing) {
      return;
    }

    const controller = new AbortController();
    playbackControllerRef.current = controller;
    setPlaying(true);
    setError("");

    try {
      await ttsService.playSentences(response, {
        audioElement: audioRef.current,
        signal: controller.signal,
        onSentenceChange: (segment) => {
          setActiveIndex(segment?.index ?? -1);
        },
      });
    } catch (playError) {
      if (playError?.name !== "AbortError") {
        setError(playError?.message || "پخش صوت جمله‌ها انجام نشد.");
      }
    } finally {
      playbackControllerRef.current = null;
      setPlaying(false);
      setActiveIndex(-1);
    }
  };

  const stop = () => {
    playbackControllerRef.current?.abort();
    audioRef.current?.pause();
    setActiveIndex(-1);
  };

  const displayResponse =
    response ||
    (Array.isArray(pipelineResponse?.segments) ? pipelineResponse : null);

  return (
    <section dir="rtl">
      <div>
        <button
          type="button"
          onClick={prepare}
          disabled={loading || playing || Boolean(response)}
        >
          {loading
            ? "در حال آماده‌سازی جمله‌ها..."
            : response
              ? "صوت جمله‌ها آماده است"
              : "دریافت صوت برای پخش جمله‌ای"}
        </button>

        <button
          type="button"
          onClick={play}
          disabled={!response || loading || playing}
        >
          {playing ? "در حال پخش..." : "پخش جمله‌به‌جمله"}
        </button>

        <button type="button" onClick={stop} disabled={!playing}>
          توقف
        </button>
      </div>

      <audio ref={audioRef} controls />

      {displayResponse ? (
        <p>
          مدت کل صوت جمله‌ها:{" "}
          {formatTtsAudioDuration(displayResponse.totalDurationMs)}
        </p>
      ) : null}

      {error ? <p role="alert">{error}</p> : null}

      <p aria-live="polite">
        {displayResponse?.segments?.map((segment) => (
          <span
            key={segment.index}
            className={segment.index === activeIndex ? activeClassName : ""}
            style={
              segment.index === activeIndex
                ? { backgroundColor: "#ffe58f", borderRadius: 4 }
                : undefined
            }
          >
            {segment.text}
            <small
              style={{ marginInline: 4, opacity: 0.65 }}
              title={`${segment.durationMs} میلی‌ثانیه`}
            >
              ({formatTtsAudioDuration(segment.durationMs)})
            </small>{" "}
          </span>
        ))}
      </p>
    </section>
  );
}
