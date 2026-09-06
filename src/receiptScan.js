// Scan struk pakai Gemini (gratis lewat Google AI Studio).
// API key diambil dari environment variable VITE_GEMINI_API_KEY —
// JANGAN ditulis langsung di file ini.

const MODEL = "gemini-2.0-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export function hasApiKey() {
  return !!import.meta.env.VITE_GEMINI_API_KEY;
}

// Ubah File jadi base64 (tanpa prefix data:...).
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error("Gagal membaca file gambar."));
    reader.readAsDataURL(file);
  });
}

function buildPrompt({ categories, toBuyNames, aliases }) {
  const catList = categories.map((c) => `- ${c.id} = ${c.name}`).join("\n");
  const buyList = toBuyNames.length ? toBuyNames.map((n) => `- ${n}`).join("\n") : "(kosong)";
  const aliasList = Object.keys(aliases || {}).length
    ? Object.entries(aliases)
        .map(([k, v]) => `- "${k}" = "${v}"`)
        .join("\n")
    : "(belum ada)";

  return `Kamu membaca foto struk belanja Indonesia. Balas HANYA JSON valid, tanpa penjelasan, tanpa markdown, tanpa tanda kutip tiga.

Bentuk JSON yang diminta:
{
  "store": "nama toko atau null",
  "date": "YYYY-MM-DDTHH:mm:ss atau null",
  "items": [
    {
      "rawName": "nama persis seperti tertulis di struk",
      "name": "nama yang sudah dirapikan dan dipanjangkan",
      "qty": angka,
      "unitPrice": angka,
      "subtotal": angka,
      "discount": angka,
      "categoryId": "id kategori paling cocok dari daftar, atau null",
      "toBuyMatch": "nama persis dari daftar belanja yang cocok, atau null",
      "confident": true/false
    }
  ],
  "discountTotal": angka,
  "tax": angka,
  "serviceCharge": angka,
  "rounding": angka,
  "total": angka,
  "paymentMethod": "tunai/kartu/qris/transfer/null",
  "change": angka,
  "notes": "catatan singkat kalau ada bagian struk yang tidak terbaca, atau null"
}

Aturan:
1. Semua nilai uang berupa angka polos tanpa titik, koma, atau "Rp". Contoh: 15000.
2. Kalau suatu nilai tidak ada di struk, isi 0 untuk angka dan null untuk teks.
3. "rawName" harus persis seperti di struk. "name" adalah versi yang sudah dinormalkan jadi nama yang wajar dibaca manusia — panjangkan singkatan yang umum di ritel Indonesia. Contoh: "IND GRG RENDANG" jadi "Indomie Goreng Rendang", "ULTRAMILK UHT 1L" jadi "Ultramilk UHT 1 Liter", "MLK" jadi "Milk", "BISKT" jadi "Biskuit".
4. Set "confident": false untuk item yang tulisannya buram, terpotong, atau kamu ragu membacanya.
5. Pilih "categoryId" HANYA dari daftar kategori berikut (pakai id-nya, bukan namanya):
${catList}
6. "toBuyMatch" diisi kalau item itu kemungkinan besar sama dengan salah satu dari daftar belanja berikut, walaupun penulisannya berbeda. Kalau tidak ada yang cocok, isi null. Jangan memaksakan kecocokan.
Daftar belanja:
${buyList}
7. Padanan nama yang sudah pernah dipakai sebelumnya (gunakan ini kalau ketemu lagi):
${aliasList}
8. Baris yang bukan barang (subtotal, total, kembalian, terima kasih, nomor kasir, NPWP) jangan dimasukkan ke "items".
9. Kalau struknya difoto beberapa kali, gabungkan semua barang jadi satu daftar.`;
}

// Bersihkan output model dari pagar markdown kalau ada.
function extractJson(text) {
  let s = String(text).trim();
  s = s.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first === -1 || last === -1) throw new Error("Balasan AI tidak berisi JSON.");
  return JSON.parse(s.slice(first, last + 1));
}

function toNumber(v) {
  const n = Number(String(v ?? 0).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Kirim satu atau beberapa foto struk ke Gemini dan kembalikan hasil terstruktur.
 * @param {File[]} files daftar foto struk
 * @param {{categories: Array, toBuyNames: string[], aliases: Object}} ctx
 */
export async function scanReceipt(files, ctx) {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (!key) throw new Error("NO_API_KEY");
  if (!files || !files.length) throw new Error("Belum ada foto yang dipilih.");

  const parts = [{ text: buildPrompt(ctx) }];
  for (const f of files) {
    const data = await fileToBase64(f);
    parts.push({ inline_data: { mime_type: f.type || "image/jpeg", data } });
  }

  let res;
  try {
    res = await fetch(`${ENDPOINT}?key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { temperature: 0, responseMimeType: "application/json" },
      }),
    });
  } catch (err) {
    throw new Error("Gagal terhubung ke layanan AI. Cek koneksi internetmu.");
  }

  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body?.error?.message || "";
    } catch (_) {
      /* abaikan */
    }
    if (res.status === 400 && /API key/i.test(detail)) throw new Error("API key-nya tidak valid. Cek lagi di pengaturan Vercel.");
    if (res.status === 429) throw new Error("Kuota AI hari ini sudah habis. Coba lagi nanti.");
    throw new Error(`Layanan AI menolak permintaan (${res.status}). ${detail}`.trim());
  }

  const body = await res.json();
  const text = body?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
  if (!text) throw new Error("AI tidak mengembalikan hasil. Coba foto ulang lebih terang.");

  let raw;
  try {
    raw = extractJson(text);
  } catch (err) {
    throw new Error("Hasil AI tidak bisa dibaca. Coba foto ulang lebih jelas.");
  }

  const items = Array.isArray(raw.items) ? raw.items : [];
  const parsed = {
    store: raw.store || "",
    date: raw.date || null,
    items: items.map((it, i) => ({
      id: `ri-${i}-${Math.random().toString(36).slice(2, 7)}`,
      rawName: it.rawName || it.name || "",
      name: it.name || it.rawName || "",
      qty: toNumber(it.qty) || 1,
      unitPrice: toNumber(it.unitPrice),
      subtotal: toNumber(it.subtotal) || toNumber(it.unitPrice) * (toNumber(it.qty) || 1),
      discount: toNumber(it.discount),
      categoryId: it.categoryId || "",
      toBuyMatch: it.toBuyMatch || null,
      confident: it.confident !== false,
    })),
    discountTotal: toNumber(raw.discountTotal),
    tax: toNumber(raw.tax),
    serviceCharge: toNumber(raw.serviceCharge),
    rounding: toNumber(raw.rounding),
    total: toNumber(raw.total),
    paymentMethod: raw.paymentMethod || null,
    change: toNumber(raw.change),
    notes: raw.notes || null,
  };

  const itemsSum = parsed.items.reduce((s, it) => s + it.subtotal - it.discount, 0);
  const expected = itemsSum - parsed.discountTotal + parsed.tax + parsed.serviceCharge + parsed.rounding;
  parsed.itemsSum = itemsSum;
  // Selisih lebih dari seribu rupiah dianggap perlu dicek manual.
  parsed.mismatch = parsed.total > 0 && Math.abs(expected - parsed.total) > 1000 ? Math.round(parsed.total - expected) : 0;

  return parsed;
}

// Tebak dompet dari metode bayar di struk.
export function guessWallet(paymentMethod, wallets) {
  if (!paymentMethod || !wallets.length) return null;
  const p = String(paymentMethod).toLowerCase();
  const byIcon = (icon) => wallets.find((w) => w.icon === icon);
  if (/tunai|cash/.test(p)) return byIcon("cash") || null;
  if (/qris|gopay|ovo|dana|shopee|e-?wallet/.test(p)) return byIcon("ewallet") || null;
  if (/kartu|debit|kredit|card/.test(p)) return byIcon("card") || byIcon("bank") || null;
  if (/transfer|bank/.test(p)) return byIcon("bank") || null;
  return null;
}

// Cari transaksi yang kemungkinan besar struk yang sama (biar gak dobel catat).
export function findDuplicate(parsed, transactions) {
  if (!parsed.total) return null;
  const when = parsed.date ? new Date(parsed.date) : null;
  return (
    transactions.find((t) => {
      if (t.type !== "expense") return false;
      if (Math.abs((Number(t.amount) || 0) - parsed.total) > 1) return false;
      if (!when) return false;
      const diffHours = Math.abs(new Date(t.date) - when) / 3600000;
      return diffHours <= 36;
    }) || null
  );
}
