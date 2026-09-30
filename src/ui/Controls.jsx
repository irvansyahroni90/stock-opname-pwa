import React, { useEffect, useId, useRef } from "react";
import { motion, LayoutGroup } from "motion/react";
import { Minus, Plus, X } from "lucide-react";
import { SPRING, DUR, EASE } from "./motion";

// ---------------------------------------------------------------------
// Segmented — pilihan 2–4 opsi dengan "pil" yang meluncur ke opsi aktif.
// Tiap instance punya LayoutGroup sendiri (useId), jadi dua Segmented di
// layar yang sama tidak saling "mencuri" pil.
// ---------------------------------------------------------------------
export function Segmented({
  options,
  value,
  onChange,
  activeBg = "#26314D",
  activeColor = "#FFFFFF",
  inkSoft = "#6B685F",
  trackBg = "#F6F4EC",
  height = 40,
  fontSize = 13,
  ariaLabel,
  style,
}) {
  const id = useId();
  // Warna pil bisa berbeda per opsi (mis. Pengeluaran merah, Pemasukan
  // hijau). Pil yang baru muncul mulai dari warna sebelumnya lalu berganti
  // halus sambil meluncur.
  const current = options.find((o) => o.value === value);
  const currentBg = (current && current.activeBg) || activeBg;
  const prevBg = useRef(currentBg);
  const fromBg = prevBg.current;
  useEffect(() => {
    prevBg.current = currentBg;
  }, [currentBg]);
  return (
    <LayoutGroup id={id}>
      <div
        role="group"
        aria-label={ariaLabel}
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
          gap: 4,
          background: trackBg,
          borderRadius: 14,
          padding: 3,
          ...style,
        }}
      >
        {options.map((o) => {
          const active = o.value === value;
          const bg = o.activeBg || activeBg;
          return (
            <motion.button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              aria-pressed={active}
              className="no-tx"
              initial={false}
              animate={{ color: active ? activeColor : inkSoft }}
              transition={{ duration: DUR.fast, ease: EASE.standard }}
              style={{
                position: "relative",
                height,
                border: "none",
                borderRadius: 11,
                background: "transparent",
                fontSize,
                fontWeight: active ? 600 : 500,
                lineHeight: 1.15,
                padding: "0 6px",
                fontFamily: "inherit",
              }}
            >
              {active && (
                <motion.span
                  layoutId="seg-pill"
                  initial={{ backgroundColor: fromBg }}
                  animate={{ backgroundColor: bg }}
                  transition={{ ...SPRING.snappy, backgroundColor: { duration: DUR.fast, ease: EASE.standard } }}
                  style={{ position: "absolute", inset: 0, borderRadius: 11, boxShadow: "0 1px 3px rgba(0,0,0,0.10)" }}
                />
              )}
              <span style={{ position: "relative", display: "block" }}>
                {o.label}
                {o.sub && (
                  <span style={{ display: "block", fontSize: 11, fontWeight: 400, opacity: active ? 0.78 : 1 }}>{o.sub}</span>
                )}
              </span>
            </motion.button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}

// ---------------------------------------------------------------------
// Stepper — tombol − / + dengan angka di tengah yang juga bisa diketik.
// value berupa string supaya kolom boleh kosong saat sedang diketik.
// size "md" = tombol 44px (formulir), "lg" = 56px (sheet sudah dibeli).
// ---------------------------------------------------------------------
const fmtNum = (n) => {
  const r = Math.round(n * 100) / 100;
  return String(r);
};

export function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  size = "md",
  unit,
  trackBg = "#F6F4EC",
  btnBg = "#FFFFFF",
  ink = "#2B2B26",
  inkSoft = "#6B685F",
  ariaLabel = "Jumlah",
  numberStyle,
  style,
}) {
  const lg = size === "lg";
  const btn = lg ? 56 : 44;
  const inputRef = useRef(null);
  const num = parseFloat(String(value).replace(",", "."));
  const cur = Number.isFinite(num) ? num : 0;
  const dec = () => onChange(fmtNum(Math.max(min, cur - step)));
  const inc = () => onChange(fmtNum(cur + step));
  const canDec = cur - step >= min - 1e-9;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: trackBg,
        borderRadius: lg ? 20 : 14,
        padding: lg ? 8 : 3,
        gap: 4,
        ...style,
      }}
    >
      <button
        type="button"
        aria-label={`Kurangi ${ariaLabel.toLowerCase()}`}
        onClick={dec}
        disabled={!canDec}
        style={{
          width: btn,
          height: btn,
          flexShrink: 0,
          borderRadius: lg ? 15 : 11,
          border: "none",
          background: btnBg,
          color: ink,
          opacity: canDec ? 1 : 0.4,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
        }}
      >
        <Minus size={lg ? 20 : 16} strokeWidth={2.4} />
      </button>
      <div
        onClick={() => inputRef.current && inputRef.current.focus()}
        style={{ flex: 1, minWidth: 0, alignSelf: "stretch", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, cursor: "text" }}
      >
        <input
          ref={inputRef}
          aria-label={ariaLabel}
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9.,]/g, ""))}
          onFocus={(e) => e.target.select()}
          className={lg ? "fs-36" : "fs-19"}
          style={{
            // Lebar mengikuti isi, supaya satuan menempel di samping angka.
            width: `calc(${Math.max(1, String(value).length)}ch + 6px)`,
            minWidth: 0,
            maxWidth: lg ? 160 : 70,
            textAlign: "center",
            border: "none",
            outline: "none",
            background: "transparent",
            fontWeight: 700,
            color: ink,
            padding: 0,
            fontFamily: "inherit",
            ...numberStyle,
          }}
        />
        {unit && <span style={{ fontSize: lg ? 15 : 12.5, color: inkSoft, flexShrink: 0 }}>{unit}</span>}
      </div>
      <button
        type="button"
        aria-label={`Tambah ${ariaLabel.toLowerCase()}`}
        onClick={inc}
        style={{
          width: btn,
          height: btn,
          flexShrink: 0,
          borderRadius: lg ? 15 : 11,
          border: "none",
          background: btnBg,
          color: ink,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
        }}
      >
        <Plus size={lg ? 20 : 16} strokeWidth={2.4} />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------
// Chip — tombol pil kecil (satuan, dompet, tanggal cepat). Warna aktif
// berganti dengan halus lewat Motion.
// ---------------------------------------------------------------------
export function Chip({
  active,
  onClick,
  children,
  activeBg = "#26314D",
  activeColor = "#FFFFFF",
  ink = "#2B2B26",
  inkSoft = "#6B685F",
  border = "#E1DDD0",
  dashed = false,
  height = 36,
  title,
  tabIndex,
  ariaHidden,
  style,
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      title={title}
      tabIndex={tabIndex}
      aria-hidden={ariaHidden || undefined}
      aria-pressed={dashed ? undefined : !!active}
      className="no-tx"
      initial={false}
      animate={{
        backgroundColor: active ? activeBg : dashed ? "rgba(255,255,255,0)" : "#FFFFFF",
        color: active ? activeColor : dashed ? inkSoft : ink,
        borderColor: active ? activeBg : dashed ? "#D6D1C3" : border,
      }}
      transition={{ duration: DUR.fast, ease: EASE.standard }}
      style={{
        height,
        padding: "0 14px",
        borderRadius: 999,
        borderWidth: 1,
        borderStyle: dashed ? "dashed" : "solid",
        fontSize: 13,
        fontWeight: active ? 600 : 500,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        whiteSpace: "nowrap",
        fontFamily: "inherit",
        ...style,
      }}
    >
      {children}
    </motion.button>
  );
}

// ---------------------------------------------------------------------
// SheetHeader — judul jendela + tombol tutup bulat 44px.
// ---------------------------------------------------------------------
export function SheetHeader({ title, sub, onClose, titleFont = "'Baloo 2', cursive", closeBg = "#F6F4EC", closeColor = "#6B685F", right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 14 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: titleFont, fontWeight: 700, fontSize: 22, lineHeight: 1.15 }}>{title}</div>
        {sub && <div style={{ fontSize: 12.5, opacity: 0.7, marginTop: 2 }}>{sub}</div>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        {right}
        <button
          type="button"
          aria-label="Tutup"
          title="Tutup"
          onClick={onClose}
          style={{ width: 44, height: 44, borderRadius: 999, border: "none", background: closeBg, color: closeColor, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <X size={17} strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// FieldLabel — label kecil di atas kolom.
// ---------------------------------------------------------------------
export function FieldLabel({ children, color = "#6B685F", style }) {
  return <div style={{ fontSize: 12.5, fontWeight: 500, color, marginBottom: 6, ...style }}>{children}</div>;
}
