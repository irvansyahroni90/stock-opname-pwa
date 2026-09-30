import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, useDragControls } from "motion/react";
import { useVisibleViewport } from "./useVisibleViewport";
import { DUR, EASE, EXIT, SPRING, DISMISS, SCRIM } from "./motion";

// ---------------------------------------------------------------------
// Sheet — jendela formulir yang naik dari bawah layar.
//
// Cara pakai: bungkus pemanggilnya dengan <AnimatePresence>, supaya saat
// komponen ini dilepas (tombol X, Simpan, tap di luar, atau ditarik ke
// bawah) animasi keluarnya tetap diputar dulu:
//
//   <AnimatePresence>
//     {modal && <Sheet key="item" onClose={() => setModal(null)}>…</Sheet>}
//   </AnimatePresence>
//
// Dirender lewat portal ke <body>, jadi posisinya tidak pernah terganggu
// oleh transform milik halaman di belakangnya.
// ---------------------------------------------------------------------
export function Sheet({ children, onClose, padded = true, background = "#FFFFFF", font, color }) {
  const vp = useVisibleViewport();
  const panelRef = useRef(null);
  const drag = useDragControls();

  // Kolom yang sedang diketik digulir ke tengah supaya tidak tertutup papan
  // ketik, tanpa perlu menggulir sendiri.
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const onFocus = (e) => {
      const el = e.target;
      if (!el.matches || !el.matches("input, textarea, select")) return;
      setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 260);
    };
    panel.addEventListener("focusin", onFocus);
    return () => panel.removeEventListener("focusin", onFocus);
  }, []);

  const close = () => onClose && onClose();

  return createPortal(
    <div
      className="fixed left-0 right-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      style={{ top: vp.offsetTop, height: vp.height, fontFamily: font, color }}
    >
      <motion.div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: SCRIM }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { duration: DUR.base, ease: EASE.standard } }}
        exit={{ opacity: 0, transition: EXIT }}
        onClick={close}
      />

      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        className="relative w-full sm:max-w-sm overflow-y-auto rounded-t-[24px] sm:rounded-[24px]"
        style={{
          background,
          // Sisakan sedikit ruang di atas supaya masih terlihat bahwa ini
          // jendela yang menumpang di atas halaman.
          maxHeight: Math.max(220, vp.height - 24),
          overscrollBehavior: "contain",
          WebkitOverflowScrolling: "touch",
          paddingBottom: padded ? "max(20px, env(safe-area-inset-bottom))" : undefined,
          boxShadow: "0 -8px 32px rgba(24,24,20,0.10)",
        }}
        initial={{ y: "100%" }}
        animate={{ y: 0, transition: SPRING.panel }}
        exit={{ y: "100%", transition: EXIT }}
        // Tarik ke bawah untuk menutup — hanya dari pegangan di atas, supaya
        // menggulir isi formulir tidak ikut menarik jendelanya.
        drag="y"
        dragListener={false}
        dragControls={drag}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 1 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > DISMISS.distance || info.velocity.y > DISMISS.velocity) close();
        }}
      >
        <div
          className="sticky top-0 z-10 flex justify-center"
          style={{ background, paddingTop: 10, paddingBottom: 8, touchAction: "none", cursor: "grab" }}
          onPointerDown={(e) => drag.start(e)}
        >
          <span style={{ width: 38, height: 5, borderRadius: 99, background: "#DDD9CC" }} />
        </div>
        <div className={padded ? "px-5 pt-1" : undefined}>{children}</div>
      </motion.div>
    </div>,
    document.body
  );
}

// ---------------------------------------------------------------------
// Drawer — panel yang meluncur dari kanan (menu, riwayat, kategori).
// Sama seperti Sheet: bungkus pemanggilnya dengan <AnimatePresence>.
// Bisa ditutup dengan tap di luar, tombol X, atau geser ke kanan.
// ---------------------------------------------------------------------
export function Drawer({ children, onClose, background = "#EDEAE1", font, color, narrow = false }) {
  const close = () => onClose && onClose();

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end" style={{ fontFamily: font, color }}>
      <motion.div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: SCRIM }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { duration: DUR.base, ease: EASE.standard } }}
        exit={{ opacity: 0, transition: EXIT }}
        onClick={close}
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        className={`relative w-full h-full overflow-y-auto p-5 ${narrow ? "sm:max-w-xs" : "sm:max-w-sm"}`}
        style={{
          background,
          paddingTop: "calc(env(safe-area-inset-top) + 1.25rem)",
          paddingBottom: "max(20px, env(safe-area-inset-bottom))",
          overscrollBehaviorY: "contain",
          boxShadow: "-8px 0 32px rgba(24,24,20,0.10)",
        }}
        initial={{ x: "100%" }}
        animate={{ x: 0, transition: SPRING.panel }}
        exit={{ x: "100%", transition: EXIT }}
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0, right: 1 }}
        onDragEnd={(_, info) => {
          if (info.offset.x > DISMISS.distance || info.velocity.x > DISMISS.velocity) close();
        }}
      >
        {children}
      </motion.div>
    </div>,
    document.body
  );
}
