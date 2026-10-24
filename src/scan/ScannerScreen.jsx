import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, LayoutGroup } from "motion/react";
import { X, Camera, Image as ImageIcon, Flashlight, FlashlightOff, ImagePlus, Loader2, ScanLine, HelpCircle, Check, AlertTriangle } from "lucide-react";
import { scanFrame, scanPhoto, warmupScanner } from "./scanner";
import { DUR, EASE, EXIT, SPRING } from "../ui/motion";

// =====================================================================
// Layar scan label QR — dua cara:
//   • Kamera: arahkan kamera, setiap label yang terlihat langsung masuk
//     daftar (bisa banyak sekaligus dalam satu bingkai).
//   • Foto: ambil foto / pilih dari galeri. SEMUA label di foto dibaca
//     (20, 30, 40… tidak ada batas), lalu ditandai satu per satu di foto.
// Kode yang terbaca dikumpulkan di `codes` (milik induk), jadi tombol
// "Scan lagi" dari daftar hasil tidak menghapus yang sudah terbaca.
// =====================================================================

const GREEN = "#3DDC84";
const AMBER = "#FFB547";
const PANEL = "#151A2B";

function centerOf(pts) {
  let x = 0;
  let y = 0;
  pts.forEach((p) => {
    x += p[0];
    y += p[1];
  });
  return [x / pts.length, y / pts.length];
}

// Peta koordinat gambar → koordinat layar untuk object-fit cover/contain.
function fitMap(boxW, boxH, imgW, imgH, mode) {
  if (!boxW || !boxH || !imgW || !imgH) return null;
  const s = mode === "cover" ? Math.max(boxW / imgW, boxH / imgH) : Math.min(boxW / imgW, boxH / imgH);
  return { s, ox: (boxW - imgW * s) / 2, oy: (boxH - imgH * s) / 2 };
}

function useBoxSize(ref) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

function CodeOverlay({ box, frame, resolve, numbered, fit }) {
  if (!frame || !frame.codes.length) return null;
  const m = fitMap(box.w, box.h, frame.width, frame.height, fit);
  if (!m) return null;
  const P = (p) => [m.ox + p[0] * m.s, m.oy + p[1] * m.s];
  return (
    <svg className="absolute inset-0 pointer-events-none" width={box.w} height={box.h} aria-hidden="true">
      {frame.codes.map((c, i) => {
        const item = resolve(c.text);
        const col = item ? GREEN : AMBER;
        const pts = c.pts.map(P);
        const [cx, cy] = centerOf(pts);
        const side = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]);
        const r = Math.max(9, Math.min(15, side * 0.28));
        return (
          <g key={c.text + i}>
            <polygon points={pts.map((p) => p.join(",")).join(" ")} fill={item ? "rgba(61,220,132,0.20)" : "rgba(255,181,71,0.20)"} stroke={col} strokeWidth={2.5} strokeLinejoin="round" />
            {numbered ? (
              <>
                <circle cx={cx} cy={cy} r={r} fill={col} stroke="#0B0F1A" strokeWidth={1.5} />
                <text x={cx} y={cy + r * 0.36} textAnchor="middle" fontSize={r * 1.05} fontWeight={700} fill="#0B0F1A">
                  {item ? "✓" : "?"}
                </text>
              </>
            ) : (
              item && (
                <text x={cx} y={Math.max(...pts.map((p) => p[1])) + 18} textAnchor="middle" fontSize={13} fontWeight={700} fill="#FFFFFF" stroke="#0B0F1A" strokeWidth={3} paintOrder="stroke">
                  {item.name.length > 18 ? item.name.slice(0, 17) + "…" : item.name}
                </text>
              )
            )}
          </g>
        );
      })}
    </svg>
  );
}

function ModeSwitch({ mode, onChange }) {
  const opts = [
    { value: "camera", label: "Kamera", Icon: Camera },
    { value: "photo", label: "Foto", Icon: ImageIcon },
  ];
  return (
    <LayoutGroup id="scan-mode">
      <div role="group" aria-label="Cara scan" className="flex" style={{ background: "rgba(255,255,255,0.10)", borderRadius: 999, padding: 4, gap: 2 }}>
        {opts.map(({ value, label, Icon }) => {
          const active = mode === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(value)}
              className="relative flex items-center justify-center"
              style={{ height: 36, padding: "0 16px", gap: 7, borderRadius: 999, border: "none", background: "transparent", color: active ? "#10141F" : "rgba(255,255,255,0.78)", fontSize: 13.5, fontWeight: 600, transition: `color ${DUR.fast}s` }}
            >
              {active && <motion.span layoutId="scan-mode-pill" className="absolute inset-0" style={{ background: "#FFFFFF", borderRadius: 999 }} transition={SPRING.snappy} />}
              <Icon size={15} className="relative" />
              <span className="relative">{label}</span>
            </button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}

const glassBtn = { width: 44, height: 44, borderRadius: 999, border: "none", background: "rgba(255,255,255,0.12)", color: "#FFFFFF" };

export function ScannerScreen({ codes, onAddCodes, resolve, onClose, onContinue, paused, font, accent = "#E08A3C" }) {
  const [mode, setMode] = useState("camera");
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const stageRef = useRef(null);
  const box = useBoxSize(stageRef);
  const [camState, setCamState] = useState("idle"); // idle | starting | on | denied | unavailable
  const [live, setLive] = useState(null);
  const [torch, setTorch] = useState({ supported: false, on: false });
  const [photo, setPhoto] = useState(null); // { url, width, height, codes }
  const [busy, setBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const cameraInput = useRef(null);
  const galleryInput = useRef(null);
  const seenRef = useRef(new Set(codes));
  seenRef.current = new Set(codes);
  const urlsRef = useRef([]);

  useEffect(() => {
    warmupScanner();
    return () => urlsRef.current.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  const addCodes = (texts, haptic) => {
    const fresh = [...new Set(texts)].filter((t) => !seenRef.current.has(t));
    if (!fresh.length) return;
    fresh.forEach((t) => seenRef.current.add(t));
    onAddCodes(fresh);
    if (haptic && fresh.some((t) => resolve(t)) && navigator.vibrate) navigator.vibrate(25);
  };

  // --- Kamera -----------------------------------------------------------
  const stopStream = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setTorch({ supported: false, on: false });
  };

  useEffect(() => {
    if (mode !== "camera") {
      stopStream();
      setCamState("idle");
      setLive(null);
      return;
    }
    let cancelled = false;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCamState("unavailable");
      return;
    }
    setCamState("starting");
    navigator.mediaDevices
      .getUserMedia({ audio: false, video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } } })
      .then(async (stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          try {
            await v.play();
          } catch {
            /* autoplay diizinkan karena muted + playsInline */
          }
        }
        const track = stream.getVideoTracks()[0];
        const caps = track && track.getCapabilities ? track.getCapabilities() : {};
        setTorch({ supported: !!caps.torch, on: false });
        setCamState("on");
      })
      .catch((err) => {
        if (cancelled) return;
        setCamState(err && (err.name === "NotAllowedError" || err.name === "SecurityError") ? "denied" : "unavailable");
      });
    return () => {
      cancelled = true;
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Baca bingkai terus-menerus selama kamera aktif (berhenti saat daftar
  // hasil terbuka, supaya tidak menambah label di belakang layar).
  useEffect(() => {
    if (mode !== "camera" || camState !== "on" || paused) return;
    let stop = false;
    let timer = null;
    const tick = async () => {
      if (stop) return;
      const v = videoRef.current;
      if (v && v.readyState >= 2) {
        try {
          const r = await scanFrame(v);
          if (stop) return;
          setLive({ ...r, at: Date.now() });
          if (r.codes.length) addCodes(r.codes.map((c) => c.text), true);
        } catch {
          /* bingkai berikutnya */
        }
      }
      if (!stop) timer = setTimeout(tick, 90);
    };
    tick();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, camState, paused]);

  const toggleTorch = async () => {
    const track = streamRef.current && streamRef.current.getVideoTracks()[0];
    if (!track) return;
    const next = !torch.on;
    try {
      await track.applyConstraints({ advanced: [{ torch: next }] });
      setTorch((t) => ({ ...t, on: next }));
    } catch {
      setTorch({ supported: false, on: false });
    }
  };

  // --- Foto -------------------------------------------------------------
  const handleFiles = async (fileList) => {
    const files = Array.from(fileList || []).filter((f) => f && ((f.type || "").startsWith("image/") || /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name || "")));
    if (!files.length) return;
    setBusy(true);
    setPhotoError("");
    for (const f of files) {
      try {
        const r = await scanPhoto(f);
        urlsRef.current.push(r.url);
        setPhoto(r);
        addCodes(r.codes.map((c) => c.text), false);
      } catch {
        setPhotoError("Foto tidak bisa dibaca. Coba foto lain atau format JPG/PNG.");
      }
    }
    setBusy(false);
  };

  const known = useMemo(() => {
    const items = [];
    const ids = new Set();
    let unknown = 0;
    codes.forEach((c) => {
      const it = resolve(c);
      if (!it) unknown++;
      else if (!ids.has(it.id)) {
        ids.add(it.id);
        items.push(it);
      }
    });
    return { items, unknown };
  }, [codes, resolve]);

  const photoKnown = photo ? photo.codes.filter((c) => resolve(c.text)).length : 0;
  const photoUnknown = photo ? photo.codes.length - photoKnown : 0;

  return createPortal(
    <motion.div
      className="fixed inset-0 flex flex-col"
      style={{ zIndex: 45, background: "#0B0F1A", color: "#FFFFFF", fontFamily: font }}
      initial={{ y: "100%" }}
      animate={{ y: 0, transition: SPRING.page }}
      exit={{ y: "100%", transition: EXIT }}
      role="dialog"
      aria-modal="true"
      aria-label="Scan label QR"
    >
      {/* Bilah atas */}
      <div className="shrink-0 flex items-center justify-between px-4" style={{ paddingTop: "calc(env(safe-area-inset-top) + 10px)", paddingBottom: 10, gap: 10 }}>
        <button type="button" onClick={onClose} aria-label="Tutup" title="Tutup" className="flex items-center justify-center" style={glassBtn}>
          <X size={19} />
        </button>
        <ModeSwitch mode={mode} onChange={setMode} />
        {mode === "camera" && torch.supported ? (
          <button type="button" onClick={toggleTorch} aria-label={torch.on ? "Matikan senter" : "Nyalakan senter"} title="Senter" className="flex items-center justify-center" style={{ ...glassBtn, background: torch.on ? "#FFFFFF" : glassBtn.background, color: torch.on ? "#10141F" : "#FFFFFF" }}>
            {torch.on ? <Flashlight size={18} /> : <FlashlightOff size={18} />}
          </button>
        ) : (
          <span style={{ width: 44 }} />
        )}
      </div>

      {/* Area kamera / foto */}
      <div ref={stageRef} className="relative flex-1 overflow-hidden" style={{ margin: "0 12px", borderRadius: 24, background: "#05070D" }}>
        <AnimatePresence mode="popLayout" initial={false}>
          {mode === "camera" ? (
            <motion.div key="cam" className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: DUR.base, ease: EASE.standard } }} exit={{ opacity: 0, transition: EXIT }}>
              <video ref={videoRef} muted playsInline autoPlay className="absolute inset-0 w-full h-full" style={{ objectFit: "cover", opacity: camState === "on" ? 1 : 0, transition: `opacity ${DUR.base}s` }} />
              {camState === "on" && live && Date.now() - live.at < 900 && <CodeOverlay box={box} frame={live} resolve={resolve} fit="cover" />}
              {camState === "on" && (
                <div className="absolute left-0 right-0 flex justify-center pointer-events-none" style={{ top: 14 }}>
                  <span style={{ background: "rgba(11,15,26,0.62)", borderRadius: 999, padding: "7px 14px", fontSize: 12.5, color: "rgba(255,255,255,0.9)" }}>
                    Arahkan ke label — bisa banyak sekaligus
                  </span>
                </div>
              )}
              {camState === "starting" && (
                <div className="absolute inset-0 flex items-center justify-center" style={{ color: "rgba(255,255,255,0.7)", gap: 8, fontSize: 14 }}>
                  <Loader2 size={18} className="animate-spin" /> Menyalakan kamera…
                </div>
              )}
              {(camState === "denied" || camState === "unavailable") && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8" style={{ gap: 12 }}>
                  <Camera size={30} color="rgba(255,255,255,0.6)" />
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{camState === "denied" ? "Izin kamera belum diberikan" : "Kamera tidak bisa dipakai"}</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.68)", lineHeight: 1.5 }}>
                    {camState === "denied"
                      ? "Izinkan akses kamera untuk aplikasi ini di pengaturan browser, lalu buka lagi. Atau pakai mode Foto."
                      : "Perangkat ini tidak mengizinkan kamera langsung. Mode Foto tetap bisa dipakai."}
                  </div>
                  <button type="button" onClick={() => setMode("photo")} style={{ marginTop: 4, height: 44, padding: "0 18px", borderRadius: 14, border: "none", background: "#FFFFFF", color: "#10141F", fontWeight: 600, fontSize: 14 }}>
                    Pakai foto
                  </button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="photo" className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: DUR.base, ease: EASE.standard } }} exit={{ opacity: 0, transition: EXIT }}>
              {photo ? (
                <>
                  <img src={photo.url} alt="Foto label" className="absolute inset-0 w-full h-full" style={{ objectFit: "contain" }} />
                  {!busy && <CodeOverlay box={box} frame={photo} resolve={resolve} fit="contain" numbered />}
                  <div className="absolute left-0 right-0 flex justify-center pointer-events-none" style={{ top: 14 }}>
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span
                        key={busy ? "busy" : `n-${photo.codes.length}-${photo.url}`}
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0, transition: { duration: DUR.fast, ease: EASE.out } }}
                        exit={{ opacity: 0, transition: { duration: DUR.micro } }}
                        className="flex items-center"
                        style={{ gap: 7, background: "rgba(11,15,26,0.72)", borderRadius: 999, padding: "7px 14px", fontSize: 13, fontWeight: 600 }}
                      >
                        {busy ? (
                          <>
                            <Loader2 size={15} className="animate-spin" /> Membaca label…
                          </>
                        ) : photo.codes.length === 0 ? (
                          <>
                            <AlertTriangle size={15} color={AMBER} /> Tidak ada label terbaca
                          </>
                        ) : (
                          <>
                            <Check size={15} color={GREEN} /> {photoKnown} label terbaca
                            {photoUnknown > 0 && <span style={{ color: AMBER }}>· {photoUnknown} tidak dikenal</span>}
                          </>
                        )}
                      </motion.span>
                    </AnimatePresence>
                  </div>
                  <div className="absolute flex" style={{ right: 12, bottom: 12, gap: 8 }}>
                    <button type="button" disabled={busy} onClick={() => galleryInput.current && galleryInput.current.click()} className="flex items-center" style={{ height: 40, padding: "0 14px", gap: 7, borderRadius: 999, border: "none", background: "rgba(11,15,26,0.72)", color: "#FFFFFF", fontSize: 13, fontWeight: 600 }}>
                      <ImageIcon size={16} /> Galeri
                    </button>
                    <button type="button" disabled={busy} onClick={() => cameraInput.current && cameraInput.current.click()} className="flex items-center" style={{ height: 40, padding: "0 14px", gap: 7, borderRadius: 999, border: "none", background: "rgba(255,255,255,0.92)", color: "#10141F", fontSize: 13, fontWeight: 600 }}>
                      <ImagePlus size={16} /> Foto lagi
                    </button>
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center px-7 text-center" style={{ gap: 14 }}>
                  {busy ? (
                    <div className="flex items-center" style={{ gap: 8, color: "rgba(255,255,255,0.8)", fontSize: 14 }}>
                      <Loader2 size={18} className="animate-spin" /> Membaca label…
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-center" style={{ width: 64, height: 64, borderRadius: 22, background: "rgba(255,255,255,0.08)" }}>
                        <ScanLine size={30} />
                      </div>
                      <div style={{ fontSize: 17, fontWeight: 700 }}>Foto semua labelnya sekaligus</div>
                      <div style={{ fontSize: 13, lineHeight: 1.55, color: "rgba(255,255,255,0.7)", maxWidth: 300 }}>
                        Semua label di foto dibaca — 20, 30 atau lebih. Pastikan tiap label terlihat utuh, cukup terang, dan tidak buram.
                      </div>
                      <div className="flex flex-col w-full" style={{ gap: 10, maxWidth: 300, marginTop: 6 }}>
                        <button type="button" onClick={() => cameraInput.current && cameraInput.current.click()} className="flex items-center justify-center" style={{ height: 50, gap: 9, borderRadius: 16, border: "none", background: accent, color: "#FFFFFF", fontSize: 15, fontWeight: 700 }}>
                          <Camera size={18} /> Ambil foto
                        </button>
                        <button type="button" onClick={() => galleryInput.current && galleryInput.current.click()} className="flex items-center justify-center" style={{ height: 50, gap: 9, borderRadius: 16, border: "1px solid rgba(255,255,255,0.22)", background: "transparent", color: "#FFFFFF", fontSize: 15, fontWeight: 600 }}>
                          <ImageIcon size={18} /> Pilih dari galeri
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
              {photoError && (
                <div className="absolute left-3 right-3 text-center" style={{ bottom: 64, background: "rgba(185,58,46,0.92)", borderRadius: 12, padding: "9px 12px", fontSize: 13 }}>
                  {photoError}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }} />
        <input ref={galleryInput} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }} />
      </div>

      {/* Daftar yang sudah terbaca */}
      <div className="shrink-0" style={{ padding: "12px 12px", paddingBottom: "max(24px, calc(env(safe-area-inset-bottom) + 10px))" }}>
        <div style={{ background: PANEL, borderRadius: 22, padding: "12px 12px 12px" }}>
          <div className="flex items-center justify-between" style={{ padding: "0 4px 8px" }}>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
              {known.items.length ? (
                <>
                  <b style={{ color: "#FFFFFF", fontSize: 15 }}>{known.items.length}</b> barang terbaca
                </>
              ) : (
                "Belum ada label terbaca"
              )}
            </div>
            {known.unknown > 0 && (
              <div className="flex items-center" style={{ gap: 5, fontSize: 12, color: AMBER }}>
                <HelpCircle size={13} /> {known.unknown} tidak dikenal
              </div>
            )}
          </div>
          <div className="flex overflow-x-auto" style={{ scrollbarWidth: "none", gap: 6, minHeight: 34, padding: "0 2px 2px" }} data-noswipe>
            <AnimatePresence initial={false}>
              {[...known.items].reverse().map((it) => (
                <motion.span
                  key={it.id}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1, transition: SPRING.press }}
                  exit={{ opacity: 0, scale: 0.8, transition: EXIT }}
                  className="shrink-0 flex items-center"
                  style={{ height: 34, padding: "0 12px", gap: 6, borderRadius: 999, background: "rgba(61,220,132,0.14)", color: "#CFF7DF", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}
                >
                  <Check size={13} color={GREEN} /> {it.name}
                </motion.span>
              ))}
            </AnimatePresence>
          </div>
          <button
            type="button"
            disabled={!codes.length || busy}
            onClick={onContinue}
            className="w-full flex items-center justify-center"
            style={{ marginTop: 10, height: 50, borderRadius: 16, border: "none", background: codes.length && !busy ? accent : "rgba(255,255,255,0.10)", color: codes.length && !busy ? "#FFFFFF" : "rgba(255,255,255,0.45)", fontSize: 15, fontWeight: 700, transition: `background ${DUR.fast}s, color ${DUR.fast}s` }}
          >
            {known.items.length ? `Lanjut · atur ${known.items.length} stok` : "Lanjut"}
          </button>
        </div>
      </div>
    </motion.div>,
    document.body
  );
}
