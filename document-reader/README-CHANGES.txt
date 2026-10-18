فایل‌های تغییریافته/جدید — بخش History (نسخه نهایی)
=====================================================

مسیرها نسبت به ریشه ریپازیتوری The-Document-Reader-Copy هستند.
کافیست محتوای هر فایل را روی همان مسیر در ریپازیتوری خودتان بگذارید.

جدید (بخش History):
  document-reader/src/pages/history/HistoryPage.jsx
  document-reader/src/components/history/HistoryListItem/HistoryListItem.jsx
  document-reader/src/components/history/HistoryListItem/index.js

تغییریافته (History):
  document-reader/src/services/apiClient.js      -> + historyService (getMine, rename)، + ttsService.getTimeline
  document-reader/src/routes/AppRoutes.jsx        -> + مسیر /history
  document-reader/src/pages/profile/ProfilePage.jsx -> فعال‌سازی دکمه «تاریخچه اسناد اخیر»

تغییریافته (اتصال/اجرا):
  document-reader/vite.config.js                  -> proxy مسیرهای API + allowedHosts + VITE_DEV_HTTPS
  document-reader/.env.development                -> VITE_API_BASE_URL_WEB / MOBILE
  document-reader/src/pages/auth/PhoneLoginPage.jsx -> نمایش debugCode در حالت توسعه
  document-reader/src/pages/auth/OtpVerifyPage.jsx  -> نمایش debugCode در ارسال مجدد
  project-backend/backend/DocumentReaderBackend.csproj -> + Microsoft.EntityFrameworkCore.Sqlite
  project-backend/backend/Program.cs              -> Database:Provider (پیش‌فرض SqlServer) + EnsureCreated برای Sqlite

نکته: فایل‌های dev.db / dev.db-shm / dev.db-wal دیتابیس اجرای محلی هستند و عمداً در این آرشیو نیامده‌اند؛
پیشنهاد می‌شود به .gitignore اضافه شوند.
