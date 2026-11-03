export const PHONE_NUMBER_LENGTH = 11;
export const MIN_PHONE_LENGTH = 2;
export const INITIAL_PHONE_PREFIX = "09";
export const OTP_CODE_LENGTH = 6;
// Phone number pending OTP verification (session-scoped, per browser tab)
export const PHONE_KEY = "auth_pending_phone";
// Verified phone number — persisted in localStorage alongside the tokens,
// so it survives tab/browser closes and dev server restarts
export const USER_PHONE_KEY = "user_phone";
