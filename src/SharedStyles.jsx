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
         Sistem transisi. JavaScript hanya mengirim empat angka
         (--dx, --dy, --sx, --sy) lalu lepas tangan; seluruh gerakan di
         bawah ini dijalankan sendiri oleh peramban.

         --sp = pengali kecepatan, bisa dipakai memperlambat semuanya
         sekaligus kalau suatu saat ingin disetel.
         --------------------------------------------------------------- */

      /* Kartu terbang: berlapis — bergerak, sedikit kabur di tengah jalan,
         dan menggantung dengan bayangan tebal supaya terasa melayang. */
      @keyframes flyToHero {
        from { transform: translate3d(var(--dx), var(--dy), 0) scale(var(--sx), var(--sy)); filter: blur(0px); }
        45%  { filter: blur(1.5px); }
        to   { transform: translate3d(0, 0, 0) scale(1, 1); filter: blur(0); }
      }
      @keyframes flyBackToCard {
        from { transform: translate3d(0, 0, 0) scale(1, 1); }
        to   { transform: translate3d(var(--dx), var(--dy), 0) scale(var(--sx), var(--sy)); }
      }
      @keyframes flyerFade { 0%, 78% { opacity: 1; } 100% { opacity: 0; } }

      .flyer {
        position: fixed;
        z-index: 80;
        pointer-events: none;
        transform-origin: top left;
        will-change: transform, opacity;
        box-shadow: 0 30px 60px rgba(18, 32, 24, 0.30);
        animation: flyToHero calc(620ms * var(--sp, 1)) cubic-bezier(0.16, 1, 0.3, 1) forwards,
                   flyerFade calc(820ms * var(--sp, 1)) ease forwards;
      }
      .flyer.is-back {
        animation: flyBackToCard calc(560ms * var(--sp, 1)) cubic-bezier(0.16, 1, 0.3, 1) forwards,
                   flyerFade calc(720ms * var(--sp, 1)) ease forwards;
      }

      /* Dua lapisan tulisan yang bersilangan di dalam kartu terbang. Sengaja
         TIDAK ikut membesar supaya hurufnya tetap tajam. */
      .flyer-text { position: absolute; left: 0; right: 0; }
      @keyframes textOut { 0% { opacity: 1; transform: translateY(0); } 40% { opacity: 0; transform: translateY(-8px); } 100% { opacity: 0; } }
      @keyframes textIn  { 0%, 32% { opacity: 0; transform: translateY(14px); } 100% { opacity: 1; transform: translateY(0); } }
      .flyer-text-from { animation: textOut calc(620ms * var(--sp, 1)) ease forwards; }
      .flyer-text-to   { animation: textIn calc(620ms * var(--sp, 1)) cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      .is-back .flyer-text-from { animation: textIn calc(560ms * var(--sp, 1)) cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      .is-back .flyer-text-to   { animation: textOut calc(560ms * var(--sp, 1)) ease forwards; }

      /* Halaman awal menyurut: mengecil, naik sedikit, dan mengabur. */
      @keyframes recedeAway { to { opacity: 0; transform: scale(0.93) translateY(-6px); filter: blur(3px); } }
      .picker-recede { animation: recedeAway calc(420ms * var(--sp, 1)) cubic-bezier(0.4, 0, 0.2, 1) forwards; }

      /* Saat kembali: kartu di ATAS kartu yang tadi dibuka datang dari atas,
         yang di BAWAH datang dari bawah — seolah berkumpul lagi. */
      @keyframes comeFromTop    { from { opacity: 0; transform: translateY(-34px) scale(0.97); } to { opacity: 1; transform: none; } }
      @keyframes comeFromBottom { from { opacity: 0; transform: translateY(34px) scale(0.97); }  to { opacity: 1; transform: none; } }
      .come-top    { animation: comeFromTop calc(560ms * var(--sp, 1)) cubic-bezier(0.16, 1, 0.3, 1) both; }
      .come-bottom { animation: comeFromBottom calc(560ms * var(--sp, 1)) cubic-bezier(0.16, 1, 0.3, 1) both; }

      /* Halaman tujuan menggeser masuk sedikit di balik kartu terbang */
      @keyframes pageIn { 0% { opacity: 0; transform: translateX(var(--pd, 18px)) scale(0.985); } 100% { opacity: 1; transform: none; } }
      .fx-page { animation: pageIn calc(480ms * var(--sp, 1)) cubic-bezier(0.16, 1, 0.3, 1) both; }

      /* Baris daftar muncul berurutan */
      @keyframes rowIn { from { opacity: 0; transform: translateY(14px) scale(0.985); } to { opacity: 1; transform: none; } }
      .row-stagger > * { animation: rowIn calc(520ms * var(--sp, 1)) cubic-bezier(0.16, 1, 0.3, 1) both; }
      .row-stagger > *:nth-child(1) { animation-delay: calc(40ms * var(--sp, 1)); }
      .row-stagger > *:nth-child(2) { animation-delay: calc(100ms * var(--sp, 1)); }
      .row-stagger > *:nth-child(3) { animation-delay: calc(160ms * var(--sp, 1)); }
      .row-stagger > *:nth-child(4) { animation-delay: calc(220ms * var(--sp, 1)); }
      .row-stagger > *:nth-child(5) { animation-delay: calc(280ms * var(--sp, 1)); }
      .row-stagger > *:nth-child(n + 6) { animation-delay: calc(330ms * var(--sp, 1)); }

      /* Sentuhan terasa direspons: menekan cepat, kembali perlahan */
      button {
        transition: transform calc(420ms * var(--sp, 1)) cubic-bezier(0.16, 1, 0.3, 1),
                    box-shadow calc(420ms * var(--sp, 1)) ease,
                    background-color calc(420ms * var(--sp, 1)) ease,
                    color calc(420ms * var(--sp, 1)) ease;
      }
      button:active { transform: scale(0.955); transition-duration: 110ms; }

      /* Jendela formulir: latar mengabur, panel naik dari bawah */
      @keyframes scrimIn { from { opacity: 0; backdrop-filter: blur(0px); } to { opacity: 1; backdrop-filter: blur(6px); } }
      .sheet-scrim { animation: scrimIn calc(460ms * var(--sp, 1)) ease both; }
      @keyframes sheetUp { 0% { opacity: 0; transform: translateY(64px) scale(0.97); } 100% { opacity: 1; transform: none; } }
      .sheet-panel { animation: sheetUp calc(620ms * var(--sp, 1)) cubic-bezier(0.16, 1, 0.3, 1) both; transform-origin: bottom center; }

      /* Panel samping meluncur dari kanan, isinya menyusul berurutan */
      @keyframes drawerIn { from { opacity: 0; transform: translateX(64px); } to { opacity: 1; transform: none; } }
      .drawer-panel { animation: drawerIn calc(560ms * var(--sp, 1)) cubic-bezier(0.16, 1, 0.3, 1) both; }
      @keyframes drawerRowIn { from { opacity: 0; transform: translateX(26px); } to { opacity: 1; transform: none; } }
      .drawer-rows > * { animation: drawerRowIn calc(520ms * var(--sp, 1)) cubic-bezier(0.16, 1, 0.3, 1) both; }
      .drawer-rows > *:nth-child(1) { animation-delay: calc(90ms * var(--sp, 1)); }
      .drawer-rows > *:nth-child(2) { animation-delay: calc(140ms * var(--sp, 1)); }
      .drawer-rows > *:nth-child(3) { animation-delay: calc(190ms * var(--sp, 1)); }
      .drawer-rows > *:nth-child(4) { animation-delay: calc(240ms * var(--sp, 1)); }

      /* Kartu filter berpindah warna dengan halus */
      .tile-swap { transition: background-color calc(420ms * var(--sp, 1)) ease, box-shadow calc(420ms * var(--sp, 1)) ease, color calc(420ms * var(--sp, 1)) ease; }

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
