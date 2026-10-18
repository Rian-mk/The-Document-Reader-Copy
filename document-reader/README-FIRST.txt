نسخه سبک پاسخ Pipeline

POST /pipeline/document-to-speech همچنان OCR، تولید صوت مستقل هر جمله، Cache و محاسبه مدت را انجام می‌دهد.

از پاسخ Pipeline حذف شده‌اند:
- totalByteCount
- segments[].byteCount
- segments[].durationSeconds
- segments[].audioBase64
- contentType در ریشه و Segmentها

در پاسخ Pipeline باقی مانده‌اند:
- segmentCount
- totalDurationMs
- totalDurationSeconds
- segments[].index
- segments[].text
- segments[].durationMs
- segments[].fromCache
- segments[].isLast

GET /tts/{id}/sentences برای دریافت اختیاری صوت جمله‌ها و سازگاری قبلی بدون تغییر باقی مانده است.
هیچ Migration دیتابیسی لازم نیست.

اجرا:
Remove-Item -Recurse -Force .\bin,.\obj -ErrorAction SilentlyContinue
dotnet clean
dotnet build
dotnet run --launch-profile http
