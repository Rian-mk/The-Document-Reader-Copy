# راهنمای `apiClient.js`

این فایل لایه‌ی ارتباط فرانت React با `DocumentReaderBackend` است و بر پایه‌ی Axios کار می‌کند.

قابلیت‌های اصلی:

- تنظیم خودکار Base URL و Timeout
- ذخیره و مدیریت Access Token و Refresh Token
- افزودن خودکار هدر `Authorization`
- تمدید خودکار توکن بعد از پاسخ `401`
- جلوگیری از چند درخواست Refresh همزمان
- پشتیبانی از Refresh Token Rotation
- ارسال تصویر و PDF با `multipart/form-data`
- نمایش درصد آپلود
- لغو درخواست با `AbortController`
- مدیریت خطاهای ASP.NET Core
- ساخت URL قابل پخش برای `<audio>`
- سرویس‌های آماده برای Auth، User، OCR، TTS و Pipeline

---

## ۱) نصب و قرار دادن فایل

Axios را نصب کنید:

```bash
npm install axios
```

فایل را مثلاً در این مسیر قرار دهید:

```text
src/services/apiClient.js
```

سپس در Componentها یا Hookها از آن import کنید:

```js
import {
  authService,
  userService,
  ocrService,
  ttsSettingsService,
  ttsService,
  pipelineService,
  getApiErrorMessage,
} from "./services/apiClient";
```

---

## ۲) تنظیم `.env`

این نسخه برای Create React App از متغیرهای زیر استفاده می‌کند:

```env
REACT_APP_API_BASE_URL=http://localhost:5027
REACT_APP_API_TIMEOUT_MS=90000
```

بعد از تغییر `.env`، سرور React را متوقف و دوباره اجرا کنید:

```bash
npm start
```

### مقادیر پیش‌فرض

اگر `.env` تنظیم نشده باشد:

```text
Base URL: http://localhost:5027
Timeout:  90000 ms
```

### استفاده در Vite

نسخه‌ی فعلی از `process.env.REACT_APP_*` استفاده می‌کند. در Vite باید متغیرها به شکل زیر باشند:

```env
VITE_API_BASE_URL=http://localhost:5027
VITE_API_TIMEOUT_MS=90000
```

و ابتدای فایل باید از `import.meta.env` خوانده شود.

---

## ۳) Exportهای فایل

| Export                       | کاربرد                                          |
| ---------------------------- | ----------------------------------------------- |
| `BASE_URL`                   | آدرس نهایی Backend                              |
| `tokenService`               | خواندن، ذخیره و حذف توکن‌ها                     |
| `ttsSettingsService`         | کش و ویرایش مستقل تنظیمات TTS در `localStorage` |
| `DEFAULT_TTS_SETTINGS`       | مقادیر پیش‌فرض تنظیمات TTS                      |
| `TTS_SETTINGS_STORAGE_KEY`   | کلید `tts_settings` در `localStorage`           |
| `setAuthFailureHandler`      | واکنش سراسری به شکست Refresh Token              |
| `getApiErrorMessage`         | استخراج پیام قابل نمایش از خطا                  |
| `getRetryAfterSeconds`       | خواندن زمان انتظار خطای 429                     |
| `apiService`                 | متدهای عمومی GET/POST/PUT/PATCH/DELETE/Upload   |
| `authService`                | ارسال کد، ورود، Refresh و Logout                |
| `userService`                | دریافت و ویرایش کاربر جاری                      |
| `ocrService`                 | OCR تصویر یا PDF                                |
| `ttsService`                 | ساخت TTS و دریافت URL صوت                       |
| `pipelineService`            | تبدیل فایل به متن و لینک صوت                    |
| `toAbsoluteApiUrl`           | تبدیل مسیر نسبی Backend به URL کامل             |
| `buildAuthenticatedAudioUrl` | افزودن Access Token به URL صوت                  |
| `decodeBase64Audio`          | تبدیل Base64 جمله به `Uint8Array`               |
| `formatTtsAudioDuration`     | نمایش میلی‌ثانیه به‌شکل زمان خوانا             |
| `ttsSentenceSegmentToBlob`   | تبدیل صوت یک جمله به `Blob`                     |
| `playTtsSentenceAudio`       | پخش ترتیبی و اعلام جمله فعال                    |
| `default export`             | نمونه‌ی اصلی Axios برای درخواست سفارشی          |

---

## ۴) نحوه‌ی مدیریت توکن

توکن‌ها با این کلیدها داخل `localStorage` قرار می‌گیرند:

```text
access_token
refresh_token
access_token_expires_at
```

### `tokenService.getAccessToken()`

نوع خروجی:

```ts
string | null;
```

مثال:

```js
const accessToken = tokenService.getAccessToken();
```

### `tokenService.getRefreshToken()`

نوع خروجی:

```ts
string | null;
```

```js
const refreshToken = tokenService.getRefreshToken();
```

### `tokenService.getAccessTokenExpiresAt()`

زمان انقضای Access Token را به‌شکل Timestamp میلی‌ثانیه‌ای برمی‌گرداند:

```ts
number | null;
```

```js
const expiresAt = tokenService.getAccessTokenExpiresAt();
```

### `tokenService.isAccessTokenExpired(clockSkewSeconds)`

نوع ورودی و خروجی:

```ts
(clockSkewSeconds?: number) => boolean;
```

مثال:

```js
const expired = tokenService.isAccessTokenExpired();
```

به‌صورت پیش‌فرض ۳۰ ثانیه حاشیه‌ی امن در نظر گرفته می‌شود.

### `tokenService.setTokens(...)`

امضای متد:

```ts
setTokens(
  accessToken: string,
  refreshToken?: string | null,
  expiresInSeconds?: number,
): void
```

مثال:

```js
tokenService.setTokens(
  response.accessToken,
  response.refreshToken,
  response.expiresInSeconds,
);
```

این متد در `verifyCode` و `refresh` به‌صورت خودکار اجرا می‌شود و معمولاً نیازی نیست مستقیم آن را صدا بزنید.

### `tokenService.clearTokens()`

```js
tokenService.clearTokens();
```

هر سه مقدار ذخیره‌شده را حذف می‌کند.

---

## ۵) افزودن خودکار Authorization

برای تمام درخواست‌هایی که از `apiClient` یا سرویس‌های محافظت‌شده استفاده می‌کنند، این هدر خودکار اضافه می‌شود:

```http
Authorization: Bearer ACCESS_TOKEN
```

بنابراین لازم نیست در هر درخواست این هدر را دستی بنویسید:

```js
const user = await userService.getMe();
```

سه مسیر عمومی زیر با Client جدا و بدون JWT اجرا می‌شوند:

```text
POST /auth/send-code
POST /auth/verify-code
POST /auth/refresh
```

---

## ۶) تمدید خودکار توکن

اگر یک درخواست محافظت‌شده پاسخ `401 Unauthorized` بگیرد:

1. درخواست به‌عنوان Retry علامت‌گذاری می‌شود.
2. Refresh Token از `localStorage` خوانده می‌شود.
3. `POST /auth/refresh` اجرا می‌شود.
4. Access Token و Refresh Token جدید ذخیره می‌شوند.
5. درخواست قبلی با Access Token جدید تکرار می‌شود.
6. اگر چند درخواست همزمان `401` بگیرند، فقط یک Refresh انجام می‌شود.
7. اگر Refresh شکست بخورد، تمام توکن‌ها حذف می‌شوند.

به‌دلیل Rotation، Backend در هر Refresh یک Refresh Token جدید می‌دهد و فایل آن را جایگزین مقدار قبلی می‌کند.

### مدیریت شکست نهایی احراز هویت

این Handler را یک بار در لایه‌ی بالای برنامه، مثلاً `App.jsx`، ثبت کنید:

```js
import { setAuthFailureHandler } from "./services/apiClient";

setAuthFailureHandler(() => {
  window.location.href = "/login";
});
```

نمونه با React Router:

```js
useEffect(() => {
  setAuthFailureHandler(() => navigate("/login"));

  return () => setAuthFailureHandler(null);
}, [navigate]);
```

---

# ۷) `authService`

## ۷.۱) ارسال کد تأیید

```ts
sendCode(number: string): Promise<SendCodeResponseDto>
```

مثال:

```js
const result = await authService.sendCode("09121234567");
```

درخواست ارسالی:

```json
{
  "number": "09121234567"
}
```

خروجی نمونه:

```json
{
  "message": "کد تایید ارسال شد.",
  "expiresInSeconds": 120,
  "debugCode": "483921"
}
```

`debugCode` فقط در Development و در صورت فعال بودن تنظیم Backend برمی‌گردد و در Production معمولاً `null` است.

این شکل نیز پشتیبانی می‌شود:

```js
await authService.sendCode({
  number: "09121234567",
});
```

---

## ۷.۲) تأیید کد و ورود/ثبت‌نام

امضای متد:

```ts
verifyCode(input: {
  number: string
  code: string
  fullName?: string | null
}): Promise<AuthResponseDto>
```

مثال:

```js
const auth = await authService.verifyCode({
  number: "09121234567",
  code: "483921",
  fullName: "Parham Ahmadi",
});
```

درخواست ارسالی:

```json
{
  "number": "09121234567",
  "code": "483921",
  "fullName": "Parham Ahmadi"
}
```

خروجی نمونه:

```json
{
  "isNewUser": true,
  "message": "ثبت‌نام با موفقیت انجام شد.",
  "user": {
    "id": 12,
    "number": "09121234567",
    "fullName": "Parham Ahmadi"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresInSeconds": 900,
  "refreshToken": "a4f1c2d3..."
}
```

بعد از پاسخ موفق، هر دو توکن به‌صورت خودکار ذخیره می‌شوند.

---

## ۷.۳) Refresh دستی

```ts
refresh(): Promise<AuthResponseDto>
```

```js
const newSession = await authService.refresh();
```

در حالت معمول نیازی به اجرای دستی نیست، چون Interceptor پاسخ `401` را مدیریت می‌کند.

خروجی شامل Access Token و Refresh Token جدید است و خودکار ذخیره می‌شود.

---

## ۷.۴) خروج

```ts
logout(): Promise<{ message: string }>
```

```js
try {
  await authService.logout();
} finally {
  navigate("/login");
}
```

در پایان، حتی اگر درخواست Logout خطا بدهد، توکن‌های محلی حذف می‌شوند.

خروجی نمونه:

```json
{
  "message": "خروج انجام شد."
}
```

---

## ۷.۵) بررسی وجود Access Token

```ts
isAuthenticated(): boolean
```

```js
if (authService.isAuthenticated()) {
  // یک Access Token در localStorage وجود دارد.
}
```

این متد فقط وجود توکن را بررسی می‌کند. برای بررسی زمان انقضا از این متد استفاده کنید:

```js
tokenService.isAccessTokenExpired();
```

---

# ۸) `userService`

## ۸.۱) دریافت کاربر جاری

```ts
getMe(): Promise<UserViewModel>
```

```js
const user = await userService.getMe();
```

خروجی نمونه:

```json
{
  "id": 12,
  "number": "09121234567",
  "fullName": "Parham Ahmadi"
}
```

---

## ۸.۲) ویرایش نام کامل

می‌توان رشته را مستقیم فرستاد:

```js
const user = await userService.updateMe("Parham Ahmadi");
```

یا Payload کامل فرستاد:

```js
const user = await userService.updateMe({
  fullName: "Parham Ahmadi",
});
```

درخواست Backend:

```json
{
  "fullName": "Parham Ahmadi"
}
```

برای حذف نام کامل:

```js
await userService.updateMe(null);
```

درخواست ارسالی:

```json
{
  "fullName": null
}
```

---

# ۹) `ocrService`

## ۹.۱) استخراج متن از تصویر یا PDF

```ts
recognize(
  file: File,
  options?: {
    category?: "book" | "newspaper" | "paper" | "letter"
    returnDetails?: boolean | 1 | 0
    onUploadProgress?: (percent: number, event: ProgressEvent) => void
    signal?: AbortSignal
  },
): Promise<OcrResponseDto>
```

مثال خروجی جزئیات‌دار:

```js
const result = await ocrService.recognize(file, {
  category: "book",
  returnDetails: true,
  onUploadProgress: (percent) => setProgress(percent),
});
```

`apiClient.js` این FormData را می‌سازد:

```text
file=<binary PDF/Image>
category=book
return_details=1
```

`access_token` سرویس OCR از فرانت ارسال نمی‌شود؛ Secret در Backend با `OcrApi:AccessToken` نگهداری و هنگام تماس با Provider اضافه می‌شود. فرانت فقط JWT برنامه را از طریق Interceptor در هدر Authorization می‌فرستد.

نمایش مستندی ورودی:

```json
{
  "file": "<binary PDF/Image>",
  "category": "book",
  "return_details": 1
}
```

خروجی جزئیات‌دار:

```json
{
  "ocrId": "17dedbc2-bbd5-44f2-b13e-0137b7c694df",
  "successful": true,
  "cost": 8,
  "message": "ok.",
  "result": [
    [
      {
        "box_label": "title",
        "box_boundary": [
          [102, 111],
          [580, 184]
        ],
        "font": "IRNazanin",
        "lines": [
          {
            "text": "عنوان سند",
            "boundary": [
              [530.0, 852.0],
              [576.0, 873.0]
            ]
          }
        ]
      }
    ]
  ],
  "text": "عنوان سند",
  "category": "book",
  "returnDetails": true
}
```

خروجی ساده:

```js
const result = await ocrService.recognize(file, {
  category: "book",
  returnDetails: false,
});
```

```json
{
  "ocrId": "17dedbc2-bbd5-44f2-b13e-0137b7c694df",
  "successful": true,
  "cost": 8,
  "message": "ok.",
  "result": ["پاراگراف اول", "پاراگراف دوم"],
  "text": "پاراگراف اول\nپاراگراف دوم",
  "category": "book",
  "returnDetails": false
}
```

در PDF، `result` می‌تواند دیکشنری شماره صفحه باشد و بدون تغییر در پاسخ باقی می‌ماند:

```json
{
  "result": {
    "1": ["متن صفحه اول"],
    "2": ["متن صفحه دوم"]
  },
  "text": "متن صفحه اول\n\nمتن صفحه دوم"
}
```

## ۹.۲) دریافت نتیجه OCR ذخیره‌شده

```ts
getById(ocrId: string, config?: AxiosRequestConfig): Promise<OcrResponseDto>
```

```js
const result = await ocrService.getById("17dedbc2-bbd5-44f2-b13e-0137b7c694df");
```

خروجی ذخیره‌شده همان فیلدهای `successful`، `cost`، `message`، `result`، `text`، `category` و `returnDetails` را دارد.

# ۱۰) تنظیمات TTS و `ttsService`

## ۱۰.۱) کش تنظیمات TTS

سه تنظیم `gender`، `speakerId` و `audioFormat` با کلید `tts_settings` در `localStorage` ذخیره می‌شوند. صفحه Settings فرانت منبع تغییر این پیش‌فرض‌هاست:

```json
{
  "gender": "male",
  "speakerId": 1,
  "audioFormat": "mp3"
}
```

خواندن تنظیمات:

```js
const settings = ttsSettingsService.getSettings();
```

تغییر هر مقدار بدون دست‌زدن به دو مقدار دیگر:

```js
ttsSettingsService.setGender("female");
ttsSettingsService.setSpeakerId(4);
ttsSettingsService.setAudioFormat("opus");
```

Reset جداگانه یا کامل:

```js
ttsSettingsService.resetGender();
ttsSettingsService.resetSpeakerId();
ttsSettingsService.resetAudioFormat();
ttsSettingsService.resetSettings();
```

برای فرم صفحه Settings که دکمه Save دارد، هر سه مقدار را یک‌جا ذخیره کنید:

```js
const saved = ttsSettingsService.saveDefaults({
  gender: form.gender,
  speakerId: Number(form.speakerId),
  audioFormat: form.audioFormat,
});
```

نام معادل `saveDefaults()`، متد `saveSettings()` است. برای تغییر Partial نیز می‌توان از `updateSettings()` استفاده کرد. Setterها، Save و Resetها شیء کامل تنظیمات نهایی را برمی‌گردانند و برای قرار دادن مستقیم در React State مناسب‌اند.

## ۱۰.۲) ساخت رکورد TTS با تنظیمات کش‌شده

```ts
create(input: {
  text: string
  gender?: "male" | "female"
  speakerId?: number
  audioFormat?: "mp3" | "opus"
  speed?: number
  pitch?: number
  energy?: number
  ocrId?: string | null
}): Promise<TtsCreatedDto>
```

اگر سه تنظیم اصلی ارسال نشوند، مقادیر `localStorage` استفاده می‌شوند:

```js
const result = await ttsService.create({
  text: "سلام، این یک متن آزمایشی است.",
});
```

اگر مقدار جدید مستقیماً در درخواست ارسال شود، فقط همان درخواست Override می‌شود و Default ذخیره‌شده صفحه Settings تغییر نمی‌کند:

```js
const result = await ttsService.create({
  text: "سلام",
  gender: "female",
  speakerId: 5,
  audioFormat: "opus",
});
```

درخواست ارسالی نمونه:

```json
{
  "text": "سلام",
  "gender": "female",
  "speakerId": 5,
  "audioFormat": "opus",
  "speed": 1,
  "pitch": 1,
  "energy": 1,
  "ocrId": null
}
```

POST فایل صوتی برنمی‌گرداند؛ پاسخ JSON شامل `ttsId`، `audioUrl` و `sentenceAudioUrl` است.

## ۱۰.۳) صدای مرجع

```js
const result = await ttsService.createWithReference({
  text: "متن مورد نظر",
  speakerReference: file,
  audioFormat: "opus",
  speed: 1,
  pitch: 1,
  energy: 1,
});
```

اگر `audioFormat` مشخص نشود، مقدار پیش‌فرض صفحه Settings استفاده می‌شود. مقدار صریح فقط همان درخواست را Override می‌کند. `gender` و `speakerId` در حالت صدای مرجع برای Provider ارسال نمی‌شوند.

## ۱۰.۴) Alias قدیمی TTS

```js
const result = await ttsService.createLegacy({ text: "سلام" });
```

این متد از `/tts/stream` استفاده می‌کند، ولی مانند `/tts` فقط JSON برمی‌گرداند.

## ۱۰.۵) ساخت URL قابل پخش صوت

```js
const playableUrl = ttsService.getAudioUrl(result.audioUrl);
```

```jsx
<audio controls src={ttsService.getAudioUrl(result.audioUrl)} />
```

## ۱۰.۶) دریافت صوت به‌شکل Blob

```js
const blob = await ttsService.getAudioBlob(result.audioUrl);
const objectUrl = URL.createObjectURL(blob);
audioRef.current.src = objectUrl;
```

در پایان Object URL را آزاد کنید:

```js
URL.revokeObjectURL(objectUrl);
```

Backend ابتدا تولید صوت را کامل می‌کند و سپس فایل کامل را با `Content-Length` و پشتیبانی Range برمی‌گرداند.

## ۱۰.۷) دریافت صوت و متن دقیق هر جمله

```js
const response = await ttsService.getSentenceAudio(result.sentenceAudioUrl);
```

نمونه هر عضو:

```json
{
  "index": 0,
  "text": "سلام.",
  "audioBase64": "SUQzBAAAAA...",
  "byteCount": 15420,
  "durationMs": 1280,
  "durationSeconds": 1.28,
  "contentType": "audio/mpeg",
  "fromCache": false,
  "isLast": false
}
```

تبدیل یک جمله به Blob:

```js
const blob = ttsService.sentenceSegmentToBlob(response.segments[0]);
```

پخش ترتیبی و هایلایت جمله فعال:

```js
await ttsService.playSentences(response, {
  audioElement: audioRef.current,
  onSentenceChange: (segment) => {
    setActiveSentenceIndex(segment?.index ?? -1);
  },
});
```

این پاسخ ابتدا کامل ساخته می‌شود، `Content-Length` دارد و Chunked نیست. هر Segment دارای `durationMs` و `durationSeconds` است و پاسخ نیز مجموع مدت را در `totalDurationMs` و `totalDurationSeconds` می‌دهد. فایل `SentenceAudioHighlighter.jsx` نمونه کامل React و نمایش مدت است.

---

# ۱۱) `pipelineService`

## ۱۱.۱) تصویر/PDF به متن و صوت مدت‌دار هر جمله در یک درخواست

```ts
documentToSpeech(
  file: File,
  options?: {
    category?: "book" | "newspaper" | "paper" | "letter"
    returnDetails?: boolean | 1 | 0
    gender?: "male" | "female"
    speakerId?: number
    audioFormat?: "mp3" | "opus"
    speed?: number
    pitch?: number
    energy?: number
    speakerReference?: File
    onUploadProgress?: (percent: number, event: ProgressEvent) => void
    signal?: AbortSignal
  },
): Promise<PipelineResultDto>
```

استفاده از تنظیمات کش‌شده:

```js
const result = await pipelineService.documentToSpeech(file, {
  category: "book",
  returnDetails: true,
});
```

Override موقت تنظیمات فقط برای همان درخواست:

```js
const result = await pipelineService.documentToSpeech(file, {
  category: "book",
  gender: "female",
  speakerId: 9,
  audioFormat: "mp3",
});
```

FormData شامل فیلدهای `gender`، `speaker_id` و `audio_format` خواهد بود. این Override، Default ذخیره‌شده صفحه Settings را تغییر نمی‌دهد. Pipeline پیش از پاسخ، صوت مستقل همه جمله‌ها را تولید و Cache می‌کند و فقط `segments[].text`، `segments[].durationMs` و مدت کل را برمی‌گرداند. فیلدهای بایت و نوع محتوا از پاسخ Pipeline حذف شده‌اند.

پخش صوت:

```js
setText(result.text);
setSentenceTimings(result.segments);
setTotalDurationMs(result.totalDurationMs);
```

## ۱۱.۲) Alias قدیمی Pipeline

```js
const result = await pipelineService.imageToSpeechLegacy(file);
```

این متد همان قرارداد را روی مسیر قدیمی `/pipeline/image-to-speech` اجرا می‌کند.

# ۱۲) لغو درخواست با `AbortController`

`ocrService` و `pipelineService` از `AbortSignal` پشتیبانی می‌کنند:

```js
const controller = new AbortController();

const request = pipelineService.documentToSpeech(file, {
  category: "book",
  returnDetails: true,
  gender: "male",
  speakerId: 1,
  audioFormat: "mp3",
  signal: controller.signal,
});

// لغو درخواست
controller.abort();

try {
  const result = await request;
  console.log(result);
} catch (error) {
  if (error.code === "ERR_CANCELED") {
    console.log("درخواست توسط کاربر لغو شد.");
  }
}
```

لغو درخواست باعث لغو `CancellationToken` متناظر در Backend می‌شود.

---

# ۱۳) مدیریت خطا

## `getApiErrorMessage`

این تابع پیام مناسب را از حالت‌های مختلف استخراج می‌کند:

- `{ message }`های Backend
- Validation Problem Details مربوط به ASP.NET Core
- خطای Timeout Axios
- خطای شبکه و نبود پاسخ
- رشته‌ی خطای خام

مثال:

```js
try {
  const result = await pipelineService.documentToSpeech(file);
  console.log(result);
} catch (error) {
  const message = getApiErrorMessage(error);
  setError(message);
}
```

### نمونه خطای ساده Backend

```json
{
  "message": "متنی از فایل تشخیص داده نشد."
}
```

### نمونه Validation Error

```json
{
  "title": "One or more validation errors occurred.",
  "status": 400,
  "errors": {
    "Text": ["متن نمی‌تواند خالی باشد."]
  }
}
```

---

## `getRetryAfterSeconds`

برای خطاهای `429 Too Many Requests`:

```js
try {
  await authService.sendCode(number);
} catch (error) {
  const seconds = getRetryAfterSeconds(error);

  if (seconds !== null) {
    setRemainingSeconds(seconds);
  }
}
```

تابع مقدار را از یکی از این دو محل می‌خواند:

```text
Retry-After response header
retryAfterSeconds response body
```

---

# ۱۴) `apiService` برای درخواست‌های سفارشی

## GET

```js
const data = await apiService.get("/custom", {
  page: 1,
});
```

امضا:

```ts
get(url, params?, config?): Promise<unknown>
```

## POST

```js
const data = await apiService.post("/custom", {
  name: "value",
});
```

## PUT

```js
const data = await apiService.put("/custom/1", {
  name: "new value",
});
```

## PATCH

```js
const data = await apiService.patch("/custom/1", {
  enabled: true,
});
```

## DELETE

```js
const data = await apiService.delete("/custom/1");
```

## Upload

```js
const form = new FormData();
form.append("file", file);

const data = await apiService.upload(
  "/custom/upload",
  form,
  (percent) => setProgress(percent),
  { signal: controller.signal },
);
```

`apiService` فقط `response.data` را برمی‌گرداند، نه کل `AxiosResponse`.

اگر به Status یا Header نیاز دارید، از `apiClient` پیش‌فرض استفاده کنید.

---

# ۱۵) استفاده مستقیم از Axios Client

```js
import apiClient from "./services/apiClient";

const response = await apiClient.get("/user/me");

console.log(response.status);
console.log(response.headers);
console.log(response.data);
```

این Client همچنان:

- Authorization را خودکار اضافه می‌کند.
- پاسخ `401` را Refresh و Retry می‌کند.
- Base URL و Timeout مشترک دارد.

---

# ۱۶) Helperهای URL

## `toAbsoluteApiUrl`

```js
const url = toAbsoluteApiUrl("/ocr/123");
```

خروجی:

```text
http://localhost:5027/ocr/123
```

اگر URL از قبل کامل باشد، بدون تغییر برگردانده می‌شود.

## `buildAuthenticatedAudioUrl`

```js
const url = buildAuthenticatedAudioUrl(
  "/tts/8d52dc86-e379-4b51-a345-bc16d131d78e/audio",
);
```

این تابع:

1. URL نسبی را کامل می‌کند.
2. Access Token را از `tokenService` می‌خواند.
3. آن را به پارامتر `access_token` اضافه می‌کند.

---

# ۱۷) TypeScript Typeهای پیشنهادی

```ts
export type Guid = string;
export type OcrCategory = "book" | "newspaper" | "paper" | "letter";
export type OcrRawResult = unknown[] | Record<string, unknown>;
export type TtsGender = "male" | "female";
export type TtsAudioFormat = "mp3" | "opus";

export interface TtsSettings {
  gender: TtsGender;
  speakerId: number;
  audioFormat: TtsAudioFormat;
}

export interface UserViewModel {
  id: number;
  number: string;
  fullName: string | null;
}

export interface SendCodeResponseDto {
  message: string;
  expiresInSeconds: number;
  debugCode: string | null;
}

export interface AuthResponseDto {
  isNewUser: boolean;
  message: string;
  user: UserViewModel;
  accessToken: string;
  expiresInSeconds: number;
  refreshToken: string;
}

export interface OcrResponseDto {
  ocrId: Guid;
  successful: boolean;
  cost: number | null;
  message: string;
  result: OcrRawResult;
  text: string;
  category: OcrCategory;
  returnDetails: boolean;
}

export interface TtsCreatedDto extends TtsSettings {
  ttsId: Guid;
  text: string;
  speed: number;
  pitch: number;
  energy: number;
  usesSpeakerReference: boolean;
  audioUrl: string;
  sentenceAudioUrl: string;
  ocrId: Guid | null;
}

export interface TtsSentenceAudioSegment {
  index: number;
  text: string;
  audioBase64: string;
  byteCount: number;
  durationMs: number;
  durationSeconds: number;
  contentType: "audio/mpeg" | "audio/ogg";
  fromCache: boolean;
  isLast: boolean;
}

export interface TtsSentenceAudioResponse {
  ttsId: Guid;
  text: string;
  audioFormat: TtsAudioFormat;
  contentType: "audio/mpeg" | "audio/ogg";
  segmentCount: number;
  totalByteCount: number;
  totalDurationMs: number;
  totalDurationSeconds: number;
  segments: TtsSentenceAudioSegment[];
}

export interface PipelineSentenceAudioSegment {
  index: number;
  text: string;
  durationMs: number;
  fromCache: boolean;
  isLast: boolean;
}

export interface PipelineResultDto extends OcrResponseDto {
  ttsId: Guid;
  audioUrl: string;
  sentenceAudioUrl: string;
  segmentCount: number;
  totalDurationMs: number;
  totalDurationSeconds: number;
  segments: PipelineSentenceAudioSegment[];
}
```

# ۱۸) نمونه Hook ساده احراز هویت

```js
import { useCallback, useState } from "react";
import { authService, getApiErrorMessage } from "./services/apiClient";

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sendCode = useCallback(async (number) => {
    setLoading(true);
    setError("");

    try {
      return await authService.sendCode(number);
    } catch (err) {
      setError(getApiErrorMessage(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyCode = useCallback(async (payload) => {
    setLoading(true);
    setError("");

    try {
      return await authService.verifyCode(payload);
    } catch (err) {
      setError(getApiErrorMessage(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    sendCode,
    verifyCode,
    logout: authService.logout,
  };
}
```

---

# ۱۹) نمونه جریان کامل فایل تا صوت

```js
async function processDocument(file) {
  try {
    const result = await pipelineService.documentToSpeech(file, {
      category: "book",
      returnDetails: true,
      gender: "male",
      speakerId: 1,
      audioFormat: "mp3",
      onUploadProgress: (percent) => {
        console.log(`Upload: ${percent}%`);
      },
    });

    console.log("OCR text:", result.text);
    console.log("Provider result:", result.result);

    return result;
  } catch (error) {
    throw new Error(getApiErrorMessage(error));
  }
}
```

```js
const result = await processDocument(selectedFile);
setText(result.text);
setSentenceTimings(result.segments);
setTotalDurationMs(result.totalDurationMs);
```

# ۲۰) نکات امنیتی

## ذخیره توکن در `localStorage`

نسخه‌ی فعلی برای سادگی Access Token و Refresh Token را در `localStorage` ذخیره می‌کند. در صورت وجود آسیب‌پذیری XSS، کد مخرب می‌تواند این توکن‌ها را بخواند.

برای Production امن‌تر است:

- Refresh Token داخل Cookie با `HttpOnly`, `Secure`, `SameSite` قرار بگیرد.
- Access Token تا حد ممکن داخل حافظه نگهداری شود.
- CSP مناسب تنظیم شود.

این تغییر نیازمند تغییر Backend نیز هست.

## توکن صوت در Query String

برای `<audio>`، Access Token به Query String اضافه می‌شود:

```text
?access_token=...
```

این مقدار ممکن است در Log، History یا ابزارهای مانیتورینگ دیده شود. گزینه امن‌تر استفاده از Cookie امن یا دریافت Blob با Authorization Header است.

## Refresh Token Rotation

بعد از هر Refresh باید Refresh Token جدید ذخیره شود. این فایل این کار را به‌صورت خودکار انجام می‌دهد.

---

# ۲۱) خطاهای رایج

## Network Error یا سرور پاسخ نمی‌دهد

موارد زیر را بررسی کنید:

- Backend روی `http://localhost:5027` اجرا باشد.
- `REACT_APP_API_BASE_URL` درست باشد.
- Origin فرانت داخل `Cors:AllowedOrigins` Backend باشد.
- بعد از تغییر `.env`، React Restart شده باشد.

## خطای CORS

مقدار پیش‌فرض Backend:

```text
http://localhost:3000
```

اگر React روی Port دیگری اجرا می‌شود، آن Origin را در Backend اضافه کنید.

## خطای 401 تکراری

موارد زیر را بررسی کنید:

- Refresh Token در `localStorage` وجود داشته باشد.
- Endpoint `/auth/refresh` در دسترس باشد.
- توکن‌ها بعد از `verifyCode` ذخیره شده باشند.
- Clock سیستم درست باشد.

## آپلود فایل به Backend نمی‌رسد

`Content-Type` را دستی تنظیم نکنید:

```js
// اشتباه
headers: {
  "Content-Type": "multipart/form-data"
}
```

فایل `apiClient.js` این هدر را عمداً به مرورگر واگذار می‌کند.

## Timeout در OCR

Timeout پیش‌فرض Client برابر ۹۰ ثانیه است. می‌توانید در `.env` افزایش دهید:

```env
REACT_APP_API_TIMEOUT_MS=120000
```

## صوت پخش نمی‌شود

بررسی کنید:

- از `ttsService.getAudioUrl(result.audioUrl)` استفاده شده باشد.
- Access Token وجود داشته باشد.
- `TtsApi:BasicToken` سرویس Deepmine در Backend تنظیم شده باشد.
- `speakerId` معتبر و بزرگ‌تر از صفر باشد.
- `audioFormat` مقدار `mp3` یا `opus` داشته باشد.
- Backend توانسته باشد مسیر `/tts/{id}/audio` را باز کند.

---

## جمع‌بندی سریع

ورود:

```js
await authService.sendCode(number);
await authService.verifyCode({ number, code, fullName });
```

پروفایل:

```js
const user = await userService.getMe();
await userService.updateMe("New Full Name");
```

OCR:

```js
const ocr = await ocrService.recognize(file, {
  category: "book",
  returnDetails: false,
});
```

TTS:

```js
ttsSettingsService.setGender("female");
ttsSettingsService.setSpeakerId(5);
ttsSettingsService.setAudioFormat("mp3");

const tts = await ttsService.create({
  text: "سلام، این یک متن آزمایشی است.",
});

const sentenceAudio = await ttsService.getSentenceAudio(tts.sentenceAudioUrl);
await ttsService.playSentences(sentenceAudio, {
  audioElement: audio,
  onSentenceChange: (segment) => highlight(segment?.index ?? -1),
});
```

Pipeline:

```js
const result = await pipelineService.documentToSpeech(file, {
  category: "book",
  returnDetails: true,
  gender: "male",
  speakerId: 1,
  audioFormat: "mp3",
});

setText(result.text);
setSentenceTimings(result.segments);
setTotalDurationMs(result.totalDurationMs);
```
