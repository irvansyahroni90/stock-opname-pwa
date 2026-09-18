import React from "react";

// Gaya dasar yang berlaku di SEMUA halaman (halaman awal, Stok Rumah,
// Agenda, dan Kas Rumah). Ditaruh di satu tempat supaya animasi seperti
// lonceng notifikasi dan efek kedip tidak perlu disalin ke tiap halaman —
// dulu tercecer begitu, dan akibatnya efeknya cuma jalan di sebagian layar.
export function SharedStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@400..800&family=Outfit:wght@300..700&family=IBM+Plex+Mono:wght@500;600&display=swap');
      * { box-sizing: border-box; }
      ::placeholder { color: #A6A296; }

      /* Lonceng notifikasi */
      @keyframes notifPop { 0% { opacity: 0; transform: scale(0.92) translateY(-6px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
      @keyframes notifBadgePop { 0% { transform: scale(0.5); } 60% { transform: scale(1.25); } 100% { transform: scale(1); } }

      /* Kedip dua kali saat sebuah item disorot */
      @keyframes highlightBlinkTwice {
        0%, 100% { box-shadow: 0 0 0 0 rgba(107,143,113,0); }
        15%, 45% { box-shadow: 0 0 0 3px rgba(107,143,113,0.55); }
        30%, 60% { box-shadow: 0 0 0 0 rgba(107,143,113,0); }
      }
      .highlight-blink { animation: highlightBlinkTwice 1.1s ease-in-out; }

      /* Tombol centang yang menyelinap masuk saat ada perubahan tertunda */
      @keyframes confirmSlideIn { 0% { opacity: 0; transform: translateX(14px) scale(0.85); } 100% { opacity: 1; transform: translateX(0) scale(1); } }
      .confirm-slide-in { animation: confirmSlideIn 220ms cubic-bezier(0.22, 1, 0.36, 1); }

      /* Halaman tujuan muncul berangsur setelah kartu mendarat */
      @keyframes appEnter { from { opacity: 0; } to { opacity: 1; } }
      .app-enter { animation: appEnter 320ms ease both; }


      /* ---------------------------------------------------------------
         Transisi kartu melebar. JavaScript hanya mengirim empat angka
         (--dx, --dy, --sx, --sy) lalu lepas tangan; seluruh gerakan di
         bawah ini dijalankan sendiri oleh peramban.
         --------------------------------------------------------------- */
      @keyframes flyToHero {
        from { transform: translate3d(var(--dx), var(--dy), 0) scale(var(--sx), var(--sy)); }
        to   { transform: translate3d(0, 0, 0) scale(1, 1); }
      }
      @keyframes flyBackToCard {
        from { transform: translate3d(0, 0, 0) scale(1, 1); }
        to   { transform: translate3d(var(--dx), var(--dy), 0) scale(var(--sx), var(--sy)); }
      }
      /* Kotak warnanya tetap terlihat sampai hampir mendarat, baru meredup
         menyerahkan tempat ke halaman aslinya. */
      @keyframes flyerFade { 0%, 70% { opacity: 1; } 100% { opacity: 0; } }

      .flyer {
        position: fixed;
        z-index: 80;
        pointer-events: none;
        transform-origin: top left;
        will-change: transform, opacity;
        animation: flyToHero 440ms cubic-bezier(0.45, 0.05, 0.2, 1) forwards,
                   flyerFade 620ms ease forwards;
      }
      .flyer.is-back {
        animation: flyBackToCard 440ms cubic-bezier(0.45, 0.05, 0.2, 1) forwards,
                   flyerFade 620ms ease forwards;
      }

      /* Dua lapisan tulisan yang bersilangan di dalam kartu terbang. Sengaja
         TIDAK ikut membesar supaya hurufnya tetap tajam — yang membesar
         hanya kotak warnanya. */
      .flyer-text { position: absolute; left: 0; right: 0; }
      @keyframes textOut { 0% { opacity: 1; } 35% { opacity: 0; } 100% { opacity: 0; } }
      @keyframes textIn  { 0%, 28% { opacity: 0; transform: translateY(10px); } 100% { opacity: 1; transform: translateY(0); } }
      .flyer-text-from { animation: textOut 440ms ease forwards; }
      .flyer-text-to   { animation: textIn 440ms cubic-bezier(0.45, 0.05, 0.2, 1) forwards; }
      .is-back .flyer-text-from { animation: textIn 440ms cubic-bezier(0.45, 0.05, 0.2, 1) forwards; }
      .is-back .flyer-text-to   { animation: textOut 440ms ease forwards; }

      /* Halaman awal menyingkir saat sebuah kartu dibuka */
      @keyframes recedeAway { to { opacity: 0; transform: scale(0.94); } }
      .picker-recede { animation: recedeAway 260ms ease forwards; }

      /* Saat kembali: kartu di ATAS kartu yang tadi dibuka datang dari atas,
         yang di BAWAH datang dari bawah — seolah berkumpul lagi. */
      @keyframes comeFromTop    { from { opacity: 0; transform: translateY(-26px); } to { opacity: 1; transform: none; } }
      @keyframes comeFromBottom { from { opacity: 0; transform: translateY(26px); }  to { opacity: 1; transform: none; } }
      .come-top    { animation: comeFromTop 380ms cubic-bezier(0.22, 1, 0.36, 1) both; }
      .come-bottom { animation: comeFromBottom 380ms cubic-bezier(0.22, 1, 0.36, 1) both; }

      /* Jendela formulir naik dari bawah, latarnya meredup masuk */
      @keyframes sheetUp { from { transform: translateY(26px); opacity: 0; } to { transform: none; opacity: 1; } }
      @keyframes scrimIn { from { opacity: 0; } to { opacity: 1; } }
      .sheet-scrim { animation: scrimIn 200ms ease both; }
      .sheet-panel { animation: sheetUp 300ms cubic-bezier(0.22, 1, 0.36, 1) both; }

      /* Panel samping meluncur dari kanan */
      @keyframes slideFromRight { from { transform: translateX(28px); opacity: 0; } to { transform: none; opacity: 1; } }
      .drawer-panel { animation: slideFromRight 280ms cubic-bezier(0.22, 1, 0.36, 1) both; }

      /* Baris daftar muncul berurutan, dibatasi sepuluh baris pertama supaya
         daftar panjang tidak terasa lambat. */
      @keyframes rowIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
      .row-stagger > * { animation: rowIn 300ms cubic-bezier(0.22, 1, 0.36, 1) both; }
      .row-stagger > *:nth-child(1) { animation-delay: 20ms; }
      .row-stagger > *:nth-child(2) { animation-delay: 50ms; }
      .row-stagger > *:nth-child(3) { animation-delay: 80ms; }
      .row-stagger > *:nth-child(4) { animation-delay: 110ms; }
      .row-stagger > *:nth-child(5) { animation-delay: 140ms; }
      .row-stagger > *:nth-child(6) { animation-delay: 170ms; }
      .row-stagger > *:nth-child(7) { animation-delay: 200ms; }
      .row-stagger > *:nth-child(8) { animation-delay: 230ms; }
      .row-stagger > *:nth-child(9) { animation-delay: 260ms; }
      .row-stagger > *:nth-child(10) { animation-delay: 290ms; }
      .row-stagger > *:nth-child(n + 11) { animation: none; }

      /* Tombol dan baris terasa merespons saat disentuh */
      button { transition: transform 120ms ease; }
      button:active { transform: scale(0.975); }

      /* Kartu filter berpindah warna dengan halus */
      .tile-swap { transition: background-color 220ms ease, box-shadow 220ms ease, color 220ms ease; }

      /* Hormati pengguna yang mematikan animasi di pengaturan HP-nya */
      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }

      /* Denyut saat struk sedang dibaca AI */
      @keyframes scanPulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.12); opacity: 0.75; } }
      .scan-pulse { animation: scanPulse 1.1s ease-in-out infinite; }
    `}</style>
  );
}
