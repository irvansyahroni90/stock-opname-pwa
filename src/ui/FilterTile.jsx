import React from "react";

// Kartu filter — angka besar berwarna sesuai maknanya, label abu-abu di
// bawahnya. Yang sedang dipilih jadi warna utama aplikasinya. Satu komponen
// untuk Stok, Akan Dibeli, Agenda, dan Transaksi Kas (dulu tiga salinan
// yang perilakunya berbeda-beda).
export function FilterTile({
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
      className="min-w-0 text-left"
      style={{
        background: active ? activeBg : "#FFFFFF",
        borderRadius: 18,
        padding: "13px 12px 12px",
        boxShadow: active ? `0 4px 12px rgba(${shadowRgb},0.22)` : `0 2px 8px rgba(${shadowRgb},0.05)`,
      }}
    >
      <div
        style={{
          fontFamily: valueFont,
          fontWeight: 700,
          fontSize: 24,
          lineHeight: "26px",
          color: active ? "#fff" : color,
        }}
      >
        {value}
      </div>
      <div className="truncate" style={{ fontSize: 12, marginTop: 2, color: active ? "rgba(255,255,255,0.75)" : inkSoft }}>
        {label}
      </div>
    </button>
  );
}
