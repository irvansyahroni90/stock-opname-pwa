import React from "react";
import { motion, AnimatePresence, useIsPresent } from "motion/react";
import { DUR, EASE, EXIT, SPRING } from "./motion";

// =====================================================================
// Blok-blok gerak kecil yang dipakai di seluruh aplikasi. Semuanya
// mengambil durasi & kurva dari motion.js, jadi rasanya selalu seragam.
// =====================================================================

// ---------------------------------------------------------------------
// Screen — satu "layar" penuh (halaman awal, Stok, Kas, Agenda).
// Layar yang sedang aktif selalu di atas; layar yang sedang pergi turun ke
// bawah lalu memudar. Pakai di dalam <AnimatePresence>.
// ---------------------------------------------------------------------
export function Screen({ children }) {
  const isPresent = useIsPresent();
  return (
    <motion.div
      className="fixed inset-0"
      style={{ zIndex: isPresent ? 2 : 1 }}
      exit={{ opacity: 0, transition: { duration: 0.3, ease: EASE.standard } }}
    >
      {children}
    </motion.div>
  );
}

// Latar warna sebuah layar. Memudar masuk, jadi layar baru "menutupi" layar
// lama dengan lembut, bukan menggantinya mendadak.
export function Backdrop({ color }) {
  return (
    <motion.div
      aria-hidden="true"
      className="fixed inset-0"
      style={{ background: color }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: DUR.base, ease: EASE.standard } }}
    />
  );
}

// Isi yang naik sedikit sambil muncul — dipakai untuk konten di bawah kartu
// sambutan, supaya menyusul setelah kartunya hampir mendarat.
export function Rise({ children, delay = 0, className, style }) {
  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0, transition: { ...SPRING.page, delay } }}
    >
      {children}
    </motion.div>
  );
}

// Berganti silang cepat saat `swapKey` berubah (mis. ganti filter), tanpa
// efek beruntun per baris.
export function FadeSwap({ swapKey, children, className, style }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={swapKey}
        className={className}
        style={style}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { duration: DUR.micro, ease: EASE.standard } }}
        exit={{ opacity: 0, transition: { duration: 0.1, ease: EASE.in } }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// Daftar yang barisnya hidup: baris baru muncul, baris dihapus menyusut
// hilang dan celahnya menutup, baris yang pindah urutan meluncur ke tempat
// barunya. Setiap anak WAJIB punya `key` yang tetap (mis. id item).
export function AnimatedList({ children, className = "", style }) {
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <div className={`relative ${className}`} style={style}>
      <AnimatePresence initial={false} mode="popLayout">
        {items.map((child) => (
          <motion.div
            key={child.key}
            layout="position"
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96, transition: EXIT }}
            transition={SPRING.snappy}
          >
            {child}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// Isi drawer menyusul satu per satu setelah panelnya meluncur masuk.
const staggerParent = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.1 } },
};
const staggerChild = {
  hidden: { opacity: 0, x: 18 },
  show: { opacity: 1, x: 0, transition: SPRING.panel },
};

export function Stagger({ children, className, style }) {
  return (
    <motion.div className={className} style={style} variants={staggerParent} initial="hidden" animate="show">
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className, style }) {
  return (
    <motion.div className={className} style={style} variants={staggerChild}>
      {children}
    </motion.div>
  );
}

// Bagian yang bisa dibuka-tutup (rincian split, detail analisis): tingginya
// ikut membuka dengan halus, bukan muncul mendadak.
export function Collapse({ open, children }) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="collapse"
          style={{ overflow: "hidden" }}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1, transition: { ...SPRING.panel, opacity: { duration: DUR.fast } } }}
          exit={{ height: 0, opacity: 0, transition: EXIT }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Pendar lembut satu kali saat sebuah item dituju dari beranda/notifikasi.
// Dipakai sebagai props `animate` + `transition` pada motion.div baris.
export function highlightMotion(active, rgb) {
  if (!active) {
    return { animate: { boxShadow: `0 0 0 0px rgba(${rgb},0)` }, transition: { duration: DUR.fast } };
  }
  return {
    animate: {
      boxShadow: [`0 0 0 0px rgba(${rgb},0)`, `0 0 0 4px rgba(${rgb},0.55)`, `0 0 0 0px rgba(${rgb},0)`],
    },
    transition: { duration: 1.3, ease: "easeInOut", times: [0, 0.35, 1], delay: 0.35 },
  };
}

// Radius sudut ditulis per sudut supaya Motion bisa menganimasikannya dengan
// benar saat kartu berubah bentuk jadi kartu sambutan (dan sebaliknya).
export function corners(tl, tr, br, bl) {
  return {
    borderTopLeftRadius: tl,
    borderTopRightRadius: tr,
    borderBottomRightRadius: br,
    borderBottomLeftRadius: bl,
  };
}
