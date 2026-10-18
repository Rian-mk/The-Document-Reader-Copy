# اتصال صفحه Settings به پیش‌فرض‌های TTS

در این نسخه، صفحه تنظیمات فرانت **تنها منبع تغییر تنظیمات پیش‌فرض TTS** است. سه مقدار زیر با کلید `tts_settings` در `localStorage` مرورگر ذخیره می‌شوند:

```json
{
  "gender": "male",
  "speakerId": 1,
  "audioFormat": "mp3"
}
```

## تفکیک Default و Override

- صفحه Settings با `ttsSettingsService` مقدارهای پیش‌فرض را ذخیره می‌کند.
- `ttsService` و `pipelineService` در زمان هر درخواست، آخرین Default ذخیره‌شده را می‌خوانند.
- اگر هنگام یک درخواست `gender`، `speakerId` یا `audioFormat` بفرستید، فقط همان درخواست Override می‌شود.
- Override یک درخواست، تنظیمات ذخیره‌شده صفحه Settings را تغییر نمی‌دهد.
- بنابراین تنظیمات پیش‌فرض فقط با Save، Setter یا Reset سرویس تنظیمات تغییر می‌کنند.

## Import در صفحه Settings

```js
import {
  DEFAULT_TTS_SETTINGS,
  ttsSettingsService,
} from "../services/apiClient";
```

## مقداردهی اولیه فرم

```js
const [settings, setSettings] = useState(() =>
  ttsSettingsService.getDefaults(),
);
```

`getDefaults()` و `getSettings()` یک رفتار دارند و آخرین مقدار ذخیره‌شده را برمی‌گردانند.

## ذخیره همه فیلدهای فرم با دکمه Save

```js
const saved = ttsSettingsService.saveDefaults({
  gender: form.gender,
  speakerId: Number(form.speakerId),
  audioFormat: form.audioFormat,
});

setSettings(saved);
```

`saveDefaults()` هر سه فیلد را اعتبارسنجی می‌کند و سپس به‌صورت یک‌جا ذخیره می‌کند. نام معادل آن `saveSettings()` است.

## ذخیره مستقل هر فیلد

اگر صفحه Settings به‌جای دکمه Save، ذخیره فوری دارد:

```js
ttsSettingsService.setGender("female");
ttsSettingsService.setSpeakerId(5);
ttsSettingsService.setAudioFormat("opus");
```

هر Setter فقط همان فیلد را عوض می‌کند و دو مقدار دیگر دست‌نخورده باقی می‌مانند.

## Reset

```js
ttsSettingsService.resetGender();
ttsSettingsService.resetSpeakerId();
ttsSettingsService.resetAudioFormat();

// حذف همه تنظیمات ذخیره‌شده و بازگشت به مقدار اولیه برنامه
ttsSettingsService.resetSettings();
```

## استفاده در صفحات ساخت صوت

پس از ذخیره صفحه Settings، کافی است تنظیمات را از درخواست حذف کنید:

```js
const result = await ttsService.create({
  text: "سلام، این یک متن آزمایشی است.",
});
```

`ttsService` خودکار آخرین مقادیر ذخیره‌شده را به Backend می‌فرستد.

برای Pipeline نیز همین رفتار برقرار است:

```js
const result = await pipelineService.documentToSpeech(file, {
  category: "book",
  returnDetails: true,
});
```

## Override موقت

مثال زیر فقط برای همین درخواست از گوینده دیگری استفاده می‌کند:

```js
await ttsService.create({
  text: "متن آزمایشی",
  gender: "female",
  speakerId: 12,
  audioFormat: "opus",
});
```

پس از آن، درخواست زیر دوباره از Default ذخیره‌شده صفحه Settings استفاده می‌کند:

```js
await ttsService.create({ text: "متن بعدی" });
```

## فایل نمونه صفحه

فایل `TtsSettingsPage.jsx` یک نمونه آماده با این قابلیت‌هاست:

- بارگذاری مقادیر ذخیره‌شده هنگام بازشدن صفحه
- ویرایش مستقل سه فیلد در فرم
- ذخیره یک‌جای فرم با `saveDefaults()`
- نمایش خطای اعتبارسنجی
- Reset کامل
- Callback اختیاری `onSettingsSaved`

مسیر Import را متناسب با ساختار پروژه خودتان تنظیم کنید.

## اعتبارسنجی

- `gender`: فقط `male` یا `female`
- `speakerId`: عدد صحیح بزرگ‌تر از صفر
- `audioFormat`: فقط `mp3` یا `opus`
- حروف بزرگ و کوچک به‌صورت خودکار Normalize می‌شوند.
- `.mp3` و `.opus` نیز پذیرفته و بدون نقطه ذخیره می‌شوند.

## نکته مربوط به کاربران

این تنظیمات در مرورگر ذخیره می‌شوند و وابسته به حساب Backend نیستند. در نتیجه در یک مرورگر مشترک، کاربران مختلف همان Default محلی را می‌بینند و Logout آن را حذف نمی‌کند. اگر می‌خواهید هنگام Logout پاک شود، بعد از Logout این متد را اجرا کنید:

```js
ttsSettingsService.resetSettings();
```
