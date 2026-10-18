import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

export const DEBUG_SAVE_FRAMES = true;

const DEBUG_FOLDER = 'text-camera-debug';
let folderReady = false;

function timestamp() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}_${pad(d.getMilliseconds()).padStart(3, '0')}`;
}

async function ensureFolder() {
    if (folderReady) return;
    try {
        await Filesystem.mkdir({ path: DEBUG_FOLDER, directory: Directory.Documents, recursive: true });
    } catch (err) {
    }
    folderReady = true;
}

export async function saveDebugFrame(base64, label, width, height) {
    if (!DEBUG_SAVE_FRAMES || !base64) return;
    try {
        await ensureFolder();
        const fileName = `${label}_${width}x${height}_${timestamp()}.jpg`;
        await Filesystem.writeFile({
            path: `${DEBUG_FOLDER}/${fileName}`,
            data: base64,
            directory: Directory.Documents,
        });
    } catch (err) {
        console.warn('[debugCapture] save failed:', err);
    }
}

export async function saveDebugLog(label, data) {
    if (!DEBUG_SAVE_FRAMES) return;
    try {
        await ensureFolder();
        const fileName = `${label}_${timestamp()}.json`;
        await Filesystem.writeFile({
            path: `${DEBUG_FOLDER}/${fileName}`,
            data: JSON.stringify(data, null, 2),
            directory: Directory.Documents,
            encoding: Encoding.UTF8,
        });
    } catch (err) {
        console.warn('[debugCapture] log save failed:', err);
    }
}

export async function saveDebugFrameFromDataUrl(dataUrl, label) {
    if (!DEBUG_SAVE_FRAMES || !dataUrl) return;
    try {
        const commaIdx = dataUrl.indexOf(',');
        const base64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
        const blob = await (await fetch(dataUrl)).blob();
        const bitmap = await createImageBitmap(blob);
        const width = bitmap.width;
        const height = bitmap.height;
        bitmap.close?.();
        await saveDebugFrame(base64, label, width, height);
    } catch (err) {
        console.warn('[debugCapture] save-from-dataurl failed:', err);
    }
}
