import React from "react";

// Gaya dasar yang berlaku di SEMUA halaman (halaman awal, Stok Rumah,
// Agenda, dan Kas Rumah): font, aturan dasar, dan umpan balik tekan tombol.
//
// Gerak lainnya diatur lewat Motion dengan token di src/ui/motion.js.
// Tekan tombol sengaja memakai properti CSS `scale` (bukan `transform`)
// supaya tidak pernah bertabrakan dengan transform milik Motion.
export function SharedStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@400..800&family=Outfit:wght@300..700&family=IBM+Plex+Mono:wght@500;600&display=swap');
      * { box-sizing: border-box; }
      ::placeholder { color: #A6A296; }

      /* Tekan tombol: mengecil cepat saat ditekan, kembali pelan saat dilepas.
         Warna latar/teks/garis/bayangan ikut berganti dengan halus. */
      button {
        transition:
          scale 240ms cubic-bezier(.32,.72,0,1),
          background-color 240ms cubic-bezier(.4,0,.2,1),
          color 240ms cubic-bezier(.4,0,.2,1),
          border-color 240ms cubic-bezier(.4,0,.2,1),
          box-shadow 240ms cubic-bezier(.4,0,.2,1);
      }
      button:active:not(:disabled) {
        scale: .97;
        transition:
          scale 90ms ease-out,
          background-color 240ms cubic-bezier(.4,0,.2,1),
          color 240ms cubic-bezier(.4,0,.2,1),
          border-color 240ms cubic-bezier(.4,0,.2,1),
          box-shadow 240ms cubic-bezier(.4,0,.2,1);
      }
      /* Tombol yang warnanya sudah dianimasikan Motion: cukup efek tekan. */
      button.no-tx, button.no-tx:active { transition: scale 200ms cubic-bezier(.32,.72,0,1) !important; }

      /* Kolom dengan huruf besar (nominal, jumlah). Semua kolom minimal 16px
         supaya iOS tidak memperbesar layar; kelas ini hanya memperbesar. */
      input.fs-17 { font-size: 17px !important; }
      input.fs-19 { font-size: 19px !important; }
      input.fs-22 { font-size: 22px !important; }
      input.fs-36 { font-size: 36px !important; }
      input.fs-38 { font-size: 38px !important; }
      /* Kolom formulir gaya baru: saat fokus cukup garis tepinya berganti
         warna (warna diatur lewat --inp-focus di style kolomnya). */
      .inp { transition: border-color 200ms cubic-bezier(.4,0,.2,1), background-color 200ms cubic-bezier(.4,0,.2,1); }
      .inp:focus { outline: none !important; border-color: var(--inp-focus, #26314D) !important; }
      input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }

      @media (prefers-reduced-motion: reduce) {
        button, button:active:not(:disabled) { transition: none !important; scale: none !important; }
      }
    `}</style>
  );
}
