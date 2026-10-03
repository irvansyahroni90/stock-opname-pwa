import React, { useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { DUR, EASE } from "./motion";

// =====================================================================
// Grafik ringan (SVG) untuk Analisis.
//  - garis 2px, isi area tipis (wash), grid tipis, sumbu tenang;
//  - sentuh & geser di grafik → garis bantu + keterangan semua seri di
//    titik itu (geser di grafik tidak ikut menggeser tab);
//  - muncul dengan sapuan dari kiri ke kanan.
// =====================================================================

// Geser di dalam grafik dipakai untuk membaca nilai, jadi tidak boleh ikut
// menggeser tab. Motion (TabPager) mendengarkan pointerdown langsung di
// elemennya, maka penghentiannya harus listener asli, bukan event React.
function useStopSwipe() {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const stop = (e) => e.stopPropagation();
    el.addEventListener("pointerdown", stop);
    return () => el.removeEventListener("pointerdown", stop);
  });
  return ref;
}

function useWidth() {
  const ref = useRef(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setW(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

// Batas atas sumbu yang "bulat" (1, 2, 2.5, 5 × 10^n).
function niceMax(v) {
  if (!(v > 0)) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / exp;
  const step = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return step * exp;
}

const INK = { grid: "#EEEDE6", axis: "#8A938C", text: "#12301E", soft: "#66736A", surface: "#FFFFFF" };

function Tooltip({ x, width, children }) {
  // Kotak keterangan menempel di atas grafik, digeser supaya tidak keluar
  // dari tepi.
  const boxW = Math.min(200, width - 8);
  const left = Math.max(4, Math.min(width - boxW - 4, x - boxW / 2));
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{ top: 0, left, width: boxW, zIndex: 2 }}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0, transition: { duration: DUR.micro } }}
      exit={{ opacity: 0, transition: { duration: 0.1 } }}
    >
      <div style={{ background: "#FFFFFF", borderRadius: 12, padding: "8px 10px", boxShadow: "0 6px 20px rgba(18,48,30,0.16)", border: "1px solid #EEEDE6" }}>
        {children}
      </div>
    </motion.div>
  );
}

function TipRow({ color, label, value, strong }) {
  return (
    <div className="flex items-center" style={{ gap: 6, fontSize: 12, lineHeight: 1.5 }}>
      {color ? <span style={{ width: 10, height: 2.5, borderRadius: 2, background: color, flexShrink: 0 }} /> : <span style={{ width: 10 }} />}
      <span className="flex-1 truncate" style={{ color: INK.soft }}>
        {label}
      </span>
      <span style={{ fontWeight: strong ? 700 : 600, color: INK.text }}>{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------
// AreaChart — satu atau beberapa seri bertumpuk (mis. Kas + Saham + Emas).
// dates: label tiap titik (string YYYY-MM-DD); series: [{key,label,color,values}]
// ---------------------------------------------------------------------
export function AreaChart({ dates, series, height = 180, stacked = true, fmtValue, fmtAxis, fmtDate, showTotal = true, revealKey }) {
  const [ref, width] = useWidth();
  const svgRef = useStopSwipe();
  const [hover, setHover] = useState(null);
  const clipId = `clip-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const pad = { l: 42, r: 10, t: 12, b: 22 };
  const n = dates.length;
  const innerW = Math.max(1, width - pad.l - pad.r);
  const innerH = height - pad.t - pad.b;

  const layers = useMemo(() => {
    const acc = new Array(n).fill(0);
    return series.map((s) => {
      const lower = acc.slice();
      const upper = s.values.map((v, i) => {
        const val = Math.max(0, Number(v) || 0);
        acc[i] = stacked ? acc[i] + val : val;
        return acc[i];
      });
      return { ...s, lower: stacked ? lower : new Array(n).fill(0), upper };
    });
  }, [series, n, stacked]);

  const maxV = niceMax(Math.max(1, ...layers.flatMap((l) => l.upper)));
  const x = (i) => pad.l + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v) => pad.t + innerH - (v / maxV) * innerH;

  const pathFor = (pts) => pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("");

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    if (n === 0) return;
    const i = n <= 1 ? 0 : Math.round(((px - pad.l) / innerW) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };

  const ticks = [0, maxV / 2, maxV];
  const xLabels = n > 2 ? [0, Math.floor((n - 1) / 2), n - 1] : n === 2 ? [0, 1] : [0];

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <>
          <svg
            ref={svgRef}
            width={width}
            height={height}
            style={{ display: "block", touchAction: "pan-y" }}
            onPointerDown={onMove}
            onPointerMove={(e) => (e.pointerType === "mouse" || e.buttons || e.pressure > 0) && onMove(e)}
            onPointerLeave={(e) => e.pointerType === "mouse" && setHover(null)}
            onPointerUp={(e) => e.pointerType !== "mouse" && setHover(null)}
            onPointerCancel={() => setHover(null)}
          >
            <defs>
              <clipPath id={clipId}>
                <motion.rect
                  key={revealKey}
                  x={0}
                  y={0}
                  height={height}
                  initial={{ width: 0 }}
                  animate={{ width }}
                  transition={{ duration: 0.7, ease: EASE.out }}
                />
              </clipPath>
            </defs>
            {ticks.map((t, i) => (
              <g key={i}>
                <line x1={pad.l} x2={width - pad.r} y1={y(t)} y2={y(t)} stroke={INK.grid} strokeWidth={1} />
                <text x={pad.l - 6} y={y(t) + 3.5} textAnchor="end" fontSize={10} fill={INK.axis}>
                  {fmtAxis ? fmtAxis(t) : t}
                </text>
              </g>
            ))}
            {xLabels.map((i) => (
              <text key={i} x={x(i)} y={height - 6} fontSize={10} fill={INK.axis} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}>
                {fmtDate ? fmtDate(dates[i]) : dates[i]}
              </text>
            ))}
            <g clipPath={`url(#${clipId})`}>
              {layers.map((l) => {
                const top = l.upper.map((v, i) => [x(i), y(v)]);
                const bottom = l.lower.map((v, i) => [x(i), y(v)]).reverse();
                return (
                  <g key={l.key}>
                    <path d={`${pathFor(top)}${bottom.map((p) => `L${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("")}Z`} fill={l.color} fillOpacity={0.14} />
                    <path d={pathFor(top)} fill="none" stroke={l.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                  </g>
                );
              })}
              {/* Titik akhir tiap seri */}
              {hover === null &&
                n > 0 &&
                layers.map((l) => <circle key={l.key} cx={x(n - 1)} cy={y(l.upper[n - 1])} r={4} fill={l.color} stroke={INK.surface} strokeWidth={2} />)}
            </g>
            {hover !== null && (
              <g>
                <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + innerH} stroke={INK.axis} strokeWidth={1} />
                {layers.map((l) => (
                  <circle key={l.key} cx={x(hover)} cy={y(l.upper[hover])} r={4.5} fill={l.color} stroke={INK.surface} strokeWidth={2} />
                ))}
              </g>
            )}
          </svg>
          <AnimatePresence>
            {hover !== null && (
              <Tooltip key="tip" x={x(hover)} width={width}>
                <div style={{ fontSize: 11, color: INK.soft, marginBottom: 2 }}>{fmtDate ? fmtDate(dates[hover], true) : dates[hover]}</div>
                {showTotal && series.length > 1 && (
                  <TipRow label="Total" value={fmtValue(series.reduce((s, se) => s + (Number(se.values[hover]) || 0), 0))} strong />
                )}
                {series
                  .slice()
                  .reverse()
                  .map((se) => (
                    <TipRow key={se.key} color={se.color} label={se.label} value={fmtValue(Number(se.values[hover]) || 0)} strong={series.length === 1} />
                  ))}
              </Tooltip>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// PairBars — batang berpasangan per periode (Masuk vs Keluar).
// buckets: [{ key, label, a, b }] ; a & b dua nilai yang dibandingkan.
// ---------------------------------------------------------------------
export function PairBars({ buckets, height = 170, colorA, colorB, labelA, labelB, fmtValue, fmtAxis, revealKey }) {
  const [ref, width] = useWidth();
  const svgRef = useStopSwipe();
  const [active, setActive] = useState(null);
  const pad = { l: 42, r: 6, t: 12, b: 22 };
  const n = buckets.length;
  const innerW = Math.max(1, width - pad.l - pad.r);
  const innerH = height - pad.t - pad.b;
  const maxV = niceMax(Math.max(1, ...buckets.flatMap((b) => [b.a, b.b])));
  const band = innerW / Math.max(1, n);
  const barW = Math.max(4, Math.min(18, (band - 10) / 2));
  const y = (v) => pad.t + innerH - (v / maxV) * innerH;
  const ticks = [0, maxV / 2, maxV];
  // Label bawah dijarangkan kalau batangnya rapat, supaya tidak bertumpuk.
  const labelEvery = band >= 26 ? 1 : Math.ceil(26 / Math.max(1, band));

  // Batang dengan ujung atas membulat 4px, dasar rata di garis nol.
  const barPath = (x0, v) => {
    const h = Math.max(0, (v / maxV) * innerH);
    if (h <= 0.5) return "";
    const r = Math.min(4, h, barW / 2);
    const top = pad.t + innerH - h;
    const base = pad.t + innerH;
    return `M${x0},${base}L${x0},${top + r}Q${x0},${top} ${x0 + r},${top}L${x0 + barW - r},${top}Q${x0 + barW},${top} ${x0 + barW},${top + r}L${x0 + barW},${base}Z`;
  };

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <>
          <svg ref={svgRef} width={width} height={height} style={{ display: "block", touchAction: "pan-y" }} onPointerLeave={(e) => e.pointerType === "mouse" && setActive(null)}>
            {ticks.map((t, i) => (
              <g key={i}>
                <line x1={pad.l} x2={width - pad.r} y1={y(t)} y2={y(t)} stroke={INK.grid} strokeWidth={1} />
                <text x={pad.l - 6} y={y(t) + 3.5} textAnchor="end" fontSize={10} fill={INK.axis}>
                  {fmtAxis ? fmtAxis(t) : t}
                </text>
              </g>
            ))}
            {buckets.map((b, i) => {
              const cx = pad.l + band * i + band / 2;
              const xA = cx - barW - 1;
              const xB = cx + 1;
              const dim = active !== null && active !== i;
              return (
                <g
                  key={`${revealKey}-${b.key}`}
                  onPointerDown={() => setActive(active === i ? null : i)}
                  onPointerEnter={(e) => e.pointerType === "mouse" && setActive(i)}
                  style={{ cursor: "pointer" }}
                >
                  <rect x={pad.l + band * i} y={pad.t} width={band} height={innerH + pad.b} fill="transparent" />
                  <motion.g
                    style={{ originY: 1, transformBox: "fill-box" }}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1, opacity: dim ? 0.45 : 1 }}
                    transition={{ scaleY: { duration: 0.55, ease: EASE.out, delay: i * 0.03 }, opacity: { duration: DUR.micro } }}
                  >
                    <path d={barPath(xA, b.a)} fill={colorA} />
                    <path d={barPath(xB, b.b)} fill={colorB} />
                  </motion.g>
                  {(i % labelEvery === 0 || active === i) && (
                    <text x={cx} y={height - 6} fontSize={10} fill={active === i ? INK.text : INK.axis} textAnchor="middle" fontWeight={active === i ? 600 : 400}>
                      {b.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
          <AnimatePresence>
            {active !== null && buckets[active] && (
              <Tooltip key={`tip-${active}`} x={pad.l + band * active + band / 2} width={width}>
                <div style={{ fontSize: 11, color: INK.soft, marginBottom: 2 }}>{buckets[active].title || buckets[active].label}</div>
                <TipRow color={colorA} label={labelA} value={fmtValue(buckets[active].a)} />
                <TipRow color={colorB} label={labelB} value={fmtValue(buckets[active].b)} />
                <TipRow label="Selisih" value={`${buckets[active].a - buckets[active].b >= 0 ? "+" : "−"}${fmtValue(Math.abs(buckets[active].a - buckets[active].b))}`} strong />
              </Tooltip>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// Donut — komposisi (kategori, dompet, dll.). Segmen dipisah celah tipis.
// ---------------------------------------------------------------------
export function Donut({ slices, total, size = 168, stroke = 22, centerLabel, centerValue, activeKey, onSelect }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const gap = slices.length > 1 ? 2 : 0;
  let offset = 0;
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#EEEDE6" strokeWidth={stroke} />
        {slices.map((s, i) => {
          const frac = total > 0 ? s.total / total : 0;
          const len = Math.max(0, frac * circumference - gap);
          const el = (
            <motion.circle
              key={s.key}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={s.color}
              strokeWidth={activeKey === s.key ? stroke + 4 : stroke}
              strokeDasharray={`${len} ${circumference - len}`}
              strokeDashoffset={-offset}
              initial={{ opacity: 0 }}
              animate={{ opacity: activeKey && activeKey !== s.key ? 0.35 : 1 }}
              transition={{ duration: DUR.fast, delay: activeKey ? 0 : i * 0.04 }}
              onClick={() => onSelect && onSelect(s)}
              style={{ cursor: onSelect ? "pointer" : "default" }}
            />
          );
          offset += frac * circumference;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 pointer-events-none">
        <div style={{ fontSize: 11, color: INK.soft }}>{centerLabel}</div>
        <div style={{ fontWeight: 700, fontSize: 15, color: INK.text, lineHeight: 1.25 }}>{centerValue}</div>
      </div>
    </div>
  );
}
