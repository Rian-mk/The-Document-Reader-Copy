# صوت و هایلایت دقیق جمله‌به‌جمله

## جریان اصلی: Pipeline

```http
POST /pipeline/document-to-speech
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: multipart/form-data
```

Pipeline در همان درخواست OCR را انجام می‌دهد، متن را به جمله‌ها تقسیم می‌کند، صوت مستقل هر جمله را تولید و Cache می‌کند و در پاسخ فقط متن و `durationMs` هر جمله را می‌دهد. `totalByteCount`، `byteCount`، `durationSeconds`، `audioBase64` و `contentType` از پاسخ Pipeline حذف شده‌اند.

```js
const pipelineResult = await pipelineService.documentToSpeech(file, {
  category: "book",
  gender: "male",
  speakerId: 1,
  audioFormat: "mp3",
});

console.log(pipelineResult.totalDurationMs);
console.log(pipelineResult.segments[0].durationMs);

setSentenceTimings(pipelineResult.segments);
setTotalDurationMs(pipelineResult.totalDurationMs);
```

کامپوننت آماده پاسخ سبک Pipeline را مستقیم برای نمایش متن و مدت می‌گیرد. اگر کاربر پخش جمله‌ای را انتخاب کند، کامپوننت از `sentenceAudioUrl` صوت را جداگانه دریافت می‌کند:

```jsx
<SentenceAudioHighlighter pipelineResponse={pipelineResult} />
```

## مسیر جایگزین و Retry

اگر Pipeline قبلاً رکورد را ساخته ولی پاسخ قطع شده یا تولید یک جمله خطا داده است، می‌توانید همان خروجی را از مسیر زیر دوباره درخواست کنید:

```http
GET /tts/{ttsId}/sentences
Authorization: Bearer <ACCESS_TOKEN>
Accept: application/json
```

این endpoint ابتدا متن را به جمله‌ها تقسیم می‌کند، صوت هر جمله را جداگانه و به ترتیب از Provider می‌سازد و فقط پس از تکمیل همه جمله‌ها یک JSON کامل برمی‌گرداند. پاسخ `Content-Length` دارد و به‌صورت Chunked ارسال نمی‌شود.

## نمونه پاسخ

```json
{
  "ttsId": "8d52dc86-e379-4b51-a345-bc16d131d78e",
  "text": "سلام. امروز هوا خوب است!",
  "audioFormat": "mp3",
  "contentType": "audio/mpeg",
  "segmentCount": 2,
  "totalByteCount": 48210,
  "totalDurationMs": 3240,
  "totalDurationSeconds": 3.24,
  "segments": [
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
    },
    {
      "index": 1,
      "text": "امروز هوا خوب است!",
      "audioBase64": "SUQzBAAAAA...",
      "byteCount": 32790,
      "durationMs": 1960,
      "durationSeconds": 1.96,
      "contentType": "audio/mpeg",
      "fromCache": false,
      "isLast": true
    }
  ]
}
```

در C# بایت‌ها `byte[]` هستند؛ `System.Text.Json` آن‌ها را در JSON به Base64 تبدیل می‌کند. فرانت با Decode کردن `audioBase64` دقیقاً بایت صوت همان `text` را دریافت می‌کند. `durationMs` مدت فایل همان جمله بر حسب میلی‌ثانیه و `durationSeconds` همان مقدار بر حسب ثانیه است. در سطح پاسخ نیز `totalDurationMs` و `totalDurationSeconds` مجموع مدت تمام جمله‌ها را نشان می‌دهند.

## جریان قدیمی POST /tts

در جریان غیر-Pipeline ابتدا رکورد TTS ساخته می‌شود:

```http
POST /tts
Content-Type: application/json
Authorization: Bearer <ACCESS_TOKEN>

{
  "text": "سلام. امروز هوا خوب است!",
  "gender": "female",
  "speakerId": 5,
  "audioFormat": "mp3"
}
```

پاسخ POST اکنون علاوه بر `audioUrl` شامل این فیلد است:

```json
{
  "ttsId": "...",
  "audioUrl": "/tts/.../audio",
  "sentenceAudioUrl": "/tts/.../sentences"
}
```

در این جریان قدیمی سپس فرانت `sentenceAudioUrl` را درخواست می‌کند؛ در Pipeline این مرحله اضافه لازم نیست.

## استفاده در apiClient

```js
const created = await ttsService.create({
  text: "سلام. امروز هوا خوب است!",
});

const sentenceResponse = await ttsService.getSentenceAudio(
  created.sentenceAudioUrl,
);

console.log(sentenceResponse.totalDurationMs);
console.log(sentenceResponse.segments[0].durationMs);
```

`getSentenceAudio` دارای Timeout نامحدود Axios است، چون Backend باید همه صوت‌های جمله‌ها را پیش از پاسخ کامل کند. لغو همچنان با `AbortSignal` ممکن است:

```js
const controller = new AbortController();

const request = ttsService.getSentenceAudio(created.ttsId, {
  signal: controller.signal,
});

controller.abort();
```

## تبدیل یک جمله به Blob

```js
const segment = sentenceResponse.segments[0];
const blob = ttsService.sentenceSegmentToBlob(segment);
const objectUrl = URL.createObjectURL(blob);

audio.src = objectUrl;
await audio.play();
```

پس از پایان استفاده:

```js
URL.revokeObjectURL(objectUrl);
```

## پخش خودکار و هایلایت

Helper آماده `playSentences` هر جمله را در همان `<audio>` پخش می‌کند و قبل از شروع هر جمله callback می‌دهد. همان callback به `durationMs` و `durationSeconds` جمله فعال نیز دسترسی دارد:

```js
await ttsService.playSentences(sentenceResponse, {
  audioElement: audioRef.current,
  onSentenceChange: (segment) => {
    setActiveSentenceIndex(segment?.index ?? -1);
    setActiveSentenceDurationMs(segment?.durationMs ?? 0);
  },
});
```

نمایش متن در React:

```jsx
<p>
  {sentenceResponse.segments.map((segment) => (
    <span
      key={segment.index}
      className={segment.index === activeSentenceIndex ? "active-sentence" : ""}
    >
      {segment.text}{" "}
    </span>
  ))}
</p>
```

CSS نمونه:

```css
.active-sentence {
  background: #ffe58f;
  border-radius: 4px;
  transition: background-color 150ms ease;
}
```

فایل `SentenceAudioHighlighter.jsx` نمونه کامل آماده‌سازی، پخش، توقف و هایلایت را دارد و با prop جدید `pipelineResponse` بدون درخواست GET دوم کار می‌کند.

## کش Backend

هر جمله با نامی مانند زیر Cache می‌شود:

```text
{ttsId}.sentence-0000.mp3
{ttsId}.sentence-0001.mp3
```

به همین دلیل درخواست‌های بعدی دوباره از Provider هزینه مصرف نمی‌کنند، مگر اینکه Cache خاموش یا پاک شده باشد.

## محدودیت‌ها

```json
{
  "TtsApi": {
    "MaxSentenceSegments": 100,
    "MaxSentenceAudioBytes": 52428800
  }
}
```

- حداکثر پیش‌فرض ۱۰۰ جمله است.
- مجموع بایت خام صوت جمله‌ها حداکثر ۵۰ مگابایت است.
- Base64 حدود ۳۳٪ از بایت خام بزرگ‌تر است.
- مدت MP3 از Frameهای فایل و مدت Ogg/Opus از Granule Position نهایی محاسبه می‌شود؛ نیازی به حدس بر اساس اندازه بایت یا Chunkهای Provider نیست.
- هر جمله در اولین درخواست یک فراخوانی جدا به Provider دارد؛ زمان پاسخ می‌تواند از تولید یک فایل بیشتر شود.
- اگر یک جمله خطا بدهد، پاسخ ناقص فرستاده نمی‌شود؛ Backend خطای JSON با شماره همان جمله برمی‌گرداند.
- صوت صدای مرجع تا پایان Retention نگه داشته می‌شود تا تولید جمله‌ای ممکن باشد.

## تست با curl.exe

```powershell
$token = "ACCESS_TOKEN".Trim()
$ttsId = "TTS_ID"

curl.exe --max-time 600 `
  -H "Authorization: Bearer $token" `
  -H "Accept: application/json" `
  -D ".\\sentence-headers.txt" `
  -o ".\\sentence-audio.json" `
  "http://localhost:5027/tts/$ttsId/sentences"
```

در Header باید `Content-Type: application/json` و `Content-Length` دیده شود و `Transfer-Encoding: chunked` وجود نداشته باشد.
