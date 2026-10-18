import axios from "axios";

const env = typeof process !== "undefined" && process.env ? process.env : {};

export const BASE_URL = (
  env.REACT_APP_API_BASE_URL || "http://localhost:5027"
).replace(/\/+$/, "");

const parsedTimeout = Number(env.REACT_APP_API_TIMEOUT_MS);
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
    throw new Error("gender باید male یا female باشد.");
  }

  return normalized;
};

const normalizeTtsSpeakerId = (value) => {
  const normalized = Number(value);

  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new Error("speakerId باید عدد صحیح بزرگ‌تر از صفر باشد.");
  }

  return normalized;
};

const normalizeTtsAudioFormat = (value) => {
  const normalized = String(value ?? "")
    .trim()
    .replace(/^\./, "")
    .toLowerCase();

  if (!ALLOWED_TTS_AUDIO_FORMATS.has(normalized)) {
    throw new Error("audioFormat باید mp3 یا opus باشد.");
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
  } catch {
    // مقدار خراب localStorage فقط برای همین فیلد با پیش‌فرض جایگزین می‌شود.
  }

  try {
    if (hasOwn(value, "speakerId")) {
      sanitized.speakerId = normalizeTtsSpeakerId(value.speakerId);
    }
  } catch {
    // مقدار خراب localStorage فقط برای همین فیلد با پیش‌فرض جایگزین می‌شود.
  }

  try {
    if (hasOwn(value, "audioFormat")) {
      sanitized.audioFormat = normalizeTtsAudioFormat(value.audioFormat);
    }
  } catch {
    // مقدار خراب localStorage فقط برای همین فیلد با پیش‌فرض جایگزین می‌شود.
  }

  return sanitized;
};

const persistTtsSettings = (settings) => {
  memoryTtsSettings = { ...settings };

  try {
    getStorage()?.setItem(TTS_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // اگر localStorage غیرفعال یا پر باشد، مقدار در حافظه همان تب باقی می‌ماند.
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
      throw new Error("تنظیمات TTS باید یک object باشد.");
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

  // مناسب دکمه Save در صفحه تنظیمات؛ هر سه مقدار را یک‌جا اعتبارسنجی می‌کند.
  saveSettings: (settings) => {
    if (
      !settings ||
      typeof settings !== "object" ||
      Array.isArray(settings) ||
      !hasOwn(settings, "gender") ||
      !hasOwn(settings, "speakerId") ||
      !hasOwn(settings, "audioFormat")
    ) {
      throw new Error(
        "برای ذخیره تنظیمات، gender و speakerId و audioFormat الزامی هستند.",
      );
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
    } catch {
      // در نبود دسترسی localStorage همان مقدار حافظه‌ای استفاده می‌شود.
    }

    return { ...DEFAULT_TTS_SETTINGS };
  },
};

const isMissingTtsSetting = (value) =>
  value === undefined || value === null || value === "";

const resolveTtsSettings = (options = {}) => {
  const defaults = ttsSettingsService.getDefaults();

  // مقدارهای داخل درخواست فقط Override موقت‌اند؛ ذخیره Default فقط با
  // ttsSettingsService در صفحه تنظیمات انجام می‌شود.
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

    // Backend در هر refresh یک Refresh Token جدید می‌دهد؛ باید جایگزین قبلی شود.
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

// این Client interceptor احراز هویت ندارد و فقط برای endpointهای عمومی Auth است.
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

    // Content-Type را اینجا ثابت نمی‌کنیم تا Axios برای FormData، boundary درست بسازد.
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
      throw new Error("Refresh Token موجود نیست؛ کاربر باید دوباره وارد شود.");
    }

    const { data } = await publicClient.post("/auth/refresh", {
      refreshToken,
    });

    if (!data?.accessToken || !data?.refreshToken) {
      throw new Error("پاسخ تمدید توکن معتبر نیست.");
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

const parseBlobErrorResponse = async (error) => {
  const data = error?.response?.data;
  if (typeof Blob === "undefined" || !(data instanceof Blob)) {
    return error;
  }

  try {
    const text = await data.text();
    if (!text.trim()) {
      return error;
    }

    try {
      error.response.data = JSON.parse(text);
    } catch {
      error.response.data = { message: text.trim() };
    }
  } catch {
    // اگر Blob خطا خوانده نشد، پیام براساس Status Code ساخته می‌شود.
  }

  return error;
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    await parseBlobErrorResponse(error);
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
  fallback = "در انجام درخواست مشکلی پیش آمد. لطفاً دوباره تلاش کنید.",
) => {
  if (error?.code === "ERR_CANCELED" || error?.name === "CanceledError") {
    return "درخواست لغو شد.";
  }

  if (error?.code === "ECONNABORTED") {
    return "زمان انتظار درخواست تمام شد. لطفاً دوباره تلاش کنید.";
  }

  const data = error?.response?.data;
  if (typeof data?.message === "string" && data.message.trim()) {
    return data.message.trim();
  }

  // برای سازگاری با نسخه‌های قبلی Backend.
  if (typeof data === "string" && data.trim()) {
    return data.trim();
  }

  const status = error?.response?.status;
  const statusMessages = {
    400: "اطلاعات واردشده معتبر نیست.",
    401: "برای ادامه، دوباره وارد حساب کاربری خود شوید.",
    403: "اجازه انجام این درخواست را ندارید.",
    404: "مورد درخواستی پیدا نشد.",
    410: "فایل موردنظر دیگر در دسترس نیست.",
    413: "حجم یا تعداد اطلاعات بیشتر از حد مجاز است.",
    415: "نوع فایل ارسال‌شده پشتیبانی نمی‌شود.",
    422: "امکان پردازش فایل ارسال‌شده وجود نداشت.",
    429: "تعداد درخواست‌ها زیاد است. کمی بعد دوباره تلاش کنید.",
    499: "درخواست لغو شد. لطفاً دوباره تلاش کنید.",
    500: "در حال حاضر امکان انجام درخواست وجود ندارد. لطفاً کمی بعد دوباره تلاش کنید.",
    502: "در حال حاضر امکان انجام درخواست وجود ندارد. لطفاً کمی بعد دوباره تلاش کنید.",
    503: "سرویس موقتاً در دسترس نیست. لطفاً کمی بعد دوباره تلاش کنید.",
  };

  if (statusMessages[status]) {
    return statusMessages[status];
  }

  if (error?.request && !error?.response) {
    return "ارتباط با سرور برقرار نشد. لطفاً اتصال خود را بررسی کنید.";
  }

  return fallback;
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

  getBlob: (url, config = {}) =>
    apiClient
      .get(url, {
        ...config,
        responseType: "blob",
        timeout: config.timeout ?? 0,
      })
      .then((response) => response.data),

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

    // عمداً Content-Type تعیین نمی‌شود؛ مرورگر multipart boundary را اضافه می‌کند.
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

  logout: async () => {
    const refreshToken = tokenService.getRefreshToken();

    try {
      if (!refreshToken) {
        return { message: "خروج از این دستگاه انجام شد." };
      }

      return await apiService.post("/auth/logout", { refreshToken });
    } finally {
      tokenService.clearTokens();
    }
  },

  logoutAll: async () => {
    try {
      return await apiService.post("/auth/logout-all");
    } finally {
      tokenService.clearTokens();
    }
  },

  isAuthenticated: () => Boolean(tokenService.getAccessToken()),
};

export const userService = {
  getMe: () => apiService.get("/user/me"),

  // رشته null یا خالی باعث حذف FullName می‌شود.
  updateMe: (fullNameOrPayload) => {
    const payload =
      fullNameOrPayload !== null && typeof fullNameOrPayload === "object"
        ? fullNameOrPayload
        : { fullName: fullNameOrPayload };

    return apiService.put("/user/me", payload);
  },
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

  throw new Error("returnDetails باید true/false یا 1/0 باشد.");
};

const appendPositiveNumber = (formData, fieldName, value) => {
  if (value === undefined || value === null || value === "") {
    return;
  }

  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw new Error(`${fieldName} باید یک عدد بزرگ‌تر از صفر باشد.`);
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
        throw new Error("speakerId باید عدد صحیح بزرگ‌تر از صفر باشد.");
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
    throw new Error("انتخاب تصویر یا PDF الزامی است.");
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
  // صدای ازپیش‌تعریف‌شده؛ پاسخ JSON شامل audioUrl است.
  create: (options) => apiService.post("/tts", createPresetTtsPayload(options)),

  // Alias قدیمی Backend؛ این مسیر هم JSON می‌دهد.
  createLegacy: (options) =>
    apiService.post("/tts/stream", createPresetTtsPayload(options)),

  // صدای مرجع دلخواه؛ فایل به Backend می‌رود و توکن Provider هرگز در فرانت نیست.
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
      throw new Error("انتخاب فایل صدای مرجع الزامی است.");
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

  // balance، phonemes و اطلاعات فایل پس از تولید صوت در این endpoint ثبت می‌شوند.
  getById: (ttsId, config = {}) =>
    apiService.get(`/tts/${encodeURIComponent(ttsId)}`, {}, config),

  getTimeline: (timelineUrlOrTtsId, config = {}) =>
    apiService.get(normalizeTimelinePath(timelineUrlOrTtsId), {}, config),

  getTimedAudioUrl: (timedAudioUrlOrTtsId, accessToken) =>
    buildAuthenticatedAudioUrl(
      normalizeTimedAudioPath(timedAudioUrlOrTtsId),
      accessToken,
    ),

  getTimedAudioBlob: (timedAudioUrlOrTtsId, config = {}) =>
    apiService.getBlob(normalizeTimedAudioPath(timedAudioUrlOrTtsId), config),

  // مسیر سازگاری؛ ممکن است فایل‌های جمله‌ای را دوباره از Provider تولید کند.
  // برای پخش عادی از timed-audio + timeline استفاده کن.
  getSentenceAudio: (sentenceAudioUrlOrTtsId, config = {}) =>
    apiClient
      .get(normalizeSentenceAudioPath(sentenceAudioUrlOrTtsId), {
        timeout: 0,
        ...config,
      })
      .then((response) => response.data),

  sentenceSegmentToBlob: (segment) => ttsSentenceSegmentToBlob(segment),

  // پخش پشت‌سرهم جمله‌ها و اعلام جمله فعال برای Highlight.
  playSentences: (sentenceResponse, options) =>
    playTtsSentenceAudio(sentenceResponse, options),

  getAudioUrl: (audioUrlOrTtsId, accessToken) =>
    buildAuthenticatedAudioUrl(audioUrlOrTtsId, accessToken),

  // این روش کل فایل را به Blob تبدیل می‌کند؛ برای پخش progressive از getAudioUrl استفاده کن.
  getAudioBlob: (audioUrlOrTtsId, config = {}) =>
    apiService.getBlob(normalizeAudioPath(audioUrlOrTtsId), config),
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

    // Pipeline فایل canonical و Timeline جمله‌ها را می‌سازد؛ فایل‌های موقت جمله‌ای نگهداری نمی‌شوند.
    // برای متن‌های چندجمله‌ای Timeout ثابت کلاینت نب��ید درخواست را قطع کند.
    return apiService.upload(
      "/pipeline/document-to-speech",
      formData,
      onUploadProgress,
      { signal, timeout: 0 },
    );
  },

  // مسیر قدیمی Backend برای سازگاری با فرانت‌های قبلی.
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

const normalizeTimelinePath = (timelineUrlOrTtsId) => {
  const value = String(timelineUrlOrTtsId ?? "").trim();

  if (!value) {
    throw new Error("timelineUrl یا ttsId معتبر نیست.");
  }

  if (/^https?:\/\//i.test(value) || /\/timeline(?:[/?#]|$)/i.test(value)) {
    return value;
  }

  return `/tts/${encodeURIComponent(value)}/timeline`;
};

const normalizeTimedAudioPath = (timedAudioUrlOrTtsId) => {
  const value = String(timedAudioUrlOrTtsId ?? "").trim();

  if (!value) {
    throw new Error("timedAudioUrl یا ttsId معتبر نیست.");
  }

  if (/^https?:\/\//i.test(value) || /\/timed-audio(?:[/?#]|$)/i.test(value)) {
    return value;
  }

  return `/tts/${encodeURIComponent(value)}/timed-audio`;
};

const normalizeSentenceAudioPath = (sentenceAudioUrlOrTtsId) => {
  const value = String(sentenceAudioUrlOrTtsId ?? "").trim();

  if (!value) {
    throw new Error("sentenceAudioUrl یا ttsId معتبر نیست.");
  }

  if (/^https?:\/\//i.test(value) || value.includes("/sentences")) {
    return value;
  }

  return `/tts/${encodeURIComponent(value)}/sentences`;
};

export const decodeBase64Audio = (audioBase64) => {
  const value = String(audioBase64 ?? "").trim();

  if (!value) {
    throw new Error("بایت‌های Base64 صوت جمله خالی است.");
  }

  if (typeof globalThis.atob !== "function") {
    throw new Error("مرورگر امکان Decode کردن Base64 را ندارد.");
  }

  let binary;

  try {
    binary = globalThis.atob(value);
  } catch {
    throw new Error("Base64 صوت جمله معتبر نیست.");
  }

  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
};

// نمایش مدت اعلام‌شده Backend به صورت HH:MM:SS.mmm یا MM:SS.mmm.
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
    throw new Error("اطلاعات صوت جمله معتبر نیست.");
  }

  return new Blob([decodeBase64Audio(segment.audioBase64)], {
    type: segment.contentType || "audio/mpeg",
  });
};

const createPlaybackAbortError = () => {
  if (typeof DOMException === "function") {
    return new DOMException("پخش جمله‌ها لغو شد.", "AbortError");
  }

  const error = new Error("پخش جمله‌ها لغو شد.");
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
      settle(reject, new Error("مرورگر نتوانست صوت جمله را پخش کند."));
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
    throw new Error("audioElement معتبر برای پخش جمله‌ها لازم است.");
  }

  const segments = sentenceResponse?.segments;

  if (!Array.isArray(segments) || segments.length === 0) {
    throw new Error("هیچ صوت جمله‌ای برای پخش وجود ندار��.");
  }

  if (
    typeof globalThis.URL?.createObjectURL !== "function" ||
    typeof globalThis.URL?.revokeObjectURL !== "function"
  ) {
    throw new Error("مرورگر امکان ساخت Object URL صوت را ندارد.");
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

const requireIdentifier = (value, label) => {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    throw new Error(`${label} معتبر نیست.`);
  }
  return normalized;
};

const normalizePageNumber = (value, fallback, label, max = null) => {
  const normalized =
    value === undefined || value === null ? fallback : Number(value);
  if (
    !Number.isInteger(normalized) ||
    normalized < 1 ||
    (max && normalized > max)
  ) {
    throw new Error(
      max
        ? `${label} باید عددی بین 1 تا ${max} باشد.`
        : `${label} باید عدد صحیح بزرگ‌تر از صفر باشد.`,
    );
  }
  return normalized;
};

export const historyService = {
  getMine: ({ page = 1, pageSize = 20, signal } = {}) =>
    apiService.get(
      "/history",
      {
        page: normalizePageNumber(page, 1, "page"),
        pageSize: normalizePageNumber(pageSize, 20, "pageSize", 100),
      },
      { signal },
    ),

  rename: (ocrId, title, config = {}) => {
    const normalizedTitle = String(title ?? "").trim();
    if (!normalizedTitle || normalizedTitle.length > 200) {
      throw new Error("عنوان باید بین 1 تا 200 کاراکتر باشد.");
    }

    return apiService.patch(
      `/history/${encodeURIComponent(requireIdentifier(ocrId, "ocrId"))}/title`,
      { title: normalizedTitle },
      config,
    );
  },
};

export const reportsService = {
  create: (
    { reportType, section, description, isDisability = false } = {},
    config = {},
  ) =>
    apiService.post(
      "/reports",
      { reportType, section, description, isDisability: Boolean(isDisability) },
      config,
    ),

  getMine: (config = {}) => apiService.get("/reports", {}, config),

  getById: (reportId, config = {}) =>
    apiService.get(
      `/reports/${encodeURIComponent(requireIdentifier(reportId, "reportId"))}`,
      {},
      config,
    ),
};

const normalizeAdminInputFilePath = (inputFileUrlOrOcrId) => {
  const value = requireIdentifier(inputFileUrlOrOcrId, "inputFileUrl یا ocrId");
  if (/^https?:\/\//i.test(value) || /\/input-file(?:[/?#]|$)/i.test(value)) {
    return value;
  }
  return `/admin/ocr-assets/${encodeURIComponent(value)}/input-file`;
};

const normalizeAdminAudioPath = (audioUrlOrIds) => {
  if (typeof audioUrlOrIds === "string") {
    const value = requireIdentifier(audioUrlOrIds, "audioUrl");
    if (/^https?:\/\//i.test(value) || /\/audio(?:[/?#]|$)/i.test(value)) {
      return value;
    }
    throw new Error(
      "برای دریافت صوت، audioUrl یا هر دو شناسه ocrId و ttsId لازم است.",
    );
  }

  const ocrId = requireIdentifier(audioUrlOrIds?.ocrId, "ocrId");
  const ttsId = requireIdentifier(audioUrlOrIds?.ttsId, "ttsId");
  return `/admin/ocr-assets/${encodeURIComponent(ocrId)}/tts/${encodeURIComponent(ttsId)}/audio`;
};

export const adminOcrAssetsService = {
  getByOcrId: (ocrId, config = {}) =>
    apiService.get(
      `/admin/ocr-assets/${encodeURIComponent(requireIdentifier(ocrId, "ocrId"))}`,
      {},
      config,
    ),

  getInputFileBlob: (inputFileUrlOrOcrId, config = {}) =>
    apiService.getBlob(
      normalizeAdminInputFilePath(inputFileUrlOrOcrId),
      config,
    ),

  getAudioBlob: (audioUrlOrIds, config = {}) =>
    apiService.getBlob(normalizeAdminAudioPath(audioUrlOrIds), config),

  getAudioUrl: (audioUrlOrIds, accessToken) =>
    buildAuthenticatedAudioUrl(
      normalizeAdminAudioPath(audioUrlOrIds),
      accessToken,
    ),
};

// Alias مفرد برای سازگاری با نام‌گذاری رایج در صفحات گزارش.
export const reportService = reportsService;

export const healthService = {
  get: (config = {}) =>
    publicClient.get("/health", config).then((response) => response.data),
};

const normalizeAudioPath = (audioUrlOrTtsId) => {
  const value = String(audioUrlOrTtsId ?? "").trim();

  if (!value) {
    throw new Error("audioUrl یا ttsId معتبر نیست.");
  }

  if (
    /^https?:\/\//i.test(value) ||
    /\/(?:timed-)?audio(?:[/?#]|$)/i.test(value)
  ) {
    return value;
  }

  return `/tts/${encodeURIComponent(value)}/audio`;
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

  // Backend برای مسیرهای audio و timed-audio اجازه می‌دهد JWT از Query String خوانده شود.
  if (accessToken) {
    url.searchParams.set("access_token", accessToken);
  }

  return url.toString();
};

export default apiClient;
