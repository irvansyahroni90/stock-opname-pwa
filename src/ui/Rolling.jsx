import React, { useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { SPRING, DUR, EASE } from "./motion";

// ---------------------------------------------------------------------
// RollingNumber — angka yang bergulir saat nilainya berubah: naik bila
// bertambah, turun bila berkurang. Tidak beranimasi saat pertama tampil.
// Bisa juga dipakai untuk teks (mis. "Rp 125.000").
// ---------------------------------------------------------------------
const roll = {
  enter: (dir) => ({ y: dir > 0 ? "65%" : "-65%", opacity: 0 }),
  center: { y: 0, opacity: 1 },
  exit: (dir) => ({ y: dir > 0 ? "-65%" : "65%", opacity: 0 }),
};

export function RollingNumber({ value, style, className }) {
  const prev = useRef(value);
  const dir = useRef(1);
  if (prev.current !== value) {
    const a = Number(prev.current);
    const b = Number(value);
    dir.current = Number.isFinite(a) && Number.isFinite(b) && b < a ? -1 : 1;
    prev.current = value;
  }
  return (
    <span className={className} style={{ position: "relative", display: "inline-flex", overflow: "hidden", verticalAlign: "bottom", ...style }}>
      <AnimatePresence initial={false} mode="popLayout" custom={dir.current}>
        <motion.span
          key={String(value)}
          custom={dir.current}
          variants={roll}
          initial="enter"
          animate="center"
          exit="exit"
          transition={SPRING.snappy}
          style={{ display: "inline-block", whiteSpace: "pre" }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

// ---------------------------------------------------------------------
// CheckCircle — lingkaran centang. Warnanya mengisi dengan halus dan
// tanda centangnya tergambar sebagai garis, bukan muncul mendadak.
// ---------------------------------------------------------------------
export function CheckCircle({ checked, onClick, size = 20, color, borderColor, borderWidth = 1.5, title, style, hit = false }) {
  const circle = {
    initial: false,
    animate: {
      backgroundColor: checked ? color : "rgba(255,255,255,0)",
      borderColor: checked ? color : borderColor,
    },
    transition: { duration: DUR.fast, ease: EASE.standard },
  };
  const mark = (
    <svg width={size * 0.58} height={size * 0.58} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
      <motion.path
        d="M20 6 9 17l-5-5"
        initial={false}
        animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
        transition={checked ? { duration: 0.28, ease: EASE.out, delay: 0.06 } : { duration: 0.12 }}
      />
    </svg>
  );
  const circleStyle = { width: size, height: size, borderRadius: 999, borderWidth, borderStyle: "solid", boxSizing: "border-box" };

  // hit: area sentuh 44px (standar jari) dengan lingkaran kecil di tengahnya.
  if (hit) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={title}
        aria-label={title}
        aria-pressed={checked}
        className="no-tx flex items-center justify-center shrink-0"
        style={{ width: 44, height: 44, border: "none", background: "transparent", padding: 0, ...style }}
      >
        <motion.span {...circle} className="flex items-center justify-center" style={circleStyle}>
          {mark}
        </motion.span>
      </button>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={checked}
      className="no-tx flex items-center justify-center shrink-0"
      {...circle}
      style={{ ...circleStyle, ...style }}
    >
      {mark}
    </motion.button>
  );
}
