// =====================================================================
// Token gerak — SATU-SATUNYA tempat durasi dan kurva ditentukan.
// Semua animasi di aplikasi mengambil nilainya dari sini, jadi kalau
// mau terasa lebih cepat/lambat, cukup ubah file ini.
//
// Karakter: tenang dan halus ala iOS — tanpa pantulan, keluar selalu
// lebih cepat dari masuk, dan semua gerakan bisa disela di tengah jalan.
// =====================================================================

// Kurva (cubic-bezier) untuk animasi berdurasi tetap.
export const EASE = {
  // Kurva sheet iOS: berangkat cepat, mendarat sangat pelan.
  ios: [0.32, 0.72, 0, 1],
  // Untuk elemen yang masuk ke layar.
  out: [0.22, 1, 0.36, 1],
  // Untuk elemen yang keluar dari layar: mulai pelan, lalu menghilang.
  in: [0.4, 0, 1, 1],
  // Perubahan warna / transparansi biasa.
  standard: [0.4, 0, 0.2, 1],
};

// Durasi dalam detik (format yang dipakai Motion).
export const DUR = {
  micro: 0.16, // tekan tombol, centang, badge
  fast: 0.24, // popover, keluarnya sheet
  base: 0.38, // sheet, drawer, pergantian isi
  slow: 0.5, // perpindahan halaman
};

// Pegas tanpa pantulan (bounce 0). visualDuration = kira-kira berapa lama
// gerakan terlihat, walau pegasnya sendiri masih "mengendap" sedikit lebih
// lama — itulah yang membuat pendaratannya terasa lembut.
export const SPRING = {
  // Perpindahan besar: halaman, kartu yang melebar, pager tab.
  page: { type: "spring", visualDuration: 0.5, bounce: 0 },
  // Panel yang naik/meluncur: sheet, drawer.
  panel: { type: "spring", visualDuration: 0.42, bounce: 0 },
  // Elemen kecil yang berpindah posisi: kapsul nav, latar filter aktif.
  snappy: { type: "spring", visualDuration: 0.3, bounce: 0 },
  // Umpan balik tekan: sedikit sekali pantulan supaya terasa hidup.
  press: { type: "spring", visualDuration: 0.2, bounce: 0.15 },
};

// Transisi keluar standar: ~70% durasi masuk, kurva "in".
export const EXIT = { duration: DUR.fast, ease: EASE.in };

// Ambang lepas untuk gestur tarik (sheet ke bawah, drawer ke kanan).
// Lewat salah satu → panel ditutup; kurang → panel kembali ke tempatnya.
export const DISMISS = {
  distance: 110, // px
  velocity: 600, // px/detik
};

// Warna latar redup di belakang sheet & drawer.
export const SCRIM = "rgba(24, 24, 20, 0.40)";
