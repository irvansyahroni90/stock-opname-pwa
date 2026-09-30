import React, { useLayoutEffect, useRef, useState } from "react";
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
      // Kalau layar yang sedang memudar pergi dipanggil balik sebelum
      // selesai (mis. menekan kembali saat animasi buka belum tuntas), layar
      // itu dipakai ulang — jadi harus bisa tampil lagi, bukan tetap
      // transparan.
      initial={false}
      animate={{ opacity: 1, transition: { duration: 0.2, ease: EASE.standard } }}
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

// ---------------------------------------------------------------------
// CardRings — dua lapisan cincin di atas kartu (pointer-events: none):
//  - ring: garis tepi berwarna, mis. saat ada perubahan belum disimpan;
//  - glow: pendar satu kali saat kartu dituju dari beranda/notifikasi.
// Dipisah dari kartunya supaya bayangan kartu tetap utuh dan kedua efek
// tidak saling menimpa. Kartu induknya harus position: relative.
// ---------------------------------------------------------------------
export function CardRings({ radius = 20, ring = false, ringRgb = "224,138,60", ringWidth = 1.5, highlighted = false, glowRgb = "224,138,60" }) {
  const glow = highlightMotion(highlighted, glowRgb);
  return (
    <>
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ borderRadius: radius }}
        initial={false}
        animate={{ boxShadow: ring ? `0 0 0 ${ringWidth}px rgba(${ringRgb},1)` : `0 0 0 0px rgba(${ringRgb},0)` }}
        transition={{ duration: DUR.fast, ease: EASE.standard }}
      />
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ borderRadius: radius }}
        initial={false}
        animate={glow.animate}
        transition={glow.transition}
      />
    </>
  );
}

// ---------------------------------------------------------------------
// AutoHeight — tingginya mengikuti isi. Saat `swapKey` berganti (mis.
// "Dari daftar stok" ↔ "Barang lain"), perubahan tinggi berikutnya
// dianimasikan pelan supaya jendelanya memanjang/memendek halus, bukan
// melompat. Perubahan lain (mis. bagian di dalamnya yang sedang membuka
// sendiri) diikuti langsung tanpa animasi tambahan, supaya tidak ada dua
// animasi yang saling kejar.
// ---------------------------------------------------------------------
export function AutoHeight({ swapKey, children, className, style }) {
  const innerRef = useRef(null);
  const [state, setState] = useState({ height: "auto", animate: false });
  const [clipping, setClipping] = useState(false);
  const lastKey = useRef(swapKey);
  const pendingSwap = useRef(false);
  const swapTimer = useRef(null);

  if (lastKey.current !== swapKey) {
    lastKey.current = swapKey;
    pendingSwap.current = true;
  }

  // Kalau pergantian isi ternyata tidak mengubah tinggi, tandanya dilepas.
  useLayoutEffect(() => {
    const t = setTimeout(() => (pendingSwap.current = false), 700);
    return () => clearTimeout(t);
  }, [swapKey]);

  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    let prev = el.offsetHeight;
    setState({ height: prev, animate: false });
    const ro = new ResizeObserver(() => {
      const h = el.offsetHeight;
      if (h === prev) return;
      prev = h;
      const animate = pendingSwap.current;
      if (animate) {
        // Isi baru sudah terpasang; beri waktu sebentar untuk menyelesaikan
        // perubahan tinggi dari pergantian ini, lalu kembali mengikuti biasa.
        clearTimeout(swapTimer.current);
        swapTimer.current = setTimeout(() => (pendingSwap.current = false), 120);
      }
      setState({ height: h, animate });
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      clearTimeout(swapTimer.current);
    };
  }, []);

  return (
    <motion.div
      className={className}
      // Hanya dipotong selama bergerak, supaya garis fokus & bayangan di
      // dalamnya tidak ikut terpotong saat diam.
      style={{ ...style, overflow: clipping ? "hidden" : "visible" }}
      initial={false}
      animate={{ height: state.height }}
      transition={state.animate ? SPRING.panel : { duration: 0 }}
      onAnimationStart={() => state.animate && setClipping(true)}
      onAnimationComplete={() => setClipping(false)}
    >
      <div ref={innerRef}>{children}</div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------
// CollapseList — daftar yang barisnya membuka/menutup TINGGINYA saat
// ditambah/dihapus. Semua yang ada di bawahnya (judul kelompok, kartu lain,
// keterangan) ikut bergeser mulus karena memang tata letaknya yang berubah
// sedikit demi sedikit — tidak ada yang melompat atau saling menumpuk.
// Dipakai untuk baris di dalam satu kartu (Akan Dibeli, Agenda, Kas).
//
// spacing: jarak antar baris (ditaruh di dalam baris supaya ikut menutup).
// ---------------------------------------------------------------------
export function CollapseList({ children, className, style, spacing = 0, spacingSide = "bottom" }) {
  const items = React.Children.toArray(children).filter(Boolean);
  const pad = spacing ? (spacingSide === "top" ? { paddingTop: spacing } : { paddingBottom: spacing }) : null;
  return (
    <div className={className} style={style}>
      <AnimatePresence initial={false}>
        {items.map((child) => (
          <motion.div
            key={child.key}
            initial={{ height: 0, opacity: 0, overflow: "hidden" }}
            animate={{
              height: "auto",
              opacity: 1,
              transition: { height: SPRING.panel, opacity: { duration: DUR.fast, delay: 0.06 } },
              transitionEnd: { overflow: "visible" },
            }}
            exit={{
              height: 0,
              opacity: 0,
              overflow: "hidden",
              transition: { height: { duration: 0.3, ease: EASE.ios }, opacity: { duration: 0.16, ease: EASE.in } },
            }}
          >
            {pad ? <div style={pad}>{child}</div> : child}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
