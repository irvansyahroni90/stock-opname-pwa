// Scan struk pakai Gemini (gratis lewat Google AI Studio).
// API key diambil dari environment variable VITE_GEMINI_API_KEY —
// JANGAN ditulis langsung di file ini.

// Daftar model yang dicoba berurutan. Kalau model teratas sudah dipensiunkan
// Google (balasan 404), otomatis lanjut ke berikutnya — jadi fitur ini tidak
// mati begitu Google mengganti versi modelnya.
// Groq dipakai lebih dulu karena jauh lebih cepat; Gemini jadi cadangan
// otomatis kalau Groq gagal, sibuk, atau key-nya belum dipasang.
const GROQ_MODELS = ["qwen/qwen3.6-27b", "meta-llama/llama-4-maverick-17b-128e-instruct", "meta-llama/llama-4-scout-17b-16e-instruct"];
const GEMINI_MODELS = ["gemini-3.6-flash", "gemini-3.7-flash", "gemini-flash-latest", "gemini-2.5-flash"];

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

// Batas waktu satu percobaan. Tanpa ini permintaan bisa menggantung tanpa
// ujung kalau server penyedia bermasalah.
const TIMEOUT_MS = 45000;

function geminiEndpoint(model) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

export function hasApiKey() {
  return !!(import.meta.env.VITE_GROQ_API_KEY || import.meta.env.VITE_GEMINI_API_KEY);
}

// Jalankan fetch dengan batas waktu, sekaligus menghormati pembatalan
// dari pengguna. Mengembalikan Response, atau melempar Error bertanda.
async function fetchWithTimeout(url, init, signal) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort("timeout"), TIMEOUT_MS);
  const onUserAbort = () => ctrl.abort("user");
  signal?.addEventListener("abort", onUserAbort);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } catch (err) {
    if (signal?.aborted) throw new Error("DIBATALKAN");
    throw new Error("TIMEOUT");
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onUserAbort);
  }
}

// Bentuk badan permintaan sesuai penyedia, lalu ambil teks balasannya.
// Hasilnya selalu berupa objek dengan bentuk yang sama supaya pemanggilnya
// tidak perlu tahu penyedia mana yang dipakai.
async function callProvider({ provider, model, key }, prompt, images, signal) {
  let url, init;

  if (provider === "groq") {
    // Groq memakai format yang sama dengan OpenAI: gambar dikirim sebagai
    // data URL di dalam daftar isi pesan.
    const content = [{ type: "text", text: prompt }];
    images.forEach(({ data, mimeType }) => {
      content.push({ type: "image_url", image_url: { url: `data:${mimeType};base64,${data}` } });
    });
    url = GROQ_ENDPOINT;
    init = {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content }],
        response_format: { type: "json_object" },
        temperature: 0,
      }),
    };
  } else {
    const parts = [{ text: prompt }];
    images.forEach(({ data, mimeType }) => {
      parts.push({ inline_data: { mime_type: mimeType, data } });
    });
    const generationConfig = { responseMimeType: "application/json" };
    // Setelan ini hanya dikenal model generasi 3.x.
    if (/^gemini-3/.test(model)) generationConfig.thinkingConfig = { thinkingLevel: "minimal" };
    url = `${geminiEndpoint(model)}?key=${encodeURIComponent(key)}`;
    init = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts }], generationConfig }),
    };
  }

  let res;
  try {
    res = await fetchWithTimeout(url, init, signal);
  } catch (err) {
    if (err.message === "DIBATALKAN") throw err;
    if (err.message === "TIMEOUT") {
      return { ok: false, busy: true, message: "Kelamaan menunggu balasan." };
    }
    return { ok: false, message: "Gagal terhubung. Cek koneksi internetmu." };
  }

  if (res.ok) {
    const body = await res.json();
    const text =
      provider === "groq"
        ? body?.choices?.[0]?.message?.content || ""
        : body?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
    if (!text) return { ok: false, message: "AI tidak mengembalikan hasil." };
    return { ok: true, text };
  }

  let detail = "";
  try {
    const errBody = await res.json();
    detail = errBody?.error?.message || "";
  } catch (_) {
    /* abaikan */
  }

  // Kunci bermasalah — ganti model tidak akan menolong, tapi penyedia lain
  // mungkin bisa, jadi jangan dihentikan total kecuali memang tidak ada lagi.
  if (res.status === 401 || res.status === 403) {
    return { ok: false, message: `API key ${provider} ditolak. Cek lagi di pengaturan Vercel.` };
  }
  if (res.status === 429) {
    return { ok: false, busy: true, message: `Kuota ${provider} lagi penuh.` };
  }
  // 5xx = server penyedia bermasalah/ramai. 404 = model sudah dipensiunkan.
  if (res.status >= 500 || res.status === 404) {
    return { ok: false, busy: res.status >= 500, message: `(${res.status}) ${detail}`.trim() };
  }

  return { ok: false, message: `(${res.status}) ${detail}`.trim() };
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

// Kecilkan foto sebelum dikirim. Foto kamera HP biasanya 3–8 MB dan bagian
// paling lama dari proses scan adalah mengunggahnya. Diperkecil ke lebar
// maksimal 1200px kualitas 80% biasanya cuma 200–400 KB — jauh lebih cepat
// diunggah, sementara tulisan di struk tetap terbaca jelas.
// Prosesnya berjalan otomatis di HP dan hanya makan waktu sepersekian detik.
const MAX_DIMENSION = 1200;
const JPEG_QUALITY = 0.8;

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Gambar tidak bisa dibuka."));
    };
    img.src = url;
  });
}

async function shrinkImage(file) {
  // Kalau bukan gambar atau sudah kecil, pakai apa adanya.
  if (!file.type || !file.type.startsWith("image/") || file.size < 400 * 1024) {
    return { data: await fileToBase64(file), mimeType: file.type || "image/jpeg" };
  }

  try {
    const img = await loadImage(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight));

    // Sudah cukup kecil dimensinya — gak perlu digambar ulang.
    if (scale >= 1) {
      return { data: await fileToBase64(file), mimeType: file.type };
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    const comma = dataUrl.indexOf(",");
    if (comma < 0) throw new Error("gagal");
    return { data: dataUrl.slice(comma + 1), mimeType: "image/jpeg" };
  } catch (err) {
    // Kalau apa pun gagal, kirim foto aslinya saja — lebih lambat tapi tetap jalan.
    return { data: await fileToBase64(file), mimeType: file.type || "image/jpeg" };
  }
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
export async function scanReceipt(files, ctx, options = {}) {
  const { signal, onProgress } = options;
  const groqKey = import.meta.env.VITE_GROQ_API_KEY;
  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!groqKey && !geminiKey) throw new Error("NO_API_KEY");
  if (!files || !files.length) throw new Error("Belum ada foto yang dipilih.");

  const say = (msg) => onProgress && onProgress(msg);

  say("Menyiapkan foto...");
  // Semua foto dikecilkan bersamaan supaya tidak antre satu per satu.
  const shrunk = await Promise.all(files.map((f) => shrinkImage(f)));
  if (signal?.aborted) throw new Error("DIBATALKAN");
  const prompt = buildPrompt(ctx);

  // Daftar percobaan: Groq dulu (paling cepat), Gemini sebagai cadangan.
  const attempts = [];
  if (groqKey) GROQ_MODELS.forEach((m) => attempts.push({ provider: "groq", model: m, key: groqKey }));
  if (geminiKey) GEMINI_MODELS.forEach((m) => attempts.push({ provider: "gemini", model: m, key: geminiKey }));

  let text = "";
  let lastError = "";
  let sawBusy = false;

  for (let i = 0; i < attempts.length; i++) {
    const a = attempts[i];
    if (signal?.aborted) throw new Error("DIBATALKAN");
    say(i === 0 ? "Membaca struk..." : "Server sibuk, mencoba cadangan...");

    const result = await callProvider(a, prompt, shrunk, signal);

    if (result.ok) {
      text = result.text;
      break;
    }

    // Kesalahan yang tidak akan berubah walau ganti model — hentikan di sini.
    if (result.fatal) throw new Error(result.message);

    if (result.busy) sawBusy = true;
    lastError = result.message;
  }

  if (!text) {
    if (sawBusy) throw new Error("Server AI-nya lagi ramai. Coba lagi sebentar lagi ya.");
    throw new Error(lastError || "Gagal membaca struk. Coba lagi.");
  }

  say("Merapikan hasil...");

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
