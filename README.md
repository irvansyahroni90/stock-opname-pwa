# Stock Opname — PWA

App stok kamu, siap jadi PWA yang bisa diinstall di Android & iPhone, dan
datanya **sinkron real-time** antar perangkat (real-time = kalau satu HP
update stok, HP lain langsung lihat perubahannya, tanpa refresh).

Kenapa perlu diubah dulu? Kode aslinya pakai `window.storage`, API yang
cuma jalan di dalam preview Claude. Supaya bisa dipakai sebagai app
sungguhan di HP, penyimpanan datanya diganti ke **Firebase Firestore**
(gratis, real-time, dan tetap jalan walau kamu tutup Claude).

Semua di bawah ini **gratis**, tidak perlu kartu kredit.

---

## Yang perlu disiapkan
- Akun Google (untuk Firebase)
- Akun GitHub (untuk deploy)
- Node.js terinstall di komputer (untuk coba jalan lokal — opsional tapi disarankan)

---

## 1. Setup Firebase (database + sync real-time)

1. Buka https://console.firebase.google.com → **Add project** → kasih nama
   bebas (mis. `stock-opname`) → lanjut sampai selesai (Google Analytics
   boleh di-skip).
2. Di sidebar kiri, klik **Build → Firestore Database** → **Create database**
   → pilih lokasi (mis. `asia-southeast2 (Jakarta)`) → mode **Production**.
3. Setelah database jadi, buka tab **Rules**, ganti isinya jadi ini, lalu
   **Publish**:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /workspaces/{workspace}/data/{key} {
         allow read, write: if true;
       }
     }
   }
   ```
   > Catatan: rule ini bikin data bisa dibaca/ditulis siapa saja yang tahu
   > URL app-nya — cukup aman untuk pemakaian internal toko/tim kecil yang
   > linknya tidak disebar ke publik. Kalau nanti mau lebih aman (pakai
   > login), tinggal bilang, aku bantu tambahkan.
4. Kembali ke **Project Overview** (ikon rumah) → klik ikon **`</>`** (Web
   app) → kasih nama app → **Register app**. Firebase akan kasih kode
   berisi `firebaseConfig = { apiKey: ..., authDomain: ..., ... }`.
5. Salin nilai-nilai itu ke file `.env` (lihat langkah 2 di bawah).

## 2. Isi konfigurasi

1. Di folder project ini, salin `.env.example` jadi `.env`.
2. Isi tiap baris dengan nilai dari `firebaseConfig` yang kamu dapat di
   langkah 1.4 (`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID`, dst).
3. `VITE_WORKSPACE_ID` boleh dibiarkan `default` kalau cuma untuk satu
   toko. Ini cuma dipakai kalau suatu saat kamu mau pisahkan data
   beberapa toko/tim dalam satu project Firebase yang sama.

## 3. Coba jalan di komputer (opsional)

```bash
npm install
npm run dev
```
Buka link yang muncul (biasanya `http://localhost:5173`) di browser.

## 4. Deploy gratis (supaya bisa dibuka dari HP)

Paling gampang pakai **Vercel**:

1. Push folder ini ke repo GitHub baru.
2. Buka https://vercel.com → daftar/login pakai akun GitHub.
3. **Add New → Project** → pilih repo tadi → **Import**.
4. Di bagian **Environment Variables**, masukkan semua isi `.env` kamu
   satu per satu (key dan value sama persis).
5. Klik **Deploy**. Setelah selesai, Vercel kasih URL seperti
   `https://stock-opname-xxxx.vercel.app` — ini HTTPS otomatis, jadi PWA
   bisa diinstall.

(Netlify atau GitHub Pages juga bisa dengan cara serupa kalau lebih
familiar dengan itu.)

## 5. Install ke HP

**Android (Chrome):**
Buka URL app-nya → menu titik tiga di kanan atas → **Install app** /
**Add to Home screen**.

**iPhone (Safari — wajib pakai Safari, bukan Chrome):**
Buka URL app-nya → tombol **Share** (kotak dengan panah ke atas) →
**Add to Home Screen** → **Add**.

Setelah diinstall, app muncul sebagai ikon sendiri di layar HP, terbuka
fullscreen tanpa address bar, dan tetap bisa dibuka meski tanpa internet
(data terakhir yang sudah dimuat tetap muncul; perubahan baru butuh
internet untuk sinkron).

## 6. Update app di kemudian hari

Kalau nanti kamu (atau aku) ubah kodenya lagi:
- Push perubahan ke GitHub → Vercel otomatis build ulang & deploy.
- Karena `registerType: "autoUpdate"`, HP yang sudah install akan otomatis
  ambil versi terbaru saat dibuka ulang — tidak perlu install ulang.

---

## Struktur singkat

- `src/App.jsx` — isi app (logic & tampilan) — sama seperti kode aslimu,
  cuma bagian penyimpanan data yang diganti.
- `src/firebase.js` — koneksi ke Firestore + fungsi simpan/baca/dengarkan
  data real-time.
- `public/icon-*.png` — ikon app, masih placeholder polos warna hijau
  tulisan "SO". Ganti kapan saja dengan logo tokomu (ukuran 192×192 dan
  512×512 px).
