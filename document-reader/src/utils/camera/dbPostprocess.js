// dbPostprocess.js
//
// Post-processing for PaddleOCR-style detection models (PP-OCRv4/v5 "det").
// The model outputs a single-channel probability map the same size as the
// input image: each pixel is "how likely is this a text pixel". This module
// turns that map into a list of quadrilateral text boxes.
//
// Requires OpenCV.js to be loaded globally as `cv` before calling detectBoxes.
// <script src="https://cdnjs.cloudflare.com/ajax/libs/opencv.js/4.9.0/opencv.js"></script>
// (self-hosting it is fine too — just make sure `cv.onRuntimeInitialized` has fired)

export const DEFAULT_DB_OPTIONS = {
    probThreshold: 0.3,
    boxThreshold: 0.55,
    minBoxSize: 4,
    unclipRatio: 1.8,
};

/**
 * Decode a raw probability map (Float32Array, length = width*height) into
 * text boxes, in the *same pixel coordinates as the map itself*.
 * Mapping back to the original video-frame coordinates happens in the caller,
 * since that depends on how you resized/padded the frame before inference.
 *
 * @param {Float32Array} probMap
 * @param {number} width
 * @param {number} height
 * @param {{probThreshold:number, boxThreshold:number, minBoxSize:number, unclipRatio:number}} [opts]
 * @returns {{points:{x:number,y:number}[], score:number}[]}
 */
export function detectBoxes(
    probMap,
    width,
    height,
    opts = DEFAULT_DB_OPTIONS
) {
    // 1. Wrap the probability map as a single-channel float Mat, then binarize.
    const probMat = cv.matFromArray(height, width, cv.CV_32FC1, probMap);
    const binMat = new cv.Mat();
    cv.threshold(probMat, binMat, opts.probThreshold, 1, cv.THRESH_BINARY);

    const bin8u = new cv.Mat();
    binMat.convertTo(bin8u, cv.CV_8UC1, 255);

    // 2. Find connected components (each is a candidate text region).
    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    cv.findContours(bin8u, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

    const boxes = [];

    for (let i = 0; i < contours.size(); i++) {
        const contour = contours.get(i);
        const rect = cv.minAreaRect(contour);

        const shortSide = Math.min(rect.size.width, rect.size.height);
        if (shortSide < opts.minBoxSize) {
            contour.delete();
            continue;
        }

        // Mean probability inside the *original* (un-shrunk) contour region.
        const mask = cv.Mat.zeros(height, width, cv.CV_8UC1);
        const single = new cv.MatVector();
        single.push_back(contour);
        cv.drawContours(mask, single, 0, new cv.Scalar(255), -1);
        const meanScore = cv.mean(probMat, mask)[0];
        mask.delete();
        single.delete();

        if (meanScore < opts.boxThreshold) {
            contour.delete();
            continue;
        }

        // DB shrinks text regions during training, so expand ("unclip") the box
        // back out to approximate the true text extent.
        const expanded = unclipRect(rect, opts.unclipRatio);
        boxes.push({ points: expanded, score: meanScore });

        contour.delete();
    }

    probMat.delete();
    binMat.delete();
    bin8u.delete();
    contours.delete();
    hierarchy.delete();

    return boxes;
}

/**
 * Expand a cv.RotatedRect outward from its center by unclipRatio.
 * @param {any} rect
 * @param {number} unclipRatio
 * @returns {{x:number,y:number}[]}
 */
function unclipRect(rect, unclipRatio) {
    const scale = Math.sqrt(unclipRatio);
    const w = rect.size.width * scale;
    const h = rect.size.height * scale;
    const cx = rect.center.x;
    const cy = rect.center.y;
    const angleRad = (rect.angle * Math.PI) / 180;
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);

    const corners = [
        { x: -w / 2, y: -h / 2 },
        { x: w / 2, y: -h / 2 },
        { x: w / 2, y: h / 2 },
        { x: -w / 2, y: h / 2 },
    ];

    return corners.map(({ x, y }) => ({
        x: cx + x * cos - y * sin,
        y: cy + x * sin + y * cos,
    }));
}

/**
 * Merge a list of text boxes into a single overall bounding rectangle.
 * @param {{points:{x:number,y:number}[], score:number}[]} boxes
 * @returns {{minX:number, minY:number, maxX:number, maxY:number}|null}
 */
export function mergeToOverallBox(boxes) {
    if (boxes.length === 0) return null;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const box of boxes) {
        for (const p of box.points) {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        }
    }
    return { minX, minY, maxX, maxY };
}
