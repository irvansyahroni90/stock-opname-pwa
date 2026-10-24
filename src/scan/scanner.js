// =====================================================================
// Jembatan ke worker pembaca QR. Satu worker dipakai bersama; dibuat saat
// pertama kali dibutuhkan (jadi aplikasi tetap ringan saat dibuka).
// =====================================================================
let worker = null;
let seq = 0;
const pending = new Map();

const canOffscreen = typeof OffscreenCanvas !== "undefined" && typeof createImageBitmap === "function";

function getWorker() {
  if (worker) return worker;
  worker = new Worker(new URL("./scanWorker.js", import.meta.url), { type: "module" });
  worker.onmessage = (e) => {
    const p = pending.get(e.data.id);
    if (!p) return;
    pending.delete(e.data.id);
    if (e.data.ok) p.resolve(e.data);
    else p.reject(new Error(e.data.error || "Gagal membaca gambar"));
  };
  worker.onerror = (e) => {
    const err = new Error((e && e.message) || "Pembaca label gagal dimuat");
    pending.forEach((p) => p.reject(err));
    pending.clear();
    worker && worker.terminate();
    worker = null;
  };
  return worker;
}

function call(msg, transfer = []) {
  const id = ++seq;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    getWorker().postMessage({ ...msg, id }, transfer);
  });
}

// Panggil saat layar scan dibuka: mesin pembaca sudah siap saat dipakai.
export function warmupScanner() {
  return call({ kind: "warmup" }).catch(() => {});
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Gambar tidak bisa dibuka"));
    img.src = url;
  });
}

function drawToImageData(source, w0, h0, maxSide) {
  const scale = Math.min(1, maxSide / Math.max(w0, h0));
  const w = Math.max(1, Math.round(w0 * scale));
  const h = Math.max(1, Math.round(h0 * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(source, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}

// Foto (file dari kamera/galeri) → { codes, width, height, url }
// `url` dipakai untuk menampilkan fotonya dengan tanda di tiap label.
export async function scanPhoto(file, maxSide = 4096) {
  const url = URL.createObjectURL(file);
  let res;
  if (canOffscreen) {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      res = await call({ kind: "photo", bitmap, maxSide }, [bitmap]);
    } catch {
      res = null;
    }
  }
  if (!res) {
    const img = await loadImage(url);
    const data = drawToImageData(img, img.naturalWidth, img.naturalHeight, maxSide);
    res = await call({ kind: "photo", buffer: data.data.buffer, width: data.width, height: data.height }, [data.data.buffer]);
  }
  return { codes: res.codes, width: res.width, height: res.height, url };
}

// Satu bingkai dari video kamera → { codes, width, height }
export async function scanFrame(video, maxSide = 1920) {
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) return { codes: [], width: 0, height: 0 };
  if (canOffscreen) {
    try {
      const bitmap = await createImageBitmap(video);
      return await call({ kind: "frame", bitmap, maxSide }, [bitmap]);
    } catch {
      /* lanjut ke cara biasa */
    }
  }
  const data = drawToImageData(video, w, h, maxSide);
  return call({ kind: "frame", buffer: data.data.buffer, width: data.width, height: data.height }, [data.data.buffer]);
}
