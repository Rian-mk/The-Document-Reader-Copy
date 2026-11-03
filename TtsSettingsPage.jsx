import { useState } from "react";
import {
  DEFAULT_TTS_SETTINGS,
  ttsSettingsService,
} from "../services/apiClient";

const toFormState = (settings) => ({
  gender: settings.gender,
  speakerId: String(settings.speakerId),
  audioFormat: settings.audioFormat,
});

// اگر مسیر این Component متفاوت است، مسیر import بالا را متناسب با پروژه عوض کنید.
export default function TtsSettingsPage({ onSettingsSaved }) {
  const [form, setForm] = useState(() =>
    toFormState(ttsSettingsService.getDefaults()),
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const changeField = (fieldName) => (event) => {
    setForm((current) => ({
      ...current,
      [fieldName]: event.target.value,
    }));
    setMessage("");
    setError("");
  };

  const save = (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    try {
      const saved = ttsSettingsService.saveDefaults({
        gender: form.gender,
        speakerId: Number(form.speakerId),
        audioFormat: form.audioFormat,
      });

      setForm(toFormState(saved));
      setMessage("تنظیمات پیش‌فرض صدا ذخیره شد.");
      onSettingsSaved?.(saved);
    } catch (saveError) {
      setError(saveError?.message || "ذخیره تنظیمات انجام نشد.");
    }
  };

  const reset = () => {
    const defaults = ttsSettingsService.resetSettings();
    setForm(toFormState(defaults));
    setError("");
    setMessage("تنظیمات صدا به حالت اولیه برگشت.");
    onSettingsSaved?.(defaults);
  };

  return (
    <main dir="rtl">
      <h1>تنظیمات پیش‌فرض صدا</h1>

      <form onSubmit={save}>
        <label htmlFor="tts-gender">جنسیت صدا</label>
        <select
          id="tts-gender"
          value={form.gender}
          onChange={changeField("gender")}
        >
          <option value="male">مرد</option>
          <option value="female">زن</option>
        </select>

        <label htmlFor="tts-speaker-id">شناسه گوینده</label>
        <input
          id="tts-speaker-id"
          type="number"
          min="1"
          step="1"
          required
          value={form.speakerId}
          onChange={changeField("speakerId")}
        />

        <label htmlFor="tts-audio-format">فرمت صوت</label>
        <select
          id="tts-audio-format"
          value={form.audioFormat}
          onChange={changeField("audioFormat")}
        >
          <option value="mp3">MP3</option>
          <option value="opus">OPUS</option>
        </select>

        <div>
          <button type="submit">ذخیره تنظیمات</button>
          <button type="button" onClick={reset}>
            بازگشت به پیش‌فرض اولیه
          </button>
        </div>

        {message ? <p role="status">{message}</p> : null}
        {error ? <p role="alert">{error}</p> : null}
      </form>

      <small>
        مقادیر اولیه برنامه: {DEFAULT_TTS_SETTINGS.gender}، گوینده{" "}
        {DEFAULT_TTS_SETTINGS.speakerId}، فرمت{" "}
        {DEFAULT_TTS_SETTINGS.audioFormat}
      </small>
    </main>
  );
}
