// =====================================================================
// Pembaca label QR — berjalan di Web Worker supaya layar tetap mulus
// selama gambar diproses.
//
// Memakai ZXing (WebAssembly) yang bisa membaca BANYAK QR sekaligus dalam
// satu gambar (tanpa batas jumlah). Untuk foto, gambar dibaca dua kali:
//   1. apa adanya
//   2. setelah dipertajam (unsharp mask) — menyelamatkan label yang agak
//      buram karena goyang/fokus kurang pas
// Untuk foto besar ditambah satu putaran ukuran setengah. Hasil semua
// putaran digabung (kode yang sama hanya dihitung sekali).
// =====================================================================
import { prepareZXingModule, readBarcodes } from "zxing-wasm/reader";
import wasmUrl from "zxing-wasm/reader/zxing_reader.wasm?url";

let ready = null;
function init() {
  if (!ready) {
    ready = prepareZXingModule({
      overrides: { locateFile: (path, prefix) => (path.endsWith(".wasm") ? wasmUrl : prefix + path) },
      fireImmediately: true,
    });
  }
  return ready;
}

const BASE = { formats: ["QRCode"], maxNumberOfSymbols: 255, tryHarder: true, tryRotate: true, tryInvert: false };

function bitmapToImageData(bitmap, maxSide) {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close && bitmap.close();
  return ctx.getImageData(0, 0, w, h);
}

// Box blur 1 arah dengan jumlah berjalan (O(n), tidak tergantung radius).
function boxBlurH(src, dst, w, h, r) {
  const len = r * 2 + 1;
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let sum = 0;
    for (let x = -r; x <= r; x++) sum += src[row + Math.min(w - 1, Math.max(0, x))];
    for (let x = 0; x < w; x++) {
      dst[row + x] = (sum / len) | 0;
      sum += src[row + Math.min(w - 1, x + r + 1)] - src[row + Math.max(0, x - r)];
    }
  }
}
function boxBlurV(src, dst, w, h, r) {
  const len = r * 2 + 1;
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let y = -r; y <= r; y++) sum += src[Math.min(h - 1, Math.max(0, y)) * w + x];
    for (let y = 0; y < h; y++) {
      dst[y * w + x] = (sum / len) | 0;
      sum += src[Math.min(h - 1, y + r + 1) * w + x] - src[Math.max(0, y - r) * w + x];
    }
  }
}

function sharpened(img) {
  const { width: w, height: h, data } = img;
  const n = w * h;
  const gray = new Uint8ClampedArray(n);
  for (let i = 0, j = 0; i < n; i++, j += 4) gray[i] = (data[j] * 77 + data[j + 1] * 150 + data[j + 2] * 29) >> 8;
  const a = new Uint8ClampedArray(n);
  const b = new Uint8ClampedArray(n);
  const r = Math.max(2, Math.min(6, Math.round(Math.max(w, h) / 1000)));
  // Tiga kali box blur ≈ Gaussian blur
  boxBlurH(gray, a, w, h, r);
  boxBlurV(a, b, w, h, r);
  boxBlurH(b, a, w, h, r);
  boxBlurV(a, b, w, h, r);
  const out = new Uint8ClampedArray(n * 4);
  const amount = 1.6;
  for (let i = 0, j = 0; i < n; i++, j += 4) {
    const v = gray[i] + amount * (gray[i] - b[i]);
    const c = v < 0 ? 0 : v > 255 ? 255 : v;
    out[j] = out[j + 1] = out[j + 2] = c;
    out[j + 3] = 255;
  }
  return new ImageData(out, w, h);
}

function halfSize(img) {
  const w = Math.max(1, img.width >> 1);
  const h = Math.max(1, img.height >> 1);
  const src = img.data;
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      const i1 = (y * 2 * img.width + x * 2) * 4;
      const i2 = i1 + img.width * 4;
      for (let k = 0; k < 3; k++) out[o + k] = (src[i1 + k] + src[i1 + 4 + k] + src[i2 + k] + src[i2 + 4 + k]) >> 2;
      out[o + 3] = 255;
    }
  }
  return new ImageData(out, w, h);
}

function collect(found, results, scale) {
  for (const r of results) {
    if (!r.isValid || !r.text || found.has(r.text)) continue;
    const p = r.position;
    found.set(r.text, {
      text: r.text,
      pts: [p.topLeft, p.topRight, p.bottomRight, p.bottomLeft].map((q) => [q.x * scale, q.y * scale]),
    });
  }
}

self.onmessage = async (e) => {
  const { id, kind } = e.data;
  try {
    await init();
    if (kind === "warmup") {
      self.postMessage({ id, ok: true, codes: [] });
      return;
    }
    const img = e.data.bitmap ? bitmapToImageData(e.data.bitmap, e.data.maxSide || 4096) : new ImageData(new Uint8ClampedArray(e.data.buffer), e.data.width, e.data.height);
    const found = new Map();
    collect(found, await readBarcodes(img, BASE), 1);
    if (kind === "photo") {
      collect(found, await readBarcodes(sharpened(img), BASE), 1);
      if (Math.max(img.width, img.height) > 2400) collect(found, await readBarcodes(halfSize(img), BASE), 2);
    }
    self.postMessage({ id, ok: true, codes: [...found.values()], width: img.width, height: img.height });
  } catch (err) {
    self.postMessage({ id, ok: false, error: String((err && err.message) || err) });
  }
};
