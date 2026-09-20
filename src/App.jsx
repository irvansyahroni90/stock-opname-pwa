import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from "react";
import {
  Plus,
  Trash2,
  Pencil,
  History,
  X,
  Search,
  Minus,
  RotateCcw,
  Package,
  BarChart3,
  Receipt,
  Banknote,
  Milk,
  ShoppingBasket,
  ThumbsUp,
  AlertTriangle,
  ClipboardList,
  ShoppingCart,
  Check,
  Loader2,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ArrowLeft,
  ArrowLeftRight,
  ArrowUpRight,
  ArrowDownLeft,
  ListTodo,
  SlidersHorizontal,
  User,
  Download,
  Upload,
  Menu,
  Repeat,
  ChevronLeft,
  Home,
  CalendarCheck2,
  Calendar,
  StickyNote,
  Clock,
  CheckCircle2,
  LayoutGrid,
  LogOut,
  Eye,
  EyeOff,
  Bell,
  Wallet,
} from "lucide-react";
import { storageGet, storageSet, storageSubscribe, subscribeAuth, login, logout } from "./firebase";
import KasRumahApp from "./KasRumah";
import { SharedStyles } from "./SharedStyles";

const COLORS = {
  bg: "#EDEAE1",
  card: "#FFFFFF",
  ink: "#2B2B26",
  inkSoft: "#6B685F",
  primary: "#1F3D2B",
  primaryLight: "#427054",
  accent: "#E08A3C",
  safe: "#2F7A4E",
  safeBg: "#E4EFE2",
  low: "#E08A3C",
  lowBg: "#FDEBD8",
  out: "#D9483B",
  outBg: "#FBE3E0",
  border: "#E1DDD0",
  // Latar lembut untuk baris di dalam kartu
  soft: "#F6F4EC",
  // Navy — dipakai Stok Rumah: kartu sambutan, kapsul navigasi, dan
  // kartu filter yang sedang aktif.
  navy: "#26314D",
  navySoft: "#E5E8F3",
  navyText: "#3E4A6B",
  // Warna latar ikon bulat gaya baru (Beranda)
  iconStockBg: "#FDEBD8",
  iconStockFg: "#E08A3C",
  iconStockText: "#96631C",
  iconBuyBg: "#E4EFE2",
  iconBuyFg: "#2F7A4E",
  iconBuyText: "#427054",
  iconAgendaBg: "#E9E7F5",
  iconAgendaFg: "#6B5FB5",
  iconAgendaText: "#4B4478",
};

// Palet khusus Agenda Rumah — teal pekat dengan aksen oranye.
const AG = {
  bg: "#EDE9E0",
  card: "#FFFFFF",
  primary: "#17403D",
  primaryDeep: "#0F2F2D",
  accent: "#E0912E",
  accentBg: "#FBEBD6",
  ink: "#1A2B2A",
  inkSoft: "#8A908C",
  label: "#A2A8A4",
  border: "#E6E2D8",
  soft: "#F2F0E8",
  safe: "#2E7D51",
  safeBg: "#E4F0E6",
  low: "#E0912E",
  lowBg: "#FBEBD6",
  out: "#D9483B",
  outBg: "#FBE3E0",
};

const UNIT_SUGGESTIONS = ["pcs", "kg", "gram", "liter", "ml", "botol", "pack", "sachet"];

const LEVEL_OPTIONS = [
  { key: "banyak", label: "Banyak", status: "safe" },
  { key: "setengah", label: "Setengah", status: "safe" },
  { key: "sedikit", label: "Sedikit", status: "low" },
  { key: "habis", label: "Habis", status: "out" },
];
const LEVEL_LABEL = Object.fromEntries(LEVEL_OPTIONS.map((o) => [o.key, o.label]));

const DEFAULT_PLACES = ["Shopee", "Tokopedia", "Alfamart", "Indomaret", "Griya"];

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function fmtDateTime(iso) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
}

function fmtDate(dateStr) {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "-";
  }
}

function statusOf(item) {
  if (item.type === "level") {
    const found = LEVEL_OPTIONS.find((o) => o.key === item.level);
    return found ? found.status : "safe";
  }
  const qty = Number(item.qty);
  const min = Number(item.minQty) || 0;
  if (qty <= 0) return "out";
  if (min > 0 && qty <= min) return "low";
  return "safe";
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + "T00:00:00");
  return Math.round((d - today) / 86400000);
}

function advanceDate(dateStr, every, unit) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  if (unit === "bulan") {
    d.setMonth(d.getMonth() + every);
  } else {
    d.setDate(d.getDate() + every * 7);
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function taskUrgency(task, threshold) {
  if (!task.deadline) return "none";
  const diff = daysUntil(task.deadline);
  if (diff < 0) return "overdue";
  if (diff <= threshold) return "soon";
  return "normal";
}

function deadlineLabel(task) {
  if (!task.deadline) return "Tanpa deadline";
  const diff = daysUntil(task.deadline);
  if (diff < 0) return `Terlambat ${Math.abs(diff)} hari`;
  if (diff === 0) return "Deadline hari ini";
  if (diff === 1) return "Besok deadline";
  return `${diff} hari lagi`;
}

// --- Aktivitas terbaru (buat lonceng notifikasi di Beranda) --------------
// Menggabungkan riwayat stok, aktivitas Akan Dibeli, dan Agenda jadi satu
// daftar kejadian terurut waktu (terbaru duluan), dibatasi 3 hari terakhir.
// Ini murni turunan dari data yang sudah ada — tidak nambah tabel/koleksi
// baru di Firestore.
const ACTIVITY_ICON = {
  stockAdd: { icon: Package, bg: COLORS.iconStockBg, fg: COLORS.iconStockFg },
  stockUpdate: { icon: Package, bg: COLORS.iconStockBg, fg: COLORS.iconStockFg },
  stockDelete: { icon: Trash2, bg: COLORS.outBg, fg: COLORS.out },
  tobuyAdd: { icon: ShoppingCart, bg: COLORS.iconBuyBg, fg: COLORS.iconBuyFg },
  tobuyBought: { icon: Check, bg: COLORS.safeBg, fg: COLORS.safe },
  agendaAdd: { icon: CalendarCheck2, bg: COLORS.iconAgendaBg, fg: COLORS.iconAgendaFg },
  agendaDone: { icon: CheckCircle2, bg: COLORS.safeBg, fg: COLORS.safe },
  kasIncome: { icon: ArrowDownLeft, bg: COLORS.safeBg, fg: COLORS.safe },
  kasExpense: { icon: ArrowUpRight, bg: COLORS.outBg, fg: COLORS.out },
  kasTransfer: { icon: ArrowLeftRight, bg: COLORS.iconBuyBg, fg: COLORS.iconBuyFg },
};

function fmtRupiahShort(n) {
  return "Rp " + Math.round(Number(n) || 0).toLocaleString("id-ID");
}

function buildActivityFeed(history, toBuy, tasks, { days, kasTx, kasCats } = {}) {
  const items = [];

  for (const h of history || []) {
    if (!h.timestamp) continue;
    let kind, text;
    if (h.action === "add") {
      kind = "stockAdd";
      text = `${h.user || "Seseorang"} menambahkan ${h.itemName} ke stok`;
    } else if (h.action === "delete") {
      kind = "stockDelete";
      text = `${h.user || "Seseorang"} menghapus ${h.itemName} dari stok`;
    } else if (h.newLevel) {
      kind = "stockUpdate";
      text = `${h.user || "Seseorang"} mengubah ${h.itemName} jadi ${LEVEL_LABEL[h.newLevel] || h.newLevel}`;
    } else {
      kind = "stockUpdate";
      text = `${h.user || "Seseorang"} mengubah ${h.itemName} jadi ${h.newQty} ${h.unit || ""}`.trim();
    }
    items.push({ id: `h-${h.id}`, kind, text, timestamp: h.timestamp, ref: { type: "stock", id: h.itemId || h.id } });
  }

  for (const e of toBuy || []) {
    if (e.addedAt) {
      const text = e.addedBy
        ? `${e.addedBy} menambahkan ${e.itemName} ke Akan Dibeli`
        : `${e.itemName} otomatis masuk Akan Dibeli (stok menipis)`;
      items.push({ id: `tb-add-${e.id}`, kind: "tobuyAdd", text, timestamp: e.addedAt, ref: { type: "tobuy", id: e.id } });
    }
    if (e.bought && e.boughtAt) {
      items.push({
        id: `tb-bought-${e.id}`,
        kind: "tobuyBought",
        text: `${e.boughtBy || "Seseorang"} membeli ${e.itemName}`,
        timestamp: e.boughtAt,
        ref: { type: "tobuy", id: e.id },
      });
    }
  }

  for (const t of tasks || []) {
    if (t.createdAt) {
      items.push({
        id: `tk-add-${t.id}`,
        kind: "agendaAdd",
        text: `${t.createdBy || "Seseorang"} menambahkan tugas "${t.title}"`,
        timestamp: t.createdAt,
        ref: { type: "agenda", id: t.id },
      });
    }
    if (t.done && t.doneAt) {
      items.push({
        id: `tk-done-${t.id}`,
        kind: "agendaDone",
        text: `${t.doneBy || "Seseorang"} menyelesaikan tugas "${t.title}"`,
        timestamp: t.doneAt,
        ref: { type: "agenda", id: t.id },
      });
    }
  }

  // Kejadian dari Kas Rumah (dibaca saja — datanya milik aplikasi itu).
  for (const t of kasTx || []) {
    if (!t.date) continue;
    const who = t.createdBy || "Seseorang";
    const nominal = fmtRupiahShort(t.amount);
    let kind, text;
    if (t.type === "income") {
      kind = "kasIncome";
      text = `${who} mencatat pemasukan ${nominal}`;
    } else if (t.type === "transfer") {
      kind = "kasTransfer";
      text = `${who} transfer ${nominal} antar dompet`;
    } else {
      kind = "kasExpense";
      const cat = (kasCats || {})[t.categoryId]?.name;
      text = `${who} mencatat pengeluaran ${nominal}${cat ? ` (${cat})` : ""}`;
    }
    items.push({ id: `kas-${t.id}`, kind, text, timestamp: t.date, ref: { type: "kas", id: t.id } });
  }

  let filtered = items;
  if (days != null) {
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - (days - 1));
    filtered = items.filter((a) => new Date(a.timestamp) >= cutoff);
  }

  // Semua timestamp berasal dari new Date().toISOString(), yang presisinya
  // sudah sampai milidetik — jadi urut turun berdasar waktu asli ini saja
  // sudah cukup dan selalu benar (gak butuh aturan tie-breaker tambahan).
  return filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

function activityDayLabel(iso) {
  const d = new Date(iso);
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today - day) / 86400000);
  if (diff <= 0) return "Hari ini";
  if (diff === 1) return "Kemarin";
  if (diff < 7) return `${diff} hari lalu`;
  return day.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: day.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

function fmtClock(iso) {
  try {
    return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

const STATUS_META = {
  safe: { label: "Aman", fg: COLORS.safe, bg: COLORS.safeBg },
  low: { label: "Menipis", fg: COLORS.low, bg: COLORS.lowBg },
  out: { label: "Habis", fg: COLORS.out, bg: COLORS.outBg },
};

const URGENCY_META = {
  overdue: { label: "Terlambat", fg: COLORS.out, bg: COLORS.outBg },
  soon: { label: "Hampir Deadline", fg: COLORS.low, bg: COLORS.lowBg },
};

const CHIP_META = {
  danger: { fg: COLORS.out, bg: COLORS.outBg },
  warn: { fg: COLORS.low, bg: COLORS.lowBg },
  safe: { fg: COLORS.safe, bg: COLORS.safeBg },
  neutral: { fg: COLORS.inkSoft, bg: COLORS.bg },
};

const BACKUP_KEYS = ["stock-items", "stock-history", "stock-tobuy", "stock-places", "agenda-tasks", "agenda-due-threshold"];

function loginErrorMessage(err) {
  const code = err && err.code ? err.code : "";
  if (["auth/invalid-credential", "auth/wrong-password", "auth/user-not-found", "auth/invalid-email"].includes(code)) {
    return "Email atau password salah.";
  }
  if (code === "auth/too-many-requests") {
    return "Terlalu banyak percobaan. Coba lagi beberapa saat lagi.";
  }
  if (code === "auth/network-request-failed") {
    return "Tidak ada koneksi internet.";
  }
  return "Gagal masuk. Coba lagi.";
}

// Latar halaman pilih aplikasi: matahari berlapis di kanan atas, bukit lembut
// dan rumah kecil di kaki layar. Semuanya opasitas rendah supaya teks tetap
// Ilustrasi samar di sudut kanan bawah tiap kartu — penanda visual supaya
// Empat ikon kecil 2x2 di sudut kartu — murni hiasan yang menggambarkan isi
// aplikasinya, bukan tombol.
function CardGlyphs({ icons, tint, solid, glyphColor }) {
  return (
    <div
      className="absolute grid gap-2 pointer-events-none select-none"
      style={{ right: 16, top: 16, gridTemplateColumns: "repeat(2, 1fr)" }}
      aria-hidden="true"
    >
      {icons.map((Ic, i) => (
        <span
          key={i}
          className="flex items-center justify-center"
          // Dua kotak diberi latar pekat, dua sisanya terang — persis pola
          // selang-seling pada desain.
          style={{ width: 46, height: 46, borderRadius: 14, background: i === 0 || i === 3 ? tint : solid }}
        >
          <Ic size={20} color={glyphColor} />
        </span>
      ))}
    </div>
  );
}

// --- Transisi kartu melebar ------------------------------------------
// Urutannya: halaman tujuan dipasang LEBIH DULU, lalu kartu terbang di
// atasnya. Dengan begitu di belakang kartu selalu sudah ada isi — tidak
// pernah ada momen layar kosong seperti sebelumnya.
//
// JavaScript hanya mengukur posisi kartu dan menyerahkan empat angka ke
// CSS (--dx, --dy, --sx, --sy). Gerakannya sepenuhnya diurus CSS.
const MORPH_MS = 620;
const MORPH_CLEANUP_MS = 860;

// Tinggi area aman di atas layar (poni iPhone) diukur lewat elemen bayangan.
function readSafeTop() {
  const probe = document.createElement("div");
  probe.style.cssText = "position:fixed;top:0;left:0;visibility:hidden;padding-top:env(safe-area-inset-top)";
  document.body.appendChild(probe);
  const h = probe.clientHeight || 0;
  document.body.removeChild(probe);
  return h;
}

// Posisi dan ukuran kartu atas di dalam aplikasi — tempat kartu mendarat.
// Kartu atas menempel penuh ke tepi layar, tinggi dikunci, sudut membulat
// hanya di bawah. Bentuk inilah yang membuat serah terima kartu terbang
// tidak berkedip: kartu mendarat tepat di atas bentuk yang identik.
const HERO_HEIGHT = 244;

function heroTargetRect() {
  const vw = window.innerWidth;
  const contentWidth = Math.min(vw, 672);
  return { left: (vw - contentWidth) / 2, top: 0, width: contentWidth, height: HERO_HEIGHT + readSafeTop() };
}

// Kartu terbang: digambar pada ukuran & posisi TUJUAN, lalu CSS yang
// membawanya dari posisi asal. Di dalamnya ada dua lapisan tulisan yang
// bersilangan — keduanya tidak ikut membesar supaya hurufnya tetap tajam.
function CardFlyer({ flight }) {
  const { from, to, color, title, subtitle, greeting, dateLabel, back } = flight;
  return (
    <div
      aria-hidden="true"
      className={`flyer${back ? " is-back" : ""}`}
      style={{
        top: to.top,
        left: to.left,
        width: to.width,
        height: to.height,
        background: color,
        "--dx": `${from.left - to.left}px`,
        "--dy": `${from.top - to.top}px`,
        "--sx": from.width / to.width,
        "--sy": from.height / to.height,
      }}
    >
      {/* Tulisan versi kartu di halaman awal */}
      <div className="flyer-text flyer-text-from" style={{ bottom: 18, paddingLeft: 18, paddingRight: 18 }}>
        <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 700, fontSize: 24, color: "#fff", lineHeight: 1.15 }}>
          {title}
        </div>
        <div style={{ fontSize: 13.5, color: "rgba(255,255,255,0.68)", marginTop: 1 }}>{subtitle}</div>
      </div>

      {/* Tulisan versi kartu atas di halaman tujuan */}
      <div className="flyer-text flyer-text-to" style={{ top: 26, paddingLeft: 24, paddingRight: 24 }}>
        <div className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.72)" }}>
          {greeting}
        </div>
        <div
          style={{
            fontFamily: "'Baloo 2', cursive",
            fontWeight: 700,
            fontSize: 44,
            lineHeight: 1.02,
            letterSpacing: "-0.5px",
            color: "#fff",
            marginTop: 4,
          }}
        >
          {title.split(" ")[0]}
          <br />
          {title.split(" ").slice(1).join(" ")}
        </div>
        <div
          className="inline-flex items-center gap-2 capitalize"
          style={{ marginTop: 20, background: "rgba(255,255,255,0.12)", borderRadius: 22, padding: "8px 14px", fontSize: 13, color: "rgba(255,255,255,0.88)" }}
        >
          {dateLabel}
        </div>
      </div>
    </div>
  );
}

let pickerIntroPlayed = false;

function AppPicker({ userName, onPick, onLogout, notifSlot, pickingKey, returningKey }) {
  // Animasi kartu muncul naik hanya diputar sekali per sesi.
  const skipIntro = pickerIntroPlayed;
  useEffect(() => {
    pickerIntroPlayed = true;
  }, []);

  const todayLabel = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 10) return "Selamat pagi";
    if (h < 15) return "Selamat siang";
    if (h < 18) return "Selamat sore";
    return "Selamat malam";
  }, []);

  const cards = [
    {
      key: "stok",
      title: "Stok Rumah",
      subtitle: "Stok barang dan daftar belanja",
      icon: Package,
      cardBg: COLORS.navy,
      iconBg: COLORS.accent,
      iconFg: "#fff",
      titleColor: "#fff",
      subColor: "rgba(255,255,255,0.70)",
      glyphs: [Package, Milk, Trash2, LayoutGrid],
      glyphTint: "rgba(224,138,60,0.28)",
      glyphSolid: "rgba(255,255,255,0.10)",
      glyphColor: "rgba(255,255,255,0.72)",
      blobColor: "rgba(255,255,255,0.05)",
    },
    {
      key: "kas",
      title: "Kas Rumah",
      subtitle: "Pemasukan dan pengeluaran",
      icon: Wallet,
      cardBg: "#12301E",
      iconBg: "#DC8A2C",
      iconFg: "#fff",
      titleColor: "#fff",
      subColor: "rgba(255,255,255,0.70)",
      glyphs: [Banknote, Wallet, Receipt, BarChart3],
      glyphTint: "rgba(220,138,44,0.28)",
      glyphSolid: "rgba(255,255,255,0.10)",
      glyphColor: "rgba(255,255,255,0.72)",
      blobColor: "rgba(255,255,255,0.05)",
    },
    {
      key: "agenda",
      title: "Agenda Rumah",
      subtitle: "Tugas dan jadwal rumah tangga",
      icon: CalendarCheck2,
      cardBg: AG.primary,
      iconBg: AG.accent,
      iconFg: "#fff",
      titleColor: "#fff",
      subColor: "rgba(255,255,255,0.68)",
      glyphs: [Clock, CheckCircle2, Pencil, Calendar],
      glyphTint: "rgba(255,255,255,0.10)",
      glyphSolid: "rgba(255,255,255,0.10)",
      glyphColor: "rgba(255,255,255,0.80)",
      blobColor: "rgba(255,255,255,0.05)",
    },
  ];

  return (
    <div
      className="flex flex-col"
      style={{ background: COLORS.bg, height: "100dvh", color: COLORS.ink, fontFamily: "'Outfit', sans-serif", overflow: "hidden" }}
    >
      <SharedStyles />
      <style>{`
        @keyframes pickerRise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .picker-card { animation: pickerRise 450ms cubic-bezier(0.22,1,0.36,1) both; transition: transform 140ms ease; }
        .picker-card:active { transform: scale(0.982); }
      `}</style>

      <div
        className="max-w-2xl mx-auto w-full flex flex-col flex-1 min-h-0 px-5"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 14px)", paddingBottom: "max(14px, env(safe-area-inset-bottom))" }}
      >
        <div
          className={`shrink-0${pickingKey ? " picker-recede" : ""}${returningKey ? " come-top" : ""}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm" style={{ color: COLORS.inkSoft }}>
                {greeting}
                {userName ? `, ${userName}` : ""}
              </div>
              <h1
                style={{
                  fontFamily: "'Baloo 2', cursive",
                  fontWeight: 700,
                  fontSize: 38,
                  lineHeight: 1.05,
                  color: COLORS.primary,
                  marginTop: 2,
                }}
              >
                Frinirvan
              </h1>
              <div className="flex items-center gap-3" style={{ marginTop: 1 }}>
                <span
                  style={{
                    fontFamily: "'Baloo 2', cursive",
                    fontWeight: 600,
                    fontSize: 15,
                    letterSpacing: "5px",
                    color: COLORS.accent,
                  }}
                >
                  TRACKER
                </span>
                <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${COLORS.accent}66, transparent)` }} />
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0" style={{ marginTop: 4 }}>
              {notifSlot}
              <button
                onClick={onLogout}
                className="w-11 h-11 rounded-full flex items-center justify-center"
                style={{ background: COLORS.card, boxShadow: "0 2px 10px rgba(43,42,37,0.08)" }}
                title="Keluar"
              >
                <LogOut size={18} color={COLORS.primary} />
              </button>
            </div>
          </div>

          <div
            className="inline-flex items-center gap-2 capitalize"
            style={{ marginTop: 16, background: COLORS.card, borderRadius: 999, padding: "10px 18px", fontSize: 14, color: COLORS.ink, boxShadow: "0 2px 10px rgba(43,42,37,0.05)" }}
          >
            <Calendar size={16} color={COLORS.iconBuyFg} />
            {todayLabel}
          </div>
        </div>

        {/* Ketiga kartu berbagi sisa tinggi layar secara merata, jadi selalu
            muat tanpa perlu digulir — berapa pun tinggi layar HP-nya. */}
        <div className="flex flex-col gap-3 flex-1 min-h-0" style={{ marginTop: 18 }}>
          {cards.map((c, i) => {
            const Icon = c.icon;
            return (
              <button
                key={c.key}
                data-card={c.key}
                onClick={(e) => onPick(c.key, e.currentTarget.getBoundingClientRect(), c.cardBg, { title: c.title, subtitle: c.subtitle })}
                className={[
                  "relative w-full flex-1 min-h-0 overflow-hidden text-left flex flex-col justify-end",
                  !skipIntro && !returningKey ? "picker-card" : "",
                  pickingKey ? "picker-recede" : "",
                  // Saat kembali: kartu di atas kartu yang tadi dibuka datang
                  // dari atas, yang di bawahnya datang dari bawah.
                  returningKey && c.key !== returningKey
                    ? (i < cards.findIndex((x) => x.key === returningKey) ? "come-top" : "come-bottom") + " card-return"
                    : "",
                  // Kartu tujuan ditahan sampai kartu terbang sampai di sini,
                  // supaya tidak pernah terlihat dua kartu sekaligus.
                  returningKey && c.key === returningKey ? "card-hold" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={{
                  background: c.cardBg,
                  borderRadius: 26,
                  padding: 18,
                  animationDelay: returningKey
                    ? // yang paling dekat dengan kartu yang dibuka datang duluan
                      `${Math.abs(i - cards.findIndex((x) => x.key === returningKey)) * 60}ms`
                    : skipIntro
                    ? undefined
                    : `${50 + i * 70}ms`,
                  // Kartu yang sedang dibuka disembunyikan karena tempatnya
                  // diambil alih kartu terbang.
                  opacity: pickingKey === c.key ? 0 : undefined,
                }}
              >
                <span
                  className="absolute rounded-full pointer-events-none"
                  style={{ right: -30, bottom: -70, width: 190, height: 190, background: c.blobColor }}
                />
                <span
                  className="absolute flex items-center justify-center"
                  style={{ left: 18, top: 18, width: 52, height: 52, borderRadius: 17, background: c.iconBg }}
                >
                  <Icon size={25} color={c.iconFg} />
                </span>
                <CardGlyphs icons={c.glyphs} tint={c.glyphTint} solid={c.glyphSolid} glyphColor={c.glyphColor} />
                <div className="relative">
                  <div
                    style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 700, fontSize: 24, lineHeight: 1.15, color: c.titleColor }}
                  >
                    {c.title}
                  </div>
                  <div style={{ fontSize: 13.5, color: c.subColor, marginTop: 1 }}>{c.subtitle}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setSubmitting(true);
    setError("");
    try {
      await onLogin(email.trim(), password);
      // Berhasil: subscribeAuth di App akan otomatis update tampilan.
    } catch (err) {
      setError(loginErrorMessage(err));
      setSubmitting(false);
    }
  };

  const reveal = () => setShowPassword(true);
  const hide = () => setShowPassword(false);

  return (
    <div
      style={{ background: COLORS.bg, minHeight: "100vh", fontFamily: "'Outfit', sans-serif" }}
      className="flex items-center justify-center px-4"
    >
      <SharedStyles />
      <style>{`
        html, body {
          overflow: hidden;
          overscroll-behavior: none;
        }
        input:focus { outline: 2px solid ${COLORS.primary}; outline-offset: 1px; }
        ::placeholder { color: #A6A296; }
        @keyframes eyePop { 0% { transform: scale(0.6); opacity: 0.3; } 100% { transform: scale(1); opacity: 1; } }
      `}</style>
      <div className="w-full sm:max-w-xs p-5 rounded-2xl" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
        <div className="flex flex-col items-center mb-6 mt-2">
          <img
            src="/frinirvan-icon.png"
            alt="Frinirvan Tracker"
            className="mb-3"
            style={{ width: 96, height: "auto" }}
          />
          <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 700, fontSize: 22, lineHeight: 1.15, textAlign: "center" }}>
            <span style={{ color: COLORS.primary }}>Frinirvan</span>{" "}
            <span style={{ color: COLORS.inkSoft, fontWeight: 500 }}>Tracker</span>
          </div>
          <div className="text-xs mt-1.5" style={{ color: COLORS.inkSoft }}>Masuk untuk melanjutkan</div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full px-3 py-2.5 rounded-xl bg-transparent"
            style={{ color: COLORS.ink, fontSize: 14, border: `1px solid ${COLORS.border}` }}
          />
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-3 py-2.5 rounded-xl bg-transparent"
              style={{ color: COLORS.ink, fontSize: 14, border: `1px solid ${COLORS.border}`, paddingRight: 40 }}
            />
            <button
              type="button"
              aria-label="Tahan untuk lihat password"
              // Tahan (mouse/jari) untuk lihat, lepas untuk sembunyikan lagi.
              onMouseDown={reveal}
              onMouseUp={hide}
              onMouseLeave={hide}
              onTouchStart={(e) => { e.preventDefault(); reveal(); }}
              onTouchEnd={hide}
              onTouchCancel={hide}
              tabIndex={-1}
              className="absolute"
              style={{ right: 10, top: "50%", transform: "translateY(-50%)", padding: 4 }}
            >
              <span
                key={showPassword ? "open" : "closed"}
                style={{ display: "inline-flex", animation: "eyePop 180ms ease-out" }}
              >
                {showPassword ? (
                  <Eye size={16} color={COLORS.primary} />
                ) : (
                  <EyeOff size={16} color={COLORS.inkSoft} />
                )}
              </span>
            </button>
          </div>

          {error && (
            <div className="text-xs" style={{ color: COLORS.out }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={submitting || !email.trim() || !password}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white mt-1"
            style={{ background: COLORS.primary, opacity: submitting || !email.trim() || !password ? 0.6 : 1 }}
          >
            {submitting ? "Masuk..." : "Masuk"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  // undefined = masih dicek, null = belum login, object = sudah login
  const [authUser, setAuthUser] = useState(undefined);

  useEffect(() => {
    const unsub = subscribeAuth((u) => setAuthUser(u));
    return unsub;
  }, []);

  const [items, setItems] = useState([]);
  const [history, setHistory] = useState([]);
  const [toBuy, setToBuy] = useState([]);
  const [places, setPlaces] = useState(DEFAULT_PLACES);
  const [tasks, setTasks] = useState([]);
  const [dueThreshold, setDueThreshold] = useState(3);
  const [loading, setLoading] = useState(true);

  // Kalau logout, siapkan ulang supaya lain kali login lagi tampil "Memuat
  // data..." dulu, bukan sekilas nampilin data punya sesi sebelumnya.
  useEffect(() => {
    if (authUser === null) setLoading(true);
  }, [authUser]);
  const [userName, setUserName] = useState("");
  const [nameDraft, setNameDraft] = useState("");
  const [askName, setAskName] = useState(false);
  // Aplikasi yang sedang dibuka: null = belum pilih (tampilkan kartu pilihan),
  // 'stok' = Stok Rumah, 'kas' = Kas Rumah.
  const [activeApp, setActiveApp] = useState(null);
  // Data Kas Rumah untuk notifikasi gabungan (baca saja).
  const [kasTx, setKasTx] = useState([]);
  const [kasCats, setKasCats] = useState([]);
  // Transaksi Kas yang harus disorot begitu aplikasi Kas Rumah dibuka.
  const [kasHighlightId, setKasHighlightId] = useState(null);
  // Transisi kartu melebar: menyimpan posisi kartu terakhir yang disentuh
  // supaya bisa mengerut pulang ke tempat yang sama.
  const cardRectRef = useRef({});

  const [view, setView] = useState("dashboard"); // 'dashboard' | 'stock' | 'tobuy'
  const [stockSearch, setStockSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [tobuySearch, setTobuySearch] = useState("");
  const [tobuyFilter, setTobuyFilter] = useState("pending");
  const [agendaSearch, setAgendaSearch] = useState("");
  const [agendaFilter, setAgendaFilter] = useState("all");
  const [highlightTarget, setHighlightTarget] = useState(null); // { type, id }

  const TAB_ORDER = ["dashboard", "stock", "tobuy"];
  // Arah masuknya isi halaman mengikuti arah perpindahan tab.
  const [dir, setDir] = useState(1);
  const changeView = (next) => {
    setDir(TAB_ORDER.indexOf(next) > TAB_ORDER.indexOf(view) ? 1 : -1);
    setView(next);
  };

  // --- Geser kiri/kanan antar tab ---------------------------------------
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartRef = useRef(null);
  const dragModeRef = useRef(null);

  const handleTouchStart = (e) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
    dragModeRef.current = null;
  };

  const handleTouchMove = (e) => {
    if (!touchStartRef.current) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;
    if (!dragModeRef.current) {
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        dragModeRef.current = Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";
        if (dragModeRef.current === "horizontal") setIsDragging(true);
      }
      return;
    }
    if (dragModeRef.current !== "horizontal") return;
    const idx = TAB_ORDER.indexOf(view);
    let clamped = dx;
    if (idx === 0 && dx > 0) clamped = dx * 0.35;
    if (idx === TAB_ORDER.length - 1 && dx < 0) clamped = dx * 0.35;
    setDragX(clamped);
  };

  const resetDrag = () => {
    setIsDragging(false);
    setDragX(0);
    touchStartRef.current = null;
    dragModeRef.current = null;
  };

  const handleTouchEnd = () => {
    const idx = TAB_ORDER.indexOf(view);
    const dx = dragX;
    const SWIPE_THRESHOLD = 60;
    if (dragModeRef.current === "horizontal") {
      if (dx < -SWIPE_THRESHOLD && idx < TAB_ORDER.length - 1) {
        attemptNavigate(() => changeView(TAB_ORDER[idx + 1]));
      } else if (dx > SWIPE_THRESHOLD && idx > 0) {
        attemptNavigate(() => changeView(TAB_ORDER[idx - 1]));
      }
    }
    resetDrag();
  };

  // --- Perubahan qty/level yang belum dikonfirmasi ------------------------
  // Cuma boleh ada SATU perubahan yang menggantung di seluruh app. Selama itu
  // ada, list tidak di-sort ulang dan navigasi ke mana pun diblokir sampai
  // dikonfirmasi atau dikembalikan ke nilai semula.
  const [pendingEdit, setPendingEdit] = useState(null);
  const [blockedNotice, setBlockedNotice] = useState(null);

  const attemptNavigate = (fn) => {
    if (pendingEdit) {
      setBlockedNotice(pendingEdit.itemName);
      return;
    }
    fn();
  };

  const beginOrUpdatePendingQty = (item, delta) => {
    setPendingEdit((prev) => {
      const base = prev && prev.itemId === item.id ? prev.draft : item.qty;
      const draft = Math.max(0, Number((base + delta).toFixed(3)));
      if (draft === item.qty) return null;
      return { itemId: item.id, itemName: item.name, kind: "qty", draft, unit: item.unit };
    });
  };

  const setPendingLevelEdit = (item, newLevel) => {
    if (newLevel === item.level) {
      setPendingEdit(null);
      return;
    }
    setPendingEdit({ itemId: item.id, itemName: item.name, kind: "level", draft: newLevel });
  };

  const confirmPendingEdit = async () => {
    if (!pendingEdit) return;
    const { itemId, kind, draft } = pendingEdit;
    if (kind === "qty") {
      const current = items.find((i) => i.id === itemId);
      if (current) await handleQuickAdjust(itemId, Number((draft - current.qty).toFixed(3)));
    } else {
      await handleLevelChange(itemId, draft);
    }
    setPendingEdit(null);
  };

  const handleBlockedNoticeOk = () => {
    if (!pendingEdit) {
      setBlockedNotice(null);
      return;
    }
    setBlockedNotice(null);
    setHighlightTarget({ type: "stock", id: pendingEdit.itemId });
  };

  // Kartu mana yang sedang dibuka — dipakai halaman awal untuk menyingkirkan
  // kartu lainnya, dan untuk menentukan arah kedatangan saat kembali.
  const [pickingKey, setPickingKey] = useState(null);
  const [lastOpenedKey, setLastOpenedKey] = useState(null);
  const [flight, setFlight] = useState(null);
  // Halaman awal dipasang tak terlihat lebih dulu supaya kartunya bisa diukur.
  const [measuring, setMeasuring] = useState(null);
  const [veil, setVeil] = useState(null);
  // Riak tinta yang melebar dari tombol tambah sebelum jendela naik.
  const [ink, setInk] = useState(null);
  const splashInk = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    setInk({ left: r.left, top: r.top, color: COLORS.accent });
    setTimeout(() => setInk(null), 800);
  };

  const todayLabelShort = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const greetingNow = (() => {
    const h = new Date().getHours();
    if (h < 10) return "Selamat pagi";
    if (h < 15) return "Selamat siang";
    if (h < 18) return "Selamat sore";
    return "Selamat malam";
  })();

  const openAppWithMorph = (key, rect, color, card) => {
    if (!rect) {
      setActiveApp(key);
      return;
    }
    cardRectRef.current[key] = { rect, color, card };
    setPickingKey(key);
    // Halaman tujuan dipasang SEKARANG JUGA, lalu kartu terbang di atasnya.
    // Inilah yang menghilangkan momen layar kosong.
    setActiveApp(key);
    setFlight({
      from: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
      to: heroTargetRect(),
      color,
      title: card.title,
      subtitle: card.subtitle,
      greeting: `${greetingNow}${userName ? `, ${userName}` : ""}`,
      dateLabel: todayLabelShort,
      back: false,
    });
    setTimeout(() => {
      setFlight(null);
      setPickingKey(null);
    }, MORPH_CLEANUP_MS);
  };

  // Transisi kembali mengikuti aturan berkas rancangan: JANGAN menebak posisi
  // kartu tujuan. Halaman awal dipasang dulu dalam keadaan tak terlihat,
  // kartunya diukur pada saat commit, baru animasinya dimulai.
  const closeAppWithMorph = () => {
    if (!activeApp) return;
    setMeasuring(activeApp);
  };

  useLayoutEffect(() => {
    if (!measuring) return;
    const el = document.querySelector(`[data-card="${measuring}"]`);
    const saved = cardRectRef.current[measuring];
    if (!el || !saved) {
      setMeasuring(null);
      setActiveApp(null);
      return;
    }
    const r = el.getBoundingClientRect();
    const { color, card } = saved;
    setLastOpenedKey(measuring);
    setFlight({
      from: { top: r.top, left: r.left, width: r.width, height: r.height },
      to: heroTargetRect(),
      color,
      title: card.title,
      subtitle: card.subtitle,
      greeting: `${greetingNow}${userName ? `, ${userName}` : ""}`,
      dateLabel: todayLabelShort,
      back: true,
    });
    setVeil(color);
    setMeasuring(null);
    setActiveApp(null);
    const t1 = setTimeout(() => setVeil(null), 560);
    const t2 = setTimeout(() => setFlight(null), 720);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measuring]);

  // Pintasan dari beranda & notifikasi: buka aplikasi yang tepat, arahkan ke
  // halamannya, lalu sorot item yang dimaksud.
  const goToStockItem = (item) => {
    const s = statusOf(item);
    setStockFilter(s === "safe" ? "all" : s);
    setStockSearch("");
    setHighlightTarget({ type: "stock", id: item.id });
    setActiveApp("stok");
    setView("stock");
  };

  const goToToBuyEntry = (entry) => {
    setTobuyFilter(entry.bought ? "bought" : "pending");
    setTobuySearch("");
    setHighlightTarget({ type: "tobuy", id: entry.id });
    setActiveApp("stok");
    setView("tobuy");
  };

  const goToTask = (task) => {
    setAgendaFilter("all");
    setAgendaSearch("");
    setHighlightTarget({ type: "agenda", id: task.id });
    setActiveApp("agenda");
  };

  // Klik satu baris notifikasi: buka aplikasi asalnya, lalu sorot itemnya.
  const handleActivitySelect = (a) => {
    setShowNotif(false);
    const ref = a && a.ref;
    if (!ref) return;
    if (ref.type === "stock") {
      const item = items.find((i) => i.id === ref.id);
      if (item) goToStockItem(item);
      else setActiveApp("stok");
    } else if (ref.type === "tobuy") {
      const entry = toBuy.find((e) => e.id === ref.id);
      if (entry) goToToBuyEntry(entry);
      else setActiveApp("stok");
    } else if (ref.type === "agenda") {
      const task = tasks.find((t) => t.id === ref.id);
      if (task) goToTask(task);
      else setActiveApp("agenda");
    } else if (ref.type === "kas") {
      setKasHighlightId(ref.id);
      setActiveApp("kas");
    }
  };

  const [showHistory, setShowHistory] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Aktivitas terbaru untuk lonceng notifikasi: dibatasi 3 hari terakhir
  // (murni turunan dari data yang sudah ada — lihat buildActivityFeed di atas).
  const kasCatMap = useMemo(() => {
    const m = {};
    (kasCats || []).forEach((c) => (m[c.id] = c));
    return m;
  }, [kasCats]);

  const activityFeed = useMemo(
    () => buildActivityFeed(history, toBuy, tasks, { days: 3, kasTx, kasCats: kasCatMap }),
    [history, toBuy, tasks, kasTx, kasCatMap]
  );
  // Riwayat penuh (halaman "Riwayat" di menu): semua perubahan, semua fitur,
  // tanpa batas hari — sumbernya sama persis dengan feed notifikasi.
  const fullActivityFeed = useMemo(
    () => buildActivityFeed(history, toBuy, tasks, { kasTx, kasCats: kasCatMap }),
    [history, toBuy, tasks, kasTx, kasCatMap]
  );
  const [showNotif, setShowNotif] = useState(false);
  const [notifSeenAt, setNotifSeenAt] = useState(() => localStorage.getItem("stock-notif-seen") || "");
  const unreadCount = useMemo(
    () => activityFeed.filter((a) => a.timestamp > notifSeenAt).length,
    [activityFeed, notifSeenAt]
  );
  const openNotif = () => {
    setShowNotif(true);
    const now = new Date().toISOString();
    setNotifSeenAt(now);
    localStorage.setItem("stock-notif-seen", now);
  };

  // Lonceng yang sama dipakai di semua halaman supaya notifikasi selalu
  // terjangkau, bukan cuma dari halaman awal.
  const notifBell = (
    <NotifBell
      count={unreadCount}
      activity={activityFeed}
      open={showNotif}
      onOpen={openNotif}
      onClose={() => setShowNotif(false)}
      onSelect={handleActivitySelect}
    />
  );

  // Versi untuk dipasang di atas kartu hijau beranda.
  const notifBellOnDark = (
    <NotifBell
      count={unreadCount}
      activity={activityFeed}
      open={showNotif}
      onOpen={openNotif}
      onClose={() => setShowNotif(false)}
      onSelect={handleActivitySelect}
      onDark
    />
  );


  const [modal, setModal] = useState(null); // { mode: 'add'|'edit', item? }
  const [toBuyModal, setToBuyModal] = useState(null); // { mode: 'add'|'edit', entry? }
  const [taskModal, setTaskModal] = useState(null); // { mode: 'add'|'edit', task? }
  const [thresholdModal, setThresholdModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // { type, id, label }
  const [pendingRestore, setPendingRestore] = useState(null);
  const [restoreError, setRestoreError] = useState("");
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef(null);
  const userNameRef = useRef("");
  const trackWrapRef = useRef(null);

  // Guard cadangan (defense-in-depth) untuk bug navigasi tab yang salah
  // geser: kontainer carousel 4-halaman (digeser via CSS transform) TIDAK
  // PERNAH boleh punya scroll horizontal sendiri — posisi horizontalnya
  // 100% dikendalikan oleh transform. Perbaikan utamanya ada di
  // `overflow: "clip"` pada style kontainer ini (lihat di bawah), yang
  // mencegah browser diam-diam menggeser scrollLeft kontainer saat
  // scrollIntoView() dipanggil pada item yang di-highlight (mis. loncat
  // dari Beranda ke item tertentu di Stok/Beli/Agenda) — browser tidak tahu
  // posisi sebenarnya sudah benar lewat transform, jadi dulu dia
  // "mengoreksi" sesuatu yang sebenarnya tidak perlu dikoreksi, membuat
  // halaman yang tampil jadi salah/geser (mis. malah nampilin halaman Beli
  // padahal lagi di tab Stok). Listener ini cuma jaring pengaman tambahan
  // kalau suatu saat ada penyebab lain yang menggeser scrollLeft-nya.
  useEffect(() => {
    const el = trackWrapRef.current;
    if (!el) return;
    const resetScroll = () => {
      if (el.scrollLeft !== 0) el.scrollLeft = 0;
    };
    el.addEventListener("scroll", resetScroll, { passive: true });
    return () => el.removeEventListener("scroll", resetScroll);
  }, []);

  // Cegah efek "karet"/tembus ala iOS (rubber-band bounce) saat list
  // discroll sampai mentok atas/bawah — TERMASUK saat app dibuka dari
  // "Add to Home Screen" (mode standalone).
  //
  // Kenapa perlu terpisah dari fix sebelumnya: di Safari biasa (bukan
  // standalone), toolbar Safari sendiri "menutupi" area status bar,
  // jadi walau ada bug bouncing di situ, ketutup dan gak kelihatan. Begitu
  // dibuka sebagai app standalone (tanpa toolbar Safari), area itu jadi
  // polos milik app sepenuhnya — dan ternyata WebKit di mode standalone
  // punya perilaku "bounce" sendiri di level SELURUH HALAMAN (bukan cuma
  // di dalam list), yang tidak bisa dicegah hanya dengan menjaga area di
  // dalam trackWrapRef saja. Makanya sekarang listener-nya dipasang di
  // `document` (mencakup seluruh app, termasuk BottomNav & menu/riwayat
  // yang render di luar trackWrapRef), dan sentuhan yang TIDAK sedang
  // scroll list apa pun (mis. nyentuh area kosong/BottomNav) langsung
  // dicegah juga — supaya WebKit gak sempat mengambil alih dan mem-bounce
  // seluruh halaman.
  //
  // CSS overscroll-behavior saja ternyata tidak selalu cukup diandalkan
  // (apalagi di mode standalone), dan event React (onTouchMove) otomatis
  // "passive" sehingga preventDefault()-nya tidak selalu didengar browser
  // — jadi dipasang listener sentuhan native (bukan lewat React) yang
  // eksplisit non-passive. Ini tidak mengganggu swipe kiri/kanan pindah
  // tab (itu sudah ditangani terpisah oleh handleTouchStart/Move/End).
  useEffect(() => {
    let startY = 0;
    let scrollTarget = null;

    function findScrollable(node) {
      while (node && node !== document.body) {
        if (node.scrollHeight > node.clientHeight) {
          const overflowY = window.getComputedStyle(node).overflowY;
          if (overflowY === "auto" || overflowY === "scroll") return node;
        }
        node = node.parentElement;
      }
      return null;
    }

    function onStart(e) {
      if (e.touches.length !== 1) return;
      startY = e.touches[0].clientY;
      scrollTarget = findScrollable(e.target);
    }

    function onMove(e) {
      if (e.touches.length !== 1) return;

      // Kalau ini bagian dari swipe geser kiri/kanan pindah tab (sudah
      // dideteksi & ditangani terpisah oleh handleTouchMove/handleTouchEnd
      // lewat dragModeRef), jangan diganggu sama sekali di sini.
      if (dragModeRef.current === "horizontal") return;

      // Tidak ada elemen yang bisa di-scroll di jalur sentuhan ini (mis.
      // BottomNav, area kosong) — cegah total supaya WebKit standalone
      // tidak mem-bounce seluruh halaman.
      if (!scrollTarget) {
        e.preventDefault();
        return;
      }

      const dy = e.touches[0].clientY - startY;
      const atTop = scrollTarget.scrollTop <= 0;
      const atBottom = scrollTarget.scrollTop + scrollTarget.clientHeight >= scrollTarget.scrollHeight - 1;
      // dy > 0: jari geser ke bawah (menarik konten atas) — cegah kalau sudah mentok atas.
      // dy < 0: jari geser ke atas (menarik konten bawah) — cegah kalau sudah mentok bawah.
      if ((dy > 0 && atTop) || (dy < 0 && atBottom)) {
        e.preventDefault();
      }
    }

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: false });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
    };
  }, []);

  useEffect(() => {
    userNameRef.current = userName;
  }, [userName]);

  // Nama operator disimpan lokal per perangkat (tidak perlu ikut sinkron ke cloud)
  useEffect(() => {
    const savedName = localStorage.getItem("stock-username");
    if (savedName) {
      setUserName(savedName);
    } else if (!userNameRef.current) {
      setAskName(true);
    }
  }, []);

  // Semua data toko disinkronkan real-time lewat Firestore: perubahan dari
  // HP/perangkat lain akan langsung muncul di sini tanpa perlu refresh.
  // Baru mulai sinkron setelah login berhasil (authUser terisi) — sebelum
  // itu Firestore memang akan menolak aksesnya (lihat Security Rules).
  useEffect(() => {
    if (!authUser) return;
    let pending = 6;
    const markLoaded = () => {
      pending -= 1;
      if (pending <= 0) setLoading(false);
    };

    const unsubs = [
      storageSubscribe("stock-items", (data) => {
        setItems(Array.isArray(data) ? data : []);
        markLoaded();
      }),
      storageSubscribe("stock-history", (data) => {
        setHistory(Array.isArray(data) ? data : []);
        markLoaded();
      }),
      storageSubscribe("stock-tobuy", (data) => {
        setToBuy(Array.isArray(data) ? data : []);
        markLoaded();
      }),
      storageSubscribe("stock-places", (data) => {
        setPlaces(Array.isArray(data) && data.length > 0 ? data : DEFAULT_PLACES);
        markLoaded();
      }),
      storageSubscribe("agenda-tasks", (data) => {
        setTasks(Array.isArray(data) ? data : []);
        markLoaded();
      }),
      // Data Kas Rumah — dibaca saja, dipakai untuk notifikasi gabungan
      // di halaman awal. Penulisannya tetap milik aplikasi Kas Rumah.
      storageSubscribe("kas-transactions", (data) => setKasTx(Array.isArray(data) ? data : [])),
      storageSubscribe("kas-categories", (data) => setKasCats(Array.isArray(data) ? data : [])),
      storageSubscribe("agenda-due-threshold", (data) => {
        setDueThreshold(typeof data === "number" && data > 0 ? data : 3);
        markLoaded();
      }),
    ];

    return () => unsubs.forEach((fn) => fn && fn());
  }, [authUser]);

  // Data sudah sinkron otomatis lewat listener real-time di atas. Tombol
  // "Muat ulang" cuma memaksa ambil ulang sekali dari server (mis. kalau
  // baru online lagi setelah offline).
  const loadAll = useCallback(async () => {
    const [itemsData, historyData, toBuyData, placesData, tasksData, thresholdData] = await Promise.all([
      storageGet("stock-items"),
      storageGet("stock-history"),
      storageGet("stock-tobuy"),
      storageGet("stock-places"),
      storageGet("agenda-tasks"),
      storageGet("agenda-due-threshold"),
    ]);
    setItems(Array.isArray(itemsData) ? itemsData : []);
    setHistory(Array.isArray(historyData) ? historyData : []);
    setToBuy(Array.isArray(toBuyData) ? toBuyData : []);
    setPlaces(Array.isArray(placesData) && placesData.length > 0 ? placesData : DEFAULT_PLACES);
    setTasks(Array.isArray(tasksData) ? tasksData : []);
    setDueThreshold(typeof thresholdData === "number" && thresholdData > 0 ? thresholdData : 3);
  }, []);

  const saveUserName = async (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setUserName(trimmed);
    setAskName(false);
    localStorage.setItem("stock-username", trimmed);
  };

  const persistHistory = async (next) => {
    setHistory(next);
    await storageSet("stock-history", next);
  };

  const pushHistory = async (entry, currentHistory) => {
    const next = [{ id: uid(), timestamp: new Date().toISOString(), ...entry }, ...currentHistory].slice(0, 200);
    await persistHistory(next);
  };

  const persistItems = async (next) => {
    setItems(next);
    await storageSet("stock-items", next);
  };

  const persistToBuy = async (next) => {
    setToBuy(next);
    await storageSet("stock-tobuy", next);
  };

  const persistPlaces = async (next) => {
    setPlaces(next);
    await storageSet("stock-places", next);
  };

  const persistTasks = async (next) => {
    setTasks(next);
    await storageSet("agenda-tasks", next);
  };

  const persistThreshold = async (n) => {
    setDueThreshold(n);
    await storageSet("agenda-due-threshold", n);
  };

  const addCustomPlace = async (name) => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const exists = places.some((p) => p.toLowerCase() === trimmed.toLowerCase());
    if (!exists) await persistPlaces([...places, trimmed]);
    return trimmed;
  };

  const deleteCustomPlace = async (name) => {
    if (DEFAULT_PLACES.includes(name)) return;
    await persistPlaces(places.filter((p) => p !== name));
  };

  // If an item's status becomes low/out, add it to the "Akan Dibeli" list
  // (unless it already has an active, unchecked entry there).
  const checkToBuy = async (item, currentToBuy) => {
    const status = statusOf(item);
    if (status !== "low" && status !== "out") return;
    const hasActive = currentToBuy.some((e) => e.itemId === item.id && !e.bought);
    if (hasActive) return;
    const entry = {
      id: uid(),
      itemId: item.id,
      itemName: item.name,
      status,
      source: "auto",
      qty: "",
      unit: "",
      place: "",
      notes: "",
      addedAt: new Date().toISOString(),
      bought: false,
      boughtBy: null,
      boughtAt: null,
    };
    await persistToBuy([entry, ...currentToBuy]);
  };

  const handleAdd = async (data) => {
    setSaving(true);
    const now = new Date().toISOString();
    let newItem;
    let histEntry;
    if (data.type === "level") {
      newItem = {
        id: uid(),
        type: "level",
        name: data.name.trim(),
        level: data.level,
        notes: data.notes ? data.notes.trim() : "",
        lastUpdatedBy: userName,
        lastUpdatedAt: now,
      };
      histEntry = { itemId: newItem.id, itemName: newItem.name, user: userName, action: "add", newLevel: newItem.level };
    } else {
      newItem = {
        id: uid(),
        type: "qty",
        name: data.name.trim(),
        qty: Number(data.qty),
        unit: data.unit.trim() || "pcs",
        minQty: data.minQty === "" ? 0 : Number(data.minQty),
        notes: data.notes ? data.notes.trim() : "",
        lastUpdatedBy: userName,
        lastUpdatedAt: now,
      };
      histEntry = { itemId: newItem.id, itemName: newItem.name, user: userName, action: "add", newQty: newItem.qty, unit: newItem.unit };
    }
    const next = [...items, newItem];
    await persistItems(next);
    await pushHistory(histEntry, history);
    await checkToBuy(newItem, toBuy);
    setSaving(false);
    setModal(null);
  };

  const handleEdit = async (id, data) => {
    setSaving(true);
    const current = items.find((i) => i.id === id);
    if (!current) {
      setSaving(false);
      return;
    }
    const now = new Date().toISOString();
    let updated;
    let histEntry = null;
    if (current.type === "level") {
      const oldLevel = current.level;
      updated = {
        ...current,
        name: data.name.trim(),
        level: data.level,
        notes: data.notes ? data.notes.trim() : "",
        lastUpdatedBy: userName,
        lastUpdatedAt: now,
      };
      if (oldLevel !== data.level) {
        histEntry = { itemId: id, itemName: updated.name, user: userName, action: "update", oldLevel, newLevel: data.level };
      }
    } else {
      const oldQty = current.qty;
      const newQty = Number(data.qty);
      updated = {
        ...current,
        name: data.name.trim(),
        qty: newQty,
        unit: data.unit.trim() || "pcs",
        minQty: data.minQty === "" ? 0 : Number(data.minQty),
        notes: data.notes ? data.notes.trim() : "",
        lastUpdatedBy: userName,
        lastUpdatedAt: now,
      };
      if (oldQty !== newQty) {
        histEntry = { itemId: id, itemName: updated.name, user: userName, action: "update", oldQty, newQty, unit: updated.unit };
      }
    }
    const next = items.map((i) => (i.id === id ? updated : i));
    await persistItems(next);
    if (histEntry) await pushHistory(histEntry, history);
    await checkToBuy(updated, toBuy);
    setSaving(false);
    setModal(null);
  };

  const handleQuickAdjust = async (id, delta) => {
    const current = items.find((i) => i.id === id);
    if (!current) return;
    const oldQty = current.qty;
    const newQty = Math.max(0, Number((oldQty + delta).toFixed(3)));
    if (newQty === oldQty) return;
    const updated = { ...current, qty: newQty, lastUpdatedBy: userName, lastUpdatedAt: new Date().toISOString() };
    const next = items.map((i) => (i.id === id ? updated : i));
    await persistItems(next);
    await pushHistory({ itemId: id, itemName: current.name, user: userName, action: "update", oldQty, newQty, unit: current.unit }, history);
    await checkToBuy(updated, toBuy);
  };

  const handleLevelChange = async (id, newLevel) => {
    const current = items.find((i) => i.id === id);
    if (!current || current.level === newLevel) return;
    const oldLevel = current.level;
    const updated = { ...current, level: newLevel, lastUpdatedBy: userName, lastUpdatedAt: new Date().toISOString() };
    const next = items.map((i) => (i.id === id ? updated : i));
    await persistItems(next);
    await pushHistory({ itemId: id, itemName: current.name, user: userName, action: "update", oldLevel, newLevel }, history);
    await checkToBuy(updated, toBuy);
  };

  const handleDeleteItem = async (id) => {
    const current = items.find((i) => i.id === id);
    if (!current) return;
    const next = items.filter((i) => i.id !== id);
    await persistItems(next);
    await pushHistory({ itemId: id, itemName: current.name, user: userName, action: "delete", oldQty: current.qty, unit: current.unit }, history);
    const nextToBuy = toBuy.filter((e) => !(e.itemId === id && !e.bought));
    if (nextToBuy.length !== toBuy.length) await persistToBuy(nextToBuy);
  };

  const handleToggleBought = async (entryId) => {
    const next = toBuy.map((e) => {
      if (e.id !== entryId) return e;
      if (e.bought) return { ...e, bought: false, boughtBy: null, boughtAt: null };
      return { ...e, bought: true, boughtBy: userName, boughtAt: new Date().toISOString() };
    });
    await persistToBuy(next);
  };

  const handleDeleteToBuyEntry = async (id) => {
    await persistToBuy(toBuy.filter((e) => e.id !== id));
  };

  const handleAddManualToBuy = async ({ name, qty, unit, place, notes }) => {
    const entry = {
      id: uid(),
      itemId: null,
      itemName: name.trim(),
      status: null,
      source: "manual",
      qty: qty || "",
      unit: unit || "",
      place: place || "",
      notes: notes ? notes.trim() : "",
      addedAt: new Date().toISOString(),
      addedBy: userName,
      bought: false,
      boughtBy: null,
      boughtAt: null,
    };
    await persistToBuy([entry, ...toBuy]);
    setToBuyModal(null);
  };

  const handleEditToBuyEntry = async (entryId, { name, qty, unit, place, notes }) => {
    const next = toBuy.map((e) =>
      e.id === entryId
        ? {
            ...e,
            itemName: e.source === "manual" ? name.trim() : e.itemName,
            qty: qty || "",
            unit: unit || "",
            place: place || "",
            notes: notes ? notes.trim() : "",
          }
        : e
    );
    await persistToBuy(next);
    setToBuyModal(null);
  };

  const handleAddTask = async ({ title, planDate, deadline, notes, recurrence }) => {
    const newTask = {
      id: uid(),
      title: title.trim(),
      planDate: planDate || "",
      deadline: deadline || "",
      notes: notes ? notes.trim() : "",
      recurrence: recurrence || null,
      done: false,
      createdBy: userName,
      createdAt: new Date().toISOString(),
      doneBy: null,
      doneAt: null,
    };
    await persistTasks([newTask, ...tasks]);
    setTaskModal(null);
  };

  const handleEditTask = async (id, { title, planDate, deadline, notes, recurrence }) => {
    const next = tasks.map((t) =>
      t.id === id
        ? { ...t, title: title.trim(), planDate: planDate || "", deadline: deadline || "", notes: notes ? notes.trim() : "", recurrence: recurrence || null }
        : t
    );
    await persistTasks(next);
    setTaskModal(null);
  };

  const handleToggleTaskDone = async (id) => {
    const current = tasks.find((t) => t.id === id);
    if (!current) return;
    let next;
    if (current.done) {
      next = tasks.map((t) => (t.id === id ? { ...t, done: false, doneBy: null, doneAt: null } : t));
    } else {
      const updated = { ...current, done: true, doneBy: userName, doneAt: new Date().toISOString() };
      next = tasks.map((t) => (t.id === id ? updated : t));
      if (current.recurrence && (current.planDate || current.deadline)) {
        const { every, unit } = current.recurrence;
        const nextTask = {
          id: uid(),
          title: current.title,
          planDate: current.planDate ? advanceDate(current.planDate, every, unit) : "",
          deadline: current.deadline ? advanceDate(current.deadline, every, unit) : "",
          notes: current.notes || "",
          recurrence: current.recurrence,
          done: false,
          createdBy: userName,
          createdAt: new Date().toISOString(),
          doneBy: null,
          doneAt: null,
        };
        next = [nextTask, ...next];
      }
    }
    await persistTasks(next);
  };

  const handleDeleteTask = async (id) => {
    await persistTasks(tasks.filter((t) => t.id !== id));
  };

  const handleConfirmedDelete = async () => {
    if (!confirmDelete) return;
    if (confirmDelete.type === "item") await handleDeleteItem(confirmDelete.id);
    else if (confirmDelete.type === "tobuy") await handleDeleteToBuyEntry(confirmDelete.id);
    else if (confirmDelete.type === "task") await handleDeleteTask(confirmDelete.id);
    setConfirmDelete(null);
  };

  const handleBackupDownload = () => {
    const payload = {
      app: "frinirvan-tracker",
      exportedAt: new Date().toISOString(),
      data: {
        "stock-items": items,
        "stock-history": history,
        "stock-tobuy": toBuy,
        "stock-places": places,
        "agenda-tasks": tasks,
        "agenda-due-threshold": dueThreshold,
      },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `frinirvan-tracker-backup-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const triggerRestorePicker = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileSelected = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== "object" || !parsed.data) {
        setRestoreError("File backup tidak valid atau rusak.");
        return;
      }
      setPendingRestore(parsed.data);
    } catch {
      setRestoreError("Gagal membaca file. Pastikan ini file backup JSON yang benar.");
    }
  };

  const handleConfirmRestore = async () => {
    if (!pendingRestore) return;
    const d = pendingRestore;
    const nextItems = Array.isArray(d["stock-items"]) ? d["stock-items"] : [];
    const nextHistory = Array.isArray(d["stock-history"]) ? d["stock-history"] : [];
    const nextToBuy = Array.isArray(d["stock-tobuy"]) ? d["stock-tobuy"] : [];
    const nextPlaces = Array.isArray(d["stock-places"]) && d["stock-places"].length > 0 ? d["stock-places"] : DEFAULT_PLACES;
    const nextTasks = Array.isArray(d["agenda-tasks"]) ? d["agenda-tasks"] : [];
    const nextThreshold = typeof d["agenda-due-threshold"] === "number" && d["agenda-due-threshold"] > 0 ? d["agenda-due-threshold"] : 3;

    await persistItems(nextItems);
    await persistHistory(nextHistory);
    await persistToBuy(nextToBuy);
    await persistPlaces(nextPlaces);
    await persistTasks(nextTasks);
    await persistThreshold(nextThreshold);
    setPendingRestore(null);
  };

  const stockCounts = useMemo(() => {
    let low = 0,
      out = 0;
    items.forEach((i) => {
      const s = statusOf(i);
      if (s === "low") low++;
      if (s === "out") out++;
    });
    return { total: items.length, low, out };
  }, [items]);

  const toBuyCounts = useMemo(() => {
    const pending = toBuy.filter((e) => !e.bought).length;
    return { pending, total: toBuy.length };
  }, [toBuy]);

  const agendaCounts = useMemo(() => {
    const active = tasks.filter((t) => !t.done);
    let soon = 0,
      overdue = 0;
    active.forEach((t) => {
      const u = taskUrgency(t, dueThreshold);
      if (u === "overdue") overdue++;
      else if (u === "soon") soon++;
    });
    return { all: active.length, soon, overdue, done: tasks.length - active.length };
  }, [tasks, dueThreshold]);

  const todayLabel = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 10) return "Selamat pagi";
    if (h < 15) return "Selamat siang";
    if (h < 18) return "Selamat sore";
    return "Selamat malam";
  }, []);

  // Preview list untuk kartu Beranda: maksimal 5 baris, sisanya lewat "Lihat semua"
  const stockPreview = useMemo(() => {
    const statusOrder = { out: 0, low: 1 };
    const needAttention = items
      .filter((i) => statusOf(i) !== "safe")
      .sort((a, b) => {
        const sa = statusOrder[statusOf(a)];
        const sb = statusOrder[statusOf(b)];
        if (sa !== sb) return sa - sb;
        return a.name.localeCompare(b.name, "id");
      });
    return { list: needAttention.slice(0, 3), total: needAttention.length };
  }, [items]);

  const toBuyPreview = useMemo(() => {
    const pending = toBuy
      .filter((e) => !e.bought)
      .sort((a, b) => new Date(a.addedAt) - new Date(b.addedAt));
    return { list: pending.slice(0, 3), total: pending.length };
  }, [toBuy]);

  const agendaPreview = useMemo(() => {
    const rank = { overdue: 0, soon: 1, normal: 2, none: 3 };
    const active = tasks
      .filter((t) => !t.done)
      .sort((a, b) => {
        const ua = taskUrgency(a, dueThreshold),
          ub = taskUrgency(b, dueThreshold);
        if (rank[ua] !== rank[ub]) return rank[ua] - rank[ub];
        const da = a.deadline ? daysUntil(a.deadline) : Infinity;
        const db = b.deadline ? daysUntil(b.deadline) : Infinity;
        return da - db;
      });
    return { list: active.slice(0, 3), total: active.length };
  }, [tasks, dueThreshold]);

  // Masih mengecek status login ke Firebase (sekejap saat pertama buka app)
  if (authUser === undefined) {
    return (
      <div style={{ background: COLORS.bg, minHeight: "100vh", color: COLORS.inkSoft }} className="flex items-center justify-center text-sm">
        Memuat...
      </div>
    );
  }

  // Belum login (atau baru logout) — tampilkan layar login, jangan render app-nya
  if (authUser === null) {
    return <LoginScreen onLogin={login} />;
  }

  if (loading) {
    return (
      <div style={{ background: COLORS.bg, minHeight: "100vh", color: COLORS.inkSoft }} className="flex items-center justify-center text-sm">
        Memuat data...
      </div>
    );
  }

  // Belum isi nama — tanya dulu sebelum masuk ke pemilihan aplikasi.
  if (askName) {
    return (
      <div style={{ background: COLORS.bg, minHeight: "100vh", color: COLORS.ink, fontFamily: "'Outfit', sans-serif" }}>
        <Overlay onClose={() => userName && setAskName(false)}>
          <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 600, fontSize: 20, color: COLORS.primary }} className="mb-1">
            Siapa kamu?
          </div>
          <p className="text-sm mb-4" style={{ color: COLORS.inkSoft }}>
            Nama ini bakal dicatat tiap kali kamu mengubah sesuatu, biar kelihatan siapa yang mengubah apa.
          </p>
          <input
            autoFocus
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            placeholder="Nama kamu, mis. Sari"
            className="w-full px-3 py-2.5 rounded-lg text-sm mb-4"
            style={{ border: `1px solid ${COLORS.border}` }}
            onKeyDown={(e) => e.key === "Enter" && saveUserName(nameDraft)}
          />
          <button onClick={() => saveUserName(nameDraft)} className="w-full py-2.5 rounded-lg text-sm font-medium text-white" style={{ background: COLORS.primary }}>
            Simpan
          </button>
        </Overlay>
      </div>
    );
  }

  // Sudah login & sudah punya nama — pilih mau buka aplikasi yang mana.
  if (!activeApp) {
    return (
      <>
        <AppPicker
          userName={userName}
          onPick={openAppWithMorph}
          onLogout={logout}
          notifSlot={notifBell}
          pickingKey={pickingKey}
          returningKey={flight && flight.back ? lastOpenedKey : null}
        />
        {flight && <CardFlyer flight={flight} />}
      {ink && <span className="fab-ink" style={{ left: ink.left, top: ink.top, background: ink.color }} />}
      {/* Halaman awal dipasang tak terlihat supaya kartunya bisa diukur. */}
      {measuring && (
        <div className="fixed inset-0" style={{ opacity: 0, pointerEvents: "none", zIndex: 1 }} aria-hidden="true">
          <AppPicker userName={userName} onPick={() => {}} onLogout={() => {}} notifSlot={null} />
        </div>
      )}
      {veil && <div className="veil" style={{ background: veil }} />}
      </>
    );
  }

  if (activeApp === "kas") {
    return (
      <>
      <KasRumahApp
        userName={userName}
        onBackToPicker={closeAppWithMorph}
        onSwitchApp={closeAppWithMorph}
        onLogout={logout}
        notifSlot={notifBell}
        notifSlotDark={notifBellOnDark}
        initialHighlightId={kasHighlightId}
        onInitialHighlightDone={() => setKasHighlightId(null)}
      />
      {flight && <CardFlyer flight={flight} />}
      </>
    );
  }

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", color: COLORS.ink, fontFamily: "'Outfit', sans-serif" }}>
      <SharedStyles />
      <style>{`
        html, body {
          overflow: hidden;
          overscroll-behavior: none;
        }
        input:focus, button:focus, textarea:focus { outline: 2px solid ${COLORS.primary}; outline-offset: 1px; }
      `}</style>

      <input ref={fileInputRef} type="file" accept=".json,application/json" style={{ display: "none" }} onChange={handleFileSelected} />

      {activeApp === "agenda" ? (
        <div className="fixed left-0 right-0 fx-page" style={{ top: 0, bottom: 0 }}>
          <AgendaPage
            tasks={tasks}
            dueThreshold={dueThreshold}
            search={agendaSearch}
            setSearch={setAgendaSearch}
            filter={agendaFilter}
            setFilter={setAgendaFilter}
            onBack={() => setActiveApp(null)}
            onAddTask={() => setTaskModal({ mode: "add" })}
            onEditTask={(task) => setTaskModal({ mode: "edit", task })}
            onDeleteTask={(task) => setConfirmDelete({ type: "task", id: task.id, label: task.title })}
            onToggleDone={handleToggleTaskDone}
            onOpenThreshold={() => setThresholdModal(true)}
            userName={userName}
            onOpenUserMenu={() => setShowUserMenu(true)}
            onSwitchApp={closeAppWithMorph}
            notifSlot={notifBellOnDark}
            onRefresh={loadAll}
            highlightId={highlightTarget?.type === "agenda" ? highlightTarget.id : null}
            onHighlightDone={() => setHighlightTarget(null)}
          />
        </div>
      ) : (
      <div
        ref={trackWrapRef}
        className="fixed left-0 right-0 overflow-hidden fx-page"
        style={{ top: 0, bottom: 0, overflow: "clip" }}
      >
        <div
          className="flex h-full"
          style={{
            width: "300vw",
            transform: `translateX(calc(${-TAB_ORDER.indexOf(view) * 100}vw + ${dragX}px))`,
            transition: isDragging ? "none" : "transform 320ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={resetDrag}
        >
          <div className="h-full overflow-y-auto" style={{ width: "100vw", overscrollBehaviorY: "contain" }}>
            <div className="max-w-2xl mx-auto px-4 pb-32" style={{ paddingTop: "env(safe-area-inset-top)" }}>
              <div>
                {/* Kartu sambutan menempel penuh ke tepi layar dengan tinggi
                    dikunci — bentuk yang sama persis dengan kartu terbang,
                    supaya serah terimanya tidak berkedip. */}
                <div
                  className="hero-hold relative flex flex-col justify-between"
                  style={{
                    background: COLORS.navy,
                    borderRadius: "0 0 30px 30px",
                    padding: "calc(env(safe-area-inset-top) + 24px) 22px 20px",
                    height: `calc(${HERO_HEIGHT}px + env(safe-area-inset-top))`,
                    marginLeft: -16,
                    marginRight: -16,
                  }}
                >
                  {/* Hiasan lingkaran dibungkus lapisan sendiri yang memotong
                      luapannya. Tombol di bawah ini berada DI LUAR lapisan itu,
                      supaya panel notifikasi bebas menjulur keluar kartu. */}
                  <span
                    className="absolute inset-0 overflow-hidden pointer-events-none"
                    style={{ borderRadius: 34 }}
                    aria-hidden="true"
                  >
                    <span
                      className="absolute rounded-full"
                      style={{ right: -52, top: -60, width: 230, height: 230, background: "rgba(255,255,255,0.07)" }}
                    />
                    <span
                      className="absolute rounded-full"
                      style={{ right: 28, bottom: -66, width: 165, height: 165, background: "rgba(255,255,255,0.05)" }}
                    />
                  </span>
                  <div className="relative flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-sm font-medium" style={{ color: "#A8B2CC" }}>
                        {greeting}
                        {userName ? `, ${userName}` : ""} <span>👋</span>
                      </span>
                      <h1
                        style={{
                          fontFamily: "'Baloo 2', cursive",
                          fontWeight: 700,
                          fontSize: 44,
                          lineHeight: 1.02,
                          letterSpacing: "-0.5px",
                          color: "#fff",
                          marginTop: 4,
                        }}
                      >
                        Stok
                        <br />
                        Rumah
                      </h1>
                    </div>
                    <div className="hero-actions flex items-center gap-2 shrink-0">
                      {view === "dashboard" ? notifBellOnDark : null}
                      <button
                        onClick={() => attemptNavigate(closeAppWithMorph)}
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(255,255,255,0.14)" }}
                        title="Ganti aplikasi"
                      >
                        <LayoutGrid size={19} color="#fff" />
                      </button>
                      <button
                        onClick={() => setShowUserMenu(true)}
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(255,255,255,0.14)" }}
                        title="Menu"
                      >
                        <Menu size={19} color="#fff" />
                      </button>
                    </div>
                  </div>
                  <div
                    className="relative inline-flex items-center gap-2 capitalize"
                    style={{ marginTop: 20, background: "rgba(255,255,255,0.12)", borderRadius: 22, padding: "8px 14px", fontSize: 13, color: "#E6EAF3" }}
                  >
                    <Calendar size={15} color="#E6EAF3" />
                    {todayLabel}
                  </div>
                </div>

                {/* Tiga ringkasan angka — sekaligus pintasan ke daftar yang sesuai */}
                <div
                  className="grid gap-2"
                  style={{ marginTop: 16, gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}
                >
                  <HomeStat
                    icon={ThumbsUp}
                    value={stockCounts.total - stockPreview.total}
                    label="stok aman"
                    bg={COLORS.navySoft}
                    fg={COLORS.navy}
                    textColor={COLORS.navyText}
                    onClick={() => {
                      setStockFilter("safe");
                      setView("stock");
                    }}
                  />
                  <HomeStat
                    icon={AlertTriangle}
                    value={stockPreview.total}
                    label="perlu dicek"
                    bg={COLORS.iconStockBg}
                    fg={COLORS.iconStockFg}
                    textColor={COLORS.iconStockText}
                    onClick={() => {
                      setStockFilter(stockCounts.out > 0 ? "out" : "low");
                      setView("stock");
                    }}
                  />
                  <HomeStat
                    icon={ShoppingBasket}
                    value={toBuyCounts.pending}
                    label="akan dibeli"
                    bg={COLORS.iconBuyBg}
                    fg={COLORS.iconBuyFg}
                    textColor={COLORS.iconBuyText}
                    onClick={() => {
                      setTobuyFilter("pending");
                      setView("tobuy");
                    }}
                  />
                </div>
              </div>

            <div className="flex flex-col gap-3" style={{ marginTop: 16 }}>
              <SectionCard
                icon={Package}
                iconBg={COLORS.iconStockBg}
                iconFg={COLORS.iconStockFg}
                title="Stok Rumah"
                subtitle={
                  stockPreview.total > 0
                    ? `${stockPreview.total} barang perlu diperhatikan`
                    : stockCounts.total === 0
                    ? "Belum ada item"
                    : "Semua aman \u2713"
                }
                badge={stockPreview.total}
                badgeColor={stockCounts.out > 0 ? COLORS.out : COLORS.low}
                onOpen={() => setView("stock")}
                rows={stockPreview.list.map((item) => (
                  <StockPreviewRow key={item.id} item={item} onClick={() => goToStockItem(item)} />
                ))}
                moreButton={
                  stockPreview.total > 3 && (
                    <SeeAllButton
                      count={stockPreview.total - stockPreview.list.length}
                      onClick={() => {
                        setStockFilter("all");
                        setView("stock");
                      }}
                    />
                  )
                }
              />

              <SectionCard
                icon={ShoppingCart}
                iconBg={COLORS.iconBuyBg}
                iconFg={COLORS.iconBuyFg}
                title="Akan Dibeli"
                subtitle={
                  toBuyPreview.total > 0
                    ? `${toBuyPreview.total} barang dalam daftar`
                    : toBuyCounts.total === 0
                    ? "Belum ada yang perlu dibeli"
                    : "Semua sudah dibeli \ud83c\udf89"
                }
                badge={toBuyPreview.total}
                badgeColor={COLORS.low}
                onOpen={() => setView("tobuy")}
                rows={toBuyPreview.list.map((entry) => (
                  <ToBuyPreviewRow key={entry.id} entry={entry} onToggle={() => handleToggleBought(entry.id)} onClick={() => goToToBuyEntry(entry)} />
                ))}
                moreButton={
                  toBuyPreview.total > 3 && (
                    <SeeAllButton
                      count={toBuyPreview.total - toBuyPreview.list.length}
                      onClick={() => {
                        setTobuyFilter("pending");
                        setView("tobuy");
                      }}
                    />
                  )
                }
              />

              <SectionCard
                icon={CalendarCheck2}
                iconBg={COLORS.iconAgendaBg}
                iconFg={COLORS.iconAgendaFg}
                title="Agenda Rumah"
                subtitle={
                  agendaPreview.total > 0
                    ? `${agendaPreview.total} tugas aktif`
                    : "Belum ada tugas"
                }
                badge={agendaCounts.overdue + agendaCounts.soon}
                badgeColor={agendaCounts.overdue > 0 ? COLORS.out : COLORS.low}
                onOpen={() => setActiveApp("agenda")}
                rows={agendaPreview.list.map((task) => (
                  <AgendaPreviewRow
                    key={task.id}
                    task={task}
                    threshold={dueThreshold}
                    onToggle={() => handleToggleTaskDone(task.id)}
                    onClick={() => goToTask(task)}
                  />
                ))}
                moreButton={
                  agendaPreview.total > 3 && (
                    <SeeAllButton
                      count={agendaPreview.total - agendaPreview.list.length}
                      onClick={() => {
                        setAgendaFilter("all");
                        setActiveApp("agenda");
                      }}
                    />
                  )
                }
              />
            </div>
          </div>
          </div>

          <div className="h-full" style={{ width: "100vw" }}>
          <StockPage
            items={items}
            search={stockSearch}
            setSearch={setStockSearch}
            filter={stockFilter}
            setFilter={setStockFilter}
            onBack={() => attemptNavigate(() => setView("dashboard"))}
            onAdd={() => attemptNavigate(() => setModal({ mode: "add" }))}
            onEditItem={(item) => attemptNavigate(() => setModal({ mode: "edit", item }))}
            onDeleteItem={(item) => attemptNavigate(() => setConfirmDelete({ type: "item", id: item.id, label: item.name }))}
            onAdjust={beginOrUpdatePendingQty}
            onLevelChange={setPendingLevelEdit}
            pendingEdit={pendingEdit}
            onConfirmPending={confirmPendingEdit}
            onBlockedAttempt={() => pendingEdit && setBlockedNotice(pendingEdit.itemName)}
            userName={userName}
            onOpenUserMenu={() => attemptNavigate(() => setShowUserMenu(true))}
            onSwitchApp={() => attemptNavigate(closeAppWithMorph)}
            notifSlot={view === "stock" ? notifBell : null}
            onRefresh={loadAll}
            highlightId={highlightTarget?.type === "stock" ? highlightTarget.id : null}
            onHighlightDone={() => setHighlightTarget(null)}
          />
          </div>

          <div className="h-full" style={{ width: "100vw" }}>
          <ToBuyPage
            toBuy={toBuy}
            search={tobuySearch}
            setSearch={setTobuySearch}
            filter={tobuyFilter}
            setFilter={setTobuyFilter}
            onBack={() => setView("dashboard")}
            onAddManual={() => setToBuyModal({ mode: "add" })}
            onEditEntry={(entry) => setToBuyModal({ mode: "edit", entry })}
            onDeleteEntry={(entry) => setConfirmDelete({ type: "tobuy", id: entry.id, label: entry.itemName })}
            onToggle={handleToggleBought}
            userName={userName}
            onOpenUserMenu={() => setShowUserMenu(true)}
            onSwitchApp={closeAppWithMorph}
            notifSlot={view === "tobuy" ? notifBell : null}
            onRefresh={loadAll}
            highlightId={highlightTarget?.type === "tobuy" ? highlightTarget.id : null}
            onHighlightDone={() => setHighlightTarget(null)}
          />
          </div>

        </div>
      </div>
      )}

      {activeApp !== "agenda" && (
        <BottomNav
          view={view}
          setView={(v) => attemptNavigate(() => changeView(v))}
          showAdd={view === "stock" || view === "tobuy"}
          onAdd={(e) => {
            splashInk(e);
            attemptNavigate(() => {
              if (view === "stock") setModal({ mode: "add" });
              else setToBuyModal({ mode: "add" });
            });
          }}
        />
      )}

      {/* Item add/edit modal */}
      {modal && (
        <ItemFormModal
          mode={modal.mode}
          item={modal.item}
          saving={saving}
          onClose={() => setModal(null)}
          onSubmit={(data) => (modal.mode === "add" ? handleAdd(data) : handleEdit(modal.item.id, data))}
        />
      )}

      {/* Generic delete confirm */}
      {confirmDelete && (
        <Overlay onClose={() => setConfirmDelete(null)}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={18} color={COLORS.out} />
            <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 600, fontSize: 18, color: COLORS.ink }}>
              Hapus {confirmDelete.type === "item" ? "item" : confirmDelete.type === "tobuy" ? "item beli" : "tugas"}?
            </div>
          </div>
          <p className="text-sm mb-4" style={{ color: COLORS.inkSoft }}>
            "{confirmDelete.label}" akan dihapus
            {confirmDelete.type === "item" ? " dari daftar stok." : confirmDelete.type === "tobuy" ? " dari daftar akan dibeli." : " dari agenda."}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmDelete(null)}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium"
              style={{ border: `1px solid ${COLORS.border}`, color: COLORS.ink }}
            >
              Batal
            </button>
            <button onClick={handleConfirmedDelete} className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white" style={{ background: COLORS.out }}>
              Hapus
            </button>
          </div>
        </Overlay>
      )}

      {/* Peringatan: ada perubahan qty/level yang belum ditekan centang */}
      {blockedNotice && (
        <Overlay onClose={handleBlockedNoticeOk}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={18} color={COLORS.low} />
            <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 600, fontSize: 18, color: COLORS.ink }}>
              Perubahan belum disetujui
            </div>
          </div>
          <p className="text-sm mb-4" style={{ color: COLORS.inkSoft }}>
            Kamu belum menyetujui perubahan pada "{blockedNotice}". Tekan centang pada item itu dulu, atau kembalikan ke nilai semula.
          </p>
          <button onClick={handleBlockedNoticeOk} className="w-full py-2.5 rounded-lg text-sm font-medium text-white" style={{ background: COLORS.primary }}>
            OK
          </button>
        </Overlay>
      )}

      {/* History panel */}
      {showHistory && <HistoryPanel activity={fullActivityFeed} onClose={() => setShowHistory(false)} />}

      {flight && <CardFlyer flight={flight} />}
      {/* Halaman awal dipasang tak terlihat supaya kartunya bisa diukur. */}
      {measuring && (
        <div className="fixed inset-0" style={{ opacity: 0, pointerEvents: "none", zIndex: 1 }} aria-hidden="true">
          <AppPicker userName={userName} onPick={() => {}} onLogout={() => {}} notifSlot={null} />
        </div>
      )}
      {veil && <div className="veil" style={{ background: veil }} />}

      {/* User menu drawer */}
      {showUserMenu && (
        <UserMenuPanel
          userName={userName}
          userEmail={authUser ? authUser.email : ""}
          onClose={() => setShowUserMenu(false)}
          onChangeName={() => setAskName(true)}
          onOpenHistory={() => setShowHistory(true)}
          onBackup={handleBackupDownload}
          onRestore={triggerRestorePicker}
          onSwitchApp={closeAppWithMorph}
          onOpenThreshold={() => setThresholdModal(true)}
          dueThreshold={dueThreshold}
          onLogout={logout}
        />
      )}

      {/* Akan Dibeli add/edit modal */}
      {toBuyModal && (
        <ToBuyFormModal
          mode={toBuyModal.mode}
          entry={toBuyModal.entry}
          places={places}
          onAddPlace={addCustomPlace}
          onDeletePlace={deleteCustomPlace}
          onClose={() => setToBuyModal(null)}
          onSubmit={(data) => (toBuyModal.mode === "add" ? handleAddManualToBuy(data) : handleEditToBuyEntry(toBuyModal.entry.id, data))}
        />
      )}

      {/* Agenda task add/edit modal */}
      {taskModal && (
        <TaskFormModal
          mode={taskModal.mode}
          task={taskModal.task}
          onClose={() => setTaskModal(null)}
          onSubmit={(data) => (taskModal.mode === "add" ? handleAddTask(data) : handleEditTask(taskModal.task.id, data))}
        />
      )}

      {/* Threshold settings modal */}
      {thresholdModal && (
        <ThresholdModal
          current={dueThreshold}
          onClose={() => setThresholdModal(false)}
          onSubmit={(n) => {
            persistThreshold(n);
            setThresholdModal(false);
          }}
        />
      )}

      {/* Restore confirm */}
      {pendingRestore && (
        <Overlay onClose={() => setPendingRestore(null)}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={18} color={COLORS.out} />
            <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 600, fontSize: 18, color: COLORS.ink }}>
              Pulihkan dari backup?
            </div>
          </div>
          <p className="text-sm mb-2" style={{ color: COLORS.inkSoft }}>
            Ini akan menimpa semua data yang ada sekarang dengan isi file backup:
          </p>
          <ul className="text-sm mb-4 list-disc pl-4" style={{ color: COLORS.ink }}>
            <li>{(pendingRestore["stock-items"] || []).length} item stok</li>
            <li>{(pendingRestore["stock-tobuy"] || []).length} item akan dibeli</li>
            <li>{(pendingRestore["agenda-tasks"] || []).length} tugas agenda</li>
          </ul>
          <div className="flex gap-2">
            <button
              onClick={() => setPendingRestore(null)}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium"
              style={{ border: `1px solid ${COLORS.border}`, color: COLORS.ink }}
            >
              Batal
            </button>
            <button onClick={handleConfirmRestore} className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white" style={{ background: COLORS.primary }}>
              Pulihkan
            </button>
          </div>
        </Overlay>
      )}

      {/* Restore error */}
      {restoreError && (
        <Overlay onClose={() => setRestoreError("")}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={18} color={COLORS.out} />
            <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 600, fontSize: 18, color: COLORS.ink }}>
              Gagal memulihkan
            </div>
          </div>
          <p className="text-sm mb-4" style={{ color: COLORS.inkSoft }}>
            {restoreError}
          </p>
          <button onClick={() => setRestoreError("")} className="w-full py-2.5 rounded-lg text-sm font-medium text-white" style={{ background: COLORS.primary }}>
            Oke
          </button>
        </Overlay>
      )}
    </div>
  );
}

function NotifBell({ count, activity, open, onOpen, onClose, onSelect, onDark }) {
  const wrapRef = useRef(null);
  const headerRef = useRef(null);
  const [listMaxHeight, setListMaxHeight] = useState(272);
  const [panelWidth, setPanelWidth] = useState(320);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) onClose();
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [open, onClose]);

  // Hitung sisa ruang di layar dari POSISI ASLI tombol lonceng (bukan cuma
  // asumsi jarak tetap). Ini juga yang bikin lebar panel sebelumnya mepet ke
  // kiri: panel digantung dari sisi kanan tombol lonceng, tapi tombol itu
  // sendiri bukan elemen paling kanan di layar (ada tombol menu di sebelahnya),
  // jadi lebar tetap 340px kepanjangan ke kiri. Sekarang lebar & tinggi
  // dihitung dari posisi asli tombol, dipasang sebagai angka piksel pasti
  // (bukan %/vw), biar selalu pas & tetap bisa discroll di iPhone maupun Android.
  useEffect(() => {
    if (!open) return;
    function recompute() {
      const btn = wrapRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const headerH = headerRef.current ? headerRef.current.getBoundingClientRect().height : 64;
      const viewportH = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
      const viewportW = (window.visualViewport && window.visualViewport.width) || window.innerWidth;

      const leftMargin = 16;
      const availableWidth = rect.right - leftMargin;
      setPanelWidth(Math.max(220, Math.min(340, availableWidth, viewportW - 32)));

      const reserved = 10 + 24 + headerH + 12; // jarak ke tombol + jarak aman bawah + tinggi header + padding
      const availableHeight = viewportH - rect.bottom - reserved;
      setListMaxHeight(Math.max(140, Math.min(320, availableHeight)));
    }
    recompute();
    window.addEventListener("resize", recompute);
    window.addEventListener("orientationchange", recompute);
    return () => {
      window.removeEventListener("resize", recompute);
      window.removeEventListener("orientationchange", recompute);
    };
  }, [open]);

  // Kelompokkan per hari, urutan kemunculan grup mengikuti urutan item
  // (yang sudah terurut terbaru duluan), jadi labelnya otomatis benar.
  const groups = [];
  for (const a of activity) {
    const label = activityDayLabel(a.timestamp);
    let g = groups.find((x) => x.label === label);
    if (!g) {
      g = { label, items: [] };
      groups.push(g);
    }
    g.items.push(a);
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => (open ? onClose() : onOpen())}
        className="relative w-10 h-10 rounded-full flex items-center justify-center"
        style={
          onDark
            ? { background: "rgba(255,255,255,0.14)" }
            : { background: COLORS.card, boxShadow: "0 2px 8px rgba(43,42,37,0.10)" }
        }
        title="Notifikasi"
      >
        <Bell size={onDark ? 19 : 16} color={onDark ? "#fff" : COLORS.ink} />
        {count > 0 && (
          <span
            key={count}
            className="absolute flex items-center justify-center font-semibold text-white"
            style={{
              top: -2,
              right: -2,
              minWidth: 17,
              height: 17,
              padding: "0 4px",
              borderRadius: 999,
              background: COLORS.out,
              fontSize: 10,
              animation: "notifBadgePop 220ms ease-out",
            }}
          >
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute"
          style={{
            top: "calc(100% + 10px)",
            right: 0,
            zIndex: 60,
            width: panelWidth,
            filter: "drop-shadow(0 16px 30px rgba(43,42,37,0.20)) drop-shadow(0 2px 6px rgba(43,42,37,0.10))",
            animation: "notifPop 180ms ease-out",
          }}
        >
          {/* Panah penunjuk: bentuknya menyatu dengan kartu (bayangan gabungan
              lewat drop-shadow di wrapper), jadi tidak ada garis sambungan */}
          <div
            className="absolute"
            style={{
              top: -6,
              right: 14,
              width: 14,
              height: 14,
              background: COLORS.card,
              borderRadius: 3,
              transform: "rotate(45deg)",
            }}
          />
          <div className="relative rounded-2xl" style={{ background: COLORS.card, overflow: "hidden" }}>
            <div ref={headerRef} className="px-4 pt-4 pb-3 flex items-center gap-2.5">
              <span
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{ background: COLORS.iconAgendaBg }}
              >
                <Bell size={14} color={COLORS.iconAgendaFg} />
              </span>
              <div className="min-w-0">
                <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 600, fontSize: 15, color: COLORS.ink, lineHeight: 1.2 }}>
                  Aktivitas Terbaru
                </div>
                <div className="text-[11px] mt-0.5" style={{ color: COLORS.inkSoft }}>3 hari terakhir</div>
              </div>
            </div>

            {activity.length === 0 ? (
              <div className="flex flex-col items-center text-center px-6 py-8">
                <span
                  className="w-11 h-11 rounded-full flex items-center justify-center mb-2.5"
                  style={{ background: COLORS.bg }}
                >
                  <Bell size={17} color={COLORS.inkSoft} />
                </span>
                <div className="text-sm" style={{ color: COLORS.inkSoft }}>Belum ada aktivitas baru</div>
              </div>
            ) : (
              <div className="relative">
                {/* Gradasi halus, ganti garis tegas biar transisi ke area scroll gak kaku */}
                <div
                  className="pointer-events-none absolute top-0 inset-x-0 z-10"
                  style={{ height: 16, background: `linear-gradient(to bottom, ${COLORS.card}, ${COLORS.card}00)` }}
                />
                <div style={{ maxHeight: listMaxHeight, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
                  {groups.map((g, gi) => (
                    <div key={g.label}>
                      <div
                        className="px-4 uppercase"
                        style={{
                          fontSize: 10,
                          letterSpacing: 0.6,
                          fontWeight: 700,
                          color: COLORS.primaryLight,
                          paddingTop: gi === 0 ? 2 : 14,
                          paddingBottom: 6,
                        }}
                      >
                        {g.label}
                      </div>
                      {g.items.map((a) => {
                        const meta = ACTIVITY_ICON[a.kind] || ACTIVITY_ICON.stockUpdate;
                        const Icon = meta.icon;
                        return (
                          <button
                            key={a.id}
                            onClick={() => onSelect && onSelect(a)}
                            className="w-full flex items-start gap-2.5 px-4 py-2.5 text-left"
                          >
                            <span
                              className="shrink-0 rounded-full flex items-center justify-center"
                              style={{ width: 30, height: 30, background: meta.bg }}
                            >
                              <Icon size={14} color={meta.fg} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm leading-snug" style={{ color: COLORS.ink }}>{a.text}</div>
                              <div className="text-xs mt-0.5" style={{ color: COLORS.inkSoft }}>{fmtClock(a.timestamp)}</div>
                            </div>
                            <ChevronRight size={14} color={COLORS.inkSoft} className="shrink-0 mt-1" />
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
                <div
                  className="pointer-events-none absolute bottom-0 inset-x-0 z-10"
                  style={{ height: 16, background: `linear-gradient(to top, ${COLORS.card}, ${COLORS.card}00)` }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function UserMenuPanel({ userName, userEmail, onClose, onChangeName, onOpenHistory, onBackup, onRestore, onSwitchApp, onOpenThreshold, dueThreshold, onLogout }) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleClose = () => {
    setEntered(false);
    setTimeout(onClose, 220);
  };

  const runAndClose = (action) => {
    action();
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0"
        style={{ background: "rgba(43,42,37,0.45)", opacity: entered ? 1 : 0, transition: "opacity 220ms ease-out" }}
        onClick={handleClose}
      />
      <div
        className="drawer-panel relative w-full sm:max-w-xs h-full overflow-y-auto p-5"
        style={{
          background: COLORS.bg,
          paddingTop: "calc(env(safe-area-inset-top) + 1.25rem)",
          transform: `translateX(${entered ? "0" : "100%"})`,
          transition: "transform 260ms ease-out",
          overscrollBehaviorY: "contain",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6 pt-1">
          <div className="flex items-center gap-3">
            <span
              className="w-11 h-11 rounded-full flex items-center justify-center text-base font-semibold text-white shrink-0"
              style={{ background: COLORS.primary }}
            >
              {userName ? userName.charAt(0).toUpperCase() : "?"}
            </span>
            <div>
              <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 600, fontSize: 16, color: COLORS.ink }}>{userName || "Belum diisi"}</div>
              <div className="text-xs" style={{ color: COLORS.inkSoft }}>{userEmail || "Frinirvan Tracker"}</div>
            </div>
          </div>
          <button onClick={handleClose}>
            <X size={18} color={COLORS.inkSoft} />
          </button>
        </div>

        <div className="rounded-2xl overflow-hidden drawer-rows" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
          <UserMenuItem icon={User} label="Ganti Nama" onClick={() => runAndClose(onChangeName)} />
          {onOpenThreshold && (
            <UserMenuItem
              icon={SlidersHorizontal}
              label={`Atur Pengingat (H-${dueThreshold})`}
              onClick={() => runAndClose(onOpenThreshold)}
            />
          )}
          <UserMenuItem icon={History} label="Riwayat" onClick={() => runAndClose(onOpenHistory)} />
          <UserMenuItem icon={Download} label="Unduh Backup" onClick={() => runAndClose(onBackup)} />
          <UserMenuItem icon={Upload} label="Pulihkan dari File" onClick={() => runAndClose(onRestore)} last />
        </div>

        <div className="rounded-2xl overflow-hidden mt-3" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
          <UserMenuItem icon={LayoutGrid} label="Ganti Aplikasi" onClick={() => runAndClose(onSwitchApp)} />
          <UserMenuItem icon={LogOut} label="Keluar" onClick={() => runAndClose(onLogout)} last danger />
        </div>
      </div>
    </div>
  );
}

function UserMenuItem({ icon: Icon, label, onClick, last, danger }) {
  const color = danger ? COLORS.out : COLORS.ink;
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-left"
      style={{ color, borderBottom: last ? "none" : `1px solid ${COLORS.border}` }}
    >
      <Icon size={16} color={danger ? COLORS.out : COLORS.inkSoft} />
      {label}
    </button>
  );
}

function TopBar({ title, subtitle, icon: Icon, iconBg, iconFg, onBack, rightSlot, userName, onOpenUserMenu, onSwitchApp, notifSlot }) {
  return (
    <div className="pt-8 pb-5 flex items-start justify-between">
      <div className="flex items-center gap-2.5 min-w-0">
        {onBack && (
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5"
            style={{ background: COLORS.card, boxShadow: "0 2px 8px rgba(43,42,37,0.10)" }}
          >
            <ArrowLeft size={16} color={COLORS.ink} />
          </button>
        )}
        {Icon && (
          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: iconBg }}>
            <Icon size={17} color={iconFg} />
          </div>
        )}
        <div className="min-w-0">
          <h1 style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 700, fontSize: onBack ? 26 : 30, lineHeight: 1.15 }}>{title}</h1>
          {subtitle && (
            <div className="text-sm mt-0.5" style={{ color: COLORS.inkSoft }}>
              {subtitle}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {rightSlot}
        {notifSlot}
        {onSwitchApp && (
          <button
            onClick={onSwitchApp}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: COLORS.card, boxShadow: "0 2px 8px rgba(43,42,37,0.10)" }}
            title="Ganti aplikasi"
          >
            <LayoutGrid size={16} color={COLORS.ink} />
          </button>
        )}
        {onOpenUserMenu && (
          <button
            onClick={onOpenUserMenu}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: COLORS.card, boxShadow: "0 2px 8px rgba(43,42,37,0.10)" }}
            title="Menu"
          >
            <Menu size={16} color={COLORS.ink} />
          </button>
        )}
      </div>
    </div>
  );
}

function SectionCard({ icon: Icon, iconBg, iconFg, title, subtitle, badge, badgeColor, onOpen, rows, moreButton }) {
  return (
    <div
      className="relative w-full"
      style={{ background: COLORS.card, borderRadius: 26, padding: 18, boxShadow: "0 4px 14px rgba(31,61,43,0.06)" }}
    >
      {badge > 0 && (
        <span
          className="absolute flex items-center justify-center font-semibold text-white"
          style={{ top: 18, right: 18, minWidth: 24, height: 24, padding: "0 7px", borderRadius: 12, background: badgeColor, fontSize: 12 }}
        >
          {badge}
        </span>
      )}
      <button onClick={onOpen} className="w-full flex items-center gap-3 text-left pr-9">
        <div
          className="flex items-center justify-center shrink-0"
          style={{ width: 44, height: 44, borderRadius: 15, background: iconBg }}
        >
          <Icon size={24} color={iconFg} />
        </div>
        <div className="flex-1 min-w-0">
          <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 700, fontSize: 18, color: COLORS.primary, lineHeight: 1.2 }}>
            {title}
          </div>
          <div style={{ fontSize: 12.5, color: iconFg, marginTop: 1 }}>{subtitle}</div>
        </div>
      </button>
      {rows && React.Children.count(rows) > 0 && (
        <div className="flex flex-col gap-2" style={{ marginTop: 14 }}>
          {rows}
        </div>
      )}
      {moreButton}
    </div>
  );
}

function SeeAllButton({ count, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-center gap-1 text-sm font-semibold"
      style={{ marginTop: 12, color: COLORS.primary }}
    >
      +{count} lainnya
      <ChevronRight size={14} color={COLORS.primary} />
    </button>
  );
}

function StockPreviewRow({ item, onClick }) {
  const status = statusOf(item);
  const meta = STATUS_META[status];
  return (
    <button onClick={onClick} className="w-full flex items-center gap-2.5 text-left" style={{ background: COLORS.soft, borderRadius: 14, padding: "11px 12px" }}>
      <span className="flex-1 min-w-0 truncate" style={{ color: COLORS.ink, fontSize: 13 }}>
        {item.name}
      </span>
      <span className="shrink-0" style={{ color: meta.fg, fontSize: 11 }}>
        {meta.label}
      </span>
    </button>
  );
}

function ToBuyPreviewRow({ entry, onToggle, onClick }) {
  const detailParts = [];
  if (entry.qty) detailParts.push(`${entry.qty}${entry.unit ? " " + entry.unit : ""}`);
  if (entry.place) detailParts.push(entry.place);
  return (
    <div className="w-full flex items-center gap-2.5" style={{ background: COLORS.soft, borderRadius: 14, padding: "11px 12px" }}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
        style={{ background: "transparent", border: `1.5px solid ${COLORS.border}` }}
        title="Tandai sudah dibeli"
      />
      <button onClick={onClick} className="flex-1 min-w-0 flex flex-col items-start text-left">
        <span className="w-full flex items-center gap-1.5 truncate" style={{ color: COLORS.ink, fontSize: 13 }}>
          <span className="truncate">{entry.itemName}</span>
          {entry.notes && <StickyNote size={11} color={COLORS.inkSoft} className="shrink-0" />}
        </span>
        {detailParts.length > 0 && (
          <span className="mt-0.5" style={{ color: COLORS.inkSoft, fontSize: 11 }}>
            {detailParts.join(" \u00b7 ")}
          </span>
        )}
      </button>
    </div>
  );
}

function AgendaPreviewRow({ task, threshold, onToggle, onClick }) {
  const urgency = taskUrgency(task, threshold);
  const meta = URGENCY_META[urgency];
  return (
    <div className="w-full flex items-center gap-2.5" style={{ background: COLORS.soft, borderRadius: 14, padding: "11px 12px" }}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
        style={{ background: "transparent", border: `1.5px solid ${COLORS.border}` }}
        title="Tandai selesai"
      />
      <button onClick={onClick} className="flex-1 min-w-0 flex items-center justify-between gap-2 text-left">
        <span className="truncate" style={{ color: COLORS.ink, fontSize: 13 }}>
          {task.title}
        </span>
        <span className="shrink-0" style={{ color: meta ? meta.fg : COLORS.inkSoft, fontSize: 11 }}>
          {deadlineLabel(task)}
        </span>
      </button>
    </div>
  );
}

// Navigasi bawah berbentuk kapsul hijau melayang. Tab yang sedang aktif
// ditandai kapsul putih berisi ikon dan namanya, sisanya cuma ikon.
// Tombol tambah menyatu di ujung kanan, bukan melayang terpisah.
function BottomNav({ view, setView, onAdd, showAdd }) {
  const tabs = [
    { key: "dashboard", label: "Beranda", icon: Home },
    { key: "stock", label: "Stok", icon: Package },
    { key: "tobuy", label: "Beli", icon: ShoppingCart },
  ];
  return (
    <div
      className="fixed left-0 right-0 z-40 flex justify-center px-4 pointer-events-none"
      style={{ bottom: "max(16px, env(safe-area-inset-bottom))" }}
    >
      <div
        className="flex items-center gap-1.5 pointer-events-auto"
        style={{ background: COLORS.navy, borderRadius: 28, padding: 8, boxShadow: "0 10px 24px rgba(38,49,77,0.30)" }}
      >
        {tabs.map((t) => {
          const active = view === t.key;
          const Icon = t.icon;
          if (active) {
            return (
              <div
                key={t.key}
                className="flex items-center gap-2"
                style={{ background: "#fff", borderRadius: 22, padding: "10px 16px", color: COLORS.navy }}
              >
                <Icon size={20} />
                <span className="font-semibold" style={{ fontSize: 13 }}>
                  {t.label}
                </span>
              </div>
            );
          }
          return (
            <button
              key={t.key}
              onClick={() => setView(t.key)}
              className="flex items-center justify-center"
              style={{ width: 44, height: 42 }}
              title={t.label}
            >
              <Icon size={20} color="rgba(255,255,255,0.8)" />
            </button>
          );
        })}

        {showAdd && (
          <button
            onClick={onAdd}
            className="flex items-center justify-center shrink-0"
            style={{ width: 42, height: 42, borderRadius: 999, background: COLORS.accent, color: "#fff" }}
            title="Tambah"
          >
            <Plus size={22} />
          </button>
        )}
      </div>
    </div>
  );
}

// Kotak ringkasan angka di beranda — sekaligus pintasan ke daftar terkait.
function HomeStat({ icon: Icon, value, label, bg, fg, textColor, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full min-w-0 flex flex-col text-left"
      style={{ background: bg, borderRadius: 18, padding: "12px 12px 11px" }}
    >
      {/* Tinggi tiap baris dikunci supaya ketiga kotak selalu sama persis,
          berapa pun panjang angka atau tulisannya. */}
      <span className="flex items-center" style={{ height: 24 }}>
        <Icon size={22} color={fg} />
      </span>
      <span
        style={{
          fontFamily: "'Baloo 2', cursive",
          fontWeight: 700,
          fontSize: 20,
          color: textColor,
          lineHeight: "24px",
          marginTop: 3,
        }}
      >
        {value}
      </span>
      <span className="truncate" style={{ fontSize: 11, color: textColor, lineHeight: "16px", marginTop: 1 }}>
        {label}
      </span>
    </button>
  );
}

function Chip({ label, tone }) {
  const meta = CHIP_META[tone] || CHIP_META.neutral;
  return (
    <span className="text-[11px] font-semibold px-2 py-1 rounded-full" style={{ background: meta.bg, color: meta.fg }}>
      {label}
    </span>
  );
}

// Kartu filter di halaman Stok — angka besar berwarna sesuai maknanya,
// label abu-abu di bawahnya. Yang sedang dipilih jadi navy penuh.
// Tombol simpan berfase: label, lalu pemintal saat menyimpan, lalu centang
// sesaat sebelum jendelanya turun.
function SaveButton({ saving, done, label = "Simpan", onClick, style }) {
  return (
    <button
      onClick={onClick}
      disabled={saving || done}
      className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white flex items-center justify-center gap-2"
      style={{ background: COLORS.primary, opacity: saving ? 0.85 : 1, ...style }}
    >
      {done ? (
        <>
          <Check size={16} /> Tersimpan
        </>
      ) : saving ? (
        <>
          <Loader2 size={16} className="spin" /> Menyimpan
        </>
      ) : (
        label
      )}
    </button>
  );
}

function FilterTile({ label, value, color, active, onClick }) {
  return (
    <button
      onClick={(e) => {
        // Warna mengembang dari titik yang disentuh, bukan berganti mendadak.
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty("--ox", `${e.clientX - r.left}px`);
        e.currentTarget.style.setProperty("--oy", `${e.clientY - r.top}px`);
        onClick();
      }}
      className="min-w-0 text-left"
      style={{
        position: "relative",
        overflow: "hidden",
        background: COLORS.card,
        borderRadius: 18,
        padding: "13px 12px 12px",
        boxShadow: active ? "0 4px 12px rgba(38,49,77,0.22)" : "0 2px 8px rgba(38,49,77,0.05)",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background: COLORS.navy,
          borderRadius: 18,
          transformOrigin: "var(--ox, 50%) var(--oy, 50%)",
          transform: active ? "scale(1)" : "scale(0)",
          transition: "transform 560ms var(--ease-lux)",
        }}
      />
      <div
        className="tile-swap relative"
        style={{
          fontFamily: "'Baloo 2', cursive",
          fontWeight: 700,
          fontSize: 24,
          lineHeight: "26px",
          color: active ? "#fff" : color,
        }}
      >
        {value}
      </div>
      <div className="tile-swap relative truncate" style={{ fontSize: 12, marginTop: 2, color: active ? "rgba(255,255,255,0.75)" : COLORS.inkSoft }}>
        {label}
      </div>
    </button>
  );
}

function SummaryCard({ icon: Icon, label, value, color, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="rounded-xl p-2.5 text-left flex flex-col gap-1.5 transition-shadow"
      style={{
        background: active ? color : COLORS.card,
        border: `1.5px solid ${active ? color : COLORS.border}`,
        boxShadow: active ? `0 3px 10px ${color}40` : "none",
      }}
    >
      {Icon && (
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center"
          style={{ background: active ? "rgba(255,255,255,0.22)" : `${color}1F` }}
        >
          <Icon size={13} color={active ? "#fff" : color} />
        </div>
      )}
      <div>
        <div className="font-bold" style={{ fontSize: 16, color: active ? "#fff" : COLORS.ink }}>
          {value}
        </div>
        <div className="leading-tight mt-0.5" style={{ fontSize: 11, color: active ? "rgba(255,255,255,0.85)" : COLORS.inkSoft }}>
          {label}
        </div>
      </div>
    </button>
  );
}

/* ---------------- Stock page ---------------- */

function StockPage({ items, search, setSearch, filter, setFilter, onBack, onAdd, onEditItem, onDeleteItem, onAdjust, onLevelChange, pendingEdit, onConfirmPending, onBlockedAttempt, userName, onOpenUserMenu, onSwitchApp, notifSlot, onRefresh, highlightId, onHighlightDone }) {
  const counts = useMemo(() => {
    let low = 0,
      out = 0;
    items.forEach((i) => {
      const s = statusOf(i);
      if (s === "low") low++;
      if (s === "out") out++;
    });
    return { total: items.length, low, out };
  }, [items]);

  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    const statusOrder = { out: 0, low: 1, safe: 2 };
    return items
      .filter((i) => i.name.toLowerCase().includes(q))
      .filter((i) => filter === "all" || statusOf(i) === filter)
      .slice()
      .sort((a, b) => {
        const sa = statusOrder[statusOf(a)];
        const sb = statusOrder[statusOf(b)];
        if (sa !== sb) return sa - sb;
        return a.name.localeCompare(b.name, "id");
      });
  }, [items, search, filter]);

  const guardedSetFilter = (f) => {
    if (pendingEdit) {
      onBlockedAttempt();
      return;
    }
    setFilter(f);
  };

  useEffect(() => {
    if (!highlightId) return;
    const el = document.getElementById(`stock-item-${highlightId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    const t = setTimeout(() => onHighlightDone && onHighlightDone(), 1300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightId]);

  return (
    <div className="h-full flex flex-col">
      {/* Header: elemen biasa (bukan sticky di dalam area scroll), jadi gak
          pernah ikut ketarik pas list-nya di-bounce/overscroll. */}
      <div className="shrink-0 max-w-2xl mx-auto w-full px-4 pb-3" style={{ paddingTop: "env(safe-area-inset-top)", background: COLORS.bg }}>
        <TopBar
          title="Stok Rumah"
          onBack={onBack}
          userName={userName}
          onOpenUserMenu={onOpenUserMenu}
          onSwitchApp={onSwitchApp}
          notifSlot={notifSlot}
        />

        {/* Empat kartu filter: angka besar berwarna sesuai maknanya, label
            abu-abu di bawahnya. Yang aktif jadi navy penuh. */}
        <div className="grid gap-2 mb-3" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
          <FilterTile label="Semua" value={counts.total} color={COLORS.navy} active={filter === "all"} onClick={() => guardedSetFilter("all")} />
          <FilterTile label="Aman" value={counts.total - counts.low - counts.out} color={COLORS.safe} active={filter === "safe"} onClick={() => guardedSetFilter("safe")} />
          <FilterTile label="Menipis" value={counts.low} color={COLORS.low} active={filter === "low"} onClick={() => guardedSetFilter("low")} />
          <FilterTile label="Habis" value={counts.out} color={COLORS.out} active={filter === "out"} onClick={() => guardedSetFilter("out")} />
        </div>

        <div
          className="flex items-center gap-2.5"
          style={{ background: COLORS.card, borderRadius: 999, padding: "12px 18px", boxShadow: "0 2px 10px rgba(38,49,77,0.05)" }}
        >
          <Search size={18} color={COLORS.inkSoft} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari item stok..."
            className="flex-1 bg-transparent"
            style={{ color: COLORS.ink, fontSize: 14, outline: "none", border: "none" }}
          />
        </div>
      </div>

      {/* Area list: satu-satunya yang scroll & bounce, terpisah dari header. */}
      <div className="flex-1 overflow-y-auto" style={{ overscrollBehaviorY: "contain", WebkitOverflowScrolling: "touch" }}>
        <div className="max-w-2xl mx-auto px-4 pb-32">
          {filteredSorted.length === 0 ? (
            <div className="py-14 text-center rounded-2xl" style={{ background: COLORS.card, border: `1px dashed ${COLORS.border}` }}>
              <Package size={28} color={COLORS.inkSoft} style={{ margin: "0 auto 8px" }} />
              <div style={{ color: COLORS.inkSoft }} className="text-sm">
                {items.length === 0 ? "Belum ada item. Tambahkan yang pertama." : "Tidak ada item yang cocok."}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {filteredSorted.map((item) => {
                const isPending = pendingEdit && pendingEdit.itemId === item.id;
                const isBlocked = !!pendingEdit && !isPending;
                return (
                  <ItemCard
                    key={item.id}
                    item={item}
                    pendingDraft={isPending ? pendingEdit : null}
                    blocked={isBlocked}
                    onAdjust={(d) => (isBlocked ? onBlockedAttempt() : onAdjust(item, d))}
                    onLevelChange={(lvl) => (isBlocked ? onBlockedAttempt() : onLevelChange(item, lvl))}
                    onConfirmPending={onConfirmPending}
                    onEdit={() => onEditItem(item)}
                    onDelete={() => onDeleteItem(item)}
                    highlighted={item.id === highlightId}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ItemCard({ item, pendingDraft, blocked, onAdjust, onLevelChange, onConfirmPending, onEdit, onDelete, highlighted }) {
  // Angka bergulir naik saat ditambah, turun saat dikurangi.
  const [roll, setRoll] = useState({ dir: 0, n: 0 });
  const bump = (d) => {
    setRoll((r) => ({ dir: d, n: r.n + 1 }));
    onAdjust(d);
  };
  const status = statusOf(item);
  const meta = STATUS_META[status];
  const isLevel = item.type === "level";
  const isPending = !!pendingDraft;
  const displayQty = isPending && pendingDraft.kind === "qty" ? pendingDraft.draft : item.qty;
  const displayLevel = isPending && pendingDraft.kind === "level" ? pendingDraft.draft : item.level;
  return (
    <div
      id={`stock-item-${item.id}`}
      className={`rounded-2xl overflow-hidden flex ${highlighted ? "highlight-blink" : ""}`}
      style={{
        background: COLORS.card,
        border: `1px solid ${isPending ? COLORS.low : COLORS.border}`,
        opacity: blocked ? 0.55 : 1,
        transition: "border-color 160ms ease, opacity 160ms ease",
      }}
    >
      <div style={{ width: 4, background: isPending ? COLORS.low : meta.fg }} />
      <div className="flex-1 p-3">
        <div className="min-w-0">
          <div className="font-semibold truncate" style={{ color: COLORS.ink, fontSize: 13 }}>
            {item.name}
          </div>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span className="px-1.5 py-0.5 rounded-full font-medium" style={{ background: meta.bg, color: meta.fg, fontSize: 11 }}>
              {meta.label}
            </span>
            {!isLevel && item.minQty > 0 && (
              <span style={{ color: COLORS.inkSoft, fontSize: 11 }}>
                min {item.minQty} {item.unit}
              </span>
            )}
            {isPending && (
              <span className="px-1.5 py-0.5 rounded-full font-medium" style={{ background: COLORS.lowBg, color: COLORS.low, fontSize: 11 }}>
                Belum disetujui
              </span>
            )}
          </div>
        </div>

        <div className="mt-2.5 flex items-center gap-2">
          <div className="flex-1 min-w-0">
            {isLevel ? (
              <div className="flex items-center gap-1 flex-wrap">
                {LEVEL_OPTIONS.map((opt) => {
                  const active = displayLevel === opt.key;
                  const optMeta = STATUS_META[opt.status];
                  return (
                    <button
                      key={opt.key}
                      onClick={() => onLevelChange(opt.key)}
                      className="px-2.5 py-1 rounded-full font-medium"
                      style={{
                        background: active ? optMeta.fg : COLORS.bg,
                        color: active ? "#fff" : COLORS.inkSoft,
                        border: `1px solid ${active ? optMeta.fg : COLORS.border}`,
                        fontSize: 11,
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <button
                  key={`m${roll.n}`}
                  onClick={() => bump(-1)}
                  className="tap-ring w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                  style={{ border: `1.5px solid ${COLORS.border}` }}
                >
                  <Minus size={13} color={COLORS.ink} />
                </button>
                <div className="text-center overflow-hidden" style={{ minWidth: 48 }}>
                  <span
                    key={roll.n}
                    className={roll.dir > 0 ? "roll-up" : roll.dir < 0 ? "roll-down" : ""}
                    style={{ display: "inline-block", fontWeight: 700, fontSize: 15, color: isPending ? COLORS.low : COLORS.ink }}
                  >
                    {displayQty}
                  </span>
                  <span className="ml-1" style={{ color: COLORS.inkSoft, fontSize: 11 }}>
                    {item.unit}
                  </span>
                </div>
                <button
                  key={`p${roll.n}`}
                  onClick={() => bump(1)}
                  className="tap-ring w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                  style={{ border: `1.5px solid ${COLORS.border}` }}
                >
                  <Plus size={13} color={COLORS.ink} />
                </button>
              </div>
            )}
          </div>

          {isPending && (
            <button
              onClick={onConfirmPending}
              className="confirm-slide-in w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-white"
              style={{ background: COLORS.safe, boxShadow: "0 3px 10px rgba(107,143,113,0.4)" }}
              title="Setujui perubahan"
            >
              <Check size={16} />
            </button>
          )}
        </div>

        {item.notes && (
          <div className="mt-2 italic" style={{ color: COLORS.inkSoft, fontSize: 11 }}>
            {item.notes}
          </div>
        )}

        <div className="flex items-end justify-between mt-2.5 pt-2.5" style={{ borderTop: `1px solid ${COLORS.border}` }}>
          <div className="flex items-start gap-1.5 min-w-0">
            <Clock size={11} color={COLORS.inkSoft} className="mt-0.5 shrink-0" />
            <div className="leading-tight" style={{ color: COLORS.inkSoft, fontSize: 11 }}>
              <div>Terakhir diperbarui</div>
              <div className="truncate">
                {item.lastUpdatedBy || "?"} &middot; {fmtDateTime(item.lastUpdatedAt)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={onEdit}
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ border: `1px solid ${COLORS.border}` }}
              title="Edit"
            >
              <Pencil size={12} color={COLORS.ink} />
            </button>
            <button
              onClick={onDelete}
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ border: `1px solid ${COLORS.out}55` }}
              title="Hapus"
            >
              <Trash2 size={12} color={COLORS.out} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ItemFormModal({ mode, item, saving, onClose, onSubmit }) {
  const [type, setType] = useState(item?.type || "qty");
  const [name, setName] = useState(item?.name || "");
  const [qty, setQty] = useState(item && item.type !== "level" ? String(item.qty) : "");
  const [unit, setUnit] = useState(item?.unit || "pcs");
  const [minQty, setMinQty] = useState(item?.minQty ? String(item.minQty) : "");
  const [level, setLevel] = useState(item?.level || "banyak");
  const [notes, setNotes] = useState(item?.notes || "");
  const [error, setError] = useState("");

  const submit = () => {
    if (!name.trim()) return setError("Nama item wajib diisi.");
    if (type === "qty" && (qty === "" || isNaN(Number(qty)) || Number(qty) < 0)) {
      return setError("Jumlah harus angka valid.");
    }
    setError("");
    onSubmit(type === "level" ? { type, name, level, notes } : { type, name, qty, unit, minQty, notes });
  };

  return (
    <Overlay onClose={onClose}>
      <div className="flex items-center justify-between mb-4">
        <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 600, fontSize: 20, color: COLORS.primary }}>
          {mode === "add" ? "Tambah item" : "Edit item"}
        </div>
        <button onClick={onClose}>
          <X size={18} color={COLORS.inkSoft} />
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {mode === "add" && (
          <Field label="Tipe item">
            <div className="flex gap-2">
              <button
                onClick={() => setType("qty")}
                className="flex-1 py-2 rounded-lg text-xs font-medium"
                style={{
                  background: type === "qty" ? COLORS.primary : COLORS.card,
                  color: type === "qty" ? "#fff" : COLORS.ink,
                  border: `1px solid ${type === "qty" ? COLORS.primary : COLORS.border}`,
                }}
              >
                Stok dengan jumlah
              </button>
              <button
                onClick={() => setType("level")}
                className="flex-1 py-2 rounded-lg text-xs font-medium"
                style={{
                  background: type === "level" ? COLORS.primary : COLORS.card,
                  color: type === "level" ? "#fff" : COLORS.ink,
                  border: `1px solid ${type === "level" ? COLORS.primary : COLORS.border}`,
                }}
              >
                Tanpa hitungan pasti
              </button>
            </div>
            {type === "level" && (
              <p className="text-xs mt-1.5" style={{ color: COLORS.inkSoft }}>
                Untuk item yang sekali beli tahan lama & gak digudangin, mis. bumbu jarang, alat rumah tangga.
              </p>
            )}
          </Field>
        )}

        <Field label="Nama item">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="mis. Beras"
            className="w-full px-3 py-2.5 rounded-lg text-sm"
            style={{ border: `1px solid ${COLORS.border}` }}
          />
        </Field>

        {type === "level" ? (
          <Field label="Sisa saat ini">
            <div className="flex gap-2 flex-wrap">
              {LEVEL_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setLevel(opt.key)}
                  className="px-3 py-2 rounded-lg text-xs font-medium"
                  style={{
                    background: level === opt.key ? STATUS_META[opt.status].fg : COLORS.card,
                    color: level === opt.key ? "#fff" : COLORS.ink,
                    border: `1px solid ${level === opt.key ? STATUS_META[opt.status].fg : COLORS.border}`,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </Field>
        ) : (
          <>
            <div className="flex gap-3">
              <Field label="Jumlah" className="flex-1">
                <input
                  type="number"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2.5 rounded-lg text-sm"
                  style={{ border: `1px solid ${COLORS.border}` }}
                />
              </Field>
              <Field label="Satuan" className="flex-1">
                <input
                  list="unit-suggestions"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="pcs"
                  className="w-full px-3 py-2.5 rounded-lg text-sm"
                  style={{ border: `1px solid ${COLORS.border}` }}
                />
                <datalist id="unit-suggestions">
                  {UNIT_SUGGESTIONS.map((u) => (
                    <option key={u} value={u} />
                  ))}
                </datalist>
              </Field>
            </div>
            <Field label="Batas minimum (opsional)">
              <input
                type="number"
                value={minQty}
                onChange={(e) => setMinQty(e.target.value)}
                placeholder="Kosongkan jika tidak perlu"
                className="w-full px-3 py-2.5 rounded-lg text-sm"
                style={{ border: `1px solid ${COLORS.border}` }}
              />
            </Field>
          </>
        )}

        <Field label="Catatan (opsional)">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="mis. merk favorit, dibeli di mana biasanya"
            rows={2}
            className="w-full px-3 py-2.5 rounded-lg text-sm resize-none"
            style={{ border: `1px solid ${COLORS.border}` }}
          />
        </Field>

        {error && (
          <div className="text-xs" style={{ color: COLORS.out }}>
            {error}
          </div>
        )}
        <button
          onClick={submit}
          disabled={saving}
          className="w-full py-2.5 rounded-lg text-sm font-medium text-white mt-1"
          style={{ background: COLORS.primary, opacity: saving ? 0.6 : 1 }}
        >
          {saving ? "Menyimpan..." : mode === "add" ? "Tambahkan" : "Simpan perubahan"}
        </button>
      </div>
    </Overlay>
  );
}

/* ---------------- Akan Dibeli page ---------------- */

function ToBuyPage({ toBuy, search, setSearch, filter, setFilter, onBack, onAddManual, onEditEntry, onDeleteEntry, onToggle, userName, onOpenUserMenu, onSwitchApp, notifSlot, onRefresh, highlightId, onHighlightDone }) {
  const pendingCount = toBuy.filter((e) => !e.bought).length;
  const boughtCount = toBuy.filter((e) => e.bought).length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return toBuy
      .filter((e) => (filter === "pending" ? !e.bought : e.bought))
      .filter((e) => e.itemName.toLowerCase().includes(q))
      .sort((a, b) => {
        const da = filter === "pending" ? a.addedAt : a.boughtAt;
        const db = filter === "pending" ? b.addedAt : b.boughtAt;
        return new Date(db) - new Date(da);
      });
  }, [toBuy, search, filter]);

  useEffect(() => {
    if (!highlightId) return;
    const el = document.getElementById(`tobuy-item-${highlightId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    const t = setTimeout(() => onHighlightDone && onHighlightDone(), 1300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightId]);

  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 max-w-2xl mx-auto w-full px-4 pb-3" style={{ paddingTop: "env(safe-area-inset-top)", background: COLORS.bg }}>
        <TopBar
          title="Akan Dibeli"
          onBack={onBack}
          userName={userName}
          onOpenUserMenu={onOpenUserMenu}
          onSwitchApp={onSwitchApp}
          notifSlot={notifSlot}
        />

        {/* Format kartu filter dibuat sama persis dengan halaman Stok. */}
        <div className="grid gap-2 mb-3" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          <FilterTile label="Perlu Dibeli" value={pendingCount} color={COLORS.low} active={filter === "pending"} onClick={() => setFilter("pending")} />
          <FilterTile label="Sudah Dibeli" value={boughtCount} color={COLORS.safe} active={filter === "bought"} onClick={() => setFilter("bought")} />
        </div>

        <div
          className="flex items-center gap-2.5"
          style={{ background: COLORS.card, borderRadius: 999, padding: "12px 18px", boxShadow: "0 2px 10px rgba(38,49,77,0.05)" }}
        >
          <Search size={18} color={COLORS.inkSoft} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari di daftar ini..."
            className="flex-1 bg-transparent"
            style={{ color: COLORS.ink, fontSize: 14, outline: "none", border: "none" }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ overscrollBehaviorY: "contain", WebkitOverflowScrolling: "touch" }}>
        <div className="max-w-2xl mx-auto px-4 pb-32">
          {filtered.length === 0 ? (
            <div className="py-14 text-center rounded-2xl" style={{ background: COLORS.card, border: `1px dashed ${COLORS.border}` }}>
              <ShoppingCart size={26} color={COLORS.inkSoft} style={{ margin: "0 auto 8px" }} />
              <div style={{ color: COLORS.inkSoft }} className="text-sm">
                {filter === "pending" ? "Gak ada yang perlu dibeli." : "Belum ada yang dibeli."}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map((e) => (
                <ToBuyRow key={e.id} entry={e} onToggle={() => onToggle(e.id)} onEdit={() => onEditEntry(e)} onDelete={() => onDeleteEntry(e)} highlighted={e.id === highlightId} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ToBuyRow({ entry, onToggle, onEdit, onDelete, highlighted }) {
  const detailParts = [];
  if (entry.qty) detailParts.push(`${entry.qty}${entry.unit ? " " + entry.unit : ""}`);
  if (entry.place) detailParts.push(entry.place);

  return (
    <div
      id={`tobuy-item-${entry.id}`}
      className={`rounded-2xl p-3 ${highlighted ? "highlight-blink" : ""}`}
      style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}
    >
      <div className="flex items-start gap-2.5">
        <button
          onClick={onToggle}
          className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: entry.bought ? COLORS.safe : "transparent", border: `1.5px solid ${entry.bought ? COLORS.safe : COLORS.border}` }}
        >
          {entry.bought && <Check size={12} color="#fff" />}
        </button>
        <div className="min-w-0 flex-1">
          <div
            className="font-semibold truncate"
            style={{
              color: entry.bought ? COLORS.inkSoft : COLORS.ink,
              textDecoration: entry.bought ? "line-through" : "none",
              fontSize: 13,
            }}
          >
            {entry.itemName}
          </div>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {!entry.bought && (
              <span className="px-1.5 py-0.5 rounded-full font-medium" style={{ background: COLORS.lowBg, color: COLORS.low, fontSize: 11 }}>
                Perlu Dibeli
              </span>
            )}
            {detailParts.length > 0 && (
              <span style={{ color: COLORS.inkSoft, fontSize: 11 }}>
                {detailParts.join(" \u00b7 ")}
              </span>
            )}
          </div>
          {entry.notes && (
            <div className="mt-1 italic" style={{ color: COLORS.inkSoft, fontSize: 11 }}>
              {entry.notes}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-end justify-between mt-2.5 pt-2.5" style={{ borderTop: `1px solid ${COLORS.border}` }}>
        <div className="flex items-start gap-1.5 min-w-0">
          <Clock size={11} color={entry.bought ? COLORS.safe : COLORS.inkSoft} className="mt-0.5 shrink-0" />
          <div className="leading-tight" style={{ color: entry.bought ? COLORS.safe : COLORS.inkSoft, fontSize: 11 }}>
            <div>{entry.bought ? "Sudah dibeli" : "Ditambahkan"}</div>
            <div className="truncate">
              {entry.bought ? `${entry.boughtBy || "?"} \u00b7 ${fmtDateTime(entry.boughtAt)}` : fmtDateTime(entry.addedAt)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={onEdit} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ border: `1px solid ${COLORS.border}` }} title="Edit">
            <Pencil size={12} color={COLORS.ink} />
          </button>
          <button
            onClick={onDelete}
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ border: `1px solid ${COLORS.out}55` }}
            title="Hapus"
          >
            <Trash2 size={12} color={COLORS.out} />
          </button>
        </div>
      </div>
    </div>
  );
}

function ToBuyFormModal({ mode, entry, places, onAddPlace, onDeletePlace, onClose, onSubmit }) {
  const isManualEditable = mode === "add" || (entry && entry.source === "manual");
  const [name, setName] = useState(entry?.itemName || "");
  const [qty, setQty] = useState(entry?.qty || "");
  const [unit, setUnit] = useState(entry?.unit || "");
  const [place, setPlace] = useState(entry?.place || "");
  const [notes, setNotes] = useState(entry?.notes || "");
  const [addingPlace, setAddingPlace] = useState(false);
  const [placeDraft, setPlaceDraft] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    if (isManualEditable && !name.trim()) return setError("Nama item wajib diisi.");
    setError("");
    onSubmit({ name, qty, unit, place, notes });
  };

  const saveCustomPlace = async () => {
    const saved = await onAddPlace(placeDraft);
    if (saved) setPlace(saved);
    setPlaceDraft("");
    setAddingPlace(false);
  };

  return (
    <Overlay onClose={onClose}>
      <div className="flex items-center justify-between mb-4">
        <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 600, fontSize: 20, color: COLORS.primary }}>
          {mode === "add" ? "Tambah manual" : "Edit item beli"}
        </div>
        <button onClick={onClose}>
          <X size={18} color={COLORS.inkSoft} />
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <Field label="Nama item">
          {isManualEditable ? (
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="mis. Lampu bohlam"
              className="w-full px-3 py-2.5 rounded-lg text-sm"
              style={{ border: `1px solid ${COLORS.border}` }}
            />
          ) : (
            <div className="text-sm py-2.5" style={{ color: COLORS.ink }}>
              {entry.itemName}
            </div>
          )}
        </Field>

        <div className="flex gap-3">
          <Field label="Jumlah" className="flex-1">
            <input
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="mis. 2"
              className="w-full px-3 py-2.5 rounded-lg text-sm"
              style={{ border: `1px solid ${COLORS.border}` }}
            />
          </Field>
          <Field label="Satuan" className="flex-1">
            <input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="mis. pack"
              className="w-full px-3 py-2.5 rounded-lg text-sm"
              style={{ border: `1px solid ${COLORS.border}` }}
            />
          </Field>
        </div>

        <Field label="Tempat beli">
          <div className="flex gap-2 flex-wrap">
            {places.map((p) => (
              <div key={p} className="relative">
                <button
                  onClick={() => setPlace(p)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium"
                  style={{
                    background: place === p ? COLORS.primary : COLORS.card,
                    color: place === p ? "#fff" : COLORS.ink,
                    border: `1px solid ${place === p ? COLORS.primary : COLORS.border}`,
                  }}
                >
                  {p}
                </button>
                {!DEFAULT_PLACES.includes(p) && (
                  <button
                    onClick={() => {
                      if (place === p) setPlace("");
                      onDeletePlace(p);
                    }}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ background: COLORS.out, color: "#fff" }}
                    title="Hapus dari daftar"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            ))}
            {!addingPlace && (
              <button
                onClick={() => setAddingPlace(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ border: `1px dashed ${COLORS.border}`, color: COLORS.inkSoft }}
              >
                + Tambah tempat
              </button>
            )}
          </div>
          {addingPlace && (
            <div className="flex gap-2 mt-2">
              <input
                autoFocus
                value={placeDraft}
                onChange={(e) => setPlaceDraft(e.target.value)}
                placeholder="mis. Superindo"
                className="flex-1 px-3 py-2 rounded-lg text-sm"
                style={{ border: `1px solid ${COLORS.border}` }}
                onKeyDown={(e) => e.key === "Enter" && saveCustomPlace()}
              />
              <button onClick={saveCustomPlace} className="px-3 rounded-lg text-xs font-medium text-white" style={{ background: COLORS.primary }}>
                Simpan
              </button>
            </div>
          )}
        </Field>

        <Field label="Catatan (opsional)">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="mis. warna/varian tertentu"
            rows={2}
            className="w-full px-3 py-2.5 rounded-lg text-sm resize-none"
            style={{ border: `1px solid ${COLORS.border}` }}
          />
        </Field>

        {error && (
          <div className="text-xs" style={{ color: COLORS.out }}>
            {error}
          </div>
        )}
        <button onClick={submit} className="w-full py-2.5 rounded-lg text-sm font-medium text-white mt-1" style={{ background: COLORS.primary }}>
          {mode === "add" ? "Tambahkan" : "Simpan perubahan"}
        </button>
      </div>
    </Overlay>
  );
}

/* ---------------- Agenda Rumah page ---------------- */

// Kartu filter Agenda — bentuknya sama persis dengan Stok Rumah dan Kas
// Rumah: angka besar berwarna sesuai maknanya, label abu-abu di bawahnya.
function AgendaTile({ label, value, color, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="min-w-0 text-left"
      style={{
        background: active ? AG.primary : AG.card,
        borderRadius: 18,
        padding: "13px 12px 12px",
        boxShadow: active ? "0 4px 12px rgba(23,64,61,0.22)" : "0 2px 8px rgba(23,64,61,0.05)",
      }}
    >
      <div
        style={{
          fontFamily: "'Baloo 2', cursive",
          fontWeight: 700,
          fontSize: 24,
          lineHeight: "26px",
          color: active ? "#fff" : color,
        }}
      >
        {value}
      </div>
      <div className="truncate" style={{ fontSize: 12, marginTop: 2, color: active ? "rgba(255,255,255,0.75)" : AG.inkSoft }}>
        {label}
      </div>
    </button>
  );
}

function AgendaPage({ tasks, dueThreshold, search, setSearch, filter, setFilter, onBack, onAddTask, onEditTask, onDeleteTask, onToggleDone, onOpenThreshold, userName, onOpenUserMenu, onSwitchApp, notifSlot, onRefresh, highlightId, onHighlightDone }) {
  const [subView, setSubView] = useState("list"); // 'list' | 'calendar'

  // Geser samping untuk berpindah antara List dan Kalender, seperti tab di
  // aplikasi lain.
  const swipeRef = useRef(null);
  const swipeModeRef = useRef(null);
  const onAgendaTouchStart = (e) => {
    const t = e.touches[0];
    swipeRef.current = { x: t.clientX, y: t.clientY };
    swipeModeRef.current = null;
  };
  const onAgendaTouchMove = (e) => {
    if (!swipeRef.current) return;
    const t = e.touches[0];
    const dx = t.clientX - swipeRef.current.x;
    const dy = t.clientY - swipeRef.current.y;
    if (!swipeModeRef.current && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
      swipeModeRef.current = Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";
    }
  };
  const onAgendaTouchEnd = (e) => {
    if (!swipeRef.current || swipeModeRef.current !== "horizontal") {
      swipeRef.current = null;
      return;
    }
    const t = e.changedTouches[0];
    const dx = t.clientX - swipeRef.current.x;
    swipeRef.current = null;
    swipeModeRef.current = null;
    if (dx < -60 && subView === "list") setSubView("calendar");
    else if (dx > 60 && subView === "calendar") setSubView("list");
  };
  const agendaGreeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 10) return "Selamat pagi";
    if (h < 15) return "Selamat siang";
    if (h < 18) return "Selamat sore";
    return "Selamat malam";
  }, []);
  const active = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  const counts = useMemo(() => {
    let soon = 0,
      overdue = 0;
    active.forEach((t) => {
      const u = taskUrgency(t, dueThreshold);
      if (u === "overdue") overdue++;
      else if (u === "soon") soon++;
    });
    return { all: active.length, soon, overdue, done: done.length };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, dueThreshold]);

  const filteredActive = useMemo(() => {
    const q = search.trim().toLowerCase();
    return active
      .filter((t) => t.title.toLowerCase().includes(q))
      .filter((t) => (filter === "all" ? true : taskUrgency(t, dueThreshold) === filter))
      .sort((a, b) => {
        const rank = { overdue: 0, soon: 1, normal: 2, none: 3 };
        const ua = taskUrgency(a, dueThreshold),
          ub = taskUrgency(b, dueThreshold);
        if (rank[ua] !== rank[ub]) return rank[ua] - rank[ub];
        const da = a.deadline ? daysUntil(a.deadline) : Infinity;
        const db = b.deadline ? daysUntil(b.deadline) : Infinity;
        if (da !== db) return da - db;
        return a.title.localeCompare(b.title, "id");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, search, filter, dueThreshold]);

  const filteredDone = useMemo(() => {
    const q = search.trim().toLowerCase();
    return done.filter((t) => t.title.toLowerCase().includes(q)).sort((a, b) => new Date(b.doneAt) - new Date(a.doneAt));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, search]);

  const showingDone = filter === "done";
  const listToShow = showingDone ? filteredDone : filteredActive;

  useEffect(() => {
    if (!highlightId) return;
    const el = document.getElementById(`agenda-item-${highlightId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    const t = setTimeout(() => onHighlightDone && onHighlightDone(), 1300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightId]);

  return (
    // Kepala halaman (kartu sambutan, penyaring, pencarian) dikunci di atas;
    // hanya daftar tugas / kalender yang tergulir. Geser samping berpindah
    // antara List dan Kalender.
    <div
      className="h-full flex flex-col"
      style={{ background: AG.bg }}
      onTouchStart={onAgendaTouchStart}
      onTouchMove={onAgendaTouchMove}
      onTouchEnd={onAgendaTouchEnd}
    >
      <div className="shrink-0 max-w-2xl mx-auto w-full px-4 pb-3">
        {/* Kartu sambutan teal */}
        <div
          className="hero-hold relative flex flex-col justify-between"
          style={{
            background: AG.primary,
            borderRadius: "0 0 30px 30px",
            padding: "calc(env(safe-area-inset-top) + 24px) 22px 20px",
            height: `calc(${HERO_HEIGHT}px + env(safe-area-inset-top))`,
            marginLeft: -16,
            marginRight: -16,
            marginBottom: 14,
          }}
        >
          <span
            className="absolute inset-0 overflow-hidden pointer-events-none"
            style={{ borderRadius: 34 }}
            aria-hidden="true"
          >
            <span
              className="absolute rounded-full"
              style={{ right: -52, top: -60, width: 230, height: 230, background: "rgba(255,255,255,0.07)" }}
            />
            <span
              className="absolute rounded-full"
              style={{ right: 28, bottom: -66, width: 165, height: 165, background: "rgba(255,255,255,0.05)" }}
            />
          </span>
          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.72)" }}>
                {agendaGreeting}
                {userName ? `, ${userName}` : ""} <span>👋</span>
              </span>
              <h1
                style={{
                  fontFamily: "'Baloo 2', cursive",
                  fontWeight: 700,
                  fontSize: 44,
                  lineHeight: 1.02,
                  letterSpacing: "-0.5px",
                  color: "#fff",
                  marginTop: 4,
                }}
              >
                Agenda
                <br />
                Rumah
              </h1>
            </div>
            <div className="hero-actions flex items-center gap-2 shrink-0">
              {notifSlot}
              <button
                onClick={onSwitchApp}
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.14)" }}
                title="Ganti aplikasi"
              >
                <LayoutGrid size={18} color="#fff" />
              </button>
              <button
                onClick={onOpenUserMenu}
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.14)" }}
                title="Menu"
              >
                <Menu size={18} color="#fff" />
              </button>
            </div>
          </div>
          <div
            className="relative inline-flex items-center gap-2 capitalize"
            style={{ marginTop: 20, background: "rgba(255,255,255,0.12)", borderRadius: 22, padding: "8px 14px", fontSize: 13, color: "rgba(255,255,255,0.88)" }}
          >
            <Clock size={15} color="rgba(255,255,255,0.88)" />
            {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </div>
        </div>

        {subView === "list" && (
          <>
            <div className="grid gap-2 mb-3" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
              <AgendaTile label="Semua" value={counts.all} color={AG.primary} active={filter === "all"} onClick={() => setFilter("all")} />
              <AgendaTile label="Dekat" value={counts.soon} color={AG.low} active={filter === "soon"} onClick={() => setFilter("soon")} />
              <AgendaTile label="Terlambat" value={counts.overdue} color={AG.out} active={filter === "overdue"} onClick={() => setFilter("overdue")} />
              <AgendaTile label="Selesai" value={counts.done} color={AG.safe} active={filter === "done"} onClick={() => setFilter("done")} />
            </div>

            <div
              className="flex items-center gap-2.5"
              style={{ background: AG.card, borderRadius: 999, padding: "13px 18px" }}
            >
              <Search size={18} color={AG.inkSoft} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari tugas..."
                className="flex-1 bg-transparent"
                style={{ color: AG.ink, fontSize: 14.5, outline: "none", border: "none" }}
              />
            </div>
          </>
        )}

      </div>

      <div className="flex-1 overflow-y-auto" style={{ overscrollBehaviorY: "contain", WebkitOverflowScrolling: "touch" }}>
        <div className="max-w-2xl mx-auto w-full px-4 pb-32">
          {subView === "list" ? (
            <>
              {listToShow.length === 0 ? (
                <div className="py-10 text-center" style={{ background: AG.card, borderRadius: 20, border: `1px dashed ${AG.border}`, marginBottom: 12 }}>
                  <ListTodo size={26} color={AG.inkSoft} style={{ margin: "0 auto 8px" }} />
                  <div style={{ color: AG.inkSoft }} className="text-sm">
                    {tasks.length === 0 ? "Belum ada tugas." : showingDone ? "Belum ada yang selesai." : "Gak ada tugas yang cocok."}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {listToShow.map((t) => (
                    <TaskRow key={t.id} task={t} threshold={dueThreshold} onToggle={() => onToggleDone(t.id)} onEdit={() => onEditTask(t)} onDelete={() => onDeleteTask(t)} highlighted={t.id === highlightId} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <CalendarView tasks={tasks} dueThreshold={dueThreshold} onToggleDone={onToggleDone} onEditTask={onEditTask} onDeleteTask={onDeleteTask} onAddTask={onAddTask} />
          )}
        </div>
      </div>

      <AgendaNav subView={subView} setSubView={setSubView} onAdd={onAddTask} />
    </div>
  );
}

// Navigasi bawah Agenda — bentuknya sama dengan aplikasi lain, sekaligus
// menggantikan sakelar List/Kalender yang dulu memakan ruang di atas.
function AgendaNav({ subView, setSubView, onAdd }) {
  const tabs = [
    { key: "list", label: "List", icon: ListTodo },
    { key: "calendar", label: "Kalender", icon: Calendar },
  ];
  return (
    <div
      className="fixed left-0 right-0 z-40 flex justify-center px-4 pointer-events-none"
      style={{ bottom: "max(16px, env(safe-area-inset-bottom))" }}
    >
      <div
        className="flex items-center gap-1.5 pointer-events-auto"
        style={{ background: AG.primary, borderRadius: 28, padding: 8, boxShadow: "0 10px 24px rgba(23,64,61,0.30)" }}
      >
        {tabs.map((t) => {
          const active = subView === t.key;
          const Icon = t.icon;
          if (active) {
            return (
              <div
                key={t.key}
                className="flex items-center gap-2"
                style={{ background: "#fff", borderRadius: 22, padding: "10px 16px", color: AG.primary }}
              >
                <Icon size={20} />
                <span className="font-semibold" style={{ fontSize: 13 }}>
                  {t.label}
                </span>
              </div>
            );
          }
          return (
            <button
              key={t.key}
              onClick={() => setSubView(t.key)}
              className="flex items-center justify-center"
              style={{ width: 44, height: 42 }}
              title={t.label}
            >
              <Icon size={20} color="rgba(255,255,255,0.8)" />
            </button>
          );
        })}
        <button
          onClick={onAdd}
          className="flex items-center justify-center shrink-0"
          style={{ width: 42, height: 42, borderRadius: 999, background: AG.accent, color: "#fff" }}
          title="Tambah tugas"
        >
          <Plus size={22} />
        </button>
      </div>
    </div>
  );
}

// Hitung kemunculan tugas berulang ke depan, hanya untuk ditampilkan di
// kalender. Data di database tetap satu jadwal saja — yang berikutnya baru
// benar-benar dibuat setelah jadwal terdekat dicentang selesai. Jadi ini
// murni bayangan/pengingat, bukan tugas sungguhan.
const RECUR_HORIZON_MONTHS = 24;

function projectedOccurrences(task) {
  if (!task.recurrence) return [];
  const { every, unit } = task.recurrence;
  if (!every || every < 1) return [];

  const limit = new Date();
  limit.setMonth(limit.getMonth() + RECUR_HORIZON_MONTHS);

  const out = [];
  let plan = task.planDate || "";
  let deadline = task.deadline || "";
  // Batas aman supaya tidak pernah berputar tanpa henti.
  for (let i = 0; i < 200; i++) {
    plan = plan ? advanceDate(plan, every, unit) : "";
    deadline = deadline ? advanceDate(deadline, every, unit) : "";
    const patokan = plan || deadline;
    if (!patokan) break;
    if (new Date(patokan + "T00:00:00") > limit) break;
    out.push({ planDate: plan, deadline, occurrence: i + 1 });
  }
  return out;
}

function CalendarView({ tasks, dueThreshold, onToggleDone, onEditTask, onDeleteTask, onAddTask }) {
  const toDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [selectedDate, setSelectedDate] = useState(() => toDateStr(new Date()));

  const active = tasks.filter((t) => !t.done);

  const dateMap = useMemo(() => {
    const map = {};
    const touch = (key) => {
      if (!map[key]) map[key] = { plan: [], deadline: [], planAhead: [], deadlineAhead: [] };
      return map[key];
    };
    active.forEach((t) => {
      if (t.planDate) touch(t.planDate).plan.push(t);
      if (t.deadline) touch(t.deadline).deadline.push(t);
      // Jadwal berulang berikutnya — tampil lebih redup sebagai pengingat.
      projectedOccurrences(t).forEach((o) => {
        if (o.planDate) touch(o.planDate).planAhead.push({ ...t, ...o, projected: true });
        if (o.deadline) touch(o.deadline).deadlineAhead.push({ ...t, ...o, projected: true });
      });
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  const cells = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startOffset + 1;
    const inMonth = dayNum >= 1 && dayNum <= daysInMonth;
    const dateObj = new Date(year, month, dayNum);
    cells.push({ dayNum: inMonth ? dayNum : dateObj.getDate(), inMonth, dateStr: toDateStr(dateObj) });
  }

  const todayStr = toDateStr(new Date());
  const monthLabel = cursor.toLocaleDateString("id-ID", { month: "long", year: "numeric" });

  // Jumlah tugas yang jatuh pada bulan yang sedang dilihat.
  const monthTaskCount = useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
    const seen = new Set();
    active.forEach((t) => {
      if ((t.planDate || "").startsWith(prefix) || (t.deadline || "").startsWith(prefix)) seen.add(t.id);
    });
    return seen.size;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, year, month]);

  const selectedTasks = active
    .filter((t) => t.planDate === selectedDate || t.deadline === selectedDate)
    .sort((a, b) => a.title.localeCompare(b.title, "id"));

  // Jadwal berulang yang belum aktif pada tanggal ini — ditampilkan terpisah
  // di bawah, tanpa tombol aksi.
  const selectedProjected = useMemo(() => {
    const info = dateMap[selectedDate];
    if (!info) return [];
    const seen = new Set();
    return [...(info.planAhead || []), ...(info.deadlineAhead || [])].filter((t) => {
      const key = `${t.id}-${t.occurrence}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [dateMap, selectedDate]);

  return (
    <div>
      {/* Kartu kalender putih */}
      <div style={{ background: AG.card, borderRadius: 24, padding: 18 }}>
        <div className="flex items-center justify-between gap-2 mb-4">
          <button
            onClick={() => setCursor(new Date(year, month - 1, 1))}
            className="flex items-center justify-center shrink-0"
            style={{ width: 40, height: 40, borderRadius: 14, background: AG.soft }}
            title="Bulan sebelumnya"
          >
            <ChevronLeft size={19} color={AG.primary} />
          </button>
          <div className="text-center min-w-0">
            <div className="capitalize" style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 700, fontSize: 20, color: AG.ink }}>
              {monthLabel}
            </div>
            <div style={{ fontSize: 12.5, color: AG.inkSoft, marginTop: 1 }}>{monthTaskCount} tugas bulan ini</div>
          </div>
          <button
            onClick={() => setCursor(new Date(year, month + 1, 1))}
            className="flex items-center justify-center shrink-0"
            style={{ width: 40, height: 40, borderRadius: 14, background: AG.primary }}
            title="Bulan berikutnya"
          >
            <ChevronRight size={19} color="#fff" />
          </button>
        </div>

        <div className="grid grid-cols-7 mb-1">
          {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((d, i) => (
            <div
              key={d}
              className="text-center uppercase"
              style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", color: i === 0 || i === 6 ? AG.out : AG.inkSoft }}
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-1">
          {cells.map((c, i) => {
            const info = dateMap[c.dateStr];
            const isToday = c.dateStr === todayStr;
            const isSelected = c.dateStr === selectedDate;
            const weekend = i % 7 === 0 || i % 7 === 6;
            const deadlineColor =
              info && info.deadline.length > 0
                ? info.deadline.some((t) => taskUrgency(t, dueThreshold) === "overdue")
                  ? AG.out
                  : AG.low
                : null;
            // Tanggal berdeadline diberi latar merah muda supaya menonjol
            // walaupun sedang tidak dipilih.
            const softBg = !isSelected && c.inMonth && deadlineColor === AG.out ? AG.outBg : "transparent";
            return (
              <button
                key={i}
                onClick={() => c.inMonth && setSelectedDate(c.dateStr)}
                disabled={!c.inMonth}
                className="aspect-square flex flex-col items-center justify-center gap-1"
                style={{
                  borderRadius: 14,
                  background: isSelected ? AG.primary : softBg,
                  boxShadow: isSelected ? "0 6px 14px -6px rgba(23,64,61,0.6)" : "none",
                }}
              >
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: isSelected || isToday ? 700 : 500,
                    color: !c.inMonth
                      ? "#CFCCC2"
                      : isSelected
                      ? "#fff"
                      : deadlineColor === AG.out
                      ? AG.out
                      : weekend
                      ? AG.out
                      : AG.ink,
                  }}
                >
                  {c.dayNum}
                </span>
                {info && c.inMonth && (
                  <span className="flex gap-1" style={{ height: 6 }}>
                    {info.plan.length > 0 && (
                      <span style={{ width: 6, height: 6, borderRadius: 999, background: isSelected ? "#fff" : AG.low }} />
                    )}
                    {deadlineColor && (
                      <span style={{ width: 6, height: 6, borderRadius: 999, background: isSelected ? "#fff" : deadlineColor }} />
                    )}
                    {info.plan.length === 0 && (info.planAhead || []).length > 0 && (
                      <span style={{ width: 6, height: 6, borderRadius: 999, background: isSelected ? "rgba(255,255,255,0.6)" : AG.primary }} />
                    )}
                    {!deadlineColor && (info.deadlineAhead || []).length > 0 && (
                      <span
                        style={{ width: 6, height: 6, borderRadius: 999, border: `1.5px solid ${isSelected ? "#fff" : AG.low}` }}
                      />
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2" style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${AG.border}` }}>
          {[
            { label: "Rencana", color: AG.low, bg: AG.lowBg },
            { label: "Deadline", color: AG.out, bg: AG.outBg },
            { label: "Berulang", color: AG.primary, bg: AG.safeBg },
          ].map((l) => (
            <span
              key={l.label}
              className="flex items-center gap-1.5 font-medium"
              style={{ background: l.bg, color: AG.ink, fontSize: 12.5, padding: "7px 13px", borderRadius: 999 }}
            >
              <span style={{ width: 7, height: 7, borderRadius: 999, background: l.color }} />
              {l.label}
            </span>
          ))}
        </div>
      </div>

      {/* Judul tanggal terpilih */}
      <div className="flex items-center justify-between gap-2" style={{ marginTop: 20, marginBottom: 12 }}>
        <div className="flex items-baseline gap-2 min-w-0">
          <span style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 700, fontSize: 18, color: AG.ink }}>
            {new Date(selectedDate + "T00:00:00").toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short", year: "numeric" })}
          </span>
          <span className="shrink-0" style={{ fontSize: 12.5, color: AG.inkSoft }}>
            {selectedTasks.length + selectedProjected.length} tugas
          </span>
        </div>
        {onAddTask && (
          <button
            onClick={onAddTask}
            className="flex items-center gap-1 font-semibold shrink-0"
            style={{ background: AG.primary, color: "#fff", fontSize: 13, padding: "9px 16px", borderRadius: 999 }}
          >
            <Plus size={15} /> Tambah
          </button>
        )}
      </div>

      {selectedTasks.length === 0 && selectedProjected.length === 0 ? (
        <div
          className="py-8 text-center"
          style={{ background: AG.card, borderRadius: 20, border: `1px dashed ${AG.border}`, color: AG.inkSoft }}
        >
          <span className="text-sm">Gak ada tugas di tanggal ini.</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {selectedTasks.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              threshold={dueThreshold}
              onToggle={() => onToggleDone(t.id)}
              onEdit={() => onEditTask(t)}
              onDelete={() => onDeleteTask(t)}
            />
          ))}

          {selectedProjected.length > 0 && (
            <>
              <div style={{ fontSize: 12, color: AG.inkSoft, marginTop: 6 }}>
                Jadwal berulang berikutnya
              </div>
              {selectedProjected.map((t) => (
                <ProjectedTaskRow key={`${t.id}-${t.occurrence}`} task={t} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Baris jadwal berulang yang belum aktif. Sengaja tanpa tombol centang,
// edit, atau hapus — jadwal ini baru benar-benar ada setelah jadwal
// sebelumnya diselesaikan, jadi di sini fungsinya cuma mengingatkan.
function ProjectedTaskRow({ task }) {
  return (
    <div
      className="rounded-2xl p-3"
      style={{ background: AG.card, borderRadius: 20, border: `1px dashed ${AG.border}`, opacity: 0.8 }}
    >
      <div className="flex items-start gap-2.5">
        <span
          className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
          style={{ border: `1.5px dashed ${COLORS.border}` }}
        >
          <Repeat size={10} color={COLORS.inkSoft} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-semibold truncate" style={{ color: COLORS.inkSoft, fontSize: 13 }}>
            {task.title}
          </div>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span
              className="px-1.5 py-0.5 rounded-full font-medium"
              style={{ background: COLORS.bg, color: COLORS.inkSoft, fontSize: 11 }}
            >
              Berulang
            </span>
            {task.planDate && (
              <span style={{ color: COLORS.inkSoft, fontSize: 11 }}>Rencana: {fmtDate(task.planDate)}</span>
            )}
          </div>
          <div className="text-[11px] mt-1.5" style={{ color: COLORS.inkSoft }}>
            Aktif setelah jadwal sebelumnya dicentang selesai.
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskRow({ task, threshold, onToggle, onEdit, onDelete, highlighted }) {
  const urgency = taskUrgency(task, threshold);
  const meta = URGENCY_META[urgency];
  // Warna garis tepi kiri menandakan tingkat mendesaknya tugas.
  const barColor = task.done ? AG.safe : urgency === "overdue" ? AG.out : urgency === "soon" ? AG.low : AG.primary;

  return (
    <div
      id={`agenda-item-${task.id}`}
      className={`relative overflow-hidden ${highlighted ? "highlight-blink" : ""}`}
      style={{ background: AG.card, borderRadius: 20, paddingLeft: 6 }}
    >
      <span className="absolute left-0 top-0 bottom-0" style={{ width: 6, background: barColor }} />
      <div style={{ padding: "16px 16px 0 12px" }}>
        <div className="flex items-start gap-3">
          <button
            onClick={onToggle}
            className="flex items-center justify-center shrink-0"
            style={{
              width: 26,
              height: 26,
              borderRadius: 999,
              marginTop: 1,
              background: task.done ? AG.safe : "transparent",
              border: `2px solid ${task.done ? AG.safe : AG.border}`,
            }}
          >
            {task.done && <Check size={14} color="#fff" />}
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div
                className="font-bold min-w-0"
                style={{
                  color: task.done ? AG.inkSoft : AG.ink,
                  textDecoration: task.done ? "line-through" : "none",
                  fontSize: 16.5,
                  lineHeight: 1.25,
                }}
              >
                {task.title}
              </div>
              {task.recurrence && (
                <span
                  className="shrink-0 flex items-center gap-1 font-semibold"
                  style={{ background: AG.safeBg, color: AG.primary, fontSize: 11.5, padding: "5px 10px", borderRadius: 999 }}
                >
                  <Repeat size={11} /> Tiap {task.recurrence.every} {task.recurrence.unit === "bulan" ? "Bulan" : "Minggu"}
                </span>
              )}
              {!task.recurrence && !task.done && (urgency === "overdue" || urgency === "soon") && (
                <span
                  className="shrink-0 flex items-center gap-1 font-semibold"
                  style={{ background: meta.bg, color: meta.fg, fontSize: 11.5, padding: "5px 10px", borderRadius: 999 }}
                >
                  {urgency === "overdue" && <AlertTriangle size={11} />}
                  {deadlineLabel(task)}
                </span>
              )}
            </div>

            {task.recurrence && !task.done && (urgency === "overdue" || urgency === "soon") && (
              <span
                className="inline-flex items-center gap-1 font-semibold"
                style={{ background: meta.bg, color: meta.fg, fontSize: 11.5, padding: "5px 10px", borderRadius: 999, marginTop: 8 }}
              >
                {urgency === "overdue" && <AlertTriangle size={11} />}
                {deadlineLabel(task)}
              </span>
            )}

            {/* Tanggal ditampilkan berpasangan: label kecil huruf besar di atas,
                tanggalnya tebal di bawah — seperti pada rancangan. */}
            {(task.planDate || task.deadline) && (
              <div className="flex gap-7" style={{ marginTop: 12 }}>
                {task.planDate && (
                  <div>
                    <div className="uppercase" style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: AG.label }}>
                      Rencana
                    </div>
                    <div style={{ fontSize: 14.5, fontWeight: 700, color: AG.ink, marginTop: 2 }}>{fmtDate(task.planDate)}</div>
                  </div>
                )}
                {task.deadline && (
                  <div>
                    <div className="uppercase" style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: AG.label }}>
                      Deadline
                    </div>
                    <div
                      style={{ fontSize: 14.5, fontWeight: 700, marginTop: 2, color: !task.done && urgency === "overdue" ? AG.out : AG.ink }}
                    >
                      {fmtDate(task.deadline)}
                    </div>
                  </div>
                )}
              </div>
            )}

            {task.notes && (
              <div className="italic" style={{ color: AG.inkSoft, fontSize: 13, marginTop: 10 }}>
                {task.notes}
              </div>
            )}
          </div>
        </div>

        <div
          className="flex items-end justify-between gap-2"
          style={{ marginTop: 14, paddingTop: 12, paddingBottom: 12, borderTop: `1px solid ${AG.border}` }}
        >
          <div className="leading-tight min-w-0" style={{ color: AG.inkSoft, fontSize: 12.5 }}>
            <div>{task.done ? "Selesai" : "Dibuat"}</div>
            <div className="truncate" style={{ marginTop: 2 }}>
              {task.done ? `${task.doneBy || "?"} \u00b7 ${fmtDateTime(task.doneAt)}` : `${task.createdBy || "?"} \u00b7 ${fmtDateTime(task.createdAt)}`}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onEdit}
              className="flex items-center justify-center"
              style={{ width: 40, height: 34, borderRadius: 12, background: AG.safeBg }}
              title="Edit"
            >
              <Pencil size={15} color={AG.primary} />
            </button>
            <button
              onClick={onDelete}
              className="flex items-center justify-center"
              style={{ width: 40, height: 34, borderRadius: 12, background: AG.outBg }}
              title="Hapus"
            >
              <Trash2 size={15} color={AG.out} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskFormModal({ mode, task, onClose, onSubmit }) {
  const [title, setTitle] = useState(task?.title || "");
  const [planDate, setPlanDate] = useState(task?.planDate || "");
  const [deadline, setDeadline] = useState(task?.deadline || "");
  const [notes, setNotes] = useState(task?.notes || "");
  const [recurEnabled, setRecurEnabled] = useState(!!task?.recurrence);
  const [recurEvery, setRecurEvery] = useState(task?.recurrence?.every ? String(task.recurrence.every) : "1");
  const [recurUnit, setRecurUnit] = useState(task?.recurrence?.unit || "minggu");
  const [error, setError] = useState("");

  const submit = () => {
    if (!title.trim()) return setError("Judul tugas wajib diisi.");
    if (recurEnabled) {
      if (!planDate && !deadline) return setError("Tugas berulang butuh minimal Rencana atau Deadline diisi, buat patokan hitung.");
      const n = parseInt(recurEvery, 10);
      if (!n || n < 1) return setError("Isi angka pengulangan yang valid (minimal 1).");
    }
    setError("");
    onSubmit({
      title,
      planDate,
      deadline,
      notes,
      recurrence: recurEnabled ? { every: parseInt(recurEvery, 10), unit: recurUnit } : null,
    });
  };

  return (
    <Overlay onClose={onClose}>
      <div className="flex items-center justify-between mb-4">
        <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 600, fontSize: 20, color: COLORS.primary }}>
          {mode === "add" ? "Tambah tugas" : "Edit tugas"}
        </div>
        <button onClick={onClose}>
          <X size={18} color={COLORS.inkSoft} />
        </button>
      </div>
      <div className="flex flex-col gap-3">
        <Field label="Judul tugas">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="mis. Servis AC"
            className="w-full px-3 py-2.5 rounded-lg text-sm"
            style={{ border: `1px solid ${COLORS.border}` }}
          />
        </Field>
        <Field label="Rencana (opsional)">
          <input
            type="date"
            value={planDate}
            onChange={(e) => setPlanDate(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg text-sm"
            style={{ border: `1px solid ${COLORS.border}` }}
          />
          {planDate && (
            <button onClick={() => setPlanDate("")} className="text-xs mt-1.5 underline" style={{ color: COLORS.inkSoft }}>
              Hapus tanggal
            </button>
          )}
        </Field>
        <Field label="Deadline (opsional)">
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg text-sm"
            style={{ border: `1px solid ${COLORS.border}` }}
          />
          {deadline && (
            <button onClick={() => setDeadline("")} className="text-xs mt-1.5 underline" style={{ color: COLORS.inkSoft }}>
              Hapus tanggal
            </button>
          )}
        </Field>
        <Field label="Ulangi tugas ini?">
          <div className="flex gap-2">
            <button
              onClick={() => setRecurEnabled(false)}
              className="flex-1 py-2 rounded-lg text-xs font-medium"
              style={{
                background: !recurEnabled ? COLORS.primary : COLORS.card,
                color: !recurEnabled ? "#fff" : COLORS.ink,
                border: `1px solid ${!recurEnabled ? COLORS.primary : COLORS.border}`,
              }}
            >
              Tidak
            </button>
            <button
              onClick={() => setRecurEnabled(true)}
              className="flex-1 py-2 rounded-lg text-xs font-medium"
              style={{
                background: recurEnabled ? COLORS.primary : COLORS.card,
                color: recurEnabled ? "#fff" : COLORS.ink,
                border: `1px solid ${recurEnabled ? COLORS.primary : COLORS.border}`,
              }}
            >
              Ya
            </button>
          </div>
          {recurEnabled && (
            <div className="flex gap-2 mt-2 items-center">
              <span className="text-xs shrink-0" style={{ color: COLORS.inkSoft }}>
                Tiap
              </span>
              <input
                type="number"
                min="1"
                value={recurEvery}
                onChange={(e) => setRecurEvery(e.target.value)}
                className="w-16 px-2 py-2 rounded-lg text-sm text-center"
                style={{ border: `1px solid ${COLORS.border}` }}
              />
              <div className="flex gap-1.5 flex-1">
                <button
                  onClick={() => setRecurUnit("minggu")}
                  className="flex-1 py-2 rounded-lg text-xs font-medium"
                  style={{
                    background: recurUnit === "minggu" ? COLORS.primary : COLORS.card,
                    color: recurUnit === "minggu" ? "#fff" : COLORS.ink,
                    border: `1px solid ${recurUnit === "minggu" ? COLORS.primary : COLORS.border}`,
                  }}
                >
                  Minggu
                </button>
                <button
                  onClick={() => setRecurUnit("bulan")}
                  className="flex-1 py-2 rounded-lg text-xs font-medium"
                  style={{
                    background: recurUnit === "bulan" ? COLORS.primary : COLORS.card,
                    color: recurUnit === "bulan" ? "#fff" : COLORS.ink,
                    border: `1px solid ${recurUnit === "bulan" ? COLORS.primary : COLORS.border}`,
                  }}
                >
                  Bulan
                </button>
              </div>
            </div>
          )}
          {recurEnabled && !planDate && !deadline && (
            <p className="text-xs mt-1.5" style={{ color: COLORS.low }}>
              Isi Rencana atau Deadline dulu buat patokan hitungnya.
            </p>
          )}
        </Field>
        <Field label="Catatan (opsional)">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="mis. detail tambahan"
            rows={2}
            className="w-full px-3 py-2.5 rounded-lg text-sm resize-none"
            style={{ border: `1px solid ${COLORS.border}` }}
          />
        </Field>
        {error && (
          <div className="text-xs" style={{ color: COLORS.out }}>
            {error}
          </div>
        )}
        <button onClick={submit} className="w-full py-2.5 rounded-lg text-sm font-medium text-white mt-1" style={{ background: COLORS.primary }}>
          {mode === "add" ? "Tambahkan" : "Simpan perubahan"}
        </button>
      </div>
    </Overlay>
  );
}

function ThresholdModal({ current, onClose, onSubmit }) {
  const [value, setValue] = useState(String(current));
  const [error, setError] = useState("");

  const submit = () => {
    const n = parseInt(value, 10);
    if (!n || n < 1) return setError("Masukkan angka hari yang valid (minimal 1).");
    onSubmit(n);
  };

  return (
    <Overlay onClose={onClose}>
      <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 600, fontSize: 20, color: COLORS.primary }} className="mb-1">
        Atur pengingat
      </div>
      <p className="text-sm mb-4" style={{ color: COLORS.inkSoft }}>
        Tugas masuk kategori "Hampir Deadline" kalau sisa waktunya sekian hari atau kurang.
      </p>
      <Field label="Jumlah hari (H-)">
        <input
          type="number"
          min="1"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg text-sm"
          style={{ border: `1px solid ${COLORS.border}` }}
        />
      </Field>
      {error && (
        <div className="text-xs mt-2" style={{ color: COLORS.out }}>
          {error}
        </div>
      )}
      <button onClick={submit} className="w-full py-2.5 rounded-lg text-sm font-medium text-white mt-4" style={{ background: COLORS.primary }}>
        Simpan
      </button>
    </Overlay>
  );
}

/* ---------------- Shared bits ---------------- */

// Mengikuti tinggi area layar yang BENAR-BENAR terlihat. Saat papan ketik HP
// muncul, tinggi layar (100dvh) tidak ikut mengecil, jadi jendela formulir
// tetap setinggi semula dan bagian bawahnya tertutup papan ketik tanpa bisa
// digulir. Nilai dari visualViewport ikut mengecil, sehingga masalah itu
// hilang.
function useVisibleViewport() {
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

function Overlay({ children, onClose }) {
  const vp = useVisibleViewport();
  const sheetRef = useRef(null);
  // Jendela turun dulu, baru dilepas — bukan hilang mendadak.
  const [closing, setClosing] = useState(false);
  const closeSheet = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onClose && onClose();
    }, 380);
  };

  // Kolom yang sedang diketik digulir ke tengah supaya tidak tertutup papan
  // ketik, tanpa perlu menggulir sendiri.
  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    const onFocus = (e) => {
      const el = e.target;
      if (!el.matches || !el.matches("input, textarea, select")) return;
      setTimeout(() => {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 260);
    };
    sheet.addEventListener("focusin", onFocus);
    return () => sheet.removeEventListener("focusin", onFocus);
  }, []);

  return (
    <div
      className={`sheet-scrim${closing ? " scrim-out" : ""} fixed left-0 right-0 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4`}
      style={{ background: "rgba(43,42,37,0.45)", top: vp.offsetTop, height: vp.height }}
      onClick={closeSheet}
    >
      <div
        ref={sheetRef}
        className={`sheet-panel${closing ? " sheet-panel-out" : ""} w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 overflow-y-auto`}
        style={{
          background: COLORS.card,
          // Sisakan sedikit ruang di atas supaya masih terlihat bahwa ini
          // jendela yang menumpang di atas halaman.
          maxHeight: Math.max(220, vp.height - 24),
          overscrollBehavior: "contain",
          WebkitOverflowScrolling: "touch",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function Field({ label, children, className = "" }) {
  return (
    <div className={className}>
      <div className="text-xs font-medium mb-1" style={{ color: COLORS.inkSoft }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function HistoryPanel({ activity, onClose }) {
  // Kelompokkan per hari, urutan grup mengikuti urutan item (terbaru duluan
  // — sudah diurutkan oleh buildActivityFeed).
  const groups = [];
  for (const a of activity || []) {
    const label = activityDayLabel(a.timestamp);
    let g = groups.find((x) => x.label === label);
    if (!g) {
      g = { label, items: [] };
      groups.push(g);
    }
    g.items.push(a);
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: "rgba(43,42,37,0.45)" }} onClick={onClose}>
      <div className="drawer-panel w-full sm:max-w-sm h-full overflow-y-auto p-5" style={{ background: COLORS.bg, paddingTop: "calc(env(safe-area-inset-top) + 1.25rem)", overscrollBehaviorY: "contain" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ClipboardList size={18} color={COLORS.primary} />
            <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 600, fontSize: 19, color: COLORS.primary }}>Riwayat</div>
          </div>
          <button onClick={onClose}>
            <X size={18} color={COLORS.inkSoft} />
          </button>
        </div>

        {groups.length === 0 ? (
          <div className="text-sm text-center py-10" style={{ color: COLORS.inkSoft }}>
            Belum ada riwayat perubahan.
          </div>
        ) : (
          <div className="flex flex-col">
            {groups.map((g, gi) => (
              <div key={g.label}>
                <div
                  className="uppercase"
                  style={{
                    fontSize: 11,
                    letterSpacing: 0.6,
                    fontWeight: 700,
                    color: COLORS.primaryLight,
                    paddingTop: gi === 0 ? 0 : 18,
                    paddingBottom: 8,
                  }}
                >
                  {g.label}
                </div>
                <div className="rounded-2xl overflow-hidden" style={{ background: COLORS.card }}>
                  {g.items.map((a, ai) => {
                    const meta = ACTIVITY_ICON[a.kind] || ACTIVITY_ICON.stockUpdate;
                    const Icon = meta.icon;
                    return (
                      <div
                        key={a.id}
                        className="flex items-start gap-2.5 px-3.5 py-3"
                        style={{ borderTop: ai === 0 ? "none" : `1px solid ${COLORS.bg}` }}
                      >
                        <span
                          className="shrink-0 rounded-full flex items-center justify-center"
                          style={{ width: 32, height: 32, background: meta.bg }}
                        >
                          <Icon size={15} color={meta.fg} />
                        </span>
                        <div className="min-w-0">
                          <div className="text-sm leading-snug" style={{ color: COLORS.ink }}>{a.text}</div>
                          <div className="text-xs mt-0.5" style={{ color: COLORS.inkSoft }}>{fmtClock(a.timestamp)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
