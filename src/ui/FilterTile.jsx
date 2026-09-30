import React from "react";
import { motion } from "motion/react";
import { SPRING, DUR } from "./motion";
import { RollingNumber } from "./Rolling";

// Kartu filter — angka besar berwarna sesuai maknanya, label abu-abu di
// bawahnya. Satu komponen untuk Stok, Akan Dibeli, Agenda, dan Transaksi Kas.
//
// Latar warna kartu yang aktif MELUNCUR ke kartu yang dipilih (bukan
// berganti mendadak), dan angkanya bergulir saat jumlahnya berubah.
// `group` wajib unik per deretan kartu (mis. "stok", "kas-tx").
export function FilterTile({
  group,
  label,
  value,
  color,
  active,
  onClick,
  activeBg,
  inkSoft = "#6B685F",
  valueFont = "'Baloo 2', cursive",
  shadowRgb = "38,49,77",
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className="relative min-w-0 text-left"
      style={{
        background: "#FFFFFF",
        borderRadius: 18,
        padding: "13px 12px 12px",
        boxShadow: active ? `0 4px 12px rgba(${shadowRgb},0.22)` : `0 2px 8px rgba(${shadowRgb},0.05)`,
      }}
    >
      {active && (
        <motion.span
          layoutId={group ? `${group}-tile` : undefined}
          className="absolute inset-0"
          style={{ background: activeBg, borderRadius: 18 }}
          transition={SPRING.snappy}
        />
      )}
      <motion.div
        className="relative"
        initial={false}
        animate={{ color: active ? "#FFFFFF" : color }}
        transition={{ duration: DUR.fast }}
        style={{ fontFamily: valueFont, fontWeight: 700, fontSize: 24, lineHeight: "26px" }}
      >
        <RollingNumber value={value} />
      </motion.div>
      <motion.div
        className="relative truncate"
        initial={false}
        animate={{ color: active ? "rgba(255,255,255,0.75)" : inkSoft }}
        transition={{ duration: DUR.fast }}
        style={{ fontSize: 12, marginTop: 2 }}
      >
        {label}
      </motion.div>
    </button>
  );
}
