import { AUTO_FLASHLIGHT_KEY, VOICE_FEEDBACK_KEY } from '@/constants/settings';

export const SETTINGS_CHANGED_EVENT = 'app:settings-changed';

const getStorage = () => {
    try {
        return typeof window === 'undefined' ? null : window.localStorage;
    } catch {
        return null;
    }
};

export function readBoolSetting(key, fallback = true) {
    let raw = null;
    try {
        raw = getStorage()?.getItem(key) ?? null;
    } catch {
        raw = null;
    }
    if (raw === null || raw === '') return fallback;
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    return fallback;
}

export function notifySettingsChanged(key, value) {
    if (typeof window === 'undefined') return;
    try {
        window.dispatchEvent(
            new CustomEvent(SETTINGS_CHANGED_EVENT, { detail: { key, value } }),
        );
    } catch {
        /* noop */
    }
}

export function writeSetting(key, value) {
    try {
        getStorage()?.setItem(key, String(value));
    } catch {
        /* noop */
    }
    notifySettingsChanged(key, value);
}

export function subscribeSettings(listener) {
    if (typeof window === 'undefined') return () => { };

    const onLocal = (event) => listener(event?.detail?.key ?? null);
    const onStorage = (event) => listener(event?.key ?? null);

    window.addEventListener(SETTINGS_CHANGED_EVENT, onLocal);
    window.addEventListener('storage', onStorage);

    return () => {
        window.removeEventListener(SETTINGS_CHANGED_EVENT, onLocal);
        window.removeEventListener('storage', onStorage);
    };
}

export function readCameraSettings() {
    return {
        voiceFeedback: readBoolSetting(VOICE_FEEDBACK_KEY, true),
        autoFlashlight: readBoolSetting(AUTO_FLASHLIGHT_KEY, true),
    };
}