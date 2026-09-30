import React from "react";

// Gaya dasar yang berlaku di SEMUA halaman (halaman awal, Stok Rumah,
// Agenda, dan Kas Rumah): font dan beberapa aturan dasar.
//
// Sengaja TIDAK ada animasi di sini lagi. Semua gerak sekarang diatur lewat
// Motion dengan token di src/ui/motion.js, supaya tidak ada lagi dua sistem
// animasi yang saling bertabrakan.
export function SharedStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@400..800&family=Outfit:wght@300..700&family=IBM+Plex+Mono:wght@500;600&display=swap');
      * { box-sizing: border-box; }
      ::placeholder { color: #A6A296; }
    `}</style>
  );
}
