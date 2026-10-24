// =====================================================================
// Label QR barang — isi kode, pencocokan ke item, dan pembuatan lembar
// label A4 siap cetak.
//
// Isi QR: "FRN1:<id barang>". Awalan FRN1 memastikan QR lain (kemasan,
// struk, dll.) tidak pernah dianggap label barang.
// =====================================================================
import QRCode from "qrcode";

export const LABEL_PREFIX = "FRN1:";

export const labelCodeFor = (item) => LABEL_PREFIX + item.id;

// Kode → id barang yang tertulis di label (atau null kalau bukan label kita).
export function parseLabel(text) {
  const t = String(text || "").trim();
  return t.startsWith(LABEL_PREFIX) && t.length > LABEL_PREFIX.length ? t.slice(LABEL_PREFIX.length) : null;
}

// Kode → barang. Cocok kalau id-nya sama, atau kalau label lama sudah
// dihubungkan ke barang ini (item.labelCodes) setelah barang aslinya dihapus.
export function resolveLabel(text, items) {
  const id = parseLabel(text);
  if (!id) return null;
  return items.find((i) => i.id === id) || items.find((i) => Array.isArray(i.labelCodes) && i.labelCodes.includes(text)) || null;
}

// ---------------------------------------------------------------------
// Lembar label A4
// ---------------------------------------------------------------------
export const LABEL_SIZES = [
  { key: "s", label: "Kecil", sub: "QR 2,5 cm · 30/lembar", qr: 2.5, cellW: 3.6, cellH: 4.2 },
  { key: "m", label: "Sedang", sub: "QR 3,5 cm · 20/lembar", qr: 3.5, cellW: 4.6, cellH: 5.3 },
  { key: "l", label: "Besar", sub: "QR 5 cm · 9/lembar", qr: 5, cellW: 6.2, cellH: 7.0 },
];

const A4 = { w: 21, h: 29.7 };
const MARGIN = 1; // cm
const DPI = 200; // cukup tajam untuk dicetak, ukuran file tetap ringan
const PX_PER_CM = DPI / 2.54;

export function labelsPerPage(sizeKey) {
  const s = LABEL_SIZES.find((x) => x.key === sizeKey) || LABEL_SIZES[1];
  const cols = Math.floor((A4.w - MARGIN * 2) / s.cellW);
  const rows = Math.floor((A4.h - MARGIN * 2) / s.cellH);
  return { cols, rows, per: cols * rows, size: s };
}

function drawQR(ctx, text, x, y, size) {
  const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
  const n = qr.modules.size;
  const quiet = 2; // modul kosong di sekeliling — wajib supaya mudah terbaca
  const unit = size / (n + quiet * 2);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = "#000000";
  const data = qr.modules.data;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (data[r * n + c]) {
        // Dibulatkan ke piksel supaya tepi modul tetap tajam saat dicetak.
        const px = Math.floor(x + (c + quiet) * unit);
        const py = Math.floor(y + (r + quiet) * unit);
        ctx.fillRect(px, py, Math.ceil(x + (c + quiet + 1) * unit) - px, Math.ceil(y + (r + quiet + 1) * unit) - py);
      }
    }
  }
}

function wrapLines(ctx, text, maxW, maxLines) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? cur + " " + w : w;
    if (ctx.measureText(test).width <= maxW) cur = test;
    else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const keep = lines.slice(0, maxLines);
    let last = keep[maxLines - 1];
    while (last.length > 1 && ctx.measureText(last + "…").width > maxW) last = last.slice(0, -1);
    keep[maxLines - 1] = last + "…";
    return keep;
  }
  // Satu kata yang terlalu panjang dipotong juga.
  return lines.map((l) => {
    if (ctx.measureText(l).width <= maxW) return l;
    let s = l;
    while (s.length > 1 && ctx.measureText(s + "…").width > maxW) s = s.slice(0, -1);
    return s + "…";
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Menghasilkan canvas per halaman A4 berisi label untuk `items`.
export async function renderLabelPages(items, sizeKey, font = "Outfit, system-ui, sans-serif") {
  const { cols, rows, per, size } = labelsPerPage(sizeKey);
  try {
    if (document.fonts && document.fonts.load) await document.fonts.load(`700 20px ${font}`);
  } catch {
    /* font cadangan tetap bisa dipakai */
  }
  const W = Math.round(A4.w * PX_PER_CM);
  const H = Math.round(A4.h * PX_PER_CM);
  const cw = size.cellW * PX_PER_CM;
  const ch = size.cellH * PX_PER_CM;
  const gridW = cols * cw;
  const gridH = rows * ch;
  const ox = (W - gridW) / 2;
  const oy = (H - gridH) / 2;
  const qrPx = size.qr * PX_PER_CM;
  const pages = [];

  for (let p = 0; p * per < items.length; p++) {
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, W, H);
    const slice = items.slice(p * per, p * per + per);
    slice.forEach((item, i) => {
      const cx = ox + (i % cols) * cw;
      const cy = oy + Math.floor(i / cols) * ch;
      const pad = 0.12 * PX_PER_CM;
      // Garis potong tipis putus-putus
      ctx.save();
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = "#C9C5B8";
      ctx.lineWidth = 2;
      roundRect(ctx, cx + pad, cy + pad, cw - pad * 2, ch - pad * 2, 0.35 * PX_PER_CM);
      ctx.stroke();
      ctx.restore();

      const qx = cx + (cw - qrPx) / 2;
      const qy = cy + 0.3 * PX_PER_CM;
      drawQR(ctx, labelCodeFor(item), qx, qy, qrPx);

      const fontPx = Math.max(16, Math.round(size.qr * 0.13 * PX_PER_CM));
      ctx.fillStyle = "#1E1E1A";
      ctx.font = `700 ${fontPx}px ${font}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const lines = wrapLines(ctx, item.name, cw - 0.5 * PX_PER_CM, 2);
      const textTop = qy + qrPx + 0.06 * PX_PER_CM;
      lines.forEach((l, li) => ctx.fillText(l, cx + cw / 2, textTop + li * fontPx * 1.15));
    });
    pages.push(canvas);
  }
  return pages;
}

const canvasBlob = (c) => new Promise((res) => c.toBlob((b) => res(b), "image/png"));

export async function pagesToFiles(pages) {
  const stamp = new Date().toISOString().slice(0, 10);
  const files = [];
  for (let i = 0; i < pages.length; i++) {
    const blob = await canvasBlob(pages[i]);
    files.push(new File([blob], `label-qr-${stamp}${pages.length > 1 ? `-${i + 1}` : ""}.png`, { type: "image/png" }));
  }
  return files;
}

// Cetak lewat iframe tersembunyi: tiap halaman tepat satu lembar A4.
export function printPages(pages) {
  return new Promise((resolve) => {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    Object.assign(iframe.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0" });
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument;
    const imgs = pages.map((c) => `<img src="${c.toDataURL("image/png")}" />`).join("");
    doc.open();
    doc.write(
      `<!doctype html><html><head><title>Label QR</title><style>@page{size:A4;margin:0}html,body{margin:0;padding:0}img{display:block;width:210mm;height:297mm;page-break-after:always;break-after:page}img:last-child{page-break-after:auto;break-after:auto}</style></head><body>${imgs}</body></html>`
    );
    doc.close();
    const go = () => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } finally {
        setTimeout(() => {
          iframe.remove();
          resolve();
        }, 1500);
      }
    };
    const all = Array.from(doc.images);
    let left = all.length;
    if (!left) go();
    all.forEach((im) => {
      if (im.complete) {
        if (--left === 0) go();
      } else im.onload = im.onerror = () => --left === 0 && go();
    });
  });
}

// Bagikan (HP: bisa simpan ke galeri / kirim ke aplikasi cetak), atau
// unduh kalau berbagi file tidak didukung.
export async function shareOrDownload(files) {
  try {
    if (navigator.canShare && navigator.canShare({ files })) {
      await navigator.share({ files, title: "Label QR" });
      return "shared";
    }
  } catch (e) {
    if (e && e.name === "AbortError") return "cancelled";
  }
  for (const f of files) {
    const url = URL.createObjectURL(f);
    const a = document.createElement("a");
    a.href = url;
    a.download = f.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  return "downloaded";
}
