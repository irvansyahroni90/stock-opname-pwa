import React from "react";
import { motion } from "motion/react";
import { SPRING, DUR, EASE } from "./motion";
import { corners } from "./Effects";

// =====================================================================
// Kartu sambutan (hero) di atas tiap aplikasi, dan kartu di halaman awal.
//
// Keduanya berbagi id (morphId). Saat kartu di halaman awal disentuh,
// Motion melihat id yang sama muncul di layar aplikasi, lalu
// menganimasikan lapisan warnanya melebar dari bentuk kartu ke bentuk
// kartu sambutan. Saat pulang, terjadi sebaliknya.
//
// Lapisan warna sengaja dipisah dari isinya: yang berubah bentuk hanya
// warnanya, sehingga tulisan tidak ikut melar; isinya menyusul memudar.
// =====================================================================

export const morphId = (key) => `app-card-${key}`;

export const CARD_CORNERS = corners(26, 26, 26, 26);
export const HERO_CORNERS = corners(0, 0, 30, 30);

// Tinggi kartu sambutan (belum termasuk area poni iPhone).
export const HERO_HEIGHT = 244;

// fadeIn: dipakai kalau aplikasi dibuka tanpa lewat kartu (notifikasi,
// pintasan) — tidak ada kartu yang bisa melebar, jadi cukup memudar.
export function HeroSurface({ color, layoutId, fadeIn }) {
  return (
    <motion.span
      aria-hidden="true"
      layoutId={layoutId}
      className="absolute inset-0"
      style={{ background: color, ...HERO_CORNERS }}
      initial={fadeIn ? { opacity: 0 } : false}
      animate={fadeIn ? { opacity: 1, transition: { duration: DUR.base, ease: EASE.standard } } : undefined}
      transition={SPRING.page}
    />
  );
}

// Lingkaran hiasan — ikut menyusul bersama isinya, supaya tidak "melayang"
// sendirian sebelum latarnya sampai.
export function HeroDecor() {
  return (
    <motion.span
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={HERO_CORNERS}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { delay: 0.26, duration: DUR.base } }}
    >
      <span
        className="absolute rounded-full"
        style={{ right: -52, top: -60, width: 230, height: 230, background: "rgba(255,255,255,0.07)" }}
      />
      <span
        className="absolute rounded-full"
        style={{ right: 28, bottom: -66, width: 165, height: 165, background: "rgba(255,255,255,0.05)" }}
      />
    </motion.span>
  );
}

// Isi kartu sambutan: muncul menyusul setelah kartunya hampir mendarat.
export function HeroContent({ children, className, style }) {
  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0, transition: { ...SPRING.page, delay: 0.24 } }}
    >
      {children}
    </motion.div>
  );
}

// Wadah kartu sambutan lengkap: lapisan warna + hiasan + isi.
export function Hero({ color, layoutId, fadeIn, marginBottom = 0, children }) {
  return (
    <div
      className="relative"
      style={{
        zIndex: 1,
        height: `calc(${HERO_HEIGHT}px + env(safe-area-inset-top))`,
        marginLeft: -16,
        marginRight: -16,
        marginBottom,
      }}
    >
      <HeroSurface color={color} layoutId={layoutId} fadeIn={fadeIn} />
      <HeroDecor />
      <HeroContent
        className="relative h-full flex flex-col justify-between"
        style={{ padding: "calc(env(safe-area-inset-top) + 24px) 22px 20px" }}
      >
        {children}
      </HeroContent>
    </div>
  );
}
