import React from "react";

// Gaya dasar yang berlaku di SEMUA halaman (halaman awal, Stok Rumah,
// Agenda, dan Kas Rumah). Ditaruh di satu tempat supaya animasi seperti
// lonceng notifikasi dan efek kedip tidak perlu disalin ke tiap halaman —
// dulu tercecer begitu, dan akibatnya efeknya cuma jalan di sebagian layar.
export function SharedStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');
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

      /* Denyut saat struk sedang dibaca AI */
      @keyframes scanPulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.12); opacity: 0.75; } }
      .scan-pulse { animation: scanPulse 1.1s ease-in-out infinite; }
    `}</style>
  );
}
