import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Plus,
  Trash2,
  Pencil,
  History,
  X,
  Search,
  Minus,
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
import { motion, AnimatePresence } from "motion/react";
import { storageGet, storageSet, storageSubscribe, subscribeAuth, login, logout } from "./firebase";
import KasRumahApp from "./KasRumah";
import { SharedStyles } from "./SharedStyles";
import {
  Sheet,
  Drawer,
  BottomNav as NavBar,
  FilterTile as Tile,
  TabPager,
  RollingNumber,
  CheckCircle,
  Screen,
  Backdrop,
  Rise,
  FadeSwap,
  AnimatedList,
  Stagger,
  StaggerItem,
  highlightMotion,
  Collapse,
  CardRings,
  AutoHeight,
  CollapseList,
  Segmented,
  Stepper,
  Chip,
  SheetHeader,
  FieldLabel,
  Hero,
  HeroBar,
  morphId,
  CARD_CORNERS,
  HERO_HEIGHT,
  SPRING,
  DUR,
  EASE,
  EXIT,
} from "./ui";

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
  // Teks yang lebih pekat supaya tetap terbaca di atas putih.
  muted: "#6B716D",
  lowText: "#A8650F",
  outText: "#B83A2E",
};

const APP_FONT = "'Outfit', sans-serif";

// Warna pendar saat sebuah item dituju dari beranda/notifikasi.
const HIGHLIGHT_RGB = "224,138,60";

const UNIT_SUGGESTIONS = ["pcs", "kg", "gram", "liter", "ml", "botol", "pack", "sachet"];

const LEVEL_OPTIONS = [
  { key: "banyak", label: "Banyak", status: "safe" },
  { key: "setengah", label: "Setengah", status: "safe" },
  { key: "sedikit", label: "Sedikit", status: "low" },
  { key: "habis", label: "Habis", status: "out" },
];
const LEVEL_LABEL = Object.fromEntries(LEVEL_OPTIONS.map((o) => [o.key, o.label]));

const DEFAULT_PLACES = ["Shopee", "Tokopedia", "Alfamart", "Indomaret", "Griya"];

const STOK_TABS = [
  { key: "dashboard", label: "Beranda", icon: Home },
  { key: "stock", label: "Stok", icon: Package },
  { key: "tobuy", label: "Beli", icon: ShoppingCart },
];

const AGENDA_TABS = [
  { key: "list", label: "List", icon: ListTodo },
  { key: "calendar", label: "Kalender", icon: Calendar },
];

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

// --- Akan Dibeli ↔ Stok ---------------------------------------------------
// Bulatkan supaya 0.1 + 0.2 tidak jadi 0.30000000000000004.
function roundQty(n) {
  return Math.round(Number(n) * 1000) / 1000;
}

function newAutoEntry(item, status) {
  return {
    id: uid(),
    itemId: item.id,
    itemName: item.name,
    status,
    source: "auto",
    qty: "",
    unit: item.type === "qty" ? item.unit || "" : "",
    place: "",
    notes: "",
    addedAt: new Date().toISOString(),
    bought: false,
    boughtBy: null,
    boughtAt: null,
  };
}

// Menyelaraskan daftar Akan Dibeli dengan status satu barang (fungsi murni):
// - stok aman     → entri OTOMATIS yang belum dibeli untuk barang itu dihapus
//                   (entri yang ditambahkan manual tetap dibiarkan);
// - menipis/habis → masuk otomatis kalau belum ada entri aktif.
// Mengembalikan array yang SAMA bila tidak ada perubahan.
function syncToBuyFor(item, list) {
  const status = statusOf(item);
  if (status === "safe") {
    const next = list.filter((e) => !(e.itemId === item.id && !e.bought && e.source === "auto"));
    return next.length === list.length ? list : next;
  }
  const active = list.find((e) => e.itemId === item.id && !e.bought);
  if (active) {
    if (active.source === "auto" && active.status !== status) {
      return list.map((e) => (e.id === active.id ? { ...e, status } : e));
    }
    return list;
  }
  return [newAutoEntry(item, status), ...list];
}

// Angka stok untuk dibaca orang: 2.5 → "2,5".
function fmtQty(n) {
  const r = roundQty(n);
  return Number.isFinite(r) ? String(r).replace(".", ",") : "0";
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
  if (Number.isNaN(d.getTime())) return "";
  if (unit === "bulan") {
    // 31 Jan + 1 bulan = 28/29 Feb (bukan 3 Maret): tanggalnya dipepetkan
    // ke hari terakhir bulan tujuan kalau bulan itu lebih pendek.
    const day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + every);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(day, last));
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
    if (h.action === "buy") {
      kind = "tobuyBought";
      const who = h.user || "Seseorang";
      text = h.newLevel
        ? `${who} membeli ${h.itemName} (stok jadi ${LEVEL_LABEL[h.newLevel] || h.newLevel})`
        : `${who} membeli ${h.itemName} ${fmtQty(h.amount)}${h.unit ? " " + h.unit : ""} (stok ${fmtQty(h.oldQty)} → ${fmtQty(h.newQty)})`;
    } else if (h.action === "unbuy") {
      kind = "stockUpdate";
      const who = h.user || "Seseorang";
      text = h.newLevel
        ? `${who} membatalkan pembelian ${h.itemName} (stok kembali ${LEVEL_LABEL[h.newLevel] || h.newLevel})`
        : `${who} membatalkan pembelian ${h.itemName} (stok ${fmtQty(h.oldQty)} → ${fmtQty(h.newQty)})`;
    } else if (h.action === "add") {
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
    // Pembelian yang ikut menambah stok sudah tercatat di riwayat stok
    // (lengkap dengan jumlahnya), jadi tidak dicatat dua kali.
    if (e.bought && e.boughtAt && !e.applied) {
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
      text = t.valuation
        ? `${who} memperbarui nilai saham (naik ${nominal})`
        : t.adjustment
        ? `${who} menyesuaikan saldo (+${nominal})`
        : `${who} mencatat pemasukan ${nominal}`;
    } else if (t.type === "transfer") {
      kind = "kasTransfer";
      text = `${who} transfer ${nominal} antar dompet`;
    } else {
      kind = "kasExpense";
      const cat = (kasCats || {})[t.categoryId]?.name;
      text = t.valuation
        ? `${who} memperbarui nilai saham (turun ${nominal})`
        : t.adjustment
        ? `${who} menyesuaikan saldo (−${nominal}${cat ? `, ${cat}` : ""})`
        : `${who} mencatat pengeluaran ${nominal}${cat ? ` (${cat})` : ""}`;
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

// returning: { key, morph } — kartu mana yang baru ditinggalkan, dan apakah
// kartu sambutannya tadi terlihat (kalau ya, kartu ini mengerut kembali dari
// sana; kalau tidak, kartu ini cukup muncul biasa).
function AppPicker({ userName, onPick, onLogout, notifSlot, returning }) {
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

  const returnIdx = returning ? cards.findIndex((c) => c.key === returning.key) : -1;

  return (
    <div className="flex flex-col h-full" style={{ color: COLORS.ink, fontFamily: APP_FONT, overflow: "hidden" }}>
      <Backdrop color={COLORS.bg} />

      <div
        className="relative max-w-2xl mx-auto w-full flex flex-col flex-1 min-h-0 px-5"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 14px)", paddingBottom: "max(14px, env(safe-area-inset-bottom))" }}
      >
        {/* zIndex: panel notifikasi di header harus tetap di atas kartu. */}
        <motion.div
          className="relative shrink-0"
          style={{ zIndex: 5 }}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0, transition: { ...SPRING.page, delay: 0.04 } }}
          exit={{ opacity: 0, transition: EXIT }}
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
        </motion.div>

        {/* Ketiga kartu berbagi sisa tinggi layar secara merata, jadi selalu
            muat tanpa perlu digulir — berapa pun tinggi layar HP-nya. */}
        <div className="flex flex-col gap-3 flex-1 min-h-0" style={{ marginTop: 18 }}>
          {cards.map((c, i) => {
            const Icon = c.icon;
            const isReturning = i === returnIdx;
            // Kartu yang baru ditinggalkan dan kartu sambutannya tadi terlihat:
            // kartu ini TIDAK memudar — latarnya mengerut kembali dari kartu
            // sambutan, isinya menyusul.
            const morphIn = isReturning && returning.morph;
            // Saat pulang, kartu di atas kartu tadi datang dari atas, yang di
            // bawahnya dari bawah. Saat pertama dibuka, semuanya naik pelan.
            const fromY = returning ? (i < returnIdx ? -24 : 24) : 18;
            const delay = returning ? 0.1 + Math.abs(i - returnIdx) * 0.05 : 0.08 + i * 0.06;
            return (
              <motion.button
                key={c.key}
                data-card={c.key}
                onClick={() => onPick(c.key)}
                className="relative w-full flex-1 min-h-0 text-left"
                style={{ background: "transparent", borderRadius: 26 }}
                initial={morphIn ? false : { opacity: 0, y: fromY }}
                animate={{ opacity: 1, y: 0, transition: { ...SPRING.page, delay } }}
                exit={{ opacity: 0, y: 12, transition: EXIT }}
              >
                {/* Latar kartu — inilah yang melebar jadi kartu sambutan. */}
                <motion.span
                  aria-hidden="true"
                  layoutId={morphId(c.key)}
                  className="absolute inset-0"
                  style={{ background: c.cardBg, ...CARD_CORNERS }}
                  transition={SPRING.page}
                />
                <motion.span
                  className="absolute inset-0 flex flex-col justify-end overflow-hidden"
                  style={{ padding: 18, borderRadius: 26 }}
                  initial={morphIn ? { opacity: 0 } : false}
                  animate={{ opacity: 1, transition: { delay: morphIn ? 0.24 : 0, duration: DUR.base } }}
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
                  <span className="relative block">
                    <span
                      className="block"
                      style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 700, fontSize: 24, lineHeight: 1.15, color: c.titleColor }}
                    >
                      {c.title}
                    </span>
                    <span className="block" style={{ fontSize: 13.5, color: c.subColor, marginTop: 1 }}>
                      {c.subtitle}
                    </span>
                  </span>
                </motion.span>
              </motion.button>
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
      style={{ background: COLORS.bg, minHeight: "100vh", fontFamily: APP_FONT }}
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
      `}</style>
      <motion.div
        className="w-full sm:max-w-xs p-5 rounded-2xl"
        style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0, transition: SPRING.page }}
      >
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
              <span style={{ display: "inline-flex" }}>
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
      </motion.div>
    </div>
  );
}

// Layar tunggu sesaat (cek login, memuat data). Tulisannya baru muncul
// setelah jeda singkat, jadi kalau datanya cepat siap, tidak ada kilatan
// tulisan yang langsung hilang lagi.
function LoadingScreen({ text }) {
  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", color: COLORS.inkSoft, fontFamily: APP_FONT }} className="flex items-center justify-center text-sm">
      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.3, duration: DUR.base } }}>
        {text}
      </motion.span>
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
  // 'stok' = Stok Rumah, 'kas' = Kas Rumah, 'agenda' = Agenda Rumah.
  const [activeApp, setActiveApp] = useState(null);
  // Data Kas Rumah untuk notifikasi gabungan (baca saja).
  const [kasTx, setKasTx] = useState([]);
  const [kasCats, setKasCats] = useState([]);
  // Transaksi Kas yang harus disorot begitu aplikasi Kas Rumah dibuka.
  const [kasHighlightId, setKasHighlightId] = useState(null);

  const [view, setView] = useState("dashboard"); // 'dashboard' | 'stock' | 'tobuy'
  const [stockSearch, setStockSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [tobuySearch, setTobuySearch] = useState("");
  const [tobuyFilter, setTobuyFilter] = useState("pending");
  const [agendaSearch, setAgendaSearch] = useState("");
  const [agendaFilter, setAgendaFilter] = useState("all");
  const [highlightTarget, setHighlightTarget] = useState(null); // { type, id }

  const TAB_ORDER = ["dashboard", "stock", "tobuy"];
  const changeView = (next) => setView(next);

  // --- Buka / tutup aplikasi dari halaman awal ---------------------------
  // returning: kartu mana yang baru ditinggalkan dan apakah kartu
  // sambutannya tadi terlihat — dipakai halaman awal untuk memilih gerakan
  // pulang yang tepat (mengerut kembali ke kartu, atau muncul biasa).
  const [returning, setReturning] = useState(null);
  // Tab yang sedang dibuka di Kas Rumah (dilaporkan oleh Kas sendiri).
  const kasViewRef = useRef("dashboard");
  // Kunci singkat selama transisi, supaya ketukan ganda tidak memicu dua
  // perpindahan sekaligus.
  const busyRef = useRef(false);
  const lockBriefly = () => {
    busyRef.current = true;
    setTimeout(() => {
      busyRef.current = false;
    }, 650);
  };

  // entryMorph: true kalau aplikasi dibuka dengan menyentuh kartunya (kartu
  // melebar jadi kartu sambutan). Kalau dibuka lewat notifikasi/pintasan,
  // kartu sambutannya cukup muncul memudar.
  const [entryMorph, setEntryMorph] = useState(false);

  const openApp = (key) => {
    if (busyRef.current) return;
    lockBriefly();
    // Kartu selalu mendarat di beranda aplikasinya.
    if (key === "stok") setView("dashboard");
    setEntryMorph(true);
    setShowNotif(false);
    setActiveApp(key);
  };

  // Pindah ke aplikasi lain tanpa lewat kartu (notifikasi, pintasan beranda).
  const jumpToApp = (key) => {
    if (activeApp === key) return;
    lockBriefly();
    setEntryMorph(false);
    setShowNotif(false);
    setActiveApp(key);
  };

  const closeApp = () => {
    if (busyRef.current || !activeApp) return;
    lockBriefly();
    // Kartu sambutan hanya terlihat di beranda aplikasi (Agenda selalu).
    const heroVisible =
      activeApp === "agenda" ? true : activeApp === "kas" ? kasViewRef.current === "dashboard" : view === "dashboard";
    setReturning({ key: activeApp, morph: heroVisible });
    setShowNotif(false);
    setShowUserMenu(false);
    setActiveApp(null);
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

  // Pintasan dari beranda & notifikasi: buka aplikasi yang tepat, arahkan ke
  // halamannya, lalu sorot item yang dimaksud.
  const goToStockItem = (item) => {
    const s = statusOf(item);
    setStockFilter(s === "safe" ? "all" : s);
    setStockSearch("");
    setHighlightTarget({ type: "stock", id: item.id });
    jumpToApp("stok");
    setView("stock");
  };

  const goToToBuyEntry = (entry) => {
    setTobuyFilter(entry.bought ? "bought" : "pending");
    setTobuySearch("");
    setHighlightTarget({ type: "tobuy", id: entry.id });
    jumpToApp("stok");
    setView("tobuy");
  };

  const goToTask = (task) => {
    setAgendaFilter("all");
    setAgendaSearch("");
    setHighlightTarget({ type: "agenda", id: task.id });
    jumpToApp("agenda");
  };

  // Klik satu baris notifikasi: buka aplikasi asalnya, lalu sorot itemnya.
  const handleActivitySelect = (a) => {
    setShowNotif(false);
    const ref = a && a.ref;
    if (!ref) return;
    if (ref.type === "stock") {
      const item = items.find((i) => i.id === ref.id);
      if (item) goToStockItem(item);
      else jumpToApp("stok");
    } else if (ref.type === "tobuy") {
      const entry = toBuy.find((e) => e.id === ref.id);
      if (entry) goToToBuyEntry(entry);
      else jumpToApp("stok");
    } else if (ref.type === "agenda") {
      const task = tasks.find((t) => t.id === ref.id);
      if (task) goToTask(task);
      else jumpToApp("agenda");
    } else if (ref.type === "kas") {
      setKasHighlightId(ref.id);
      jumpToApp("kas");
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

  // Versi untuk dipasang di atas kartu berwarna gelap.
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
  const [detailItemId, setDetailItemId] = useState(null);
  const [taskDetailId, setTaskDetailId] = useState(null);
  // Pindah dari satu jendela ke jendela lain (mis. detail → edit): jendela
  // pertama turun dulu sebentar, baru jendela berikutnya naik, supaya dua
  // lapisan gelapnya tidak menumpuk jadi terlalu gelap.
  const swapSheet = (closeFn, openFn) => {
    closeFn();
    setTimeout(openFn, 170);
  };
  const [toBuyModal, setToBuyModal] = useState(null); // { mode: 'add'|'edit', entry? }
  const [taskModal, setTaskModal] = useState(null); // { mode: 'add'|'edit', task? }
  const [thresholdModal, setThresholdModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // { type, id, label }
  const [pendingRestore, setPendingRestore] = useState(null);
  const [restoreError, setRestoreError] = useState("");
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef(null);
  const userNameRef = useRef("");
  // Cegah efek "karet"/tembus ala iOS (rubber-band bounce) saat list
  // discroll sampai mentok atas/bawah — TERMASUK saat app dibuka dari
  // "Add to Home Screen" (mode standalone). Listener dipasang di `document`
  // dan eksplisit non-passive supaya preventDefault()-nya didengar browser.
  // Gerakan menyamping (geser tab, tarik drawer) dibiarkan — itu milik
  // TabPager dan Drawer.
  useEffect(() => {
    let startX = 0;
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
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      scrollTarget = findScrollable(e.target);
    }

    function onMove(e) {
      if (e.touches.length !== 1) return;

      // Gerakan menyamping — jangan diganggu.
      const dxAbs = Math.abs(e.touches[0].clientX - startX);
      const dyAbs = Math.abs(e.touches[0].clientY - startY);
      if (dxAbs > dyAbs) return;

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

  // Semua data disinkronkan real-time lewat Firestore: perubahan dari
  // HP/perangkat lain akan langsung muncul di sini tanpa perlu refresh.
  // Baru mulai sinkron setelah login berhasil (authUser terisi).
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

  // --- Simpan stok sekaligus ----------------------------------------------
  // Semua perubahan stok, daftar Akan Dibeli, dan riwayat diterapkan ke layar
  // SEKALIGUS, lalu disimpan ke cloud bersamaan. Jadi tidak ada saat di mana
  // stok sudah berubah tapi daftarnya belum (misalnya saat koneksi lambat
  // atau offline), dan ketukan berikutnya selalu membaca data terbaru.
  const itemsRef = useRef(items);
  const toBuyRef = useRef(toBuy);
  const historyRef = useRef(history);
  itemsRef.current = items;
  toBuyRef.current = toBuy;
  historyRef.current = history;

  const commitStock = ({ items: nextItems, toBuy: nextToBuy, history: nextHistory }) => {
    const writes = [];
    if (nextItems && nextItems !== itemsRef.current) {
      itemsRef.current = nextItems;
      setItems(nextItems);
      writes.push(storageSet("stock-items", nextItems));
    }
    if (nextToBuy && nextToBuy !== toBuyRef.current) {
      toBuyRef.current = nextToBuy;
      setToBuy(nextToBuy);
      writes.push(storageSet("stock-tobuy", nextToBuy));
    }
    if (nextHistory && nextHistory !== historyRef.current) {
      historyRef.current = nextHistory;
      setHistory(nextHistory);
      writes.push(storageSet("stock-history", nextHistory));
    }
    return Promise.all(writes);
  };

  const withHistory = (entries, base) => {
    const list = Array.isArray(entries) ? entries : [entries];
    const stamped = list.map((h, i) => ({ id: uid(), timestamp: new Date(Date.now() + i).toISOString(), ...h }));
    return [...stamped.reverse(), ...base].slice(0, 200);
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
        qty: roundQty(Number(data.qty) || 0),
        unit: data.unit.trim() || "pcs",
        minQty: data.minQty === "" ? 0 : roundQty(Number(data.minQty) || 0),
        notes: data.notes ? data.notes.trim() : "",
        lastUpdatedBy: userName,
        lastUpdatedAt: now,
      };
      histEntry = { itemId: newItem.id, itemName: newItem.name, user: userName, action: "add", newQty: newItem.qty, unit: newItem.unit };
    }
    const done = commitStock({
      items: [...itemsRef.current, newItem],
      toBuy: syncToBuyFor(newItem, toBuyRef.current),
      history: withHistory(histEntry, historyRef.current),
    });
    setSaving(false);
    setModal(null);
    await done;
  };

  const handleEdit = async (id, data) => {
    const current = itemsRef.current.find((i) => i.id === id);
    if (!current) return;
    setSaving(true);
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
      const newQty = roundQty(Number(data.qty) || 0);
      updated = {
        ...current,
        name: data.name.trim(),
        qty: newQty,
        unit: data.unit.trim() || "pcs",
        minQty: data.minQty === "" ? 0 : roundQty(Number(data.minQty) || 0),
        notes: data.notes ? data.notes.trim() : "",
        lastUpdatedBy: userName,
        lastUpdatedAt: now,
      };
      if (oldQty !== newQty) {
        histEntry = { itemId: id, itemName: updated.name, user: userName, action: "update", oldQty, newQty, unit: updated.unit };
      }
    }
    // Nama/satuan di Akan Dibeli ikut diperbarui untuk entri yang belum dibeli.
    let nextToBuy = toBuyRef.current;
    if (updated.name !== current.name || updated.unit !== current.unit) {
      nextToBuy = nextToBuy.map((e) =>
        e.itemId === id && !e.bought ? { ...e, itemName: updated.name, unit: updated.type === "qty" ? updated.unit : e.unit } : e
      );
    }
    const done = commitStock({
      items: itemsRef.current.map((i) => (i.id === id ? updated : i)),
      toBuy: syncToBuyFor(updated, nextToBuy),
      history: histEntry ? withHistory(histEntry, historyRef.current) : undefined,
    });
    setSaving(false);
    setModal(null);
    await done;
  };

  const handleQuickAdjust = async (id, delta) => {
    const current = itemsRef.current.find((i) => i.id === id);
    if (!current) return;
    const oldQty = current.qty;
    const newQty = Math.max(0, roundQty(oldQty + delta));
    if (newQty === oldQty) return;
    const updated = { ...current, qty: newQty, lastUpdatedBy: userName, lastUpdatedAt: new Date().toISOString() };
    await commitStock({
      items: itemsRef.current.map((i) => (i.id === id ? updated : i)),
      toBuy: syncToBuyFor(updated, toBuyRef.current),
      history: withHistory({ itemId: id, itemName: current.name, user: userName, action: "update", oldQty, newQty, unit: current.unit }, historyRef.current),
    });
  };

  const handleLevelChange = async (id, newLevel) => {
    const current = itemsRef.current.find((i) => i.id === id);
    if (!current || current.level === newLevel) return;
    const oldLevel = current.level;
    const updated = { ...current, level: newLevel, lastUpdatedBy: userName, lastUpdatedAt: new Date().toISOString() };
    await commitStock({
      items: itemsRef.current.map((i) => (i.id === id ? updated : i)),
      toBuy: syncToBuyFor(updated, toBuyRef.current),
      history: withHistory({ itemId: id, itemName: current.name, user: userName, action: "update", oldLevel, newLevel }, historyRef.current),
    });
  };

  const handleDeleteItem = async (id) => {
    const current = itemsRef.current.find((i) => i.id === id);
    if (!current) return;
    const nextToBuy = toBuyRef.current.filter((e) => !(e.itemId === id && !e.bought));
    await commitStock({
      items: itemsRef.current.filter((i) => i.id !== id),
      toBuy: nextToBuy.length !== toBuyRef.current.length ? nextToBuy : undefined,
      history: withHistory({ itemId: id, itemName: current.name, user: userName, action: "delete", oldQty: current.qty, unit: current.unit }, historyRef.current),
    });
  };

  // --- Beli → stok bertambah ----------------------------------------------
  // purchases: [{ entryId, qty? }]. Dipakai oleh centang di Akan Dibeli,
  // sheet "Sudah dibeli", dan scan struk di Kas Rumah.
  //   - barang berjumlah: stok + qty, dicatat applied {kind:'qty', amount}
  //   - barang kira-kira: stok jadi "Banyak", dicatat applied {kind:'level', prevLevel}
  //   - barang lain (tidak terhubung ke stok): cukup ditandai dibeli
  // Kalau setelah dibeli stok masih di batas minimum, barangnya otomatis
  // masuk lagi ke Akan Dibeli (dengan tempat beli yang sama).
  const applyPurchases = async (purchases) => {
    const now = new Date().toISOString();
    let nextItems = itemsRef.current;
    let nextToBuy = toBuyRef.current;
    const newHist = [];

    for (const p of purchases || []) {
      const entry = nextToBuy.find((e) => e.id === p.entryId);
      if (!entry || entry.bought) continue;
      const item = entry.itemId ? nextItems.find((i) => i.id === entry.itemId) : null;
      let applied = null;
      let updated = null;

      if (item && item.type === "level") {
        applied = { kind: "level", prevLevel: item.level };
        updated = { ...item, level: "banyak", lastUpdatedBy: userName, lastUpdatedAt: now };
        newHist.push({ itemId: item.id, itemName: item.name, user: userName, action: "buy", oldLevel: item.level, newLevel: "banyak" });
      } else if (item) {
        const amount = roundQty(Math.max(0, Number(String(p.qty ?? "").replace(",", ".")) || 0));
        if (amount > 0) {
          const newQty = roundQty((Number(item.qty) || 0) + amount);
          applied = { kind: "qty", amount };
          updated = { ...item, qty: newQty, lastUpdatedBy: userName, lastUpdatedAt: now };
          newHist.push({ itemId: item.id, itemName: item.name, user: userName, action: "buy", oldQty: item.qty, newQty, amount, unit: item.unit });
        }
      }

      nextToBuy = nextToBuy.map((e) => (e.id === entry.id ? { ...e, bought: true, boughtBy: userName, boughtAt: now, applied } : e));
      if (updated) {
        nextItems = nextItems.map((i) => (i.id === updated.id ? updated : i));
        const before = new Set(nextToBuy.map((e) => e.id));
        nextToBuy = syncToBuyFor(updated, nextToBuy);
        if (entry.place) {
          nextToBuy = nextToBuy.map((e) => (!before.has(e.id) && e.itemId === updated.id ? { ...e, place: entry.place } : e));
        }
      }
    }

    await commitStock({
      items: nextItems,
      toBuy: nextToBuy,
      history: newHist.length ? withHistory(newHist, historyRef.current) : undefined,
    });
  };

  // Batal centang: stok dikembalikan persis seperti sebelum dibeli.
  const unbuyEntry = async (entryId) => {
    const entry = toBuyRef.current.find((e) => e.id === entryId);
    if (!entry || !entry.bought) return;
    const item = entry.itemId ? itemsRef.current.find((i) => i.id === entry.itemId) : null;
    const now = new Date().toISOString();
    let nextToBuy = toBuyRef.current.map((e) => (e.id === entry.id ? { ...e, bought: false, boughtBy: null, boughtAt: null, applied: null } : e));
    let nextItems;
    let nextHistory;

    if (item && entry.applied) {
      let updated;
      let hist;
      if (entry.applied.kind === "level" && item.type === "level") {
        updated = { ...item, level: entry.applied.prevLevel || item.level, lastUpdatedBy: userName, lastUpdatedAt: now };
        hist = { itemId: item.id, itemName: item.name, user: userName, action: "unbuy", oldLevel: item.level, newLevel: updated.level };
      } else if (entry.applied.kind === "qty" && item.type === "qty") {
        const newQty = Math.max(0, roundQty((Number(item.qty) || 0) - (Number(entry.applied.amount) || 0)));
        updated = { ...item, qty: newQty, lastUpdatedBy: userName, lastUpdatedAt: now };
        hist = { itemId: item.id, itemName: item.name, user: userName, action: "unbuy", oldQty: item.qty, newQty, unit: item.unit };
      }
      if (updated) {
        nextItems = itemsRef.current.map((i) => (i.id === item.id ? updated : i));
        nextHistory = withHistory(hist, historyRef.current);
        // Entri ini aktif lagi — entri otomatis lain untuk barang yang sama
        // (yang masuk karena stok masih kurang) tidak perlu dobel.
        nextToBuy = nextToBuy.filter((e) => !(e.id !== entry.id && e.itemId === item.id && !e.bought && e.source === "auto"));
        // Lalu cek ulang: kalau ternyata stoknya sudah aman, entri otomatis
        // tidak perlu ada di daftar.
        nextToBuy = syncToBuyFor(updated, nextToBuy);
      }
    }

    await commitStock({ items: nextItems, toBuy: nextToBuy, history: nextHistory });
  };

  // Sheet "Sudah dibeli" untuk barang berjumlah.
  const [buyEntryId, setBuyEntryId] = useState(null);
  // Kalau entrinya hilang/sudah dibeli dari perangkat lain selagi sheet
  // terbuka, sheet ditutup dan tidak akan muncul sendiri lagi nanti.
  useEffect(() => {
    if (buyEntryId && !toBuy.some((e) => e.id === buyEntryId && !e.bought)) setBuyEntryId(null);
  }, [buyEntryId, toBuy]);

  // Cegah ketukan ganda yang tak sengaja pada centang yang sama.
  const lastToggleRef = useRef({ id: null, at: 0 });

  // Satu pintu untuk centang di mana pun (halaman Beli, Beranda, detail).
  const requestToggleBought = (entryId) => {
    const nowMs = Date.now();
    if (lastToggleRef.current.id === entryId && nowMs - lastToggleRef.current.at < 450) return;
    lastToggleRef.current = { id: entryId, at: nowMs };

    const entry = toBuyRef.current.find((e) => e.id === entryId);
    if (!entry) return;
    if (pendingEdit && entry.itemId && pendingEdit.itemId === entry.itemId) {
      setBlockedNotice(pendingEdit.itemName);
      return;
    }
    if (entry.bought) {
      unbuyEntry(entry.id);
      return;
    }
    const item = entry.itemId ? itemsRef.current.find((i) => i.id === entry.itemId) : null;
    if (item && item.type === "qty") {
      setBuyEntryId(entry.id);
      return;
    }
    applyPurchases([{ entryId: entry.id }]);
  };

  const handleDeleteToBuyEntry = async (id) => {
    await commitStock({ toBuy: toBuyRef.current.filter((e) => e.id !== id) });
  };

  const handleAddManualToBuy = async ({ itemId, name, qty, unit, place, notes }) => {
    const item = itemId ? itemsRef.current.find((i) => i.id === itemId) : null;
    // Barang dari daftar stok yang sudah ada di daftar (belum dibeli) tidak
    // ditambahkan dua kali.
    if (item && toBuyRef.current.some((e) => e.itemId === item.id && !e.bought)) {
      setToBuyModal(null);
      return;
    }
    const entry = {
      id: uid(),
      itemId: item ? item.id : null,
      itemName: item ? item.name : name.trim(),
      status: null,
      source: "manual",
      qty: qty || "",
      unit: item ? (item.type === "qty" ? item.unit || "" : unit || "") : unit || "",
      place: place || "",
      notes: notes ? notes.trim() : "",
      addedAt: new Date().toISOString(),
      addedBy: userName,
      bought: false,
      boughtBy: null,
      boughtAt: null,
    };
    setToBuyModal(null);
    await commitStock({ toBuy: [entry, ...toBuyRef.current] });
  };

  const handleEditToBuyEntry = async (entryId, { name, qty, unit, place, notes }) => {
    const next = toBuyRef.current.map((e) =>
      e.id === entryId
        ? {
            ...e,
            itemName: e.itemId ? e.itemName : name.trim(),
            qty: qty || "",
            unit: e.itemId && itemsRef.current.some((i) => i.id === e.itemId && i.type === "qty") ? e.unit : unit || "",
            place: place || "",
            notes: notes ? notes.trim() : "",
          }
        : e
    );
    setToBuyModal(null);
    await commitStock({ toBuy: next });
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


  const todayLabel = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 10) return "Selamat pagi";
    if (h < 15) return "Selamat siang";
    if (h < 18) return "Selamat sore";
    return "Selamat malam";
  }, []);

  // Preview list untuk kartu Beranda: maksimal 3 baris, sisanya lewat "Lihat semua"
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

  // Baris yang baru dicentang di Beranda tetap terlihat sebentar dengan
  // centangnya sebelum keluar dari daftar.
  const toBuyLinger = useRecentlyToggled(toBuy, "bought");
  const toBuyPreview = useMemo(() => {
    const pending = toBuy
      .filter((e) => !e.bought || toBuyLinger.includes(e.id))
      .sort((a, b) => new Date(a.addedAt) - new Date(b.addedAt));
    const total = pending.filter((e) => !e.bought).length;
    return { list: pending.slice(0, 3), total };
  }, [toBuy, toBuyLinger]);


  // Masih mengecek status login ke Firebase (sekejap saat pertama buka app)
  if (authUser === undefined) {
    return <LoadingScreen text="Memuat..." />;
  }

  // Belum login (atau baru logout) — tampilkan layar login, jangan render app-nya
  if (authUser === null) {
    return <LoginScreen onLogin={login} />;
  }

  if (loading) {
    return <LoadingScreen text="Memuat data..." />;
  }

  // Belum isi nama — tanya dulu sebelum masuk ke pemilihan aplikasi.
  if (askName) {
    return (
      <div style={{ background: COLORS.bg, minHeight: "100vh", color: COLORS.ink, fontFamily: APP_FONT }}>
        <SharedStyles />
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

  const stokIndex = TAB_ORDER.indexOf(view);
  const taskDetail = taskDetailId ? tasks.find((t) => t.id === taskDetailId) || null : null;
  const detailItem = detailItemId ? items.find((i) => i.id === detailItemId) || null : null;
  const buyEntry = buyEntryId ? toBuy.find((e) => e.id === buyEntryId && !e.bought) || null : null;
  const buyItem = buyEntry && buyEntry.itemId ? items.find((i) => i.id === buyEntry.itemId && i.type === "qty") || null : null;

  return (
    <div style={{ color: COLORS.ink, fontFamily: APP_FONT }}>
      <SharedStyles />
      <style>{`
        html, body {
          overflow: hidden;
          overscroll-behavior: none;
        }
        input:focus, textarea:focus { outline: 2px solid ${COLORS.primary}; outline-offset: 1px; }
        button:focus { outline: none; }
        button:focus-visible { outline: 2px solid ${COLORS.primary}; outline-offset: 1px; }
      `}</style>

      <input ref={fileInputRef} type="file" accept=".json,application/json" style={{ display: "none" }} onChange={handleFileSelected} />

      {/* Setiap aplikasi adalah satu "layar". Layar yang baru selalu di atas,
          layar yang ditinggalkan memudar di bawahnya — sementara kartu
          berwarnanya berubah bentuk dari satu layar ke layar lain. */}
      <AnimatePresence>
        {!activeApp && (
          <Screen key="picker">
            <AppPicker userName={userName} onPick={openApp} onLogout={logout} notifSlot={notifBell} returning={returning} />
          </Screen>
        )}

        {activeApp === "kas" && (
          <Screen key="kas">
            <KasRumahApp
              userName={userName}
              onBackToPicker={closeApp}
              onSwitchApp={closeApp}
              onLogout={logout}
              notifSlot={notifBell}
              notifSlotDark={notifBellOnDark}
              initialHighlightId={kasHighlightId}
              onInitialHighlightDone={() => setKasHighlightId(null)}
              morphIn={entryMorph}
              heroLayoutId={morphId("kas")}
              onViewChange={(v) => {
                kasViewRef.current = v;
              }}
              onApplyPurchases={applyPurchases}
            />
          </Screen>
        )}

        {activeApp === "agenda" && (
          <Screen key="agenda">
            <AgendaPage
              tasks={tasks}
              dueThreshold={dueThreshold}
              search={agendaSearch}
              setSearch={setAgendaSearch}
              filter={agendaFilter}
              setFilter={setAgendaFilter}
              onAddTask={(date) => setTaskModal({ mode: "add", initialDate: typeof date === "string" ? date : "" })}
              onOpenTask={(task) => setTaskDetailId(task.id)}
              onToggleDone={handleToggleTaskDone}
              onOpenUserMenu={() => setShowUserMenu(true)}
              onSwitchApp={closeApp}
              notifSlot={notifBellOnDark}
              highlightId={highlightTarget?.type === "agenda" ? highlightTarget.id : null}
              onHighlightDone={() => setHighlightTarget(null)}
              morphIn={entryMorph}
            />
          </Screen>
        )}

        {activeApp === "stok" && (
          <Screen key="stok">
            <Backdrop color={COLORS.bg} />
            <div className="fixed inset-0">
              <TabPager
                index={stokIndex}
                onIndexChange={(i) => changeView(TAB_ORDER[i])}
                canNavigate={() => !pendingEdit}
                onBlocked={() => pendingEdit && setBlockedNotice(pendingEdit.itemName)}
              >
                <motion.div layoutScroll className="h-full overflow-y-auto" style={{ overscrollBehaviorY: "contain", WebkitOverflowScrolling: "touch" }}>
                  <div className="max-w-2xl mx-auto px-4 pb-32">
                    {/* Bilah navy ringkas (sama seperti Agenda) — lapisan warnanya
                        berubah bentuk dari kartu di halaman awal; isinya menyusul. */}
                    <HeroBar color={COLORS.navy} layoutId={view === "dashboard" ? morphId("stok") : undefined} fadeIn={!entryMorph}>
                      <div className="flex items-center justify-between" style={{ gap: 10 }}>
                        <div className="min-w-0">
                          <div className="capitalize truncate" style={{ fontSize: 12.5, color: "rgba(255,255,255,0.72)" }}>
                            {todayLabel}
                          </div>
                          <h1 style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 700, fontSize: 26, lineHeight: 1.1, color: "#FFFFFF" }}>Stok Rumah</h1>
                        </div>
                        <div className="flex items-center shrink-0" style={{ gap: 6 }}>
                          {view === "dashboard" ? notifBellOnDark : null}
                          <button
                            onClick={() => attemptNavigate(closeApp)}
                            className="flex items-center justify-center"
                            style={{ width: 44, height: 44, borderRadius: 999, border: "none", background: "rgba(255,255,255,0.14)", color: "#FFFFFF" }}
                            title="Ganti aplikasi"
                          >
                            <LayoutGrid size={18} />
                          </button>
                          <button
                            onClick={() => setShowUserMenu(true)}
                            className="flex items-center justify-center"
                            style={{ width: 44, height: 44, borderRadius: 999, border: "none", background: "rgba(255,255,255,0.14)", color: "#FFFFFF" }}
                            title="Menu"
                          >
                            <Menu size={18} />
                          </button>
                        </div>
                      </div>
                    </HeroBar>

                    {/* Tiga ringkasan angka — sekaligus pintasan ke daftar yang sesuai */}
                    <Rise delay={0.12} className="grid gap-2" style={{ marginTop: 14, gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
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
                    </Rise>

                    <div className="flex flex-col gap-3" style={{ marginTop: 16 }}>
                      <Rise delay={0.17}>
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
                              : "Semua aman ✓"
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
                      </Rise>

                      <Rise delay={0.21}>
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
                              : "Semua sudah dibeli 🎉"
                          }
                          badge={toBuyPreview.total}
                          badgeColor={COLORS.low}
                          onOpen={() => setView("tobuy")}
                          rows={toBuyPreview.list.map((entry) => (
                            <ToBuyPreviewRow key={entry.id} entry={entry} onToggle={() => requestToggleBought(entry.id)} onClick={() => goToToBuyEntry(entry)} />
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
                      </Rise>

                    </div>
                  </div>
                </motion.div>

                <StockPage
                  items={items}
                  search={stockSearch}
                  setSearch={setStockSearch}
                  filter={stockFilter}
                  setFilter={setStockFilter}
                  onBack={() => attemptNavigate(() => setView("dashboard"))}
                  onOpenDetail={(item) => attemptNavigate(() => setDetailItemId(item.id))}
                  onAdjust={beginOrUpdatePendingQty}
                  onLevelChange={setPendingLevelEdit}
                  pendingEdit={pendingEdit}
                  onConfirmPending={confirmPendingEdit}
                  onCancelPending={() => setPendingEdit(null)}
                  onBlockedAttempt={() => pendingEdit && setBlockedNotice(pendingEdit.itemName)}
                  onOpenUserMenu={() => attemptNavigate(() => setShowUserMenu(true))}
                  onSwitchApp={() => attemptNavigate(closeApp)}
                  notifSlot={view === "stock" ? notifBell : null}
                  highlightId={highlightTarget?.type === "stock" ? highlightTarget.id : null}
                  onHighlightDone={() => setHighlightTarget(null)}
                />

                <ToBuyPage
                  toBuy={toBuy}
                  items={items}
                  places={places}
                  search={tobuySearch}
                  setSearch={setTobuySearch}
                  filter={tobuyFilter}
                  setFilter={setTobuyFilter}
                  onBack={() => setView("dashboard")}
                  onEditEntry={(entry) => setToBuyModal({ mode: "edit", entry })}
                  onToggle={requestToggleBought}
                  onOpenUserMenu={() => setShowUserMenu(true)}
                  onSwitchApp={closeApp}
                  notifSlot={view === "tobuy" ? notifBell : null}
                  highlightId={highlightTarget?.type === "tobuy" ? highlightTarget.id : null}
                  onHighlightDone={() => setHighlightTarget(null)}
                />
              </TabPager>
            </div>

            <NavBar
              id="stok-nav"
              tabs={STOK_TABS}
              active={view}
              onChange={(v) => attemptNavigate(() => changeView(v))}
              showAdd={view === "stock" || view === "tobuy"}
              onAdd={() =>
                attemptNavigate(() => {
                  if (view === "stock") setModal({ mode: "add" });
                  else setToBuyModal({ mode: "add" });
                })
              }
              color={COLORS.navy}
              accent={COLORS.accent}
              shadowRgb="38,49,77"
            />
          </Screen>
        )}
      </AnimatePresence>

      {/* Setiap jendela dibungkus AnimatePresence supaya animasi keluarnya
          tetap diputar walau state-nya sudah dikosongkan. */}
      <AnimatePresence>
        {modal && (
          <ItemFormModal
            key={`item-form-${modal.item ? modal.item.id : "new"}`}
            mode={modal.mode}
            item={modal.item}
            saving={saving}
            onClose={() => setModal(null)}
            onSubmit={(data) => (modal.mode === "add" ? handleAdd(data) : handleEdit(modal.item.id, data))}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmDelete && (
          <Overlay key="confirm-delete" onClose={() => setConfirmDelete(null)}>
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
      </AnimatePresence>

      {/* Peringatan: ada perubahan qty/level yang belum ditekan centang */}
      <AnimatePresence>
        {blockedNotice && (
          <Overlay key="blocked-notice" onClose={handleBlockedNoticeOk}>
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
      </AnimatePresence>

      <AnimatePresence>
        {showHistory && <HistoryPanel key="history" activity={fullActivityFeed} onClose={() => setShowHistory(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {showUserMenu && (
          <UserMenuPanel
            key="user-menu"
            userName={userName}
            userEmail={authUser ? authUser.email : ""}
            onClose={() => setShowUserMenu(false)}
            onChangeName={() => setAskName(true)}
            onOpenHistory={() => setShowHistory(true)}
            onBackup={handleBackupDownload}
            onRestore={triggerRestorePicker}
            onSwitchApp={closeApp}
            onOpenThreshold={() => setThresholdModal(true)}
            dueThreshold={dueThreshold}
            onLogout={logout}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toBuyModal && (
          <ToBuyFormModal
            key={`tobuy-form-${toBuyModal.entry ? toBuyModal.entry.id : "new-" + (toBuyModal.preselectItemId || "")}`}
            mode={toBuyModal.mode}
            entry={toBuyModal.entry}
            items={items}
            toBuy={toBuy}
            preselectItemId={toBuyModal.preselectItemId}
            places={places}
            onAddPlace={addCustomPlace}
            onDeletePlace={deleteCustomPlace}
            onClose={() => setToBuyModal(null)}
            onSubmit={(data) => (toBuyModal.mode === "add" ? handleAddManualToBuy(data) : handleEditToBuyEntry(toBuyModal.entry.id, data))}
            onDelete={
              toBuyModal.mode === "edit"
                ? () => {
                    const e = toBuyModal.entry;
                    swapSheet(
                      () => setToBuyModal(null),
                      () => setConfirmDelete({ type: "tobuy", id: e.id, label: e.itemName })
                    );
                  }
                : undefined
            }
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {detailItem && (
          <ItemDetailSheet
            key={`item-detail-${detailItem.id}`}
            item={detailItem}
            activeEntry={toBuy.find((e) => e.itemId === detailItem.id && !e.bought) || null}
            onClose={() => setDetailItemId(null)}
            onEdit={() => swapSheet(() => setDetailItemId(null), () => setModal({ mode: "edit", item: detailItem }))}
            onDelete={() =>
              swapSheet(
                () => setDetailItemId(null),
                () => setConfirmDelete({ type: "item", id: detailItem.id, label: detailItem.name })
              )
            }
            onAddToBuy={() => swapSheet(() => setDetailItemId(null), () => setToBuyModal({ mode: "add", preselectItemId: detailItem.id }))}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {buyEntry && buyItem && (
          <BuySheet
            key={`buy-sheet-${buyEntry.id}`}
            entry={buyEntry}
            item={buyItem}
            onClose={() => setBuyEntryId(null)}
            onConfirm={async (amount) => {
              setBuyEntryId(null);
              await applyPurchases([{ entryId: buyEntry.id, qty: amount }]);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {taskModal && (
          <TaskFormModal
            key={`task-form-${taskModal.task ? taskModal.task.id : "new-" + (taskModal.initialDate || "")}`}
            mode={taskModal.mode}
            task={taskModal.task}
            initialDate={taskModal.initialDate}
            onClose={() => setTaskModal(null)}
            onSubmit={(data) => (taskModal.mode === "add" ? handleAddTask(data) : handleEditTask(taskModal.task.id, data))}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {taskDetail && (
          <TaskDetailSheet
            key={`task-detail-${taskDetail.id}`}
            task={taskDetail}
            threshold={dueThreshold}
            onClose={() => setTaskDetailId(null)}
            onToggle={() => {
              setTaskDetailId(null);
              handleToggleTaskDone(taskDetail.id);
            }}
            onEdit={() => swapSheet(() => setTaskDetailId(null), () => setTaskModal({ mode: "edit", task: taskDetail }))}
            onDelete={() =>
              swapSheet(
                () => setTaskDetailId(null),
                () => setConfirmDelete({ type: "task", id: taskDetail.id, label: taskDetail.title })
              )
            }
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {thresholdModal && (
          <ThresholdModal
            key="threshold"
            current={dueThreshold}
            onClose={() => setThresholdModal(false)}
            onSubmit={(n) => {
              persistThreshold(n);
              setThresholdModal(false);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pendingRestore && (
          <Overlay key="restore" onClose={() => setPendingRestore(null)}>
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
      </AnimatePresence>

      <AnimatePresence>
        {restoreError && (
          <Overlay key="restore-error" onClose={() => setRestoreError("")}>
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
      </AnimatePresence>
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

  // Hitung sisa ruang di layar dari POSISI ASLI tombol lonceng, lalu pasang
  // lebar & tinggi panel sebagai angka piksel pasti supaya selalu pas dan
  // tetap bisa digulir di iPhone maupun Android.
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
        <AnimatePresence initial={false}>
          {count > 0 && (
            <motion.span
              key="badge"
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
              }}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1, transition: SPRING.press }}
              exit={{ scale: 0.4, opacity: 0, transition: { duration: DUR.micro } }}
            >
              <RollingNumber value={count > 9 ? "9+" : count} />
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Panel tumbuh dari lonceng (sudut kanan atas), bukan muncul mendadak. */}
      <AnimatePresence>
      {open && (
        <motion.div
          key="notif-panel"
          className="absolute"
          style={{
            top: "calc(100% + 10px)",
            right: 0,
            zIndex: 60,
            width: panelWidth,
            transformOrigin: "calc(100% - 20px) -8px",
            filter: "drop-shadow(0 16px 30px rgba(43,42,37,0.20)) drop-shadow(0 2px 6px rgba(43,42,37,0.10))",
          }}
          initial={{ opacity: 0, scale: 0.94, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0, transition: { ...SPRING.snappy, opacity: { duration: 0.14 } } }}
          exit={{ opacity: 0, scale: 0.96, y: -4, transition: { duration: DUR.micro, ease: EASE.in } }}
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
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}

function UserMenuPanel({ userName, userEmail, onClose, onChangeName, onOpenHistory, onBackup, onRestore, onSwitchApp, onOpenThreshold, dueThreshold, onLogout }) {
  // Drawer ditutup dulu (animasi keluarnya jalan sendiri), lalu aksinya
  // langsung dijalankan — tidak perlu menunggu dengan setTimeout.
  const runAndClose = (action) => {
    onClose();
    action();
  };

  return (
    <Drawer onClose={onClose} background={COLORS.bg} font={APP_FONT} color={COLORS.ink} narrow>
      <Stagger>
        <StaggerItem className="flex items-center justify-between mb-6 pt-1">
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
          <button onClick={onClose}>
            <X size={18} color={COLORS.inkSoft} />
          </button>
        </StaggerItem>

        <StaggerItem className="rounded-2xl overflow-hidden" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
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
        </StaggerItem>

        <StaggerItem className="rounded-2xl overflow-hidden mt-3" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
          <UserMenuItem icon={LayoutGrid} label="Ganti Aplikasi" onClick={() => runAndClose(onSwitchApp)} />
          <UserMenuItem icon={LogOut} label="Keluar" onClick={() => runAndClose(onLogout)} last danger />
        </StaggerItem>
      </Stagger>
    </Drawer>
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

function TopBar({ title, subtitle, icon: Icon, iconBg, iconFg, onBack, rightSlot, onOpenUserMenu, onSwitchApp, notifSlot }) {
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
      <AnimatePresence initial={false}>
        {badge > 0 && (
          <motion.span
            key="badge"
            className="absolute flex items-center justify-center font-semibold text-white"
            style={{ top: 18, right: 18, minWidth: 24, height: 24, padding: "0 7px", borderRadius: 12, fontSize: 12 }}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1, backgroundColor: badgeColor, transition: SPRING.press }}
            exit={{ scale: 0.5, opacity: 0, transition: { duration: DUR.micro } }}
          >
            <RollingNumber value={badge} />
          </motion.span>
        )}
      </AnimatePresence>
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
      {rows && (
        <CollapseList spacing={8} spacingSide="top" style={{ marginTop: 6 }}>
          {rows}
        </CollapseList>
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
      <CheckCircle
        checked={!!entry.bought}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        color={COLORS.safe}
        borderColor={COLORS.border}
        title="Tandai sudah dibeli"
      />
      <button onClick={onClick} className="flex-1 min-w-0 flex flex-col items-start text-left">
        <span className="w-full flex items-center gap-1.5 truncate" style={{ color: COLORS.ink, fontSize: 13 }}>
          <span className="truncate">{entry.itemName}</span>
          {entry.notes && <StickyNote size={11} color={COLORS.inkSoft} className="shrink-0" />}
        </span>
        {detailParts.length > 0 && (
          <span className="mt-0.5" style={{ color: COLORS.inkSoft, fontSize: 11 }}>
            {detailParts.join(" · ")}
          </span>
        )}
      </button>
    </div>
  );
}

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
        <RollingNumber value={value} />
      </span>
      <span className="truncate" style={{ fontSize: 11, color: textColor, lineHeight: "16px", marginTop: 1 }}>
        {label}
      </span>
    </button>
  );
}

// Kartu filter Stok & Akan Dibeli — komponen bersama dengan warna navy.
function FilterTile(props) {
  return <Tile activeBg={COLORS.navy} inkSoft={COLORS.inkSoft} shadowRgb="38,49,77" {...props} />;
}

/* ---------------- Stock page ---------------- */

// Warna teks status yang lebih pekat supaya tetap terbaca di atas putih.
const STATUS_TEXT = { safe: "#2F7A4E", low: "#B0621F", out: "#B83A2E" };
const CARD_SHADOW = "0 1px 2px rgba(43,42,37,0.04), 0 6px 18px rgba(43,42,37,0.05)";
const LEVEL_ORDER = ["habis", "sedikit", "setengah", "banyak"];

function stockStatusLine(item, status) {
  const label = STATUS_META[status].label;
  if (item.type === "level") return LEVEL_LABEL[item.level] || label;
  if (Number(item.minQty) > 0) return `${label} · min ${fmtQty(item.minQty)} ${item.unit || ""}`.trim();
  return label;
}

// Isi bar: batas minimum selalu di tengah (50%), penuh = 2× minimum.
function gaugeFill(qty, min) {
  if (!(min > 0)) return 0;
  return Math.max(0, Math.min(1, (Number(qty) || 0) / (min * 2)));
}

function LetterAvatar({ name, status, size = 42, radius = 14, fontSize = 19 }) {
  const meta = STATUS_META[status];
  return (
    <motion.div
      aria-hidden="true"
      className="flex items-center justify-center shrink-0"
      initial={false}
      animate={{ backgroundColor: meta.bg, color: STATUS_TEXT[status] }}
      transition={{ duration: DUR.fast, ease: EASE.standard }}
      style={{ width: size, height: size, borderRadius: radius, fontFamily: "'Baloo 2', cursive", fontWeight: 700, fontSize }}
    >
      {(name || "?").trim().charAt(0).toUpperCase() || "?"}
    </motion.div>
  );
}

function Gauge({ qty, min, status, height = 6 }) {
  const fill = gaugeFill(qty, min);
  return (
    <div className="relative" style={{ height, borderRadius: 99, background: "#F1EEE5" }}>
      <motion.div
        className="absolute left-0 top-0 bottom-0"
        style={{ borderRadius: 99, originX: 0 }}
        initial={false}
        animate={{ width: `${fill * 100}%`, backgroundColor: STATUS_META[status].fg }}
        transition={{ width: SPRING.snappy, backgroundColor: { duration: DUR.fast } }}
      />
      <div
        aria-hidden="true"
        className="absolute"
        style={{ left: "50%", top: -3, width: 2, height: height + 6, marginLeft: -1, borderRadius: 2, background: "#D6D1C3" }}
      />
    </div>
  );
}

// Empat ruas seperti baterai: Habis → Sedikit → Setengah → Banyak. Ruas
// terisi sampai tingkat yang sekarang; warnanya mengikuti status.
function LevelBattery({ level, onChange, label, readOnly }) {
  const idx = LEVEL_ORDER.indexOf(level);
  const status = (LEVEL_OPTIONS.find((o) => o.key === level) || {}).status || "safe";
  const fillColor = STATUS_META[status].fg;
  return (
    <div
      role="group"
      aria-label={label}
      className="grid"
      style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 4, background: COLORS.soft, borderRadius: 14, padding: 3 }}
    >
      {LEVEL_ORDER.map((key, i) => {
        const filled = i <= idx;
        const Comp = readOnly ? motion.div : motion.button;
        return (
          <Comp
            key={key}
            type={readOnly ? undefined : "button"}
            onClick={readOnly ? undefined : () => onChange(key)}
            aria-pressed={readOnly ? undefined : key === level}
            className="no-tx flex items-center justify-center"
            initial={false}
            animate={{ backgroundColor: filled ? fillColor : "rgba(255,255,255,0)", color: filled ? "#FFFFFF" : COLORS.inkSoft }}
            transition={{ duration: DUR.fast, ease: EASE.standard, delay: filled ? i * 0.03 : 0 }}
            style={{ height: readOnly ? 34 : 40, border: "none", borderRadius: 11, fontSize: 12.5, fontWeight: filled ? 600 : 500, fontFamily: "inherit" }}
          >
            {LEVEL_LABEL[key]}
          </Comp>
        );
      })}
    </div>
  );
}

function StockPage({ items, search, setSearch, filter, setFilter, onBack, onOpenDetail, onAdjust, onLevelChange, pendingEdit, onConfirmPending, onCancelPending, onBlockedAttempt, onOpenUserMenu, onSwitchApp, notifSlot, highlightId, onHighlightDone }) {
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

  const displayList = filteredSorted;

  const guardedSetFilter = (f) => {
    if (pendingEdit) {
      onBlockedAttempt();
      return;
    }
    setFilter(f);
  };

  useEffect(() => {
    if (!highlightId) return;
    // Tunggu halaman/daftarnya selesai bergeser dulu, baru digulir ke item.
    const t1 = setTimeout(() => {
      const el = document.getElementById(`stock-item-${highlightId}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    }, 320);
    const t2 = setTimeout(() => onHighlightDone && onHighlightDone(), 2000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightId]);

  return (
    <div className="h-full flex flex-col">
      {/* Header: elemen biasa (bukan sticky di dalam area scroll), jadi gak
          pernah ikut ketarik pas list-nya di-bounce/overscroll. */}
      <div className="shrink-0 max-w-2xl mx-auto w-full px-4 pb-3" style={{ paddingTop: "env(safe-area-inset-top)", background: COLORS.bg }}>
        <TopBar title="Stok Rumah" onBack={onBack} onOpenUserMenu={onOpenUserMenu} onSwitchApp={onSwitchApp} notifSlot={notifSlot} />

        <div className="grid gap-2 mb-3" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
          <FilterTile group="stok" label="Semua" value={counts.total} color={COLORS.navy} active={filter === "all"} onClick={() => guardedSetFilter("all")} />
          <FilterTile group="stok" label="Aman" value={counts.total - counts.low - counts.out} color={COLORS.safe} active={filter === "safe"} onClick={() => guardedSetFilter("safe")} />
          <FilterTile group="stok" label="Menipis" value={counts.low} color={STATUS_TEXT.low} active={filter === "low"} onClick={() => guardedSetFilter("low")} />
          <FilterTile group="stok" label="Habis" value={counts.out} color={STATUS_TEXT.out} active={filter === "out"} onClick={() => guardedSetFilter("out")} />
        </div>

        <div className="flex items-center gap-2.5" style={{ background: COLORS.card, borderRadius: 999, padding: "0 18px", height: 46, boxShadow: "0 2px 10px rgba(38,49,77,0.05)" }}>
          <Search size={18} color={COLORS.inkSoft} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari item stok..."
            aria-label="Cari item stok"
            className="flex-1 bg-transparent"
            style={{ color: COLORS.ink, outline: "none", border: "none" }}
          />
        </div>
      </div>

      <motion.div layoutScroll className="flex-1 overflow-y-auto" style={{ overscrollBehaviorY: "contain", WebkitOverflowScrolling: "touch" }}>
        <FadeSwap swapKey={filter} className="max-w-2xl mx-auto px-4 pt-1 pb-32">
          {displayList.length === 0 ? (
            <div className="py-14 text-center rounded-[20px]" style={{ background: COLORS.card, border: `1px dashed ${COLORS.border}` }}>
              <Package size={28} color={COLORS.inkSoft} style={{ margin: "0 auto 8px" }} />
              <div style={{ color: COLORS.inkSoft }} className="text-sm">
                {items.length === 0 ? "Belum ada item. Tekan + untuk menambahkan." : "Tidak ada item yang cocok."}
              </div>
            </div>
          ) : (
            <AnimatedList className="flex flex-col gap-2.5">
              {displayList.map((item) => {
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
                    onCancelPending={onCancelPending}
                    onOpen={() => onOpenDetail(item)}
                    highlighted={item.id === highlightId}
                  />
                );
              })}
            </AnimatedList>
          )}
        </FadeSwap>
      </motion.div>
    </div>
  );
}

function ItemCard({ item, pendingDraft, blocked, onAdjust, onLevelChange, onConfirmPending, onCancelPending, onOpen, highlighted }) {
  const isLevel = item.type === "level";
  const isPending = !!pendingDraft;
  const displayQty = isPending && pendingDraft.kind === "qty" ? pendingDraft.draft : item.qty;
  const displayLevel = isPending && pendingDraft.kind === "level" ? pendingDraft.draft : item.level;
  // Warna & tulisan status mengikuti nilai yang sedang ditampilkan, jadi
  // perubahannya langsung terasa sebelum disimpan.
  const shown = isLevel ? { ...item, level: displayLevel } : { ...item, qty: displayQty };
  const status = statusOf(shown);
  const min = Number(item.minQty) || 0;
  const canDec = (Number(displayQty) || 0) > 0;

  const pendingText = isPending
    ? isLevel
      ? `${LEVEL_LABEL[item.level] || item.level} → ${LEVEL_LABEL[displayLevel] || displayLevel}`
      : `${fmtQty(item.qty)} → ${fmtQty(displayQty)} ${item.unit || ""}`.trim()
    : "";

  return (
    <motion.div
      id={`stock-item-${item.id}`}
      className="relative flex flex-col"
      style={{ background: COLORS.card, borderRadius: 20, padding: "12px 12px 14px 14px", gap: 10, boxShadow: CARD_SHADOW }}
      initial={false}
      animate={{ opacity: blocked ? 0.55 : 1 }}
      transition={{ duration: DUR.fast }}
    >
      <CardRings radius={20} ring={isPending} ringRgb={HIGHLIGHT_RGB} highlighted={highlighted} glowRgb={HIGHLIGHT_RGB} />

      <div className="flex items-center" style={{ gap: 12 }}>
        <button type="button" onClick={onOpen} className="flex-1 min-w-0 flex items-center text-left" style={{ gap: 12 }} title={`Detail ${item.name}`}>
          <LetterAvatar name={item.name} status={status} />
          <span className="flex-1 min-w-0">
            <span className="block truncate" style={{ fontSize: 15, fontWeight: 600, color: COLORS.ink }}>
              {item.name}
            </span>
            <motion.span
              className="block truncate"
              initial={false}
              animate={{ color: STATUS_TEXT[status] }}
              transition={{ duration: DUR.fast }}
              style={{ fontSize: 12.5, marginTop: 1 }}
            >
              {stockStatusLine(shown, status)}
            </motion.span>
          </span>
        </button>

        {!isLevel && (
          <motion.div
            className="flex items-center shrink-0"
            initial={false}
            animate={{ backgroundColor: isPending ? COLORS.lowBg : COLORS.soft }}
            transition={{ duration: DUR.fast }}
            style={{ borderRadius: 999, padding: 2 }}
          >
            <button
              type="button"
              aria-label={`Kurangi ${item.name}`}
              onClick={() => canDec && onAdjust(-1)}
              className="flex items-center justify-center"
              style={{
                width: 40,
                height: 40,
                borderRadius: 999,
                border: "none",
                background: canDec ? "#FFFFFF" : "transparent",
                boxShadow: canDec ? "0 1px 4px rgba(43,42,37,0.12)" : "none",
                color: canDec ? COLORS.ink : "#B8B4A8",
              }}
            >
              <Minus size={16} strokeWidth={2.4} />
            </button>
            <div className="text-center" style={{ minWidth: 48, padding: "0 2px" }}>
              <motion.span
                style={{ display: "inline-block", fontWeight: 700, fontSize: 17 }}
                initial={false}
                animate={{ color: isPending ? STATUS_TEXT.low : COLORS.ink }}
                transition={{ duration: DUR.fast }}
              >
                <RollingNumber value={fmtQty(displayQty)} />
              </motion.span>
              <span className="ml-1" style={{ color: COLORS.inkSoft, fontSize: 11.5 }}>
                {item.unit}
              </span>
            </div>
            <button
              type="button"
              aria-label={`Tambah ${item.name}`}
              onClick={() => onAdjust(1)}
              className="flex items-center justify-center"
              style={{ width: 40, height: 40, borderRadius: 999, border: "none", background: "#FFFFFF", boxShadow: "0 1px 4px rgba(43,42,37,0.12)", color: COLORS.ink }}
            >
              <Plus size={16} strokeWidth={2.4} />
            </button>
          </motion.div>
        )}
      </div>

      {isLevel ? (
        <LevelBattery level={displayLevel} onChange={onLevelChange} label={`Sisa ${item.name}`} />
      ) : (
        min > 0 && <Gauge qty={displayQty} min={min} status={status} />
      )}

      <Collapse open={isPending}>
        <div className="flex items-center" style={{ gap: 6, background: "#FDF4EA", borderRadius: 14, padding: "4px 4px 4px 12px" }}>
          <div className="flex-1 min-w-0" style={{ color: "#7A4514", lineHeight: 1.2 }}>
            <div style={{ fontSize: 11.5, opacity: 0.8 }}>Belum disimpan</div>
            <div className="truncate" style={{ fontSize: 13.5, fontWeight: 600 }}>
              {pendingText}
            </div>
          </div>
          <button
            type="button"
            onClick={onCancelPending}
            style={{ height: 40, padding: "0 10px", borderRadius: 12, border: "none", background: "transparent", color: "#7A4514", fontSize: 13, fontWeight: 500 }}
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirmPending}
            className="flex items-center"
            style={{ height: 40, padding: "0 16px", borderRadius: 12, border: "none", background: COLORS.safe, color: "#FFFFFF", fontSize: 13.5, fontWeight: 600, gap: 6 }}
          >
            <Check size={16} strokeWidth={2.6} />
            Simpan
          </button>
        </div>
      </Collapse>
    </motion.div>
  );
}

// Sentuh kartu → detail barang.
function ItemDetailSheet({ item, activeEntry, onClose, onEdit, onDelete, onAddToBuy }) {
  const status = statusOf(item);
  const isLevel = item.type === "level";
  const min = Number(item.minQty) || 0;
  const qty = Number(item.qty) || 0;
  let gaugeNote = "";
  if (!isLevel && min > 0) {
    if (qty < min) gaugeNote = `Kurang ${fmtQty(min - qty)} ${item.unit} dari batas minimum`;
    else if (qty === min) gaugeNote = "Pas di batas minimum — sebaiknya dibeli";
    else gaugeNote = `${fmtQty(qty - min)} ${item.unit} di atas minimum`;
  }

  return (
    <Sheet onClose={onClose} font={APP_FONT} color={COLORS.ink}>
      <div className="flex flex-col" style={{ gap: 16 }}>
        <div className="flex items-center" style={{ gap: 14 }}>
          <LetterAvatar name={item.name} status={status} size={52} radius={17} fontSize={24} />
          <div className="flex-1 min-w-0">
            <div className="truncate" style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 700, fontSize: 24, lineHeight: 1.1 }}>
              {item.name}
            </div>
            <div style={{ fontSize: 13, color: STATUS_TEXT[status], marginTop: 2 }}>{STATUS_META[status].label}</div>
          </div>
          <button
            type="button"
            aria-label="Tutup"
            title="Tutup"
            onClick={onClose}
            className="flex items-center justify-center shrink-0"
            style={{ width: 44, height: 44, borderRadius: 999, border: "none", background: COLORS.soft, color: COLORS.inkSoft }}
          >
            <X size={17} strokeWidth={2.2} />
          </button>
        </div>

        {isLevel ? (
          <div>
            <div style={{ fontSize: 12, color: COLORS.inkSoft, marginBottom: 6 }}>Sisa sekarang</div>
            <LevelBattery level={item.level} readOnly label={`Sisa ${item.name}`} />
          </div>
        ) : (
          <>
            <div className="grid" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
              <div style={{ background: COLORS.soft, borderRadius: 16, padding: "12px 14px" }}>
                <div style={{ fontSize: 12, color: COLORS.inkSoft }}>Sisa sekarang</div>
                <div style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>
                  {fmtQty(qty)} <span style={{ fontSize: 13, fontWeight: 500, color: COLORS.inkSoft }}>{item.unit}</span>
                </div>
              </div>
              <div style={{ background: COLORS.soft, borderRadius: 16, padding: "12px 14px" }}>
                <div style={{ fontSize: 12, color: COLORS.inkSoft }}>Batas minimum</div>
                <div style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>
                  {min > 0 ? fmtQty(min) : "–"} {min > 0 && <span style={{ fontSize: 13, fontWeight: 500, color: COLORS.inkSoft }}>{item.unit}</span>}
                </div>
              </div>
            </div>
            {min > 0 && (
              <div>
                <Gauge qty={qty} min={min} status={status} height={8} />
                <div className="flex justify-between" style={{ fontSize: 11.5, color: COLORS.inkSoft, marginTop: 6 }}>
                  <span>{gaugeNote}</span>
                  <span>min</span>
                </div>
              </div>
            )}
          </>
        )}

        <div className="flex flex-col" style={{ gap: 8, fontSize: 13, color: COLORS.inkSoft }}>
          <div className="flex items-center" style={{ gap: 8 }}>
            <Clock size={15} className="shrink-0" />
            <span className="truncate">
              Diperbarui {item.lastUpdatedBy || "?"} · {fmtDateTime(item.lastUpdatedAt)}
            </span>
          </div>
          {item.notes && (
            <div className="flex items-start" style={{ gap: 8 }}>
              <StickyNote size={15} className="shrink-0" style={{ marginTop: 2 }} />
              <span>{item.notes}</span>
            </div>
          )}
          {activeEntry ? (
            <div className="flex items-center" style={{ gap: 8, color: COLORS.iconBuyText }}>
              <ShoppingCart size={15} className="shrink-0" />
              <span>Sudah ada di Akan Dibeli{activeEntry.place ? ` · ${activeEntry.place}` : ""}</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={onAddToBuy}
              className="flex items-center self-start"
              style={{ gap: 8, height: 40, padding: "0 14px", marginLeft: -2, borderRadius: 12, border: `1px solid ${COLORS.border}`, background: "#FFFFFF", color: COLORS.navy, fontSize: 13.5, fontWeight: 600 }}
            >
              <ShoppingCart size={15} />
              Tambah ke Akan Dibeli
            </button>
          )}
        </div>

        <div className="flex flex-col" style={{ gap: 8, marginTop: 4 }}>
          <button
            type="button"
            onClick={onEdit}
            className="flex items-center justify-center"
            style={{ height: 48, borderRadius: 14, border: "none", background: COLORS.navy, color: "#FFFFFF", fontSize: 14.5, fontWeight: 600, gap: 8 }}
          >
            <Pencil size={16} />
            Edit barang
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="flex items-center justify-center"
            style={{ height: 48, borderRadius: 14, border: "none", background: COLORS.outBg, color: STATUS_TEXT.out, fontSize: 14.5, fontWeight: 600, gap: 8 }}
          >
            <Trash2 size={16} />
            Hapus
          </button>
        </div>
      </div>
    </Sheet>
  );
}

const QUICK_UNITS = ["pcs", "kg", "liter", "botol", "pack"];

function ItemFormModal({ mode, item, saving, onClose, onSubmit }) {
  const [type, setType] = useState(item?.type || "qty");
  const [name, setName] = useState(item?.name || "");
  const [qty, setQty] = useState(item && item.type !== "level" ? fmtQty(item.qty).replace(",", ".") : "1");
  const [unit, setUnit] = useState(item?.unit || "pcs");
  const [minQty, setMinQty] = useState(item && item.type !== "level" ? fmtQty(item.minQty || 0).replace(",", ".") : "1");
  const [level, setLevel] = useState(item?.level || "banyak");
  const [notes, setNotes] = useState(item?.notes || "");
  const [showNotes, setShowNotes] = useState(!!item?.notes);
  const [customUnit, setCustomUnit] = useState(!!item && item.type !== "level" && !QUICK_UNITS.includes(item.unit));
  const [unitTouched, setUnitTouched] = useState(false);
  const [error, setError] = useState("");

  const qtyNum = parseFloat(String(qty).replace(",", "."));
  const minNum = parseFloat(String(minQty).replace(",", "."));

  const submit = () => {
    if (!name.trim()) return setError("Nama barang wajib diisi.");
    if (type === "qty" && (!Number.isFinite(qtyNum) || qtyNum < 0)) return setError("Jumlah harus angka yang valid.");
    if (type === "qty" && String(minQty).trim() !== "" && (!Number.isFinite(minNum) || minNum < 0)) return setError("Batas minimum harus angka yang valid.");
    setError("");
    onSubmit(
      type === "level"
        ? { type, name, level, notes }
        : { type, name, qty: String(qtyNum), unit: unit || "pcs", minQty: String(minQty).trim() === "" ? "" : String(minNum), notes }
    );
  };

  const label = name.trim() || "barang ini";
  const info =
    type === "level"
      ? `Masuk otomatis ke Akan Dibeli kalau sisa ${label} tinggal Sedikit atau Habis.`
      : Number.isFinite(minNum) && minNum > 0
      ? `Masuk otomatis ke Akan Dibeli kalau sisa ${label} ${fmtQty(minNum)} ${unit || "pcs"} atau kurang.`
      : `Masuk otomatis ke Akan Dibeli kalau ${label} habis.`;

  const inputStyle = { height: 48, borderRadius: 14, border: `1.5px solid ${COLORS.border}`, padding: "0 14px", color: COLORS.ink, "--inp-focus": COLORS.navy, background: "#FFFFFF" };

  return (
    <Sheet onClose={onClose} font={APP_FONT} color={COLORS.ink}>
      <SheetHeader title={mode === "add" ? "Tambah barang" : "Edit barang"} onClose={onClose} closeBg={COLORS.soft} closeColor={COLORS.inkSoft} />

      <div className="flex flex-col" style={{ gap: 16 }}>
        <label className="flex flex-col" style={{ gap: 6 }}>
          <span style={{ fontSize: 12.5, fontWeight: 500, color: COLORS.inkSoft }}>Nama barang</span>
          <input autoFocus={mode === "add"} value={name} onChange={(e) => setName(e.target.value)} placeholder="mis. Beras" className="inp w-full" style={inputStyle} />
        </label>

        {mode === "add" && (
          <div>
            <FieldLabel color={COLORS.inkSoft}>Cara menghitung</FieldLabel>
            <Segmented
              ariaLabel="Cara menghitung"
              height={46}
              value={type}
              onChange={setType}
              activeBg={COLORS.navy}
              inkSoft={COLORS.inkSoft}
              trackBg={COLORS.soft}
              options={[
                { value: "qty", label: "Pakai jumlah", sub: "kg, pcs, liter…" },
                { value: "level", label: "Kira-kira", sub: "Banyak … Habis" },
              ]}
            />
          </div>
        )}

        <AutoHeight swapKey={type}>
          <FadeSwap swapKey={type}>
            {type === "level" ? (
              <div>
                <FieldLabel color={COLORS.inkSoft}>Sisa sekarang</FieldLabel>
                <LevelBattery level={level} onChange={setLevel} label="Sisa sekarang" />
              </div>
            ) : (
              <div className="flex flex-col" style={{ gap: 16 }}>
                <div className="flex" style={{ gap: 10 }}>
                  <div className="flex-1 min-w-0">
                    <FieldLabel color={COLORS.inkSoft}>Jumlah sekarang</FieldLabel>
                    <Stepper value={qty} onChange={setQty} ariaLabel="Jumlah" trackBg={COLORS.soft} ink={COLORS.ink} inkSoft={COLORS.inkSoft} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <FieldLabel color={COLORS.inkSoft}>Batas minimum</FieldLabel>
                    <Stepper value={minQty} onChange={setMinQty} ariaLabel="Minimum" trackBg={COLORS.soft} ink={COLORS.ink} inkSoft={COLORS.inkSoft} />
                  </div>
                </div>
                <div>
                  <FieldLabel color={COLORS.inkSoft}>Satuan</FieldLabel>
                  <div className="flex flex-wrap" style={{ gap: 6 }}>
                    {QUICK_UNITS.map((u) => (
                      <Chip
                        key={u}
                        active={!customUnit && unit === u}
                        onClick={() => {
                          setCustomUnit(false);
                          setUnit(u);
                        }}
                        activeBg={COLORS.navy}
                        ink={COLORS.ink}
                        inkSoft={COLORS.inkSoft}
                        border={COLORS.border}
                        style={{ padding: "0 12px" }}
                      >
                        {u}
                      </Chip>
                    ))}
                    <Chip
                      dashed={!customUnit}
                      active={customUnit}
                      onClick={() => {
                        if (!customUnit) {
                          setCustomUnit(true);
                          setUnitTouched(true);
                          if (QUICK_UNITS.includes(unit)) setUnit("");
                        }
                      }}
                      activeBg={COLORS.navy}
                      ink={COLORS.ink}
                      inkSoft={COLORS.inkSoft}
                      border={COLORS.border}
                      style={{ padding: "0 12px" }}
                    >
                      {customUnit && unit ? unit : "+ lainnya"}
                    </Chip>
                  </div>
                  <Collapse open={customUnit}>
                    <div style={{ paddingTop: 8 }}>
                      <input
                        autoFocus={unitTouched}
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        placeholder="mis. gram, sachet, rim"
                        aria-label="Satuan lain"
                        className="inp w-full"
                        style={{ ...inputStyle, height: 44 }}
                      />
                    </div>
                  </Collapse>
                </div>
              </div>
            )}
          </FadeSwap>
        </AutoHeight>

        <div className="flex items-center" style={{ gap: 10, background: "#F0F2F8", borderRadius: 14, padding: "12px 14px", fontSize: 12.5, color: COLORS.navyText, lineHeight: 1.4 }}>
          <ShoppingCart size={18} className="shrink-0" />
          <span>{info}</span>
        </div>

        <div>
          {!showNotes ? (
            <button type="button" onClick={() => setShowNotes(true)} style={{ height: 40, padding: "0 4px", border: "none", background: "transparent", color: COLORS.navy, fontSize: 13.5, fontWeight: 600 }}>
              + Tambah catatan
            </button>
          ) : null}
          <Collapse open={showNotes}>
            <div>
              <FieldLabel color={COLORS.inkSoft}>Catatan</FieldLabel>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="mis. merk favorit, dibeli di mana biasanya"
                rows={2}
                className="inp w-full resize-none"
                style={{ ...inputStyle, height: "auto", padding: "10px 14px" }}
              />
            </div>
          </Collapse>
        </div>

        <AnimatePresence initial={false}>
          {error && (
            <motion.div
              key="err"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: DUR.fast }}
              style={{ fontSize: 12.5, color: STATUS_TEXT.out, overflow: "hidden" }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="button"
          onClick={submit}
          disabled={saving}
          style={{ height: 52, borderRadius: 16, border: "none", background: COLORS.navy, color: "#FFFFFF", fontSize: 15, fontWeight: 600, opacity: saving ? 0.6 : 1 }}
        >
          {saving ? "Menyimpan..." : mode === "add" ? "Tambahkan ke stok" : "Simpan perubahan"}
        </button>
      </div>
    </Sheet>
  );
}

/* ---------------- Akan Dibeli page ---------------- */

// Baris yang baru dicentang/dibatalkan tetap tampil sebentar (±0,8 detik)
// dengan tanda centangnya, baru kemudian keluar dari daftar — supaya
// perubahannya terlihat, tidak hilang mendadak.
// Catatan: `list` harus array dari state (identitasnya stabil antar render),
// bukan hasil .filter() yang dibuat ulang tiap render.
function useRecentlyToggled(list, field) {
  const [prev, setPrev] = useState(list);
  const [ids, setIds] = useState([]);
  if (list !== prev) {
    const before = new Map(prev.map((e) => [e.id, !!e[field]]));
    const changed = list.filter((e) => before.has(e.id) && before.get(e.id) !== !!e[field]).map((e) => e.id);
    setPrev(list);
    if (changed.length) setIds((cur) => [...cur.filter((id) => !changed.includes(id)), ...changed]);
  }
  useEffect(() => {
    if (!ids.length) return;
    const t = setTimeout(() => setIds([]), 800);
    return () => clearTimeout(t);
  }, [ids]);
  return ids;
}

function toBuyMeta(entry, item) {
  const parts = [];
  const amount = entry.qty ? `${entry.qty}${entry.unit ? " " + entry.unit : ""}` : "";
  if (entry.bought) {
    parts.push(`${entry.boughtBy || "?"} · ${fmtClock(entry.boughtAt)}`);
    if (entry.applied && entry.applied.kind === "qty") parts.push(`stok +${fmtQty(entry.applied.amount)} ${item ? item.unit : entry.unit || ""}`.trim());
    else if (entry.applied && entry.applied.kind === "level") parts.push("stok jadi Banyak");
    else if (amount) parts.push(amount);
    return parts.join(" · ");
  }
  if (item) {
    parts.push(amount || "Jumlah belum diisi");
    if (item.type === "level") parts.push(`sisa ${(LEVEL_LABEL[item.level] || "").toLowerCase()}`);
    else parts.push(Number(item.qty) > 0 ? `stok sisa ${fmtQty(item.qty)} ${item.unit}` : "stok habis");
  } else {
    if (amount) parts.push(amount);
    if (entry.notes) parts.push(entry.notes);
  }
  return parts.join(" · ");
}

function ToBuyPage({ toBuy, items, places, search, setSearch, filter, setFilter, onBack, onEditEntry, onToggle, onOpenUserMenu, onSwitchApp, notifSlot, highlightId, onHighlightDone }) {
  const pendingCount = toBuy.filter((e) => !e.bought).length;
  const boughtCount = toBuy.filter((e) => e.bought).length;
  const lingering = useRecentlyToggled(toBuy, "bought");
  const itemMap = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = toBuy
      .filter((e) => (filter === "pending" ? !e.bought : e.bought) || lingering.includes(e.id))
      .filter((e) => e.itemName.toLowerCase().includes(q));

    if (filter === "pending") {
      // Dikelompokkan per tempat beli, urut sesuai daftar tempat; yang belum
      // punya tempat di paling bawah.
      const byPlace = new Map();
      list
        .slice()
        .sort((a, b) => new Date(a.addedAt) - new Date(b.addedAt))
        .forEach((e) => {
          const key = e.place || "";
          if (!byPlace.has(key)) byPlace.set(key, []);
          byPlace.get(key).push(e);
        });
      const order = (k) => {
        if (!k) return 1e6;
        const i = places.indexOf(k);
        return i === -1 ? 1e5 : i;
      };
      return [...byPlace.entries()]
        .sort((a, b) => order(a[0]) - order(b[0]) || a[0].localeCompare(b[0], "id"))
        .map(([k, rows]) => ({ key: `p-${k}`, title: k ? k.toUpperCase() : "TEMPAT BELUM DIPILIH", muted: !k, rows }));
    }

    // Sudah dibeli: per hari pembelian, terbaru di atas.
    const byDay = new Map();
    list
      .slice()
      .sort((a, b) => new Date(b.boughtAt || 0) - new Date(a.boughtAt || 0))
      .forEach((e) => {
        const key = e.boughtAt ? activityDayLabel(e.boughtAt) : "Baru saja";
        if (!byDay.has(key)) byDay.set(key, []);
        byDay.get(key).push(e);
      });
    return [...byDay.entries()].map(([k, rows]) => ({ key: `d-${k}`, title: k.toUpperCase(), muted: false, rows }));
  }, [toBuy, search, filter, places, lingering]);

  useEffect(() => {
    if (!highlightId) return;
    const t1 = setTimeout(() => {
      const el = document.getElementById(`tobuy-item-${highlightId}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    }, 320);
    const t2 = setTimeout(() => onHighlightDone && onHighlightDone(), 2000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightId]);

  const isEmpty = groups.length === 0;

  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 max-w-2xl mx-auto w-full px-4 pb-3" style={{ paddingTop: "env(safe-area-inset-top)", background: COLORS.bg }}>
        <TopBar title="Akan Dibeli" onBack={onBack} onOpenUserMenu={onOpenUserMenu} onSwitchApp={onSwitchApp} notifSlot={notifSlot} />

        <div className="grid gap-2 mb-3" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          <FilterTile group="tobuy" label="Perlu Dibeli" value={pendingCount} color={STATUS_TEXT.low} active={filter === "pending"} onClick={() => setFilter("pending")} />
          <FilterTile group="tobuy" label="Sudah Dibeli" value={boughtCount} color={COLORS.safe} active={filter === "bought"} onClick={() => setFilter("bought")} />
        </div>

        <div className="flex items-center gap-2.5" style={{ background: COLORS.card, borderRadius: 999, padding: "0 18px", height: 46, boxShadow: "0 2px 10px rgba(38,49,77,0.05)" }}>
          <Search size={18} color={COLORS.inkSoft} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari di daftar ini..."
            aria-label="Cari di daftar Akan Dibeli"
            className="flex-1 bg-transparent"
            style={{ color: COLORS.ink, outline: "none", border: "none" }}
          />
        </div>
      </div>

      <motion.div layoutScroll className="flex-1 overflow-y-auto" style={{ overscrollBehaviorY: "contain", WebkitOverflowScrolling: "touch" }}>
        <FadeSwap swapKey={filter} className="max-w-2xl mx-auto px-4 pt-1 pb-32">
          {isEmpty ? (
            <div className="py-14 text-center rounded-[20px]" style={{ background: COLORS.card, border: `1px dashed ${COLORS.border}` }}>
              <ShoppingCart size={26} color={COLORS.inkSoft} style={{ margin: "0 auto 8px" }} />
              <div style={{ color: COLORS.inkSoft }} className="text-sm">
                {filter === "pending" ? "Gak ada yang perlu dibeli." : "Belum ada yang dibeli."}
              </div>
            </div>
          ) : (
            <>
              <CollapseList spacing={16}>
                {groups.map((g) => (
                  <section key={g.key} className="flex flex-col" style={{ gap: 8 }}>
                    <div style={{ padding: "0 4px", fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", color: g.muted ? COLORS.inkSoft : COLORS.iconBuyText }}>
                      {g.title} · <RollingNumber value={g.rows.length} />
                    </div>
                    <div style={{ background: COLORS.card, borderRadius: 20, boxShadow: CARD_SHADOW }}>
                      <CollapseList>
                        {g.rows.map((e, i) => (
                          <ToBuyRow
                            key={e.id}
                            entry={e}
                            item={e.itemId ? itemMap.get(e.itemId) : null}
                            first={i === 0}
                            onToggle={() => onToggle(e.id)}
                            onOpen={() => onEditEntry(e)}
                            highlighted={e.id === highlightId}
                          />
                        ))}
                      </CollapseList>
                    </div>
                  </section>
                ))}
              </CollapseList>
              {filter === "pending" && (
                <div style={{ fontSize: 12, color: COLORS.inkSoft, padding: "0 4px", lineHeight: 1.5 }}>
                  Label <b style={{ color: STATUS_TEXT.low }}>Menipis</b>/<b style={{ color: STATUS_TEXT.out }}>Habis</b> = masuk otomatis dari stok.{" "}
                  <b style={{ color: COLORS.navyText }}>Nyetok</b> = kamu tambahkan sendiri dari daftar stok. Tanpa label = barang lain.
                </div>
              )}
            </>
          )}
        </FadeSwap>
      </motion.div>
    </div>
  );
}

function ToBuyChip({ entry, item }) {
  if (entry.bought || !item) return null;
  if (entry.source === "auto") {
    const s = statusOf(item);
    if (s === "safe") return null;
    return (
      <span className="shrink-0" style={{ fontSize: 11, fontWeight: 600, color: STATUS_TEXT[s], background: STATUS_META[s].bg, borderRadius: 999, padding: "4px 9px" }}>
        {STATUS_META[s].label}
      </span>
    );
  }
  return (
    <span className="shrink-0" style={{ fontSize: 11, fontWeight: 600, color: COLORS.navyText, background: COLORS.navySoft, borderRadius: 999, padding: "4px 9px" }}>
      Nyetok
    </span>
  );
}

function ToBuyRow({ entry, item, first, onToggle, onOpen, highlighted }) {
  return (
    <div id={`tobuy-item-${entry.id}`} className="relative">
      {!first && <div aria-hidden="true" style={{ height: 1, background: "#F1EEE5", marginLeft: 48 }} />}
      <div className="relative flex items-center" style={{ gap: 4, padding: "6px 12px 6px 4px" }}>
        <CardRings radius={16} highlighted={highlighted} glowRgb={HIGHLIGHT_RGB} />
        <CheckCircle
          hit
          checked={entry.bought}
          onClick={onToggle}
          size={24}
          borderWidth={2}
          color={COLORS.safe}
          borderColor="#D6D1C3"
          title={entry.bought ? `Batalkan ${entry.itemName} sudah dibeli` : `Tandai ${entry.itemName} sudah dibeli`}
        />
        <button type="button" onClick={onOpen} className="flex-1 min-w-0 flex items-center text-left" style={{ gap: 8, minHeight: 44 }}>
          <span className="flex-1 min-w-0">
            <motion.span
              className="block truncate"
              initial={false}
              animate={{ color: entry.bought ? COLORS.inkSoft : COLORS.ink }}
              transition={{ duration: DUR.fast }}
              style={{ fontSize: 15, fontWeight: 600, textDecoration: entry.bought ? "line-through" : "none", textDecorationColor: "#C9C4B6" }}
            >
              {entry.itemName}
            </motion.span>
            <span className="block truncate" style={{ fontSize: 12.5, color: COLORS.inkSoft, marginTop: 1 }}>
              {toBuyMeta(entry, item)}
            </span>
          </span>
          <ToBuyChip entry={entry} item={item} />
        </button>
      </div>
    </div>
  );
}

// Centang barang berjumlah → isi berapa yang dibeli, stok langsung bertambah.
function BuySheet({ entry, item, onClose, onConfirm }) {
  const initial = parseFloat(String(entry.qty || "").replace(",", "."));
  const [amount, setAmount] = useState(Number.isFinite(initial) && initial > 0 ? String(initial) : "1");
  const [saving, setSaving] = useState(false);
  const amt = parseFloat(String(amount).replace(",", "."));
  const valid = Number.isFinite(amt) && amt > 0;
  const now = Number(item.qty) || 0;
  const after = roundQty(now + (valid ? amt : 0));
  const min = Number(item.minQty) || 0;
  const nowStatus = statusOf(item);
  const afterStatus = statusOf({ ...item, qty: after });

  let note = "";
  let noteColor = COLORS.safe;
  if (min > 0 && afterStatus === "safe") note = `Di atas minimum ${fmtQty(min)} ${item.unit} — ${item.name} kembali aman.`;
  else if (min > 0) {
    note = `Masih di batas minimum ${fmtQty(min)} ${item.unit} — ${item.name} akan masuk lagi ke Akan Dibeli.`;
    noteColor = STATUS_TEXT.low;
  } else if (afterStatus === "safe") note = `${item.name} kembali tersedia.`;

  const confirm = async () => {
    if (!valid || saving) return;
    setSaving(true);
    await onConfirm(amt);
  };

  return (
    <Sheet onClose={onClose} font={APP_FONT} color={COLORS.ink}>
      <div className="flex flex-col" style={{ gap: 18 }}>
        <div className="flex items-center" style={{ gap: 12 }}>
          <div className="flex items-center justify-center shrink-0" style={{ width: 44, height: 44, borderRadius: 999, background: COLORS.safeBg, color: COLORS.safe }}>
            <Check size={20} strokeWidth={2.6} />
          </div>
          <div className="min-w-0">
            <div className="truncate" style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 700, fontSize: 22, lineHeight: 1.1 }}>
              {item.name} sudah dibeli
            </div>
            <div style={{ fontSize: 13, color: COLORS.inkSoft, marginTop: 2 }}>Berapa yang dibeli?</div>
          </div>
        </div>

        <Stepper
          size="lg"
          value={amount}
          onChange={setAmount}
          min={0}
          unit={item.unit}
          ariaLabel="Jumlah dibeli"
          trackBg={COLORS.soft}
          ink={COLORS.ink}
          inkSoft={COLORS.inkSoft}
          numberStyle={{ fontFamily: "'Baloo 2', cursive", lineHeight: 1.1 }}
        />

        <div>
          <div className="flex items-center" style={{ gap: 12, border: `1px solid ${COLORS.border}`, borderRadius: 18, padding: "14px 16px" }}>
            <div className="flex-1">
              <div style={{ fontSize: 12, color: COLORS.inkSoft }}>Stok sekarang</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: STATUS_TEXT[nowStatus] }}>
                {fmtQty(now)} {item.unit}
              </div>
            </div>
            <ChevronRight size={18} color={COLORS.inkSoft} />
            <div className="flex-1 text-right">
              <div style={{ fontSize: 12, color: COLORS.inkSoft }}>Setelah dibeli</div>
              <motion.div
                initial={false}
                animate={{ color: STATUS_TEXT[afterStatus] }}
                transition={{ duration: DUR.fast }}
                style={{ fontSize: 18, fontWeight: 700 }}
              >
                <RollingNumber value={fmtQty(after)} /> {item.unit}
              </motion.div>
            </div>
          </div>
          {note && (
            <FadeSwap swapKey={noteColor}>
              <div style={{ fontSize: 12.5, color: noteColor, padding: "8px 4px 0" }}>{note}</div>
            </FadeSwap>
          )}
        </div>

        <div className="flex" style={{ gap: 8 }}>
          <button
            type="button"
            onClick={onClose}
            style={{ flex: 1, height: 50, borderRadius: 14, border: `1px solid ${COLORS.border}`, background: "#FFFFFF", color: COLORS.ink, fontSize: 14.5, fontWeight: 500 }}
          >
            Batal
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={!valid || saving}
            style={{ flex: 2, height: 50, borderRadius: 14, border: "none", background: COLORS.safe, color: "#FFFFFF", fontSize: 14.5, fontWeight: 600, opacity: valid ? 1 : 0.5 }}
          >
            Simpan & tambah stok
          </button>
        </div>
      </div>
    </Sheet>
  );
}

function ToBuyFormModal({ mode, entry, items, toBuy, preselectItemId, places, onAddPlace, onDeletePlace, onClose, onSubmit, onDelete }) {
  const linkedItem = entry && entry.itemId ? items.find((i) => i.id === entry.itemId) : null;
  const [source, setSource] = useState(() => {
    if (mode === "edit") return entry && entry.itemId ? "stok" : "lain";
    if (preselectItemId) return "stok";
    return items.length > 0 ? "stok" : "lain";
  });
  const [pickedId, setPickedId] = useState(preselectItemId || null);
  const [query, setQuery] = useState("");
  const [name, setName] = useState(entry?.itemName || "");
  const [qty, setQty] = useState(entry?.qty || "");
  const [unit, setUnit] = useState(entry?.unit || "");
  const [place, setPlace] = useState(entry?.place || "");
  const [notes, setNotes] = useState(entry?.notes || "");
  const [showNotes, setShowNotes] = useState(!!entry?.notes);
  const [addingPlace, setAddingPlace] = useState(false);
  const [placeDraft, setPlaceDraft] = useState("");
  const [error, setError] = useState("");

  const activeIds = useMemo(() => new Set(toBuy.filter((e) => !e.bought && e.itemId).map((e) => e.itemId)), [toBuy]);
  const picked = source === "stok" ? (mode === "edit" ? linkedItem : items.find((i) => i.id === pickedId)) : null;

  const stockList = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rank = { out: 0, low: 1, safe: 2 };
    return items
      .filter((i) => i.name.toLowerCase().includes(q))
      .slice()
      .sort((a, b) => {
        const la = activeIds.has(a.id) ? 1 : 0;
        const lb = activeIds.has(b.id) ? 1 : 0;
        if (la !== lb) return la - lb;
        const sa = rank[statusOf(a)];
        const sb = rank[statusOf(b)];
        if (sa !== sb) return sa - sb;
        return a.name.localeCompare(b.name, "id");
      });
  }, [items, query, activeIds]);

  const submit = () => {
    if (mode === "add" && source === "stok" && !picked) return setError("Pilih barang dari daftar stok dulu.");
    if ((mode === "add" && source === "lain" && !name.trim()) || (mode === "edit" && !entry.itemId && !name.trim())) return setError("Nama barang wajib diisi.");
    setError("");
    onSubmit({
      itemId: mode === "add" && source === "stok" ? picked.id : undefined,
      name: source === "stok" && picked ? picked.name : name,
      qty: String(qty).trim(),
      unit: source === "stok" && picked ? (picked.type === "qty" ? picked.unit : unit) : unit,
      place,
      notes,
    });
  };

  const saveCustomPlace = async () => {
    const saved = await onAddPlace(placeDraft);
    if (saved) setPlace(saved);
    setPlaceDraft("");
    setAddingPlace(false);
  };

  const inputStyle = { height: 46, borderRadius: 14, border: `1.5px solid ${COLORS.border}`, padding: "0 14px", color: COLORS.ink, "--inp-focus": COLORS.navy, background: "#FFFFFF" };
  const pickedUnit = picked && picked.type === "qty" ? picked.unit : null;

  return (
    <Sheet onClose={onClose} font={APP_FONT} color={COLORS.ink}>
      <SheetHeader title={mode === "add" ? "Tambah ke Akan Dibeli" : "Edit item beli"} onClose={onClose} closeBg={COLORS.soft} closeColor={COLORS.inkSoft} />

      <div className="flex flex-col" style={{ gap: 14 }}>
        {mode === "add" ? (
          <Segmented
            ariaLabel="Sumber barang"
            height={42}
            fontSize={13.5}
            value={source}
            onChange={(v) => {
              setSource(v);
              setError("");
            }}
            activeBg={COLORS.navy}
            inkSoft={COLORS.inkSoft}
            trackBg={COLORS.soft}
            options={[
              { value: "stok", label: "Dari daftar stok" },
              { value: "lain", label: "Barang lain" },
            ]}
          />
        ) : (
          <div className="flex items-center" style={{ gap: 10 }}>
            {linkedItem ? (
              <>
                <LetterAvatar name={linkedItem.name} status={statusOf(linkedItem)} />
                <div className="flex-1 min-w-0">
                  <div className="truncate" style={{ fontSize: 15, fontWeight: 600 }}>
                    {linkedItem.name}
                  </div>
                  <div style={{ fontSize: 12.5, color: COLORS.inkSoft }}>Terhubung ke daftar stok</div>
                </div>
              </>
            ) : (
              <label className="flex flex-col flex-1" style={{ gap: 6 }}>
                <span style={{ fontSize: 12.5, fontWeight: 500, color: COLORS.inkSoft }}>Nama barang</span>
                <input value={name} onChange={(e) => setName(e.target.value)} className="inp w-full" style={inputStyle} />
              </label>
            )}
          </div>
        )}

        {mode === "add" && (
          <AutoHeight swapKey={source}>
            <FadeSwap swapKey={source}>
              {source === "stok" ? (
                <div className="flex flex-col" style={{ gap: 10 }}>
                  <label className="flex items-center" style={{ gap: 10, background: COLORS.soft, borderRadius: 14, padding: "0 14px", height: 44, color: COLORS.inkSoft }}>
                    <Search size={16} />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Cari barang stok..."
                      aria-label="Cari barang stok"
                      className="flex-1 bg-transparent"
                      style={{ border: "none", outline: "none", color: COLORS.ink }}
                    />
                  </label>
                  <div className="overflow-y-auto" style={{ maxHeight: 232, border: "1px solid #EFECE3", borderRadius: 16, overscrollBehavior: "contain" }}>
                    {stockList.length === 0 ? (
                      <div style={{ padding: "18px 14px", fontSize: 13, color: COLORS.inkSoft, textAlign: "center" }}>
                        {items.length === 0 ? "Daftar stok masih kosong." : "Tidak ada yang cocok."}
                      </div>
                    ) : (
                      stockList.map((it, i) => {
                        const listed = activeIds.has(it.id);
                        const selected = pickedId === it.id;
                        const s = statusOf(it);
                        const sub =
                          (it.type === "level" ? LEVEL_LABEL[it.level] : `Sisa ${fmtQty(it.qty)} ${it.unit}`) +
                          " · " +
                          (listed ? "sudah ada di Akan Dibeli" : STATUS_META[s].label);
                        return (
                          <React.Fragment key={it.id}>
                            {i > 0 && <div aria-hidden="true" style={{ height: 1, background: "#F1EEE5" }} />}
                            <motion.button
                              type="button"
                              disabled={listed}
                              onClick={() => {
                                setPickedId(it.id);
                                setError("");
                                if (it.type === "qty") setUnit(it.unit);
                              }}
                              className="no-tx w-full flex items-center text-left"
                              initial={false}
                              animate={{ backgroundColor: selected ? "#F0F2F8" : "#FFFFFF" }}
                              transition={{ duration: DUR.fast }}
                              style={{ gap: 12, padding: "10px 14px", border: "none", opacity: listed ? 0.55 : 1, minHeight: 52 }}
                            >
                              <span className="flex-1 min-w-0">
                                <span className="block truncate" style={{ fontSize: 14.5, fontWeight: 600, color: COLORS.ink }}>
                                  {it.name}
                                </span>
                                <span className="block truncate" style={{ fontSize: 12, color: listed ? COLORS.inkSoft : s === "safe" ? COLORS.inkSoft : STATUS_TEXT[s] }}>
                                  {sub}
                                </span>
                              </span>
                              <motion.span
                                className="flex items-center justify-center shrink-0"
                                initial={false}
                                animate={{ opacity: selected ? 1 : 0, scale: selected ? 1 : 0.6 }}
                                transition={SPRING.press}
                                style={{ width: 24, height: 24, borderRadius: 999, background: COLORS.navy, color: "#FFFFFF" }}
                              >
                                <Check size={14} strokeWidth={3} />
                              </motion.span>
                            </motion.button>
                          </React.Fragment>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : (
                <label className="flex flex-col" style={{ gap: 6 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 500, color: COLORS.inkSoft }}>Nama barang</span>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="mis. Lampu bohlam" className="inp w-full" style={inputStyle} />
                </label>
              )}
            </FadeSwap>
          </AutoHeight>
        )}

        <div className="flex" style={{ gap: 10 }}>
          <label className="flex flex-col flex-1 min-w-0" style={{ gap: 6 }}>
            <span style={{ fontSize: 12.5, fontWeight: 500, color: COLORS.inkSoft }}>Jumlah</span>
            <div className="relative">
              <input
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                inputMode={pickedUnit ? "decimal" : "text"}
                placeholder={pickedUnit ? "mis. 2" : "mis. 2"}
                className="inp w-full"
                style={{ ...inputStyle, paddingRight: pickedUnit ? 56 : 14 }}
              />
              {pickedUnit && (
                <span className="absolute pointer-events-none" style={{ right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: COLORS.inkSoft }}>
                  {pickedUnit}
                </span>
              )}
            </div>
          </label>
          {!pickedUnit && (
            <label className="flex flex-col flex-1 min-w-0" style={{ gap: 6 }}>
              <span style={{ fontSize: 12.5, fontWeight: 500, color: COLORS.inkSoft }}>Satuan</span>
              <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="mis. pack" className="inp w-full" style={inputStyle} />
            </label>
          )}
        </div>

        <div>
          <FieldLabel color={COLORS.inkSoft}>Tempat beli</FieldLabel>
          <div className="flex flex-wrap" style={{ gap: 6 }}>
            {places.map((p) => (
              <div key={p} className="relative">
                <Chip active={place === p} onClick={() => setPlace(place === p ? "" : p)} activeBg={COLORS.navy} ink={COLORS.ink} inkSoft={COLORS.inkSoft} border={COLORS.border}>
                  {p}
                </Chip>
                {!DEFAULT_PLACES.includes(p) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (place === p) setPlace("");
                      onDeletePlace(p);
                    }}
                    className="absolute flex items-center justify-center"
                    style={{ top: -6, right: -6, width: 20, height: 20, borderRadius: 999, border: "2px solid #FFFFFF", background: COLORS.out, color: "#FFFFFF" }}
                    title={`Hapus ${p} dari daftar tempat`}
                    aria-label={`Hapus ${p} dari daftar tempat`}
                  >
                    <X size={10} strokeWidth={3} />
                  </button>
                )}
              </div>
            ))}
            {!addingPlace && (
              <Chip dashed onClick={() => setAddingPlace(true)} ink={COLORS.ink} inkSoft={COLORS.inkSoft} border={COLORS.border}>
                + Tambah tempat
              </Chip>
            )}
          </div>
          <Collapse open={addingPlace}>
            <div className="flex" style={{ gap: 8, paddingTop: 8 }}>
              <input
                autoFocus
                value={placeDraft}
                onChange={(e) => setPlaceDraft(e.target.value)}
                placeholder="mis. Superindo"
                className="inp flex-1 min-w-0"
                style={{ ...inputStyle, height: 44 }}
                onKeyDown={(e) => e.key === "Enter" && saveCustomPlace()}
              />
              <button type="button" onClick={saveCustomPlace} style={{ height: 44, padding: "0 16px", borderRadius: 14, border: "none", background: COLORS.navy, color: "#FFFFFF", fontSize: 13.5, fontWeight: 600 }}>
                Simpan
              </button>
            </div>
          </Collapse>
        </div>

        <div>
          {!showNotes && (
            <button type="button" onClick={() => setShowNotes(true)} style={{ height: 40, padding: "0 4px", border: "none", background: "transparent", color: COLORS.navy, fontSize: 13.5, fontWeight: 600 }}>
              + Tambah catatan
            </button>
          )}
          <Collapse open={showNotes}>
            <div>
              <FieldLabel color={COLORS.inkSoft}>Catatan</FieldLabel>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="mis. warna/varian tertentu"
                rows={2}
                className="inp w-full resize-none"
                style={{ ...inputStyle, height: "auto", padding: "10px 14px" }}
              />
            </div>
          </Collapse>
        </div>

        <AnimatePresence initial={false}>
          {error && (
            <motion.div
              key="err"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: DUR.fast }}
              style={{ fontSize: 12.5, color: STATUS_TEXT.out, overflow: "hidden" }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col" style={{ gap: 8 }}>
          <button type="button" onClick={submit} style={{ height: 50, borderRadius: 14, border: "none", background: COLORS.navy, color: "#FFFFFF", fontSize: 14.5, fontWeight: 600 }}>
            {mode === "add" ? "Tambahkan" : "Simpan perubahan"}
          </button>
          {mode === "edit" && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="flex items-center justify-center"
              style={{ height: 46, borderRadius: 14, border: "none", background: COLORS.outBg, color: STATUS_TEXT.out, fontSize: 14, fontWeight: 600, gap: 8 }}
            >
              <Trash2 size={15} />
              Hapus dari daftar
            </button>
          )}
        </div>
      </div>
    </Sheet>
  );
}

/* ---------------- Agenda Rumah page ---------------- */

// Kartu filter Agenda — komponen bersama dengan warna teal.
function AgendaTile(props) {
  return <Tile activeBg={AG.primary} inkSoft={AG.muted} shadowRgb="23,64,61" {...props} />;
}

const AG_CARD_SHADOW = "0 1px 2px rgba(23,64,61,0.04), 0 6px 18px rgba(23,64,61,0.05)";

function fmtShortDay(dateStr) {
  if (!dateStr) return "";
  try {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" });
  } catch {
    return dateStr;
  }
}

function recurLabel(r) {
  if (!r) return "";
  if (r.every === 1) return r.unit === "bulan" ? "Bulanan" : "Mingguan";
  return `Tiap ${r.every} ${r.unit === "bulan" ? "bln" : "mgg"}`;
}

// Satu baris keterangan tanggal untuk tugas, lengkap dengan warnanya.
function taskLine(task, threshold) {
  if (task.done) return { text: `Selesai · ${task.doneBy || "?"} · ${fmtDateTime(task.doneAt)}`, color: AG.safe };
  if (task.deadline) {
    const diff = daysUntil(task.deadline);
    if (diff < 0) return { text: `Terlambat ${Math.abs(diff)} hari · deadline ${fmtShortDay(task.deadline)}`, color: AG.outText };
    if (diff === 0) return { text: "Deadline hari ini", color: AG.lowText };
    if (diff === 1) return { text: `Deadline besok · ${fmtShortDay(task.deadline)}`, color: AG.lowText };
    const soon = diff <= threshold;
    return { text: `Deadline ${fmtShortDay(task.deadline)} · ${diff} hari lagi`, color: soon ? AG.lowText : AG.muted };
  }
  if (task.planDate) {
    const diff = daysUntil(task.planDate);
    if (diff === 0) return { text: "Rencana hari ini", color: AG.primary };
    if (diff === 1) return { text: `Rencana besok · ${fmtShortDay(task.planDate)}`, color: AG.muted };
    if (diff < 0) return { text: `Rencana ${fmtShortDay(task.planDate)} (sudah lewat)`, color: AG.muted };
    return { text: `Rencana ${fmtShortDay(task.planDate)}`, color: AG.muted };
  }
  return { text: "Tanpa tanggal", color: AG.muted };
}

// Kelompok daftar: Terlambat → Minggu ini → Nanti → Tanpa tanggal.
function taskGroupKey(task) {
  const d = task.deadline ? daysUntil(task.deadline) : null;
  if (d != null && d < 0) return "overdue";
  const eff = d != null ? d : task.planDate ? daysUntil(task.planDate) : null;
  if (eff == null) return "none";
  return eff <= 6 ? "week" : "later";
}

const TASK_GROUPS = [
  { key: "overdue", title: "TERLAMBAT", color: "#B83A2E", danger: true },
  { key: "week", title: "MINGGU INI", color: "#A8650F" },
  { key: "later", title: "NANTI", color: "#6B716D" },
  { key: "none", title: "TANPA TANGGAL", color: "#6B716D" },
];

function taskSortValue(t) {
  const v = t.deadline || t.planDate;
  return v ? new Date(v + "T00:00:00").getTime() : Infinity;
}

function AgendaPage({ tasks, dueThreshold, search, setSearch, filter, setFilter, onAddTask, onOpenTask, onToggleDone, onOpenUserMenu, onSwitchApp, notifSlot, highlightId, onHighlightDone, morphIn }) {
  const SUBVIEWS = ["list", "calendar"];
  const [subView, setSubView] = useState("list"); // 'list' | 'calendar'
  const lingering = useRecentlyToggled(tasks, "done");

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

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const match = (t) => t.title.toLowerCase().includes(q);
    const byDate = (a, b) => taskSortValue(a) - taskSortValue(b) || a.title.localeCompare(b.title, "id");

    if (filter === "done") {
      const list = tasks
        .filter((t) => (t.done || lingering.includes(t.id)) && match(t))
        .sort((a, b) => new Date(b.doneAt || 0) - new Date(a.doneAt || 0));
      return list.length ? [{ key: "done", title: "SELESAI", color: AG.safe, rows: list }] : [];
    }

    const list = tasks.filter((t) => (!t.done || lingering.includes(t.id)) && match(t));
    if (filter === "soon" || filter === "overdue") {
      const rows = list.filter((t) => taskUrgency(t, dueThreshold) === filter || lingering.includes(t.id)).sort(byDate);
      return rows.length
        ? [{ key: filter, title: filter === "soon" ? "HAMPIR DEADLINE" : "TERLAMBAT", color: filter === "soon" ? AG.lowText : AG.outText, danger: filter === "overdue", rows }]
        : [];
    }

    return TASK_GROUPS.map((g) => ({ ...g, rows: list.filter((t) => taskGroupKey(t) === g.key).sort(byDate) })).filter((g) => g.rows.length > 0);
  }, [tasks, search, filter, dueThreshold, lingering]);

  useEffect(() => {
    if (!highlightId) return;
    // Sorotan selalu di tab List.
    setSubView("list");
    const t1 = setTimeout(() => {
      const el = document.getElementById(`agenda-item-${highlightId}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    }, 320);
    const t2 = setTimeout(() => onHighlightDone && onHighlightDone(), 2000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightId]);

  const barBtn = { width: 44, height: 44, borderRadius: 999, border: "none", background: "rgba(255,255,255,0.14)", color: "#FFFFFF" };

  return (
    <div className="h-full flex flex-col" style={{ color: AG.ink }}>
      <Backdrop color={AG.bg} />

      <div className="relative shrink-0 max-w-2xl mx-auto w-full px-4">
        {/* Bilah teal ringkas — lapisan warnanya berubah bentuk dari kartu
            di halaman awal, isinya menyusul. */}
        <HeroBar color={AG.primary} layoutId={morphId("agenda")} fadeIn={!morphIn} marginBottom={14}>
          <div className="flex items-center justify-between" style={{ gap: 10 }}>
            <div className="min-w-0">
              <div className="capitalize truncate" style={{ fontSize: 12.5, color: "rgba(255,255,255,0.72)" }}>
                {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </div>
              <h1 style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 700, fontSize: 26, lineHeight: 1.1, color: "#FFFFFF" }}>Agenda Rumah</h1>
            </div>
            <div className="flex items-center shrink-0" style={{ gap: 6 }}>
              {notifSlot}
              <button onClick={onSwitchApp} className="flex items-center justify-center" style={barBtn} title="Ganti aplikasi">
                <LayoutGrid size={18} />
              </button>
              <button onClick={onOpenUserMenu} className="flex items-center justify-center" style={barBtn} title="Menu">
                <Menu size={18} />
              </button>
            </div>
          </div>
        </HeroBar>
      </div>

      <Rise delay={0.12} className="relative flex-1 min-h-0">
        <TabPager index={SUBVIEWS.indexOf(subView)} onIndexChange={(i) => setSubView(SUBVIEWS[i])}>
          {/* Halaman List: penyaring & pencarian dikunci, daftar tergulir. */}
          <div className="h-full flex flex-col">
            <div className="shrink-0 max-w-2xl mx-auto w-full px-4 pb-3">
              <div className="grid gap-2 mb-3" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
                <AgendaTile group="agenda" label="Semua" value={counts.all} color={AG.primary} active={filter === "all"} onClick={() => setFilter("all")} />
                <AgendaTile group="agenda" label="Dekat" value={counts.soon} color={AG.lowText} active={filter === "soon"} onClick={() => setFilter("soon")} />
                <AgendaTile group="agenda" label="Terlambat" value={counts.overdue} color={AG.outText} active={filter === "overdue"} onClick={() => setFilter("overdue")} />
                <AgendaTile group="agenda" label="Selesai" value={counts.done} color={AG.safe} active={filter === "done"} onClick={() => setFilter("done")} />
              </div>

              <div className="flex items-center gap-2.5" style={{ background: AG.card, borderRadius: 999, padding: "0 18px", height: 46 }}>
                <Search size={18} color={AG.muted} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari tugas..."
                  aria-label="Cari tugas"
                  className="flex-1 bg-transparent"
                  style={{ color: AG.ink, outline: "none", border: "none" }}
                />
              </div>
            </div>

            <motion.div layoutScroll className="flex-1 overflow-y-auto" style={{ overscrollBehaviorY: "contain", WebkitOverflowScrolling: "touch" }}>
              <FadeSwap swapKey={filter} className="max-w-2xl mx-auto w-full px-4 pt-1 pb-32">
                {groups.length === 0 ? (
                  <div className="py-10 text-center" style={{ background: AG.card, borderRadius: 20, border: `1px dashed ${AG.border}`, marginBottom: 12 }}>
                    <ListTodo size={26} color={AG.muted} style={{ margin: "0 auto 8px" }} />
                    <div style={{ color: AG.muted }} className="text-sm">
                      {tasks.length === 0 ? "Belum ada tugas. Tekan + untuk menambahkan." : filter === "done" ? "Belum ada yang selesai." : "Gak ada tugas yang cocok."}
                    </div>
                  </div>
                ) : (
                  <CollapseList spacing={16}>
                    {groups.map((g) => (
                      <section key={g.key} className="flex flex-col" style={{ gap: 8 }}>
                        <div style={{ padding: "0 4px", fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", color: g.color }}>
                          {g.title} · <RollingNumber value={g.rows.length} />
                        </div>
                        <motion.div
                          initial={false}
                          animate={{ boxShadow: g.danger ? "0 0 0 1.5px #F3C9C2, 0 6px 18px rgba(185,58,46,0.08)" : AG_CARD_SHADOW }}
                          style={{ background: AG.card, borderRadius: 20 }}
                        >
                          <CollapseList>
                            {g.rows.map((t, i) => (
                              <TaskRow
                                key={t.id}
                                task={t}
                                threshold={dueThreshold}
                                first={i === 0}
                                onToggle={() => onToggleDone(t.id)}
                                onOpen={() => onOpenTask(t)}
                                highlighted={t.id === highlightId}
                              />
                            ))}
                          </CollapseList>
                        </motion.div>
                      </section>
                    ))}
                  </CollapseList>
                )}
              </FadeSwap>
            </motion.div>
          </div>

          {/* Halaman Kalender */}
          <motion.div layoutScroll className="h-full overflow-y-auto" style={{ overscrollBehaviorY: "contain", WebkitOverflowScrolling: "touch" }}>
            <div className="max-w-2xl mx-auto w-full px-4 pt-1 pb-32">
              <CalendarView tasks={tasks} dueThreshold={dueThreshold} lingering={lingering} onToggleDone={onToggleDone} onOpenTask={onOpenTask} onAddTask={onAddTask} />
            </div>
          </motion.div>
        </TabPager>
      </Rise>

      <NavBar
        id="agenda-nav"
        tabs={AGENDA_TABS}
        active={subView}
        onChange={setSubView}
        onAdd={() => onAddTask()}
        color={AG.primary}
        accent={AG.accent}
        shadowRgb="23,64,61"
        addTitle="Tambah tugas"
      />
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

const toDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function CalendarView({ tasks, dueThreshold, lingering = [], onToggleDone, onOpenTask, onAddTask }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [selectedDate, setSelectedDate] = useState(() => toDateStr(new Date()));
  // Arah pergantian bulan: 1 = maju (grid masuk dari kanan), -1 = mundur.
  const [monthDir, setMonthDir] = useState(1);
  const goMonth = (delta) => {
    setMonthDir(delta);
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
  };

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

  const goToday = () => {
    const t = new Date();
    const delta = (t.getFullYear() - year) * 12 + (t.getMonth() - month);
    if (delta !== 0) {
      setMonthDir(delta > 0 ? 1 : -1);
      setCursor(new Date(t.getFullYear(), t.getMonth(), 1));
    }
    setSelectedDate(todayStr);
  };

  // Ringkasan bulan yang sedang dilihat.
  const monthSummary = useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
    const seen = new Set();
    let late = 0;
    active.forEach((t) => {
      if ((t.planDate || "").startsWith(prefix) || (t.deadline || "").startsWith(prefix)) {
        seen.add(t.id);
        if ((t.deadline || "").startsWith(prefix) && daysUntil(t.deadline) < 0) late++;
      }
    });
    return { count: seen.size, late };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, year, month]);

  const selectedTasks = tasks
    .filter((t) => (!t.done || lingering.includes(t.id)) && (t.planDate === selectedDate || t.deadline === selectedDate))
    .sort((a, b) => a.title.localeCompare(b.title, "id"));

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

  const selectedLabel = new Date(selectedDate + "T00:00:00").toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short" });
  const totalSelected = selectedTasks.length + selectedProjected.length;

  return (
    <div>
      <div style={{ background: AG.card, borderRadius: 22, padding: "14px 12px 12px", boxShadow: AG_CARD_SHADOW }}>
        <div className="flex items-center justify-between" style={{ gap: 8, padding: "0 4px 10px" }}>
          <div className="min-w-0 capitalize whitespace-nowrap" style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 700, fontSize: 21, lineHeight: 1.1 }}>
            <RollingNumber value={monthLabel} />
          </div>
          <div className="flex items-center shrink-0" style={{ gap: 6 }}>
            <button
              type="button"
              onClick={goToday}
              style={{ height: 36, padding: "0 12px", borderRadius: 999, border: `1px solid ${AG.border}`, background: "#FFFFFF", fontSize: 12.5, fontWeight: 600, color: AG.primary }}
            >
              Hari ini
            </button>
            <button
              type="button"
              onClick={() => goMonth(-1)}
              className="flex items-center justify-center"
              style={{ width: 40, height: 40, borderRadius: 13, border: "none", background: AG.soft, color: AG.primary }}
              title="Bulan sebelumnya"
              aria-label="Bulan sebelumnya"
            >
              <ChevronLeft size={19} />
            </button>
            <button
              type="button"
              onClick={() => goMonth(1)}
              className="flex items-center justify-center"
              style={{ width: 40, height: 40, borderRadius: 13, border: "none", background: AG.primary, color: "#FFFFFF" }}
              title="Bulan berikutnya"
              aria-label="Bulan berikutnya"
            >
              <ChevronRight size={19} />
            </button>
          </div>
        </div>

        <div style={{ fontSize: 12, color: AG.muted, padding: "0 4px 12px", marginTop: -4 }}>
          <RollingNumber value={monthSummary.count} /> tugas bulan ini
          {monthSummary.late > 0 && <span style={{ color: AG.outText }}> · {monthSummary.late} terlambat</span>}
        </div>

        <div className="grid grid-cols-7" style={{ paddingBottom: 4 }}>
          {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((d, i) => (
            <div key={d} className="text-center uppercase" style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", color: i === 0 || i === 6 ? AG.outText : AG.muted }}>
              {d}
            </div>
          ))}
        </div>

        <div className="relative overflow-hidden">
          <AnimatePresence initial={false} mode="popLayout" custom={monthDir}>
            <motion.div
              key={`${year}-${month}`}
              className="grid grid-cols-7"
              style={{ gap: 3 }}
              custom={monthDir}
              variants={{
                enter: (d) => ({ x: d > 0 ? 36 : -36, opacity: 0 }),
                // Bulan baru masuk sedikit setelah bulan lama pergi, supaya
                // angka tanggal keduanya tidak sempat bertumpuk.
                center: { x: 0, opacity: 1, transition: { ...SPRING.snappy, opacity: { duration: DUR.fast, delay: 0.08 } } },
                exit: (d) => ({ x: d > 0 ? -36 : 36, opacity: 0, transition: { duration: 0.12, ease: EASE.in } }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
            >
              {cells.map((c, i) => {
                const info = c.inMonth ? dateMap[c.dateStr] : null;
                const isToday = c.dateStr === todayStr;
                const isSelected = c.inMonth && c.dateStr === selectedDate;
                const weekend = i % 7 === 0 || i % 7 === 6;
                const hasOverdue = !!info && info.deadline.some((t) => daysUntil(t.deadline) < 0);
                const hasPlan = !!info && info.plan.length > 0;
                const hasDeadline = !!info && info.deadline.length > 0;
                const hasAhead = !!info && ((info.planAhead || []).length > 0 || (info.deadlineAhead || []).length > 0);
                const numColor = !c.inMonth ? "#C9C5BA" : isSelected ? "#FFFFFF" : isToday ? AG.primary : hasOverdue || weekend ? AG.outText : AG.ink;
                return (
                  <button
                    key={c.dateStr}
                    type="button"
                    onClick={() => c.inMonth && setSelectedDate(c.dateStr)}
                    disabled={!c.inMonth}
                    aria-label={new Date(c.dateStr + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "long" })}
                    aria-pressed={isSelected}
                    className="no-tx relative flex flex-col items-center justify-center"
                    style={{
                      height: 46,
                      gap: 3,
                      padding: 0,
                      border: "none",
                      borderRadius: 14,
                      background: hasOverdue ? AG.outBg : "transparent",
                      boxShadow: isToday && !isSelected ? `inset 0 0 0 1.5px ${AG.primary}` : "none",
                    }}
                  >
                    {isSelected && (
                      <motion.span
                        layoutId={`cal-sel-${year}-${month}`}
                        className="absolute inset-0"
                        style={{ borderRadius: 14, background: AG.primary, boxShadow: "0 6px 14px -6px rgba(23,64,61,0.6)" }}
                        transition={SPRING.snappy}
                      />
                    )}
                    <motion.span
                      className="relative"
                      initial={false}
                      animate={{ color: numColor }}
                      transition={{ duration: DUR.fast }}
                      style={{ fontSize: 14.5, fontWeight: isSelected || isToday ? 700 : 500, lineHeight: 1 }}
                    >
                      {c.dayNum}
                    </motion.span>
                    <span className="relative flex" style={{ gap: 3, height: 5 }}>
                      {hasPlan && <span style={{ width: 5, height: 5, borderRadius: 99, background: isSelected ? "#FFFFFF" : AG.accent }} />}
                      {hasDeadline && <span style={{ width: 5, height: 5, borderRadius: 99, background: isSelected ? "#FFFFFF" : AG.outText }} />}
                      {hasAhead && (
                        <span style={{ width: 5, height: 5, borderRadius: 99, boxShadow: `inset 0 0 0 1.5px ${isSelected ? "#FFFFFF" : AG.primary}` }} />
                      )}
                    </span>
                  </button>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex flex-wrap items-center" style={{ gap: 14, marginTop: 10, padding: "10px 4px 0", borderTop: `1px solid ${AG.border}`, fontSize: 12, color: AG.muted }}>
          <span className="flex items-center" style={{ gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: 99, background: AG.accent }} />
            Rencana
          </span>
          <span className="flex items-center" style={{ gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: 99, background: AG.outText }} />
            Deadline
          </span>
          <span className="flex items-center" style={{ gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: 99, boxShadow: `inset 0 0 0 1.5px ${AG.primary}` }} />
            Berulang
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between" style={{ gap: 8, margin: "18px 4px 10px" }}>
        <div className="min-w-0">
          <div className="capitalize truncate" style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 700, fontSize: 18, lineHeight: 1.15 }}>
            <FadeSwap swapKey={selectedDate}>{selectedLabel}</FadeSwap>
          </div>
          <div style={{ fontSize: 12.5, color: AG.muted }}>
            <RollingNumber value={totalSelected} /> tugas
          </div>
        </div>
        <button
          type="button"
          onClick={() => onAddTask(selectedDate)}
          className="flex items-center shrink-0"
          style={{ gap: 6, height: 40, padding: "0 16px", borderRadius: 999, border: "none", background: AG.primary, color: "#FFFFFF", fontSize: 13, fontWeight: 600 }}
        >
          <Plus size={15} /> Tambah
        </button>
      </div>

      <FadeSwap swapKey={selectedDate}>
        {totalSelected === 0 ? (
          <div className="py-8 text-center" style={{ background: AG.card, borderRadius: 20, border: `1px dashed ${AG.border}`, color: AG.muted }}>
            <span className="text-sm">Gak ada tugas di tanggal ini.</span>
          </div>
        ) : (
          <div className="flex flex-col" style={{ gap: 12 }}>
            {selectedTasks.length > 0 && (
              <div style={{ background: AG.card, borderRadius: 20, boxShadow: AG_CARD_SHADOW }}>
                <CollapseList>
                  {selectedTasks.map((t, i) => (
                    <TaskRow key={t.id} task={t} threshold={dueThreshold} first={i === 0} onToggle={() => onToggleDone(t.id)} onOpen={() => onOpenTask(t)} />
                  ))}
                </CollapseList>
              </div>
            )}
            {selectedProjected.length > 0 && (
              <div className="flex flex-col" style={{ gap: 8 }}>
                <div style={{ padding: "0 4px", fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", color: AG.muted }}>JADWAL BERULANG BERIKUTNYA</div>
                <div style={{ background: AG.card, borderRadius: 20, border: `1px dashed ${AG.border}` }}>
                  {selectedProjected.map((t, i) => (
                    <ProjectedTaskRow key={`${t.id}-${t.occurrence}`} task={t} first={i === 0} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </FadeSwap>
    </div>
  );
}

// Baris jadwal berulang yang belum aktif. Sengaja tanpa tombol centang —
// jadwal ini baru benar-benar ada setelah jadwal sebelumnya diselesaikan,
// jadi di sini fungsinya cuma mengingatkan.
function ProjectedTaskRow({ task, first }) {
  return (
    <div>
      {!first && <div aria-hidden="true" style={{ height: 1, background: "#F0EDE5", marginLeft: 48 }} />}
      <div className="flex items-center" style={{ gap: 4, padding: "8px 14px 8px 4px", opacity: 0.85 }}>
        <span className="flex items-center justify-center shrink-0" style={{ width: 44, height: 44 }}>
          <span className="flex items-center justify-center" style={{ width: 24, height: 24, borderRadius: 999, border: `1.5px dashed ${AG.border}` }}>
            <Repeat size={11} color={AG.muted} />
          </span>
        </span>
        <div className="flex-1 min-w-0">
          <div className="truncate" style={{ fontSize: 15, fontWeight: 600, color: AG.muted }}>
            {task.title}
          </div>
          <div className="truncate" style={{ fontSize: 12.5, color: AG.muted, marginTop: 1 }}>
            Aktif setelah jadwal sebelumnya dicentang selesai
          </div>
        </div>
      </div>
    </div>
  );
}

function RecurChip({ recurrence }) {
  if (!recurrence) return null;
  return (
    <span className="flex items-center shrink-0" style={{ gap: 4, fontSize: 11, fontWeight: 600, color: AG.primary, background: AG.safeBg, borderRadius: 999, padding: "4px 9px" }}>
      <Repeat size={11} strokeWidth={2.4} />
      {recurLabel(recurrence)}
    </span>
  );
}

function TaskRow({ task, threshold, first, onToggle, onOpen, highlighted }) {
  const line = taskLine(task, threshold);
  return (
    <div id={`agenda-item-${task.id}`} className="relative">
      {!first && <div aria-hidden="true" style={{ height: 1, background: "#F0EDE5", marginLeft: 48 }} />}
      <div className="relative flex items-center" style={{ gap: 4, padding: "8px 14px 8px 4px" }}>
        <CardRings radius={16} highlighted={!!highlighted} glowRgb={HIGHLIGHT_RGB} />
        <CheckCircle
          hit
          checked={task.done}
          onClick={onToggle}
          size={24}
          borderWidth={2}
          color={AG.safe}
          borderColor="#D9D5CA"
          title={task.done ? `Batalkan ${task.title} selesai` : `Tandai ${task.title} selesai`}
        />
        <button type="button" onClick={onOpen} className="flex-1 min-w-0 flex items-center text-left" style={{ gap: 8, minHeight: 44 }}>
          <span className="flex-1 min-w-0">
            <motion.span
              className="block truncate"
              initial={false}
              animate={{ color: task.done ? AG.muted : AG.ink }}
              transition={{ duration: DUR.fast }}
              style={{ fontSize: 15, fontWeight: 600, textDecoration: task.done ? "line-through" : "none", textDecorationColor: "#C9C5BA" }}
            >
              {task.title}
            </motion.span>
            <span className="block truncate" style={{ fontSize: 12.5, color: line.color, marginTop: 1 }}>
              {line.text}
            </span>
          </span>
          <RecurChip recurrence={task.recurrence} />
        </button>
      </div>
    </div>
  );
}

// Sentuh tugas → detail, dengan aksi selesai / edit / hapus.
function TaskDetailSheet({ task, threshold, onClose, onToggle, onEdit, onDelete }) {
  const line = taskLine(task, threshold);
  const nextDate = task.recurrence ? advanceDate(task.planDate || task.deadline, task.recurrence.every, task.recurrence.unit) : "";
  const box = (label, dot, value, color) => (
    <div style={{ background: AG.soft, borderRadius: 16, padding: "12px 14px" }}>
      <div className="flex items-center" style={{ gap: 6, fontSize: 12, color: AG.muted }}>
        <span style={{ width: 7, height: 7, borderRadius: 99, background: dot }} />
        {label}
      </div>
      <div style={{ fontSize: 15.5, fontWeight: 700, marginTop: 3, color: color || AG.ink }}>{value}</div>
    </div>
  );
  const overdue = !task.done && task.deadline && daysUntil(task.deadline) < 0;

  return (
    <Sheet onClose={onClose} font={APP_FONT} color={AG.ink}>
      <div className="flex flex-col" style={{ gap: 16 }}>
        <div className="flex items-start" style={{ gap: 12 }}>
          <div className="flex-1 min-w-0">
            <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 700, fontSize: 23, lineHeight: 1.15 }}>{task.title}</div>
            <div style={{ fontSize: 13, color: line.color, marginTop: 3 }}>{line.text}</div>
          </div>
          <button
            type="button"
            aria-label="Tutup"
            title="Tutup"
            onClick={onClose}
            className="flex items-center justify-center shrink-0"
            style={{ width: 44, height: 44, borderRadius: 999, border: "none", background: AG.soft, color: AG.muted }}
          >
            <X size={17} strokeWidth={2.2} />
          </button>
        </div>

        <div className="grid" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
          {box("Rencana", AG.accent, task.planDate ? fmtShortDay(task.planDate) : "–")}
          {box("Deadline", AG.outText, task.deadline ? fmtShortDay(task.deadline) : "–", overdue ? AG.outText : undefined)}
        </div>

        <div className="flex flex-col" style={{ gap: 8, fontSize: 13, color: AG.muted }}>
          {task.recurrence && (
            <div className="flex items-center" style={{ gap: 8, color: AG.primary }}>
              <Repeat size={15} className="shrink-0" />
              <span>
                {recurLabel(task.recurrence)}
                {nextDate && !task.done ? ` · berikutnya ${fmtShortDay(nextDate)}` : ""}
              </span>
            </div>
          )}
          {task.notes && (
            <div className="flex items-start" style={{ gap: 8 }}>
              <StickyNote size={15} className="shrink-0" style={{ marginTop: 2 }} />
              <span style={{ color: AG.ink }}>{task.notes}</span>
            </div>
          )}
          <div className="flex items-center" style={{ gap: 8 }}>
            <Clock size={15} className="shrink-0" />
            <span className="truncate">
              Dibuat {task.createdBy || "?"} · {fmtDateTime(task.createdAt)}
            </span>
          </div>
        </div>

        <div className="flex flex-col" style={{ gap: 8, marginTop: 4 }}>
          <button
            type="button"
            onClick={onToggle}
            className="flex items-center justify-center"
            style={{
              height: 50,
              borderRadius: 14,
              border: task.done ? `1px solid ${AG.border}` : "none",
              background: task.done ? "#FFFFFF" : AG.primary,
              color: task.done ? AG.ink : "#FFFFFF",
              fontSize: 14.5,
              fontWeight: 600,
              gap: 8,
            }}
          >
            <Check size={17} strokeWidth={2.6} />
            {task.done ? "Batalkan selesai" : "Tandai selesai"}
          </button>
          <div className="flex" style={{ gap: 8 }}>
            <button
              type="button"
              onClick={onEdit}
              className="flex-1 flex items-center justify-center"
              style={{ height: 46, borderRadius: 14, border: "none", background: AG.safeBg, color: AG.primary, fontSize: 14, fontWeight: 600, gap: 8 }}
            >
              <Pencil size={15} />
              Edit
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="flex-1 flex items-center justify-center"
              style={{ height: 46, borderRadius: 14, border: "none", background: AG.outBg, color: AG.outText, fontSize: 14, fontWeight: 600, gap: 8 }}
            >
              <Trash2 size={15} />
              Hapus
            </button>
          </div>
        </div>
      </div>
    </Sheet>
  );
}

// Tanggal cepat untuk formulir tugas.
function addDaysStr(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}
function endOfWeekStr() {
  // Minggu (hari terakhir pekan). Kalau hari ini Minggu, ya hari ini.
  const d = new Date();
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7));
  return toDateStr(d);
}
function endOfMonthStr() {
  const d = new Date();
  return toDateStr(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

// Baris pilihan tanggal: chip cepat + "Pilih" (kalender bawaan HP).
function DateChips({ label, dotColor, labelColor, value, onChange, quick }) {
  const quickValues = quick.map((q) => q.value);
  const custom = value && !quickValues.includes(value);
  return (
    <div className="flex flex-col" style={{ gap: 8 }}>
      <div className="flex items-center" style={{ gap: 6, fontSize: 12.5, fontWeight: 600, color: labelColor }}>
        <span style={{ width: 7, height: 7, borderRadius: 99, background: dotColor }} />
        {label}
      </div>
      <div className="flex flex-wrap" style={{ gap: 6 }}>
        {quick.map((q) => (
          <Chip key={q.label} active={value === q.value} onClick={() => onChange(q.value)} height={38} activeBg={AG.primary} ink={AG.ink} inkSoft={AG.muted} border={AG.border} style={{ padding: "0 12px" }}>
            {q.label}
          </Chip>
        ))}
        {/* Kolom tanggal asli dibuat transparan menutupi chip, jadi sentuhan
            langsung membuka kalender bawaan HP di semua browser. */}
        <div className="relative">
          <Chip tabIndex={-1} ariaHidden active={custom} dashed={!custom} height={38} activeBg={AG.primary} ink={AG.ink} inkSoft={AG.muted} border={AG.border} style={{ padding: "0 12px", gap: 5 }}>
            <Calendar size={14} />
            {custom ? fmtShortDay(value) : "Pilih"}
          </Chip>
          <input
            type="date"
            aria-label={`Pilih tanggal ${label.toLowerCase()}`}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            onClick={(e) => {
              try {
                e.currentTarget.showPicker();
              } catch {
                /* browser lama: cukup fokus bawaan */
              }
            }}
            className="absolute inset-0"
            style={{ opacity: 0, width: "100%", height: "100%", cursor: "pointer" }}
          />
        </div>
      </div>
    </div>
  );
}

function TaskFormModal({ mode, task, initialDate, onClose, onSubmit }) {
  const [title, setTitle] = useState(task?.title || "");
  const [planDate, setPlanDate] = useState(task?.planDate || initialDate || "");
  const [deadline, setDeadline] = useState(task?.deadline || "");
  const [notes, setNotes] = useState(task?.notes || "");
  const [showNotes, setShowNotes] = useState(!!task?.notes);
  const r = task?.recurrence;
  const [recurMode, setRecurMode] = useState(() => {
    if (!r) return "none";
    if (r.every === 1) return r.unit === "bulan" ? "monthly" : "weekly";
    return "custom";
  });
  const [recurEvery, setRecurEvery] = useState(r && r.every > 1 ? String(r.every) : "2");
  const [recurUnit, setRecurUnit] = useState(r?.unit || "bulan");
  const [error, setError] = useState("");

  const recurrence =
    recurMode === "none"
      ? null
      : recurMode === "weekly"
      ? { every: 1, unit: "minggu" }
      : recurMode === "monthly"
      ? { every: 1, unit: "bulan" }
      : { every: Math.max(1, parseInt(recurEvery, 10) || 0), unit: recurUnit };

  const anchor = planDate || deadline;
  const nextDate = recurrence && anchor ? advanceDate(anchor, recurrence.every, recurrence.unit) : "";

  const submit = () => {
    if (!title.trim()) return setError("Judul tugas wajib diisi.");
    if (recurrence) {
      if (!planDate && !deadline) return setError("Tugas berulang butuh Rencana atau Deadline sebagai patokan.");
      if (recurMode === "custom" && !(parseInt(recurEvery, 10) >= 1)) return setError("Isi angka pengulangan yang valid (minimal 1).");
    }
    setError("");
    onSubmit({ title, planDate, deadline, notes, recurrence });
  };

  return (
    <Sheet onClose={onClose} font={APP_FONT} color={AG.ink}>
      <SheetHeader title={mode === "add" ? "Tugas baru" : "Edit tugas"} onClose={onClose} closeBg={AG.soft} closeColor={AG.muted} />

      <div className="flex flex-col" style={{ gap: 16 }}>
        <input
          autoFocus={mode === "add"}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Mau mengerjakan apa?"
          aria-label="Judul tugas"
          className="inp fs-17 w-full"
          style={{ height: 52, borderRadius: 14, border: `1.5px solid ${AG.border}`, padding: "0 14px", fontWeight: 600, color: AG.ink, "--inp-focus": AG.primary, background: "#FFFFFF" }}
        />

        <DateChips
          label="Rencana dikerjakan"
          dotColor={AG.accent}
          labelColor={AG.lowText}
          value={planDate}
          onChange={setPlanDate}
          quick={[
            { label: "Tidak ada", value: "" },
            { label: "Hari ini", value: addDaysStr(0) },
            { label: "Besok", value: addDaysStr(1) },
          ]}
        />

        <DateChips
          label="Deadline"
          dotColor={AG.outText}
          labelColor={AG.outText}
          value={deadline}
          onChange={setDeadline}
          quick={[
            { label: "Tidak ada", value: "" },
            { label: "Minggu ini", value: endOfWeekStr() },
            { label: "Akhir bulan", value: endOfMonthStr() },
          ]}
        />

        <div className="flex flex-col" style={{ gap: 8 }}>
          <div className="flex items-center" style={{ gap: 6, fontSize: 12.5, fontWeight: 600, color: AG.primary }}>
            <Repeat size={14} strokeWidth={2.2} />
            Ulangi
          </div>
          <Segmented
            ariaLabel="Ulangi tugas"
            value={recurMode}
            onChange={setRecurMode}
            activeBg={AG.primary}
            inkSoft={AG.muted}
            trackBg={AG.soft}
            fontSize={12.5}
            options={[
              { value: "none", label: "Tidak" },
              { value: "weekly", label: "Mingguan" },
              { value: "monthly", label: "Bulanan" },
              { value: "custom", label: recurMode === "custom" ? `Tiap ${Math.max(1, parseInt(recurEvery, 10) || 0)} ${recurUnit === "bulan" ? "bln" : "mgg"}` : "Kustom" },
            ]}
          />
          <Collapse open={recurMode === "custom"}>
            <div className="flex items-center" style={{ gap: 10, paddingTop: 4 }}>
              <span style={{ fontSize: 13, color: AG.muted }}>Tiap</span>
              <Stepper value={recurEvery} onChange={setRecurEvery} min={1} ariaLabel="Jarak ulang" trackBg={AG.soft} ink={AG.ink} inkSoft={AG.muted} style={{ width: 150 }} />
              <Segmented
                ariaLabel="Satuan ulang"
                value={recurUnit}
                onChange={setRecurUnit}
                activeBg={AG.primary}
                inkSoft={AG.muted}
                trackBg={AG.soft}
                height={44}
                style={{ flex: 1 }}
                options={[
                  { value: "minggu", label: "minggu" },
                  { value: "bulan", label: "bulan" },
                ]}
              />
            </div>
          </Collapse>
          <Collapse open={!!recurrence}>
            <div style={{ fontSize: 12, color: anchor ? AG.muted : AG.lowText, padding: "0 2px" }}>
              {anchor
                ? `Setelah dicentang selesai, jadwal berikutnya dibuat otomatis: ${fmtDate(nextDate)}.`
                : "Isi Rencana atau Deadline dulu sebagai patokan hitungnya."}
            </div>
          </Collapse>
        </div>

        <div>
          {!showNotes && (
            <button type="button" onClick={() => setShowNotes(true)} style={{ height: 40, padding: "0 4px", border: "none", background: "transparent", color: AG.primary, fontSize: 13.5, fontWeight: 600 }}>
              + Tambah catatan
            </button>
          )}
          <Collapse open={showNotes}>
            <div>
              <FieldLabel color={AG.muted}>Catatan</FieldLabel>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="mis. detail tambahan"
                rows={2}
                className="inp w-full resize-none"
                style={{ borderRadius: 14, border: `1.5px solid ${AG.border}`, padding: "10px 14px", color: AG.ink, "--inp-focus": AG.primary }}
              />
            </div>
          </Collapse>
        </div>

        <AnimatePresence initial={false}>
          {error && (
            <motion.div
              key="err"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: DUR.fast }}
              style={{ fontSize: 12.5, color: AG.outText, overflow: "hidden" }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <button type="button" onClick={submit} style={{ height: 52, borderRadius: 16, border: "none", background: AG.primary, color: "#FFFFFF", fontSize: 15, fontWeight: 600 }}>
          {mode === "add" ? "Tambahkan tugas" : "Simpan perubahan"}
        </button>
      </div>
    </Sheet>
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

// Jendela formulir Stok & Agenda — Sheet bersama dengan warna dan font
// aplikasi ini. Karena Sheet dirender lewat portal ke <body>, font dan warna
// teks harus diberikan di sini (tidak lagi mewarisi dari halaman).
function Overlay({ children, onClose }) {
  return (
    <Sheet onClose={onClose} background={COLORS.card} font={APP_FONT} color={COLORS.ink}>
      {children}
    </Sheet>
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
    <Drawer onClose={onClose} background={COLORS.bg} font={APP_FONT} color={COLORS.ink}>
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
        <Stagger className="flex flex-col">
          {groups.map((g, gi) => (
            <StaggerItem key={g.label}>
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
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </Drawer>
  );
}
