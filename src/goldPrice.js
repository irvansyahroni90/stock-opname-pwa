// =====================================================================
// Harga emas otomatis.
//
// Sumber: Logam Mulia API (https://github.com/iamutaki/logam-mulia-api) —
// API publik gratis yang setiap hari mengambil harga dari situs resmi /
// toko emas di Indonesia (logammulia.com, Galeri24/Pegadaian, IndoGold,
// dll.) dan bisa diakses langsung dari browser.
//
// Ini BUKAN API resmi Antam. Kalau suatu hari API ini mati, aplikasi tetap
// jalan: memakai harga terakhir yang tersimpan, dan harga bisa diisi
// manual.
//
// Harga yang dipakai = harga per 1 gram dari tiap merek.
// =====================================================================

const API = "https://logam-mulia-api.iamutaki.workers.dev/api/prices";

// Tiap merek dicoba berurutan dari sumber pertama; kalau gagal / kosong,
// lanjut ke sumber berikutnya.
export const GOLD_BRANDS = [
  {
    key: "antam",
    label: "Antam",
    sources: [
      { source: "hargaemas-net", type: "Emas LM Batangan Antam", name: "Logam Mulia (Antam)" },
      { source: "logammulia", type: "Emas Batangan", name: "logammulia.com" },
      { source: "indogold", type: "Antam", name: "IndoGold" },
    ],
  },
  {
    key: "ubs",
    label: "UBS",
    sources: [
      { source: "galeri24", type: "UBS", name: "Galeri24" },
      { source: "indogold", type: "UBS", name: "IndoGold" },
    ],
  },
  { key: "galeri24", label: "Galeri24", sources: [{ source: "galeri24", type: "GALERI 24", name: "Galeri24" }] },
  { key: "lotus", label: "Lotus Archi", sources: [{ source: "galeri24", type: "LOTUS ARCHI", name: "Galeri24" }] },
  { key: "lainnya", label: "Lainnya", sources: [] },
];

export const BRAND_BY_KEY = Object.fromEntries(GOLD_BRANDS.map((b) => [b.key, b]));

export function isAutoBrand(key) {
  const b = BRAND_BY_KEY[key];
  return !!b && b.sources.length > 0;
}

// Tanggal hari ini menurut WIB, "YYYY-MM-DD".
export function todayWIB(d = new Date()) {
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
}

async function getJSON(url, ms = 12000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json || json.success === false || !Array.isArray(json.data)) throw new Error("Format data tidak dikenal");
    return json.data;
  } finally {
    clearTimeout(t);
  }
}

// "2026-10-01" tetap; timestamp penuh diubah ke tanggal WIB.
function dayOf(v) {
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = v ? new Date(v) : null;
  return d && !Number.isNaN(d.getTime()) ? todayWIB(d) : null;
}

const sameType = (a, b) => String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

// Satu baris 1 gram dari daftar harga sebuah sumber.
function pickOneGram(rows, type) {
  const row = rows.find((r) => sameType(r.materialType, type) && Number(r.weight) === 1 && String(r.material || "gold") === "gold");
  if (!row) return null;
  const s = num(row.sellPrice);
  if (!s) return null;
  return { s, b: num(row.buybackPrice), date: dayOf(row.recordedDate) || todayWIB() };
}

// Harga terbaru untuk beberapa merek sekaligus.
// Hasil: { antam: { s, b, date, source }, ubs: {...} } — merek yang gagal
// tidak ikut.
export async function fetchLatestPrices(brandKeys) {
  const wanted = [...new Set(brandKeys)].filter(isAutoBrand);
  const cache = new Map(); // source -> rows | Error
  const loadSource = async (source) => {
    if (!cache.has(source)) {
      cache.set(
        source,
        getJSON(`${API}/${encodeURIComponent(source)}`).catch((e) => e)
      );
    }
    return cache.get(source);
  };

  const out = {};
  await Promise.all(
    wanted.map(async (key) => {
      for (const src of BRAND_BY_KEY[key].sources) {
        const rows = await loadSource(src.source);
        if (rows instanceof Error) continue;
        const p = pickOneGram(rows, src.type);
        if (p) {
          out[key] = { ...p, source: src.name };
          return;
        }
      }
    })
  );
  return out;
}

// Riwayat harga harian (dipakai sekali per merek untuk mengisi grafik ke
// belakang). Hasil: { "2026-09-30": { s, b }, ... } atau null kalau gagal.
export async function fetchPriceHistory(brandKey) {
  const brand = BRAND_BY_KEY[brandKey];
  if (!brand) return null;
  for (const src of brand.sources) {
    try {
      const url = `${API}/${encodeURIComponent(src.source)}/history?weight=1&materialType=${encodeURIComponent(src.type)}&length=1000`;
      const rows = await getJSON(url, 15000);
      const days = {};
      rows.forEach((r) => {
        if (!sameType(r.materialType, src.type) || Number(r.weight) !== 1) return;
        const s = num(r.sellPrice);
        const day = dayOf(r.recordedDate);
        if (!s || !day) return;
        days[day] = { s, b: num(r.buybackPrice) };
      });
      if (Object.keys(days).length) return days;
    } catch {
      /* coba sumber berikutnya */
    }
  }
  return null;
}
