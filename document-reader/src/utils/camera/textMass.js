export const DEFAULT_TEXT_MASS_OPTIONS = {
    cellSize: 16,
    cellTextThreshold: 0.22,
    minRegionRatio: 0.015,
    keepRegionRatio: 0.22,
    borderBandRatio: 0.055,
    edgeRunThreshold: 0.12,
};

export function analyzeTextMass(probMap, width, height, userOptions = {}) {
    const opts = { ...DEFAULT_TEXT_MASS_OPTIONS, ...userOptions };

    const cell = Math.max(4, Math.round(opts.cellSize));
    const gw = Math.max(4, Math.ceil(width / cell));
    const gh = Math.max(4, Math.ceil(height / cell));

    const sum = new Float32Array(gw * gh);
    const count = new Uint32Array(gw * gh);

    for (let y = 0; y < height; y++) {
        const gy = (y / cell) | 0;
        const rowOffset = y * width;
        const gridRow = gy * gw;
        for (let x = 0; x < width; x++) {
            const gi = gridRow + ((x / cell) | 0);
            sum[gi] += probMap[rowOffset + x];
            count[gi] += 1;
        }
    }

    const mass = new Float32Array(gw * gh);
    const text = new Uint8Array(gw * gh);
    for (let i = 0; i < mass.length; i++) {
        const m = count[i] ? sum[i] / count[i] : 0;
        mass[i] = m;
        text[i] = m >= opts.cellTextThreshold ? 1 : 0;
    }

    const emptyEdges = { left: 0, right: 0, top: 0, bottom: 0 };
    const emptyResult = {
        hasText: false,
        coverage: 0,
        bbox: null,
        bboxArea: 0,
        center: null,
        edgeRun: { ...emptyEdges },
        edgeMass: { ...emptyEdges },
        angleDeg: null,
        grid: { w: gw, h: gh, text, mass },
        textCellCount: 0,
    };

    const dilated = dilate(text, gw, gh);
    const { labels, sizes } = labelRegions(dilated, gw, gh);
    if (sizes.length === 0) return emptyResult;

    let largest = 0;
    for (let i = 1; i < sizes.length; i++) if (sizes[i] > sizes[largest]) largest = i;

    const minRegionCells = Math.max(3, Math.round(opts.minRegionRatio * gw * gh));
    if (sizes[largest] < minRegionCells) return emptyResult;

    const keepThreshold = sizes[largest] * opts.keepRegionRatio;
    const kept = new Uint8Array(sizes.length);
    for (let i = 0; i < sizes.length; i++) kept[i] = sizes[i] >= keepThreshold ? 1 : 0;

    const inRegion = new Uint8Array(gw * gh);
    let textCellCount = 0;
    let minGx = gw, minGy = gh, maxGx = -1, maxGy = -1;
    let massTotal = 0;

    for (let i = 0; i < inRegion.length; i++) {
        if (!text[i]) continue;
        const label = labels[i];
        if (label < 0 || !kept[label]) continue;
        inRegion[i] = 1;
        textCellCount++;
        massTotal += mass[i];
        const gx = i % gw;
        const gy = (i / gw) | 0;
        if (gx < minGx) minGx = gx;
        if (gx > maxGx) maxGx = gx;
        if (gy < minGy) minGy = gy;
        if (gy > maxGy) maxGy = gy;
    }

    if (textCellCount < minRegionCells || maxGx < 0) return emptyResult;

    const bbox = {
        x0: minGx / gw,
        y0: minGy / gh,
        x1: (maxGx + 1) / gw,
        y1: (maxGy + 1) / gh,
    };
    const bboxArea = (bbox.x1 - bbox.x0) * (bbox.y1 - bbox.y0);

    const bandX = Math.max(1, Math.round(opts.borderBandRatio * gw));
    const bandY = Math.max(1, Math.round(opts.borderBandRatio * gh));

    const edgeRun = { left: 0, right: 0, top: 0, bottom: 0 };
    const edgeMass = { left: 0, right: 0, top: 0, bottom: 0 };

    let leftRun = 0, rightRun = 0;
    for (let gy = 0; gy < gh; gy++) {
        let l = 0, r = 0;
        for (let b = 0; b < bandX; b++) {
            if (inRegion[gy * gw + b]) l = 1;
            if (inRegion[gy * gw + (gw - 1 - b)]) r = 1;
        }
        leftRun += l;
        rightRun += r;
    }
    let topRun = 0, bottomRun = 0;
    for (let gx = 0; gx < gw; gx++) {
        let t = 0, b2 = 0;
        for (let b = 0; b < bandY; b++) {
            if (inRegion[b * gw + gx]) t = 1;
            if (inRegion[(gh - 1 - b) * gw + gx]) b2 = 1;
        }
        topRun += t;
        bottomRun += b2;
    }
    edgeRun.left = leftRun / gh;
    edgeRun.right = rightRun / gh;
    edgeRun.top = topRun / gw;
    edgeRun.bottom = bottomRun / gw;

    if (massTotal > 0) {
        let ml = 0, mr = 0, mt = 0, mb = 0;
        for (let i = 0; i < inRegion.length; i++) {
            if (!inRegion[i]) continue;
            const gx = i % gw;
            const gy = (i / gw) | 0;
            const m = mass[i];
            if (gx < bandX) ml += m;
            if (gx >= gw - bandX) mr += m;
            if (gy < bandY) mt += m;
            if (gy >= gh - bandY) mb += m;
        }
        edgeMass.left = ml / massTotal;
        edgeMass.right = mr / massTotal;
        edgeMass.top = mt / massTotal;
        edgeMass.bottom = mb / massTotal;
    }

    const angleDeg = estimateAngle(inRegion, gw, gh);

    return {
        hasText: true,
        coverage: textCellCount / (gw * gh),
        bbox,
        bboxArea,
        center: { x: (bbox.x0 + bbox.x1) / 2, y: (bbox.y0 + bbox.y1) / 2 },
        edgeRun,
        edgeMass,
        angleDeg,
        grid: { w: gw, h: gh, text: inRegion, mass },
        textCellCount,
    };
}

function dilate(src, gw, gh) {
    const out = new Uint8Array(src.length);
    for (let gy = 0; gy < gh; gy++) {
        for (let gx = 0; gx < gw; gx++) {
            const i = gy * gw + gx;
            if (src[i]) { out[i] = 1; continue; }
            if (gx > 0 && src[i - 1]) { out[i] = 1; continue; }
            if (gx < gw - 1 && src[i + 1]) { out[i] = 1; continue; }
            if (gy > 0 && src[i - gw]) { out[i] = 1; continue; }
            if (gy < gh - 1 && src[i + gw]) { out[i] = 1; continue; }
        }
    }
    return out;
}

function labelRegions(bin, gw, gh) {
    const labels = new Int32Array(bin.length).fill(-1);
    const sizes = [];
    const stack = new Int32Array(bin.length);

    for (let start = 0; start < bin.length; start++) {
        if (!bin[start] || labels[start] !== -1) continue;
        const label = sizes.length;
        let size = 0;
        let sp = 0;
        stack[sp++] = start;
        labels[start] = label;

        while (sp > 0) {
            const i = stack[--sp];
            size++;
            const gx = i % gw;
            const gy = (i / gw) | 0;

            if (gx > 0) { const n = i - 1; if (bin[n] && labels[n] === -1) { labels[n] = label; stack[sp++] = n; } }
            if (gx < gw - 1) { const n = i + 1; if (bin[n] && labels[n] === -1) { labels[n] = label; stack[sp++] = n; } }
            if (gy > 0) { const n = i - gw; if (bin[n] && labels[n] === -1) { labels[n] = label; stack[sp++] = n; } }
            if (gy < gh - 1) { const n = i + gw; if (bin[n] && labels[n] === -1) { labels[n] = label; stack[sp++] = n; } }
        }
        sizes.push(size);
    }
    return { labels, sizes };
}

function estimateAngle(inRegion, gw, gh) {
    let n = 0, sx = 0, sy = 0;
    for (let i = 0; i < inRegion.length; i++) {
        if (!inRegion[i]) continue;
        sx += i % gw;
        sy += (i / gw) | 0;
        n++;
    }
    if (n < 12) return null;
    const mx = sx / n, my = sy / n;

    let cxx = 0, cyy = 0, cxy = 0;
    for (let i = 0; i < inRegion.length; i++) {
        if (!inRegion[i]) continue;
        const dx = (i % gw) - mx;
        const dy = ((i / gw) | 0) - my;
        cxx += dx * dx;
        cyy += dy * dy;
        cxy += dx * dy;
    }
    cxx /= n; cyy /= n; cxy /= n;

    const tr = cxx + cyy;
    const det = cxx * cyy - cxy * cxy;
    const disc = Math.max(0, (tr * tr) / 4 - det);
    const l1 = tr / 2 + Math.sqrt(disc);
    const l2 = tr / 2 - Math.sqrt(disc);
    if (l2 <= 1e-6 || l1 / l2 < 1.6) return null;

    let deg = (Math.atan2(2 * cxy, cxx - cyy) / 2) * (180 / Math.PI);
    while (deg > 90) deg -= 180;
    while (deg < -90) deg += 180;
    if (deg > 45) deg -= 90;
    if (deg < -45) deg += 90;
    return deg;
}