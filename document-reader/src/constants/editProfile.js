export { DISPLAY_NAME_KEY } from './home';

// Disability type is device-local only for now (not synced with the backend)
export const DISABILITY_TYPE_KEY = 'disabilityType';
export const getDisabilityType = () =>
    localStorage.getItem(DISABILITY_TYPE_KEY) || '';

export const DISABILITY_OPTIONS = [
    { label: "بدون محدودیت", value: "none" },
    { label: "نابینایی", value: "blind" },
    { label: "کم‌بینایی", value: "low-vision" },
    { label: "محدودیت در خواندن (کم‌سوادی)", value: "dyslexia" },
    { label: "کم‌بینایی/محدودیت در خواندن", value: "combined" },
    { label: "سایر", value: "other" },
];
