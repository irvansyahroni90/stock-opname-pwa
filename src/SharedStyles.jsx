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

      @media (prefers-reduced-motion: reduce) {
        button, button:active:not(:disabled) { transition: none !important; scale: none !important; }
      }
    `}</style>
  );
}
