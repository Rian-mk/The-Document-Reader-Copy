export const READING_SPEED_KEY = 'readingSpeed';
export const SPEAKER_KEY = 'speaker';
export const DEFAULT_MODE_KEY = 'defaultMode';
export const AUTO_FLASHLIGHT_KEY = 'autoFlashlight';
export const VOICE_FEEDBACK_KEY = 'voiceFeedback';

// The TTS provider exposes four preset speakers and only speakerId 1 is a male
// voice; 2, 3 and 4 are female. The Backend keeps no speaker catalog: it only
// checks that gender is one of TtsApi:AllowedGenders (male/female) and that
// speakerId is an integer greater than zero (TtsRequestValidator.NormalizePreset),
// then forwards both fields untouched, so this list is the single source of truth
// for the gender + speakerId pairing. `label` is display-only and is never sent.
export const TTS_SPEAKERS = [
    { label: "هومن (مرد)", value: "speaker-1", gender: "male", speakerId: 1 },
    { label: "آوا (زن)", value: "speaker-2", gender: "female", speakerId: 1 },
    { label: "شیرین (زن)", value: "speaker-3", gender: "female", speakerId: 2 },
    { label: "هدی (زن)", value: "speaker-4", gender: "female", speakerId: 3 },
];

export const DEFAULT_SPEAKER_VALUE = TTS_SPEAKERS[0].value;