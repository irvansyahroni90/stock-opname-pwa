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


      /* ===============================================================
         Sistem transisi. Satu kurva untuk semua: panjang, tenang, tanpa
         pantulan. --sp adalah pengali kecepatan global.
         =============================================================== */
      :root { --ease-lux: cubic-bezier(.16, 1, .3, 1); --sp: 1; }

      /* 1. Kartu terbang — serah terima TANPA pudar, jadi tidak ada kedipan.
         Kartu berhenti tepat di atas kartu atas yang identik lalu dilepas.
         Bayangan dan sudutnya ikut dianimasikan supaya bentuk akhirnya sama
         persis — tidak ada satu pun sifat yang "loncat" di bingkai terakhir. */
      .flyer {
        position: fixed;
        z-index: 80;
        pointer-events: none;
        transform-origin: top left;
        will-change: transform;
        animation: flyToHero calc(620ms * var(--sp)) var(--ease-lux) forwards,
                   radiusFwd calc(620ms * var(--sp)) var(--ease-lux) forwards;
      }
      @keyframes flyToHero {
        from { transform: translate3d(var(--dx), var(--dy), 0) scale(var(--sx), var(--sy));
               box-shadow: 0 30px 60px rgba(18,32,24,.30); }
        45%  { box-shadow: 0 22px 44px rgba(18,32,24,.22); }
        to   { transform: translate3d(0,0,0) scale(1,1);
               box-shadow: 0 0 0 rgba(18,32,24,0); }
      }
      @keyframes radiusFwd { from { border-radius: 26px } to { border-radius: 0 0 30px 30px } }
      @keyframes radiusBack { from { border-radius: 0 0 30px 30px } to { border-radius: 26px } }
      .flyer.is-back {
        animation: flyToHero calc(680ms * var(--sp)) var(--ease-lux) forwards,
                   radiusBack calc(680ms * var(--sp)) var(--ease-lux) forwards;
      }

      /* Teks di dalam kartu terbang: dua lapis yang bersilangan, tidak ikut
         membesar supaya hurufnya tetap tajam. */
      .flyer-text { position: absolute; left: 0; right: 0; }
      .flyer .flyer-text-to { bottom: 20px; padding: 0 22px; }
      @keyframes textOut { 0% { opacity:1; transform:translateY(0) } 40% { opacity:0; transform:translateY(-8px) } 100% { opacity:0 } }
      @keyframes textIn  { 0%,32% { opacity:0; transform:translateY(14px) } 100% { opacity:1; transform:translateY(0) } }
      .flyer-text-from { animation: textOut calc(620ms * var(--sp)) ease forwards; }
      .flyer-text-to   { animation: textIn calc(620ms * var(--sp)) var(--ease-lux) forwards; }
      .is-back .flyer-text-from { animation: textIn calc(680ms * var(--sp)) var(--ease-lux) forwards; }
      .is-back .flyer-text-to   { animation: textOut calc(680ms * var(--sp)) ease forwards; }

      /* 1b. Tombol di kartu atas muncul SETELAH kartu mendarat */
      @keyframes late { 0%,62% { opacity:0 } 100% { opacity:1 } }
      .hero-actions { animation: late calc(760ms * var(--sp)) ease both; }

      /* 2. Halaman awal menyingkir: mundur + buram, bukan sekadar pudar */
      @keyframes recedeAway { to { opacity:0; transform:scale(.93) translateY(-6px); filter:blur(3px); } }
      .picker-recede { animation: recedeAway calc(420ms * var(--sp)) cubic-bezier(.4,0,.2,1) forwards; }

      /* Saat kembali: kartu berdatangan dari arah masing-masing, berurutan */
      @keyframes comeFromTop    { from { opacity:0; transform:translateY(-34px) scale(.97) } to { opacity:1; transform:none } }
      @keyframes comeFromBottom { from { opacity:0; transform:translateY(34px) scale(.97) }  to { opacity:1; transform:none } }
      .come-top    { animation: comeFromTop calc(560ms * var(--sp)) var(--ease-lux) both; }
      .come-bottom { animation: comeFromBottom calc(560ms * var(--sp)) var(--ease-lux) both; }

      /* 3. Pindah tab: isi masuk dari arah tab yang dituju */
      @keyframes pageIn { 0% { opacity:0; transform:translateX(var(--pd,18px)) scale(.985) } 100% { opacity:1; transform:none } }
      .fx-page, .page-enter { animation: pageIn calc(480ms * var(--sp)) var(--ease-lux) both; }

      /* 4. Tombol: tekan cepat, lepas melambat */
      button { transition: transform calc(420ms * var(--sp)) var(--ease-lux),
                           background-color calc(420ms * var(--sp)) ease,
                           color calc(420ms * var(--sp)) ease,
                           box-shadow calc(420ms * var(--sp)) ease; }
      button:active { transform: scale(.955); transition-duration: 110ms; }

      /* 5. Angka stok bergulir sesuai arah +/- */
      @keyframes rollUp { from { opacity:0; transform:translateY(60%) } to { opacity:1; transform:none } }
      @keyframes rollDown { from { opacity:0; transform:translateY(-60%) } to { opacity:1; transform:none } }
      .roll-up { animation: rollUp calc(440ms * var(--sp)) var(--ease-lux); }
      .roll-down { animation: rollDown calc(440ms * var(--sp)) var(--ease-lux); }
      @keyframes ring { 0% { box-shadow:0 0 0 0 rgba(224,138,60,.45) } 100% { box-shadow:0 0 0 14px rgba(224,138,60,0) } }
      .tap-ring { animation: ring calc(620ms * var(--sp)) ease-out; }

      /* 6. Centang setuju: masuk melewati posisi akhir, lalu kilau menyapu */
      @keyframes confirmSlideIn {
        0% { opacity:0; transform:translateX(18px) scale(.7) }
        60% { opacity:1; transform:translateX(-2px) scale(1.06) }
        100% { opacity:1; transform:none }
      }
      .confirm-slide-in { animation: confirmSlideIn calc(520ms * var(--sp)) var(--ease-lux) both; }
      @keyframes sweep { from { transform:translateX(-110%) } to { transform:translateX(210%) } }
      .btn-sweep { animation: sweep calc(760ms * var(--sp)) cubic-bezier(.4,0,.2,1); }

      /* 7. Sheet: latar meredup + memburam, panel naik dari bawah */
      @keyframes scrimIn { from { opacity:0; backdrop-filter:blur(0) } to { opacity:1; backdrop-filter:blur(6px) } }
      .sheet-scrim { animation: scrimIn calc(460ms * var(--sp)) ease both; }
      @keyframes sheetUp { 0% { opacity:0; transform:translateY(64px) scale(.97) } 100% { opacity:1; transform:none } }
      .sheet-panel { animation: sheetUp calc(620ms * var(--sp)) var(--ease-lux) both; transform-origin: bottom center; }
      @keyframes sheetDown { to { opacity:0; transform:translateY(70px) scale(.97) } }
      .sheet-panel-out { animation: sheetDown calc(380ms * var(--sp)) cubic-bezier(.4,0,1,1) forwards; }
      @keyframes scrimOut { to { opacity:0 } }
      .scrim-out { animation: scrimOut calc(380ms * var(--sp)) ease forwards; }

      /* 8. Riak tinta dari tombol + — melebar di belakang sheet */
      @keyframes ink { from { transform:scale(0); opacity:.30 } to { transform:scale(34); opacity:0 } }
      .fab-ink { position:fixed; width:42px; height:42px; border-radius:999px;
                 pointer-events:none; z-index:45;
                 animation: ink calc(760ms * var(--sp)) cubic-bezier(.22,1,.36,1) forwards; }

      /* 9. Drawer: panel meluncur, isinya menyusul satu per satu */
      @keyframes slideFromRight { from { opacity:0; transform:translateX(64px) } to { opacity:1; transform:none } }
      .drawer-panel { animation: slideFromRight calc(560ms * var(--sp)) var(--ease-lux) both; }
      @keyframes drawerRow { from { opacity:0; transform:translateX(26px) } to { opacity:1; transform:none } }
      .drawer-rows > * { animation: drawerRow calc(520ms * var(--sp)) var(--ease-lux) both; }
      .drawer-rows > *:nth-child(1){animation-delay:90ms}
      .drawer-rows > *:nth-child(2){animation-delay:140ms}
      .drawer-rows > *:nth-child(3){animation-delay:190ms}
      .drawer-rows > *:nth-child(4){animation-delay:240ms}

      /* 10. Baris daftar menyusul bertahap */
      @keyframes rowIn { from { opacity:0; transform:translateY(14px) scale(.985) } to { opacity:1; transform:none } }
      .row-stagger > * { animation: rowIn calc(520ms * var(--sp)) var(--ease-lux) both; }
      .row-stagger > *:nth-child(1){animation-delay:40ms}
      .row-stagger > *:nth-child(2){animation-delay:100ms}
      .row-stagger > *:nth-child(3){animation-delay:160ms}
      .row-stagger > *:nth-child(4){animation-delay:220ms}
      .row-stagger > *:nth-child(5){animation-delay:280ms}
      .row-stagger > *:nth-child(n+6){animation-delay:330ms}

      .tile-swap { transition: background-color calc(420ms * var(--sp)) ease, box-shadow calc(420ms * var(--sp)) ease, color calc(420ms * var(--sp)) ease; }

      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after { animation-duration:.01ms !important; transition-duration:.01ms !important; }
      }

      /* Denyut saat struk sedang dibaca AI */
      @keyframes scanPulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.12); opacity: 0.75; } }
      .scan-pulse { animation: scanPulse 1.1s ease-in-out infinite; }
    `}</style>
  );
}
