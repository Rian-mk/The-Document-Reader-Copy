export const ERROR_CODES = Object.freeze({
    TTS_GENDER_INVALID: "TTS_GENDER_INVALID",
    TTS_SPEAKER_ID_INVALID: "TTS_SPEAKER_ID_INVALID",
    TTS_AUDIO_FORMAT_INVALID: "TTS_AUDIO_FORMAT_INVALID",
    TTS_SETTINGS_PAYLOAD_INVALID: "TTS_SETTINGS_PAYLOAD_INVALID",
    TTS_SETTINGS_INCOMPLETE: "TTS_SETTINGS_INCOMPLETE",

    SESSION_EXPIRED: "SESSION_EXPIRED",
    SESSION_REFRESH_FAILED: "SESSION_REFRESH_FAILED",

    REQUEST_TIMEOUT: "REQUEST_TIMEOUT",
    SERVER_UNREACHABLE: "SERVER_UNREACHABLE",
    GENERIC_SERVER_ERROR: "GENERIC_SERVER_ERROR",

    RETURN_DETAILS_INVALID: "RETURN_DETAILS_INVALID",
    POSITIVE_NUMBER_INVALID: "POSITIVE_NUMBER_INVALID",
    DOCUMENT_FILE_REQUIRED: "DOCUMENT_FILE_REQUIRED",
    REFERENCE_AUDIO_REQUIRED: "REFERENCE_AUDIO_REQUIRED",

    SENTENCE_AUDIO_SOURCE_INVALID: "SENTENCE_AUDIO_SOURCE_INVALID",
    SENTENCE_AUDIO_EMPTY: "SENTENCE_AUDIO_EMPTY",
    SENTENCE_AUDIO_UNREADABLE: "SENTENCE_AUDIO_UNREADABLE",
    SENTENCE_AUDIO_DATA_INVALID: "SENTENCE_AUDIO_DATA_INVALID",
    NO_SENTENCE_AUDIO: "NO_SENTENCE_AUDIO",

    AUDIO_SOURCE_INVALID: "AUDIO_SOURCE_INVALID",
    AUDIO_PLAYER_UNAVAILABLE: "AUDIO_PLAYER_UNAVAILABLE",
    PLAYBACK_FAILED: "PLAYBACK_FAILED",
    PLAYBACK_ABORTED: "PLAYBACK_ABORTED",

    GENERAL: "GENERAL"
});

export const ERROR_MESSAGES = Object.freeze({

    [ERROR_CODES.TTS_GENDER_INVALID]:
        "نوع صدا معتبر نیست؛ یکی از صدای زن یا مرد را انتخاب کنید.",
    [ERROR_CODES.TTS_SPEAKER_ID_INVALID]:
        "گوینده انتخاب‌شده معتبر نیست؛ یکی از گوینده‌های فهرست را انتخاب کنید.",
    [ERROR_CODES.TTS_AUDIO_FORMAT_INVALID]:
        "فرمت صوت معتبر نیست؛ MP3 یا OPUS را انتخاب کنید.",
    [ERROR_CODES.TTS_SETTINGS_PAYLOAD_INVALID]:
        "تنظیمات صدا به‌درستی خوانده نشد؛ دوباره تلاش کنید.",
    [ERROR_CODES.TTS_SETTINGS_INCOMPLETE]:
        "برای ذخیره تنظیمات، نوع صدا، گوینده و فرمت باید مشخص باشند.",


    [ERROR_CODES.SESSION_EXPIRED]:
        "نشست شما منقضی شده است؛ دوباره وارد حساب شوید.",
    [ERROR_CODES.SESSION_REFRESH_FAILED]:
        "نشست شما تمدید نشد؛ دوباره وارد حساب شوید.",


    [ERROR_CODES.REQUEST_TIMEOUT]:
        "پاسخی از سرور دریافت نشد؛ اتصال اینترنت را بررسی کنید و دوباره تلاش کنید.",
    [ERROR_CODES.SERVER_UNREACHABLE]:
        "ارتباط با سرور برقرار نشد؛ اتصال اینترنت را بررسی کنید و دوباره تلاش کنید.",
    [ERROR_CODES.GENERIC_SERVER_ERROR]:
        "مشکلی پیش آمد؛ چند لحظه بعد دوباره تلاش کنید.",


    [ERROR_CODES.RETURN_DETAILS_INVALID]:
        "گزینه نمایش جزئیات متن معتبر نیست؛ دوباره تلاش کنید.",
    [ERROR_CODES.POSITIVE_NUMBER_INVALID]:
        "مقدار {field} معتبر نیست؛ عددی بزرگ‌تر از صفر وارد کنید.",
    [ERROR_CODES.DOCUMENT_FILE_REQUIRED]:
        "هیچ فایلی انتخاب نشده است؛ یک تصویر یا فایل PDF انتخاب کنید.",
    [ERROR_CODES.REFERENCE_AUDIO_REQUIRED]:
        "هیچ صدای مرجعی انتخاب نشده است؛ یک فایل صوتی انتخاب کنید.",


    [ERROR_CODES.SENTENCE_AUDIO_SOURCE_INVALID]:
        "آدرس صوت جمله‌ها معتبر نیست؛ دوباره تلاش کنید.",
    [ERROR_CODES.SENTENCE_AUDIO_EMPTY]:
        "صوت این جمله دریافت نشد؛ دوباره تلاش کنید.",
    [ERROR_CODES.SENTENCE_AUDIO_UNREADABLE]:
        "صوت این جمله قابل استفاده نیست؛ دوباره تلاش کنید.",
    [ERROR_CODES.SENTENCE_AUDIO_DATA_INVALID]:
        "اطلاعات صوت کامل نیست؛ دوباره تلاش کنید.",
    [ERROR_CODES.NO_SENTENCE_AUDIO]:
        "صوتی برای پخش وجود ندارد؛ دوباره تلاش کنید.",


    [ERROR_CODES.AUDIO_SOURCE_INVALID]:
        "آدرس فایل صوتی معتبر نیست؛ دوباره تلاش کنید.",
    [ERROR_CODES.AUDIO_PLAYER_UNAVAILABLE]:
        "پخش‌کننده صوت آماده نیست؛ صفحه را تازه‌سازی کنید و دوباره تلاش کنید.",
    [ERROR_CODES.PLAYBACK_FAILED]:
        "صوت پخش نشد؛ اتصال اینترنت را بررسی کنید و دوباره تلاش کنید.",
    [ERROR_CODES.PLAYBACK_ABORTED]: "پخش صوت متوقف شد.",

    [ERROR_CODES.GENERAL]: "خطای غیرمنتطره رخ داد."
});


export const ERROR_FIELD_LABELS = Object.freeze({
    speed: "سرعت صدا",
    pitch: "زیر وبمی صدا",
    energy: "انرژی صدا",
});


export const formatErrorMessage = (template, values = {}) =>
    Object.entries(values).reduce(
        (message, [key, value]) => message.split(`{${key}}`).join(String(value)),
        template,
    );


export const getPositiveNumberErrorMessage = (fieldName) =>
    formatErrorMessage(ERROR_MESSAGES[ERROR_CODES.POSITIVE_NUMBER_INVALID], {
        field: ERROR_FIELD_LABELS[fieldName] ?? fieldName,
    });