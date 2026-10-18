import * as ort from 'onnxruntime-web';

const PAD = 32;
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];

function round32(value) {
    return Math.max(PAD, Math.round(value / PAD) * PAD);
}

export function planInputSize(frameWidth, frameHeight, longSide = 736) {
    const target = round32(longSide);
    const scale = target / Math.max(frameWidth, frameHeight);
    return {
        width: round32(frameWidth * scale),
        height: round32(frameHeight * scale),
    };
}

export class FramePreprocessor {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.width = 0;
        this.height = 0;
        this.floatData = null;
    }

    _ensure(width, height) {
        if (this.width === width && this.height === height && this.canvas) return;

        this.canvas =
            typeof OffscreenCanvas !== 'undefined'
                ? new OffscreenCanvas(width, height)
                : Object.assign(document.createElement('canvas'), { width, height });
        this.canvas.width = width;
        this.canvas.height = height;
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true, alpha: false });
        this.width = width;
        this.height = height;
        this.floatData = new Float32Array(3 * width * height);
    }

    toTensor(source, frameWidth, frameHeight, longSide = 736) {
        const { width, height } = planInputSize(frameWidth, frameHeight, longSide);
        this._ensure(width, height);

        this.ctx.drawImage(source, 0, 0, width, height);
        const imageData = this.ctx.getImageData(0, 0, width, height);
        const { data } = imageData;

        const plane = width * height;
        const out = this.floatData;
        for (let i = 0; i < plane; i++) {
            const j = i * 4;
            out[i] = (data[j] / 255 - MEAN[0]) / STD[0];
            out[plane + i] = (data[j + 1] / 255 - MEAN[1]) / STD[1];
            out[2 * plane + i] = (data[j + 2] / 255 - MEAN[2]) / STD[2];
        }

        return {
            tensor: new ort.Tensor('float32', out, [1, 3, height, width]),
            width,
            height,
            imageData,
        };
    }
}