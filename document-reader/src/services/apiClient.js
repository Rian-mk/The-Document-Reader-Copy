import axios from "axios";
import { Capacitor } from "@capacitor/core";
import {
    ERROR_CODES,
    ERROR_MESSAGES,
    getPositiveNumberErrorMessage,
} from "@/constants/error.js";

// One base URL per platform (see .env.example): a Capacitor build runs on a
// phone/emulator where "localhost" is the device itself, so the native build
// needs the LAN address of the backend. VITE_API_BASE_URL stays as the shared
// fallback for setups that define only one address.
const apiBaseUrl =
    (Capacitor.isNativePlatform()
        ? import.meta.env.VITE_API_BASE_URL_MOBILE
        : import.meta.env.VITE_API_BASE_URL_WEB) ||
    import.meta.env.VITE_API_BASE_URL ||
    "https://localhost:7282";

export const BASE_URL = apiBaseUrl.replace(/\/+$/, "");

// Vite exposes env vars on import.meta.env (not process.env as in CRA)
const parsedTimeout = Number(import.meta.env.VITE_API_TIMEOUT_MS);
const REQUEST_TIMEOUT_MS =
    Number.isFinite(parsedTimeout) && parsedTimeout > 0 ? parsedTimeout : 90000;

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const ACCESS_TOKEN_EXPIRES_AT_KEY = "access_token_expires_at";

const getStorage = () => {
    if (typeof window === "undefined") {
        return null;
    }

    try {
        return window.localStorage;
    } catch {
        return null;
    }
};

export const TTS_SETTINGS_STORAGE_KEY = "tts_settings";

export const DEFAULT_TTS_SETTINGS = Object.freeze({
    gender: "male",
    speakerId: 1,
    audioFormat: "mp3",
});

const ALLOWED_TTS_GENDERS = new Set(["male", "female"]);
const ALLOWED_TTS_AUDIO_FORMATS = new Set(["mp3", "opus"]);
let memoryTtsSettings = { ...DEFAULT_TTS_SETTINGS };

const hasOwn = (value, propertyName) =>
    Object.prototype.hasOwnProperty.call(value, propertyName);

const normalizeTtsGender = (value) => {
    const normalized = String(value ?? "")
        .trim()
        .toLowerCase();

    if (!ALLOWED_TTS_GENDERS.has(normalized)) {
        throw new Error(ERROR_MESSAGES[ERROR_CODES.TTS_GENDER_INVALID]);
    }

    return normalized;
};

const normalizeTtsSpeakerId = (value) => {
    const normalized = Number(value);

    if (!Number.isInteger(normalized) || normalized <= 0) {
        throw new Error(ERROR_MESSAGES[ERROR_CODES.TTS_SPEAKER_ID_INVALID]);
    }

    return normalized;
};

const normalizeTtsAudioFormat = (value) => {
    const normalized = String(value ?? "")
        .trim()
        .replace(/^\./, "")
        .toLowerCase();

    if (!ALLOWED_TTS_AUDIO_FORMATS.has(normalized)) {
        throw new Error(ERROR_MESSAGES[ERROR_CODES.TTS_AUDIO_FORMAT_INVALID]);
    }

    return normalized;
};

const sanitizeStoredTtsSettings = (value) => {
    const sanitized = { ...DEFAULT_TTS_SETTINGS };

    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return sanitized;
    }

    try {
        if (hasOwn(value, "gender")) {
            sanitized.gender = normalizeTtsGender(value.gender);
        }
    } catch { }

    try {
        if (hasOwn(value, "speakerId")) {
            sanitized.speakerId = normalizeTtsSpeakerId(value.speakerId);
        }
    } catch { }

    try {
        if (hasOwn(value, "audioFormat")) {
            sanitized.audioFormat = normalizeTtsAudioFormat(value.audioFormat);
        }
    } catch { }

    return sanitized;
};

const persistTtsSettings = (settings) => {
    memoryTtsSettings = { ...settings };

    try {
        getStorage()?.setItem(TTS_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {

    }
};

export const ttsSettingsService = {
    getSettings: () => {
        const storage = getStorage();
        if (!storage) {
            return { ...memoryTtsSettings };
        }

        try {
            const rawValue = storage.getItem(TTS_SETTINGS_STORAGE_KEY);
            if (!rawValue) {
                return { ...memoryTtsSettings };
            }

            const sanitized = sanitizeStoredTtsSettings(JSON.parse(rawValue));
            persistTtsSettings(sanitized);
            return { ...sanitized };
        } catch {
            persistTtsSettings(DEFAULT_TTS_SETTINGS);
            return { ...DEFAULT_TTS_SETTINGS };
        }
    },

    updateSettings: (partialSettings = {}) => {
        if (
            !partialSettings ||
            typeof partialSettings !== "object" ||
            Array.isArray(partialSettings)
        ) {
            throw new Error(ERROR_MESSAGES[ERROR_CODES.TTS_SETTINGS_PAYLOAD_INVALID]);
        }

        const next = ttsSettingsService.getSettings();

        if (hasOwn(partialSettings, "gender")) {
            next.gender = normalizeTtsGender(partialSettings.gender);
        }

        if (hasOwn(partialSettings, "speakerId")) {
            next.speakerId = normalizeTtsSpeakerId(partialSettings.speakerId);
        }

        if (hasOwn(partialSettings, "audioFormat")) {
            next.audioFormat = normalizeTtsAudioFormat(partialSettings.audioFormat);
        }

        persistTtsSettings(next);
        return { ...next };
    },

    saveSettings: (settings) => {
        if (
            !settings ||
            typeof settings !== "object" ||
            Array.isArray(settings) ||
            !hasOwn(settings, "gender") ||
            !hasOwn(settings, "speakerId") ||
            !hasOwn(settings, "audioFormat")
        ) {
            throw new Error(ERROR_MESSAGES[ERROR_CODES.TTS_SETTINGS_INCOMPLETE]);
        }

        const next = {
            gender: normalizeTtsGender(settings.gender),
            speakerId: normalizeTtsSpeakerId(settings.speakerId),
            audioFormat: normalizeTtsAudioFormat(settings.audioFormat),
        };

        persistTtsSettings(next);
        return { ...next };
    },

    getDefaults: () => ttsSettingsService.getSettings(),
    saveDefaults: (settings) => ttsSettingsService.saveSettings(settings),

    getGender: () => ttsSettingsService.getSettings().gender,
    getSpeakerId: () => ttsSettingsService.getSettings().speakerId,
    getAudioFormat: () => ttsSettingsService.getSettings().audioFormat,

    setGender: (gender) => ttsSettingsService.updateSettings({ gender }),
    setSpeakerId: (speakerId) => ttsSettingsService.updateSettings({ speakerId }),
    setAudioFormat: (audioFormat) =>
        ttsSettingsService.updateSettings({ audioFormat }),

    resetGender: () =>
        ttsSettingsService.updateSettings({
            gender: DEFAULT_TTS_SETTINGS.gender,
        }),
    resetSpeakerId: () =>
        ttsSettingsService.updateSettings({
            speakerId: DEFAULT_TTS_SETTINGS.speakerId,
        }),
    resetAudioFormat: () =>
        ttsSettingsService.updateSettings({
            audioFormat: DEFAULT_TTS_SETTINGS.audioFormat,
        }),

    resetSettings: () => {
        memoryTtsSettings = { ...DEFAULT_TTS_SETTINGS };

        try {
            getStorage()?.removeItem(TTS_SETTINGS_STORAGE_KEY);
        } catch { }

        return { ...DEFAULT_TTS_SETTINGS };
    },
};

const isMissingTtsSetting = (value) =>
    value === undefined || value === null || value === "";

const resolveTtsSettings = (options = {}) => {
    const defaults = ttsSettingsService.getDefaults();

    return {
        gender: isMissingTtsSetting(options.gender)
            ? defaults.gender
            : normalizeTtsGender(options.gender),
        speakerId: isMissingTtsSetting(options.speakerId)
            ? defaults.speakerId
            : normalizeTtsSpeakerId(options.speakerId),
        audioFormat: isMissingTtsSetting(options.audioFormat)
            ? defaults.audioFormat
            : normalizeTtsAudioFormat(options.audioFormat),
    };
};

export const tokenService = {
    getAccessToken: () => getStorage()?.getItem(ACCESS_TOKEN_KEY) ?? null,

    getRefreshToken: () => getStorage()?.getItem(REFRESH_TOKEN_KEY) ?? null,

    getAccessTokenExpiresAt: () => {
        const value = getStorage()?.getItem(ACCESS_TOKEN_EXPIRES_AT_KEY);
        const timestamp = Number(value);
        return Number.isFinite(timestamp) ? timestamp : null;
    },

    isAccessTokenExpired: (clockSkewSeconds = 30) => {
        const expiresAt = tokenService.getAccessTokenExpiresAt();
        if (!expiresAt) {
            return false;
        }

        return Date.now() >= expiresAt - clockSkewSeconds * 1000;
    },

    setTokens: (accessToken, refreshToken, expiresInSeconds) => {
        const storage = getStorage();
        if (!storage || !accessToken) {
            return;
        }

        storage.setItem(ACCESS_TOKEN_KEY, accessToken);

        if (refreshToken) {
            storage.setItem(REFRESH_TOKEN_KEY, refreshToken);
        }

        const lifetime = Number(expiresInSeconds);
        if (Number.isFinite(lifetime) && lifetime > 0) {
            storage.setItem(
                ACCESS_TOKEN_EXPIRES_AT_KEY,
                String(Date.now() + lifetime * 1000),
            );
        } else {
            storage.removeItem(ACCESS_TOKEN_EXPIRES_AT_KEY);
        }
    },

    clearTokens: () => {
        const storage = getStorage();
        if (!storage) {
            return;
        }

        storage.removeItem(ACCESS_TOKEN_KEY);
        storage.removeItem(REFRESH_TOKEN_KEY);
        storage.removeItem(ACCESS_TOKEN_EXPIRES_AT_KEY);
    },
};

const axiosConfig = {
    baseURL: BASE_URL,
    timeout: REQUEST_TIMEOUT_MS,
    headers: {
        Accept: "application/json",
    },
};

const publicClient = axios.create(axiosConfig);

const apiClient = axios.create(axiosConfig);

const setAuthorizationHeader = (config, token) => {
    config.headers = config.headers || {};

    if (typeof config.headers.set === "function") {
        config.headers.set("Authorization", `Bearer ${token}`);
    } else {
        config.headers.Authorization = `Bearer ${token}`;
    }
};

apiClient.interceptors.request.use(
    (config) => {
        const token = tokenService.getAccessToken();

        if (token) {
            setAuthorizationHeader(config, token);
        }

        return config;
    },
    (error) => Promise.reject(error),
);

let authFailureHandler = null;

export const setAuthFailureHandler = (handler) => {
    authFailureHandler = typeof handler === "function" ? handler : null;
};

const notifyAuthFailure = (error) => {
    if (authFailureHandler) {
        authFailureHandler(error);
    }
};

let refreshPromise = null;

const refreshSession = () => {
    if (refreshPromise) {
        return refreshPromise;
    }

    refreshPromise = (async () => {
        const refreshToken = tokenService.getRefreshToken();

        if (!refreshToken) {
            throw new Error(ERROR_MESSAGES[ERROR_CODES.SESSION_EXPIRED]);
        }

        const { data } = await publicClient.post("/auth/refresh", {
            refreshToken,
        });

        if (!data?.accessToken || !data?.refreshToken) {
            throw new Error(ERROR_MESSAGES[ERROR_CODES.SESSION_REFRESH_FAILED]);
        }

        tokenService.setTokens(
            data.accessToken,
            data.refreshToken,
            data.expiresInSeconds,
        );

        return data;
    })()
        .catch((error) => {
            tokenService.clearTokens();
            notifyAuthFailure(error);
            throw error;
        })
        .finally(() => {
            refreshPromise = null;
        });

    return refreshPromise;
};

const isPublicAuthRequest = (url = "") =>
    ["/auth/send-code", "/auth/verify-code", "/auth/refresh"].some((path) =>
        String(url).includes(path),
    );

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        const shouldRefresh =
            error.response?.status === 401 &&
            originalRequest &&
            !originalRequest._retry &&
            !isPublicAuthRequest(originalRequest.url);

        if (!shouldRefresh) {
            return Promise.reject(error);
        }

        originalRequest._retry = true;

        try {
            const session = await refreshSession();
            setAuthorizationHeader(originalRequest, session.accessToken);
            return apiClient(originalRequest);
        } catch (refreshError) {
            return Promise.reject(refreshError);
        }
    },
);

export const getApiErrorMessage = (
    error,
    fallback = ERROR_MESSAGES[ERROR_CODES.GENERIC_SERVER_ERROR],
) => {
    if (error?.code === "ECONNABORTED") {
        return ERROR_MESSAGES[ERROR_CODES.SERVER_UNREACHABLE];
    }

    const data = error?.response?.data;

    if (typeof data === "string" && data.trim()) {
        return data;
    }

    if (data?.message) {
        return data.message;
    }

    if (data?.errors && typeof data.errors === "object") {
        const validationMessage = Object.values(data.errors)
            .flat()
            .find((message) => typeof message === "string" && message.trim());

        if (validationMessage) {
            return validationMessage;
        }
    }

    if (data?.title) {
        return data.title;
    }

    if (error?.request && !error?.response) {
        return ERROR_MESSAGES[ERROR_CODES.SERVER_UNREACHABLE];
    }

    return error?.message || fallback;
};

export const getRetryAfterSeconds = (error) => {
    const headerValue = error?.response?.headers?.["retry-after"];
    const bodyValue = error?.response?.data?.retryAfterSeconds;
    const value = Number(headerValue ?? bodyValue);
    return Number.isFinite(value) && value >= 0 ? value : null;
};

export const apiService = {
    get: (url, params = {}, config = {}) =>
        apiClient
            .get(url, {
                ...config,
                params: config.params ?? params,
            })
            .then((response) => response.data),

    post: (url, data = {}, config = {}) =>
        apiClient.post(url, data, config).then((response) => response.data),

    put: (url, data = {}, config = {}) =>
        apiClient.put(url, data, config).then((response) => response.data),

    patch: (url, data = {}, config = {}) =>
        apiClient.patch(url, data, config).then((response) => response.data),

    delete: (url, config = {}) =>
        apiClient.delete(url, config).then((response) => response.data),

    upload: (url, formData, onUploadProgress, config = {}) => {
        const uploadConfig = { ...config };

        if (typeof onUploadProgress === "function") {
            uploadConfig.onUploadProgress = (progressEvent) => {
                if (!progressEvent.total) {
                    return;
                }

                const percent = Math.round(
                    (progressEvent.loaded * 100) / progressEvent.total,
                );

                onUploadProgress(percent, progressEvent);
            };
        }

        return apiClient
            .post(url, formData, uploadConfig)
            .then((response) => response.data);
    },
};

export const authService = {
    sendCode: (number) => {
        const payload = typeof number === "string" ? { number } : number;
        return publicClient
            .post("/auth/send-code", payload)
            .then((response) => response.data);
    },

    verifyCode: async ({ number, code, fullName } = {}) => {
        const payload = { number, code };

        if (fullName !== undefined) {
            payload.fullName = fullName;
        }

        const { data } = await publicClient.post("/auth/verify-code", payload);

        tokenService.setTokens(
            data.accessToken,
            data.refreshToken,
            data.expiresInSeconds,
        );

        return data;
    },

    refresh: () => refreshSession(),

    logout: () => {
        tokenService.clearTokens();
        apiService.post("/auth/logout").catch(() => {});
    },

    isAuthenticated: () => Boolean(tokenService.getAccessToken()),
};

export const userService = {
    getMe: () => apiService.get("/user/me"),

    updateMe: (fullNameOrPayload) => {
        const payload =
            fullNameOrPayload !== null && typeof fullNameOrPayload === "object"
                ? fullNameOrPayload
                : { fullName: fullNameOrPayload };

        return apiService.put("/user/me", payload);
    },
};

// POST /reports — [Authorize], body ReportBugRequestDto; the backend answers
// with ReportBugResponseDto ({ id, reportType, section, description,
// isDisability, createdAt, message }) and rejects values outside its own
// allow-list of report types / sections with { message }.
export const reportsService = {
    create: ({ reportType, section, description, isDisability = false } = {}) =>
        apiService.post("/reports", {
            reportType,
            section,
            description,
            isDisability: Boolean(isDisability),
        }),
};

const normalizeReturnDetails = (value) => {
    if (value === undefined || value === null || value === "") {
        return null;
    }

    if ([true, 1, "1", "true"].includes(value)) {
        return "1";
    }

    if ([false, 0, "0", "false"].includes(value)) {
        return "0";
    }

    throw new Error(ERROR_MESSAGES[ERROR_CODES.RETURN_DETAILS_INVALID]);
};

const appendPositiveNumber = (formData, fieldName, value) => {
    if (value === undefined || value === null || value === "") {
        return;
    }

    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) {
        throw new Error(getPositiveNumberErrorMessage(fieldName));
    }

    formData.append(fieldName, String(number));
};

const appendTtsFormFields = (formData, options = {}) => {
    const hasReference = Boolean(options.speakerReference);

    if (hasReference) {
        formData.append("speaker_reference", options.speakerReference);
    } else {
        if (typeof options.gender === "string" && options.gender.trim()) {
            formData.append("gender", options.gender.trim().toLowerCase());
        }

        if (options.speakerId !== undefined && options.speakerId !== null) {
            const speakerId = Number(options.speakerId);
            if (!Number.isInteger(speakerId) || speakerId <= 0) {
                throw new Error(ERROR_MESSAGES[ERROR_CODES.TTS_SPEAKER_ID_INVALID]);
            }
            formData.append("speaker_id", String(speakerId));
        }
    }

    if (typeof options.audioFormat === "string" && options.audioFormat.trim()) {
        formData.append(
            "audio_format",
            options.audioFormat.trim().replace(/^\./, "").toLowerCase(),
        );
    }

    appendPositiveNumber(formData, "speed", options.speed);
    appendPositiveNumber(formData, "pitch", options.pitch);
    appendPositiveNumber(formData, "energy", options.energy);
};

const createDocumentFormData = (file, options = {}) => {
    if (!file) {
        throw new Error(ERROR_MESSAGES[ERROR_CODES.DOCUMENT_FILE_REQUIRED]);
    }

    const formData = new FormData();
    formData.append("file", file);

    if (typeof options.category === "string" && options.category.trim()) {
        formData.append("category", options.category.trim().toLowerCase());
    }

    const returnDetails = normalizeReturnDetails(options.returnDetails);
    if (returnDetails !== null) {
        formData.append("return_details", returnDetails);
    }

    if (options.includeTtsFields) {
        appendTtsFormFields(formData, options);
    }

    return formData;
};

export const ocrService = {
    recognize: (
        file,
        { category = "book", returnDetails = false, onUploadProgress, signal } = {},
    ) => {
        const formData = createDocumentFormData(file, {
            category,
            returnDetails,
        });

        return apiService.upload("/ocr/recognize", formData, onUploadProgress, {
            signal,
        });
    },

    getById: (ocrId, config = {}) =>
        apiService.get(`/ocr/${encodeURIComponent(ocrId)}`, {}, config),
};

// GET /history — [Authorize], query { page, pageSize? }; the backend answers
// OcrHistoryResponseDto ({ page, pageSize, totalCount, totalPages,
// items: [{ ocrId, title, inputOriginalFileName, createdAt }] }) and rejects
// out-of-range paging values with { message }.
// PATCH /history/{ocrId}/title — renames one record (body { title }); answers
// the updated OcrHistoryItemDto, 400 { message } for an empty title, or 404.
export const historyService = {
    getMine: (params = {}, config = {}) =>
        apiService.get("/history", params, config),

    rename: (ocrId, title, config = {}) =>
        apiService.patch(
            `/history/${encodeURIComponent(ocrId)}/title`,
            { title },
            config,
        ),
};

const createPresetTtsPayload = (options = {}) => {
    const { text, speed = 1, pitch = 1, energy = 1, ocrId = null } = options;
    const settings = resolveTtsSettings(options);

    return {
        text,
        gender: settings.gender,
        speakerId: settings.speakerId,
        audioFormat: settings.audioFormat,
        speed,
        pitch,
        energy,
        ocrId,
    };
};

export const ttsService = {

    create: (options) => apiService.post("/tts", createPresetTtsPayload(options)),

    createLegacy: (options) =>
        apiService.post("/tts/stream", createPresetTtsPayload(options)),

    createWithReference: (options = {}) => {
        const {
            text,
            speakerReference,
            speed = 1,
            pitch = 1,
            energy = 1,
            ocrId,
            onUploadProgress,
            signal,
        } = options;

        if (!speakerReference) {
            throw new Error(ERROR_MESSAGES[ERROR_CODES.REFERENCE_AUDIO_REQUIRED]);
        }

        const settings = resolveTtsSettings(options);
        const formData = new FormData();
        formData.append("text", text);
        formData.append("speaker_reference", speakerReference);
        formData.append("audio_format", settings.audioFormat);
        appendPositiveNumber(formData, "speed", speed);
        appendPositiveNumber(formData, "pitch", pitch);
        appendPositiveNumber(formData, "energy", energy);

        if (ocrId) {
            formData.append("ocr_id", ocrId);
        }

        return apiService.upload("/tts/reference", formData, onUploadProgress, {
            signal,
        });
    },

    getById: (ttsId, config = {}) =>
        apiService.get(`/tts/${encodeURIComponent(ttsId)}`, {}, config),

    // GET /tts/{id}/timeline — answers TtsTimelineResponseDto ({ ttsId, text,
    // audioUrl, segmentCount, totalDurationMs, segments: [{ index, text,
    // startMs, endMs, durationMs, fromCache, isLast }] }): the audio URL plus
    // per-sentence timings the karaoke player syncs against.
    getTimeline: (ttsId, config = {}) =>
        apiService.get(`/tts/${encodeURIComponent(ttsId)}/timeline`, {}, config),

    getSentenceAudio: (sentenceAudioUrlOrTtsId, config = {}) =>
        apiClient
            .get(normalizeSentenceAudioPath(sentenceAudioUrlOrTtsId), {
                timeout: 0,
                ...config,
            })
            .then((response) => response.data),

    sentenceSegmentToBlob: (segment) => ttsSentenceSegmentToBlob(segment),

    playSentences: (sentenceResponse, options) =>
        playTtsSentenceAudio(sentenceResponse, options),

    getAudioUrl: (audioUrlOrTtsId, accessToken) =>
        buildAuthenticatedAudioUrl(audioUrlOrTtsId, accessToken),

    getAudioBlob: (audioUrlOrTtsId, config = {}) =>
        apiClient
            .get(normalizeAudioPath(audioUrlOrTtsId), {
                ...config,
                responseType: "blob",
                timeout: 0,
            })
            .then((response) => response.data),
};

const createPipelineFormData = (file, options = {}) => {
    const settings = resolveTtsSettings(options);

    return createDocumentFormData(file, {
        ...options,
        ...settings,
        includeTtsFields: true,
    });
};

export const pipelineService = {
    documentToSpeech: (file, options = {}) => {
        const {
            category = "book",
            returnDetails = false,
            onUploadProgress,
            signal,
        } = options;

        const formData = createPipelineFormData(file, {
            ...options,
            category,
            returnDetails,
        });

        return apiService.upload(
            "/pipeline/document-to-speech",
            formData,
            onUploadProgress,
            { signal, timeout: 0 },
        );
    },

    imageToSpeechLegacy: (file, options = {}) => {
        const {
            category = "book",
            returnDetails = false,
            onUploadProgress,
            signal,
        } = options;

        const formData = createPipelineFormData(file, {
            ...options,
            category,
            returnDetails,
        });

        return apiService.upload(
            "/pipeline/image-to-speech",
            formData,
            onUploadProgress,
            { signal, timeout: 0 },
        );
    },
};

const normalizeSentenceAudioPath = (sentenceAudioUrlOrTtsId) => {
    const value = String(sentenceAudioUrlOrTtsId ?? "").trim();

    if (!value) {
        throw new Error(ERROR_MESSAGES[ERROR_CODES.SENTENCE_AUDIO_SOURCE_INVALID]);
    }

    if (/^https?:\/\//i.test(value) || value.includes("/sentences")) {
        return value;
    }

    return `/tts/${encodeURIComponent(value)}/sentences`;
};

export const decodeBase64Audio = (audioBase64) => {
    const value = String(audioBase64 ?? "").trim();

    if (!value) {
        throw new Error(ERROR_MESSAGES[ERROR_CODES.SENTENCE_AUDIO_EMPTY]);
    }

    if (typeof globalThis.atob !== "function") {
        throw new Error(ERROR_MESSAGES[ERROR_CODES.AUDIO_UNSUPPORTED_BROWSER]);
    }

    let binary;

    try {
        binary = globalThis.atob(value);
    } catch {
        throw new Error(ERROR_MESSAGES[ERROR_CODES.SENTENCE_AUDIO_UNREADABLE]);
    }

    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
    }

    return bytes;
};

export const formatTtsAudioDuration = (durationMs) => {
    const numericDuration = Number(durationMs);

    if (!Number.isFinite(numericDuration) || numericDuration < 0) {
        return "--:--.---";
    }

    const totalMilliseconds = Math.round(numericDuration);
    const milliseconds = totalMilliseconds % 1000;
    const totalSeconds = Math.floor(totalMilliseconds / 1000);
    const seconds = totalSeconds % 60;
    const totalMinutes = Math.floor(totalSeconds / 60);
    const minutes = totalMinutes % 60;
    const hours = Math.floor(totalMinutes / 60);
    const millisecondsText = String(milliseconds).padStart(3, "0");
    const secondsText = String(seconds).padStart(2, "0");
    const minutesText = String(minutes).padStart(2, "0");

    return hours > 0
        ? `${String(hours).padStart(2, "0")}:${minutesText}:${secondsText}.${millisecondsText}`
        : `${minutesText}:${secondsText}.${millisecondsText}`;
};

export const ttsSentenceSegmentToBlob = (segment) => {
    if (!segment || typeof segment !== "object") {
        throw new Error(ERROR_MESSAGES[ERROR_CODES.SENTENCE_AUDIO_DATA_INVALID]);
    }

    return new Blob([decodeBase64Audio(segment.audioBase64)], {
        type: segment.contentType || "audio/mpeg",
    });
};

const createPlaybackAbortError = () => {
    if (typeof DOMException === "function") {
        return new DOMException(
            ERROR_MESSAGES[ERROR_CODES.PLAYBACK_ABORTED],
            "AbortError",
        );
    }

    const error = new Error(ERROR_MESSAGES[ERROR_CODES.PLAYBACK_ABORTED]);
    error.name = "AbortError";
    return error;
};

const playAudioElementOnce = (audioElement, signal) =>
    new Promise((resolve, reject) => {
        let settled = false;

        const cleanup = () => {
            audioElement.removeEventListener("ended", onEnded);
            audioElement.removeEventListener("error", onError);
            signal?.removeEventListener("abort", onAbort);
        };

        const settle = (callback, value) => {
            if (settled) {
                return;
            }

            settled = true;
            cleanup();
            callback(value);
        };

        const onEnded = () => settle(resolve);
        const onError = () =>
            settle(
                reject,
                new Error(ERROR_MESSAGES[ERROR_CODES.PLAYBACK_FAILED]),
            );
        const onAbort = () => {
            audioElement.pause();
            settle(reject, createPlaybackAbortError());
        };

        audioElement.addEventListener("ended", onEnded, { once: true });
        audioElement.addEventListener("error", onError, { once: true });
        signal?.addEventListener("abort", onAbort, { once: true });

        if (signal?.aborted) {
            onAbort();
            return;
        }

        try {
            Promise.resolve(audioElement.play()).catch((error) =>
                settle(reject, error),
            );
        } catch (error) {
            settle(reject, error);
        }
    });

export const playTtsSentenceAudio = async (
    sentenceResponse,
    { audioElement, onSentenceChange, signal } = {},
) => {
    if (!audioElement || typeof audioElement.play !== "function") {
        throw new Error(ERROR_MESSAGES[ERROR_CODES.AUDIO_PLAYER_UNAVAILABLE]);
    }

    const segments = sentenceResponse?.segments;

    if (!Array.isArray(segments) || segments.length === 0) {
        throw new Error(ERROR_MESSAGES[ERROR_CODES.NO_SENTENCE_AUDIO]);
    }

    if (
        typeof globalThis.URL?.createObjectURL !== "function" ||
        typeof globalThis.URL?.revokeObjectURL !== "function"
    ) {
        throw new Error(ERROR_MESSAGES[ERROR_CODES.AUDIO_UNSUPPORTED_BROWSER]);
    }

    try {
        for (let index = 0; index < segments.length; index += 1) {
            if (signal?.aborted) {
                throw createPlaybackAbortError();
            }

            const segment = segments[index];
            const objectUrl = globalThis.URL.createObjectURL(
                ttsSentenceSegmentToBlob(segment),
            );

            try {
                audioElement.src = objectUrl;
                audioElement.load?.();
                onSentenceChange?.(segment, index);
                await playAudioElementOnce(audioElement, signal);
            } finally {
                globalThis.URL.revokeObjectURL(objectUrl);
            }
        }
    } finally {
        onSentenceChange?.(null, -1);
    }
};

const normalizeAudioPath = (audioUrlOrTtsId) => {
    const value = String(audioUrlOrTtsId ?? "").trim();

    if (!value) {
        throw new Error(ERROR_MESSAGES[ERROR_CODES.AUDIO_SOURCE_INVALID]);
    }

    if (/^https?:\/\//i.test(value) || value.includes("/timed-audio")) {
        return value;
    }

    return `/tts/${encodeURIComponent(value)}/timed-audio`;
};

export const toAbsoluteApiUrl = (path) => {
    const value = String(path ?? "").trim();

    if (/^https?:\/\//i.test(value)) {
        return value;
    }

    return `${BASE_URL}/${value.replace(/^\/+/, "")}`;
};

export const buildAuthenticatedAudioUrl = (
    audioUrlOrTtsId,
    accessToken = tokenService.getAccessToken(),
) => {
    const absoluteUrl = toAbsoluteApiUrl(normalizeAudioPath(audioUrlOrTtsId));
    const url = new URL(absoluteUrl);

    if (accessToken) {
        url.searchParams.set("access_token", accessToken);
    }

    return url.toString();
};

export default apiClient;