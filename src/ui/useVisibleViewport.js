import { useEffect, useState } from "react";

// Mengikuti tinggi area layar yang BENAR-BENAR terlihat. Saat papan ketik HP
// muncul, tinggi layar (100dvh) tidak ikut mengecil, jadi jendela formulir
// tetap setinggi semula dan bagian bawahnya tertutup papan ketik tanpa bisa
// digulir. Nilai dari visualViewport ikut mengecil, sehingga masalah itu
// hilang.
export function useVisibleViewport() {
  const [vp, setVp] = useState(() => ({
    height: typeof window !== "undefined" ? window.innerHeight : 0,
    offsetTop: 0,
  }));

  useEffect(() => {
    const visual = window.visualViewport;
    const read = () => {
      if (visual) setVp({ height: visual.height, offsetTop: visual.offsetTop });
      else setVp({ height: window.innerHeight, offsetTop: 0 });
    };
    read();
    if (visual) {
      visual.addEventListener("resize", read);
      visual.addEventListener("scroll", read);
      return () => {
        visual.removeEventListener("resize", read);
        visual.removeEventListener("scroll", read);
      };
    }
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);

  return vp;
}
