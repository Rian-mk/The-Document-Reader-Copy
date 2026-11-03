export const DEFAULT_QUALITY_OPTIONS = {
    step: 2,
    darkMeanBelow: 45,
    glareRatioAbove: 0.055,
    blurVarianceBelow: 55,
};

export function assessImageQuality(imageData, userOptions = {}) {
    const opts = { ...DEFAULT_QUALITY_OPTIONS, ...userOptions };
    const { data, width, height } = imageData;
    const step = Math.max(1, opts.step | 0);

    const gw = Math.floor(width / step);
    const gh = Math.floor(height / step);
    if (gw < 8 || gh < 8) {
        return { isDark: false, hasGlare: false, isBlurry: false, meanLuma: 0, glareRatio: 0, blurScore: Infinity };
    }

    const gray = new Float32Array(gw * gh);
    let sum = 0;
    let bright = 0;

    for (let y = 0; y < gh; y++) {
        for (let x = 0; x < gw; x++) {
            const j = ((y * step) * width + x * step) * 4;
            const r = data[j], g = data[j + 1], b = data[j + 2];
            const luma = 0.299 * r + 0.587 * g + 0.114 * b;
            gray[y * gw + x] = luma;
            sum += luma;
            if (luma > 244 && Math.max(r, g, b) - Math.min(r, g, b) < 12) bright++;
        }
    }

    const total = gw * gh;
    const meanLuma = sum / total;
    const glareRatio = bright / total;

    let lapSum = 0;
    let lapSqSum = 0;
    let n = 0;
    for (let y = 1; y < gh - 1; y++) {
        for (let x = 1; x < gw - 1; x++) {
            const i = y * gw + x;
            const lap = 4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - gw] - gray[i + gw];
            lapSum += lap;
            lapSqSum += lap * lap;
            n++;
        }
    }
    const mean = lapSum / n;
    const blurScore = lapSqSum / n - mean * mean;

    return {
        meanLuma,
        glareRatio,
        blurScore,
        isDark: meanLuma < opts.darkMeanBelow,
        hasGlare: glareRatio > opts.glareRatioAbove,
        isBlurry: blurScore < opts.blurVarianceBelow,
    };
}