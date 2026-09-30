import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, animate, useMotionValue } from "motion/react";
import { SPRING } from "./motion";

// ---------------------------------------------------------------------
// TabPager — halaman-halaman yang bisa digeser kiri/kanan (Beranda/Stok/
// Beli, Beranda/Transaksi/Dompet, List/Kalender).
//
// - Mengikuti jari 1:1 tanpa me-render ulang React di setiap gerakan
//   (posisinya motion value, bukan state).
// - Saat dilepas, lanjut dengan kecepatan lemparan jari lalu mendarat
//   dengan pegas tanpa pantulan.
// - Di ujung (tab pertama/terakhir) terasa "karet", tidak bisa kebablasan.
// - canNavigate(target) bisa menolak perpindahan (mis. ada perubahan stok
//   yang belum disetujui); halaman lalu kembali ke tempatnya.
// ---------------------------------------------------------------------
export function TabPager({ index, onIndexChange, canNavigate, onBlocked, children }) {
  const pages = React.Children.toArray(children);
  const count = pages.length;
  const wrapRef = useRef(null);
  const widthRef = useRef(0);
  const [width, setWidth] = useState(0);
  const x = useMotionValue(0);
  const draggedRef = useRef(false);
  const indexRef = useRef(index);
  indexRef.current = index;

  // Lebar halaman diukur dari elemennya sendiri (bukan 100vw), jadi tetap
  // pas walau layar diputar atau jendela browser diubah ukurannya.
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      widthRef.current = w;
      setWidth(w);
      x.set(-indexRef.current * w);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [x]);

  // Pindah tab (dari tombol nav, pintasan, atau selesai digeser).
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const controls = animate(x, -index * widthRef.current, SPRING.page);
    return () => controls.stop();
  }, [index, x]);

  // Jaring pengaman: wadah ini tidak boleh punya scroll horizontal sendiri
  // (mis. digeser diam-diam oleh scrollIntoView). Posisinya 100% dari x.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const reset = () => {
      if (el.scrollLeft !== 0) el.scrollLeft = 0;
    };
    el.addEventListener("scroll", reset, { passive: true });
    return () => el.removeEventListener("scroll", reset);
  }, []);

  const snapBack = () => animate(x, -indexRef.current * widthRef.current, SPRING.page);

  const handleDragEnd = (_, info) => {
    const w = widthRef.current || 1;
    const i = indexRef.current;
    let target = i;
    if (info.offset.x < -w * 0.2 || info.velocity.x < -500) target = i + 1;
    else if (info.offset.x > w * 0.2 || info.velocity.x > 500) target = i - 1;
    target = Math.max(0, Math.min(count - 1, target));

    if (target !== i && canNavigate && !canNavigate(target)) {
      onBlocked && onBlocked();
      target = i;
    }
    if (target === i) snapBack();
    else onIndexChange(target);

    // Lepas jari setelah menggeser jangan sampai dianggap "tap" pada tombol.
    setTimeout(() => {
      draggedRef.current = false;
    }, 60);
  };

  return (
    <div ref={wrapRef} className="relative h-full w-full" style={{ overflow: "clip" }}>
      <motion.div
        className="flex h-full"
        style={{ x, width: `${count * 100}%`, touchAction: "pan-y" }}
        drag={count > 1 ? "x" : false}
        dragDirectionLock
        dragMomentum={false}
        dragElastic={0.16}
        dragConstraints={{ left: -(count - 1) * width, right: 0 }}
        onDragStart={() => {
          draggedRef.current = true;
        }}
        onDragEnd={handleDragEnd}
        onClickCapture={(e) => {
          if (draggedRef.current) {
            e.stopPropagation();
            e.preventDefault();
          }
        }}
      >
        {pages.map((page, i) => (
          <div key={i} className="h-full shrink-0" style={{ width: `${100 / count}%` }}>
            {page}
          </div>
        ))}
      </motion.div>
    </div>
  );
}
