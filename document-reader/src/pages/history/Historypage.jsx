import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { MdErrorOutline, MdOutlineHistory, MdRefresh } from 'react-icons/md';
import HistoryListItem from '../../components/history/HistoryListItem';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/+ui/dialog';
import { Input } from '@/components/ui/input';
import { CAPTURED_PIPELINE_KEY, CAPTURED_TEXT_KEY } from '@/constants/player';
// All API calls go through apiClient
import {
    historyService,
    ocrService,
    ttsService,
    getApiErrorMessage,
} from '../../services/apiClient';

// Backend contract: GET /history answers OcrHistoryResponseDto
// ({ page, pageSize, totalCount, totalPages, items:[{ ocrId, title,
// inputOriginalFileName, createdAt }] }). pageSize is not sent explicitly —
// the backend picks its own default (20) and echoes it back in the response.
const FIRST_PAGE = 1;

// Backend contract: UpdateHistoryTitleRequestDto.Title is [MaxLength(200)]
// (OcrHistoryTitleGenerator.MaxTitleLength)
const TITLE_MAX_LENGTH = 200;

// createdAt is a UTC DateTime serialized as ISO-8601; show it in the
// Persian (Jalali) calendar like the rest of the Persian-first UI.
const formatCreatedAt = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('fa-IR', { dateStyle: 'medium', timeStyle: 'short' });
};

export default function HistoryPage() {
    const navigate = useNavigate();

    // List data — kept in page state (same pattern as the other pages)
    const [items, setItems] = useState([]);
    const [page, setPage] = useState(FIRST_PAGE);
    const [totalPages, setTotalPages] = useState(0);

    // Initial-load status; "loading" | "ready" | "error"
    const [status, setStatus] = useState("loading");
    const [errorMessage, setErrorMessage] = useState("");
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    // ocrId of the document currently being opened in the player
    const [openingId, setOpeningId] = useState(null);

    // Rename dialog state
    const [renameItem, setRenameItem] = useState(null);
    const [renameValue, setRenameValue] = useState("");
    const [isSavingTitle, setIsSavingTitle] = useState(false);

    // Real API call: GET /history?page=N (see historyService in apiClient)
    const fetchPage = async (nextPage, { replace = false } = {}) => {
        if (replace) {
            setStatus("loading");
            setErrorMessage("");
        } else {
            setIsLoadingMore(true);
        }

        try {
            const response = await historyService.getMine({ page: nextPage });

            setItems((prev) => replace ? (response?.items || []) : [...prev, ...(response?.items || [])]);
            setPage(response?.page ?? nextPage);
            setTotalPages(response?.totalPages ?? 0);
            setStatus("ready");
        } catch (err) {
            if (replace) {
                setErrorMessage(getApiErrorMessage(err, "دریافت تاریخچه ناموفق بود"));
                setStatus("error");
            } else {
                // Loading more failed — keep the already-visible list and
                // report the failure transiently, like the other pages do
                toast.error(getApiErrorMessage(err, "دریافت موارد بیشتر ناموفق بود"));
            }
        } finally {
            setIsLoadingMore(false);
        }
    };

    useEffect(() => {
        fetchPage(FIRST_PAGE, { replace: true });
    }, []);

    // Open one history document in the speech player — the same storage
    // contract the camera capture flow uses (see useDocumentToSpeech):
    //   1) GET /ocr/{ocrId}         → the stored document text
    //   2) POST /tts                → speech for that text (with ocrId linked)
    //   3) GET /tts/{ttsId}/timeline → audioUrl + per-sentence timings
    const handleOpenDocument = async (item) => {
        if (openingId) return;
        setOpeningId(item.ocrId);

        try {
            const ocr = await ocrService.getById(item.ocrId);
            const text = ocr?.text || "";

            const tts = await ttsService.create({ text, ocrId: item.ocrId });
            const timeline = await ttsService.getTimeline(tts.ttsId);

            localStorage.setItem(CAPTURED_TEXT_KEY, text);
            localStorage.setItem(
                CAPTURED_PIPELINE_KEY,
                JSON.stringify({
                    ...timeline,
                    audioUrl: timeline?.audioUrl || tts?.timedAudioUrl,
                }),
            );

            navigate("/player");
            // No setState after navigate — the page is transitioning
        } catch (err) {
            toast.error(getApiErrorMessage(err, "بازکردن سند ناموفق بود"));
            setOpeningId(null);
        }
    };

    const handleOpenRename = (item) => {
        setRenameItem(item);
        setRenameValue(item.title || "");
    };

    // Real API call: PATCH /history/{ocrId}/title (see historyService)
    const handleRenameSave = async () => {
        const title = renameValue.trim();
        if (!renameItem || isSavingTitle) return;

        if (!title) {
            toast.error("عنوان نمی‌تواند خالی باشد.");
            return;
        }

        setIsSavingTitle(true);
        try {
            const updated = await historyService.rename(renameItem.ocrId, title);

            // The backend answers the updated item — merge it into the row
            setItems((prev) =>
                prev.map((it) => (it.ocrId === renameItem.ocrId ? { ...it, ...updated } : it)),
            );
            setRenameItem(null);
            toast.success("عنوان سند با موفقیت تغییر کرد.", { duration: 2000 });
        } catch (err) {
            toast.error(getApiErrorMessage(err, "تغییر عنوان ناموفق بود"));
        } finally {
            setIsSavingTitle(false);
        }
    };

    const hasMore = status === "ready" && page < totalPages;

    return (
        <div className="flex h-full w-full flex-1 flex-col gap-4">
            {/* Loading — initial fetch */}
            {status === "loading" && (
                <div className="flex flex-1 flex-col items-center justify-center gap-3">
                    <span className="loading loading-spinner loading-lg text-amber-400"></span>
                    <p className="text-sm font-medium text-slate-400">
                        در حال دریافت تاریخچه...
                    </p>
                </div>
            )}

            {/* Error — initial fetch failed */}
            {status === "error" && (
                <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-red-400">
                        <MdErrorOutline size={"2rem"} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <h2 className="text-lg font-bold text-slate-50">
                            دریافت تاریخچه ناموفق بود
                        </h2>
                        <p className="max-w-64 text-sm leading-relaxed text-slate-400">
                            {errorMessage}
                        </p>
                    </div>
                    <button type="button" onClick={() => fetchPage(FIRST_PAGE, { replace: true })}
                        className="flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-6 py-3 text-base font-bold text-cyan-400 transition select-none active:scale-[0.98]">
                        <MdRefresh size={"1.25rem"} />
                        تلاش مجدد
                    </button>
                </div>
            )}

            {/* Ready — empty history */}
            {status === "ready" && items.length === 0 && (
                <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-amber-300">
                        <MdOutlineHistory size={"2rem"} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <h2 className="text-lg font-bold text-slate-50">
                            هنوز سندی ثبت نشده است
                        </h2>
                        <p className="max-w-64 text-sm leading-relaxed text-slate-400">
                            اسنادی که تصویربرداری می‌کنید، اینجا برایتان نگه‌داری می‌شوند
                        </p>
                    </div>
                </div>
            )}

            {/* Ready — history list */}
            {status === "ready" && items.length > 0 && (
                <div className="flex w-full flex-col gap-2">
                    {items.map((item) => (
                        <HistoryListItem
                            key={item.ocrId}
                            title={item.title}
                            fileName={item.inputOriginalFileName}
                            createdAtLabel={formatCreatedAt(item.createdAt)}
                            isBusy={openingId === item.ocrId}
                            onClick={() => handleOpenDocument(item)}
                            onRename={() => handleOpenRename(item)}
                        />
                    ))}
                </div>
            )}

            {/* Pagination — more pages left on the backend */}
            {hasMore && (
                <button type="button" onClick={() => fetchPage(page + 1)} disabled={isLoadingMore}
                    className="mt-auto flex w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3.5 text-base font-bold text-cyan-400 transition select-none active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60">
                    {isLoadingMore && <span className="loading loading-spinner loading-md"></span>}
                    نمایش موارد بیشتر
                </button>
            )}

            {/* Rename dialog — PATCH /history/{ocrId}/title */}
            <Dialog open={!!renameItem} onOpenChange={(open) => !open && setRenameItem(null)}>
                <DialogContent dir="rtl"
                    className="max-w-sm border-slate-800 bg-slate-900 text-slate-50">
                    <DialogHeader>
                        <DialogTitle className="text-right text-slate-50">
                            تغییر عنوان سند
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex w-full flex-col gap-1.5">
                        <label htmlFor="history-title" className="text-base font-bold text-slate-100">
                            عنوان
                        </label>
                        <Input id="history-title" dir="rtl" value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleRenameSave()}
                            maxLength={TITLE_MAX_LENGTH} disabled={isSavingTitle}
                            placeholder="عنوان سند را وارد کنید"
                            className="h-10 rounded-xl border-slate-800 bg-slate-900 px-3 text-sm font-bold text-slate-100" />
                    </div>
                    <DialogFooter className="flex flex-row gap-2">
                        <button type="button" onClick={() => setRenameItem(null)} disabled={isSavingTitle}
                            className="flex h-11 flex-1 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-base font-bold text-slate-300 transition active:scale-[0.98] disabled:opacity-50">
                            انصراف
                        </button>
                        <button type="button" onClick={handleRenameSave}
                            disabled={isSavingTitle || !renameValue.trim()}
                            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-cyan-400 text-base font-bold text-slate-900 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-gray-500 disabled:text-gray-800">
                            {isSavingTitle && <span className="loading loading-spinner loading-md"></span>}
                            ذخیره
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
