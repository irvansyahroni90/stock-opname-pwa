import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Plus,
  Trash2,
  Pencil,
  X,
  Search,
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Home,
  Receipt,
  Wallet,
  PieChart,
  Calendar,
  Menu,
  Check,
  Copy,
  Split,
  ChevronRight,
  LayoutGrid,
  LogOut,
  User,
  Tag,
  AlertTriangle,
  Utensils,
  Car,
  ShoppingBag,
  Zap,
  HeartPulse,
  GraduationCap,
  Gamepad2,
  Gift,
  Banknote,
  Briefcase,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Sparkles,
  ScanLine,
  Camera,
  MoreHorizontal,
  Landmark,
  Smartphone,
  CreditCard,
  Coins,
} from "lucide-react";
import { storageSet, storageSubscribe } from "./firebase";
import { scanReceipt, guessWallet, findDuplicate } from "./receiptScan";

const COLORS = {
  bg: "#F1EEE3",
  card: "#FFFFFF",
  ink: "#2B2A25",
  inkSoft: "#6B685F",
  primary: "#2F4A3C",
  primaryLight: "#6B8F71",
  accent: "#C98A3E",
  safe: "#3F7D5C",
  safeBg: "#E7F0EA",
  low: "#C98A3E",
  lowBg: "#FBF0DD",
  out: "#B5432E",
  outBg: "#FBE7E1",
  border: "#E4DFCF",
  iconAgendaBg: "#E7F0EA",
  iconAgendaFg: "#3F7D5C",
};

const TAB_ORDER = ["dashboard", "transactions", "wallets", "analysis"];

// --- Ikon yang bisa dipilih untuk kategori & dompet ----------------------
const CATEGORY_ICONS = {
  utensils: Utensils,
  car: Car,
  bag: ShoppingBag,
  zap: Zap,
  health: HeartPulse,
  school: GraduationCap,
  game: Gamepad2,
  gift: Gift,
  banknote: Banknote,
  briefcase: Briefcase,
  trending: TrendingUp,
  tag: Tag,
  other: MoreHorizontal,
};

const WALLET_ICONS = {
  cash: Coins,
  bank: Landmark,
  ewallet: Smartphone,
  card: CreditCard,
};

const CATEGORY_COLORS = ["#C98A3E", "#3F7D5C", "#B5432E", "#2F4A3C", "#6B8F71", "#8B6F47", "#5C7A99", "#9B5C8F"];

// Kategori & dompet bawaan — dipakai sekali saat pertama kali app dibuka.
const DEFAULT_CATEGORIES = [
  { id: "cat-makan", name: "Makan & Minum", kind: "expense", icon: "utensils", color: "#C98A3E" },
  { id: "cat-transport", name: "Transport", kind: "expense", icon: "car", color: "#5C7A99" },
  { id: "cat-belanja", name: "Belanja", kind: "expense", icon: "bag", color: "#9B5C8F" },
  { id: "cat-tagihan", name: "Tagihan", kind: "expense", icon: "zap", color: "#B5432E" },
  { id: "cat-kesehatan", name: "Kesehatan", kind: "expense", icon: "health", color: "#3F7D5C" },
  { id: "cat-pendidikan", name: "Pendidikan", kind: "expense", icon: "school", color: "#2F4A3C" },
  { id: "cat-hiburan", name: "Hiburan", kind: "expense", icon: "game", color: "#6B8F71" },
  { id: "cat-lain", name: "Lainnya", kind: "expense", icon: "other", color: "#8B6F47" },
  { id: "cat-gaji", name: "Gaji", kind: "income", icon: "briefcase", color: "#3F7D5C" },
  { id: "cat-bonus", name: "Bonus", kind: "income", icon: "gift", color: "#C98A3E" },
  { id: "cat-usaha", name: "Usaha", kind: "income", icon: "trending", color: "#2F4A3C" },
  { id: "cat-masuk-lain", name: "Pemasukan Lain", kind: "income", icon: "banknote", color: "#6B8F71" },
];

const DEFAULT_WALLETS = [
  { id: "wal-tunai", name: "Tunai", icon: "cash", color: "#3F7D5C", initialBalance: 0 },
];

// --- Util ---------------------------------------------------------------
function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function fmtRupiah(n) {
  const num = Number(n) || 0;
  return "Rp " + Math.round(num).toLocaleString("id-ID");
}

function fmtShortRupiah(n) {
  const num = Math.abs(Number(n) || 0);
  return Math.round(num).toLocaleString("id-ID");
}

function fmtDateTime(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) +
    ", " + d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(":", ".");
}

function dayLabel(iso) {
  const d = new Date(iso);
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today - day) / 86400000);
  if (diff === 0) return "Hari ini";
  if (diff === 1) return "Kemarin";
  if (diff > 0 && diff < 7) return `${diff} hari lalu`;
  return day.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: day.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

// Ubah ISO jadi nilai untuk <input type="datetime-local"> (waktu lokal).
function toLocalInput(iso) {
  const d = iso ? new Date(iso) : new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Hitung ekspresi angka sederhana seperti "50000+25000" atau "120000/3".
// Ditulis manual (bukan eval) supaya aman: hanya angka, + - * / dan kurung.
function evalAmount(raw) {
  if (!raw) return null;
  const expr = String(raw).replace(/x/gi, "*").replace(/[×]/g, "*").replace(/[÷]/g, "/").replace(/\s/g, "");
  if (!expr) return null;
  if (!/^[0-9+\-*/().]+$/.test(expr)) return null;
  // Kalau isinya cuma angka polos, gak usah dihitung.
  if (/^[0-9.]+$/.test(expr)) return Number(expr);

  let pos = 0;
  const peek = () => expr[pos];
  function parseExpr() {
    let val = parseTerm();
    while (peek() === "+" || peek() === "-") {
      const op = expr[pos++];
      const rhs = parseTerm();
      if (rhs === null) return null;
      val = op === "+" ? val + rhs : val - rhs;
    }
    return val;
  }
  function parseTerm() {
    let val = parseFactor();
    if (val === null) return null;
    while (peek() === "*" || peek() === "/") {
      const op = expr[pos++];
      const rhs = parseFactor();
      if (rhs === null) return null;
      if (op === "/" && rhs === 0) return null;
      val = op === "*" ? val * rhs : val / rhs;
    }
    return val;
  }
  function parseFactor() {
    if (peek() === "(") {
      pos++;
      const val = parseExpr();
      if (peek() !== ")") return null;
      pos++;
      return val;
    }
    if (peek() === "-") {
      pos++;
      const val = parseFactor();
      return val === null ? null : -val;
    }
    let start = pos;
    while (pos < expr.length && /[0-9.]/.test(expr[pos])) pos++;
    if (start === pos) return null;
    const n = Number(expr.slice(start, pos));
    return Number.isFinite(n) ? n : null;
  }

  const result = parseExpr();
  if (pos !== expr.length || result === null || !Number.isFinite(result)) return null;
  return result;
}

function walletBalance(wallet, transactions) {
  let bal = Number(wallet.initialBalance) || 0;
  for (const t of transactions) {
    if (t.type === "income" && t.walletId === wallet.id) bal += Number(t.amount) || 0;
    else if (t.type === "expense" && t.walletId === wallet.id) bal -= Number(t.amount) || 0;
    else if (t.type === "transfer") {
      if (t.walletId === wallet.id) bal -= (Number(t.amount) || 0) + (Number(t.fee) || 0);
      if (t.toWalletId === wallet.id) bal += Number(t.amount) || 0;
    }
  }
  return bal;
}

function isSameMonth(iso, ref) {
  const d = new Date(iso);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}

// --- Komponen kecil bersama ---------------------------------------------
function Overlay({ children, onClose }) {
  return (
    <div className="fixed inset-0 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" style={{ background: "rgba(43,42,37,0.45)" }} onClick={onClose}>
      <div
        className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 overflow-y-auto"
        style={{ background: COLORS.card, maxHeight: "90dvh" }}
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

function SummaryCard({ icon: Icon, label, value, color, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl p-2.5 text-left"
      style={{
        background: active ? color : COLORS.card,
        border: `1.5px solid ${active ? color : COLORS.border}`,
      }}
    >
      <div className="w-7 h-7 rounded-full flex items-center justify-center mb-1.5" style={{ background: active ? "rgba(255,255,255,0.22)" : `${color}1F` }}>
        <Icon size={14} color={active ? "#fff" : color} />
      </div>
      <div className="font-bold" style={{ fontSize: 17, color: active ? "#fff" : COLORS.ink, lineHeight: 1.1 }}>
        {value}
      </div>
      <div className="text-[11px] mt-0.5" style={{ color: active ? "rgba(255,255,255,0.85)" : COLORS.inkSoft }}>
        {label}
      </div>
    </button>
  );
}

function SearchBox({ value, onChange, placeholder }) {
  return (
    <div className="flex items-center gap-2 px-3 rounded-xl" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
      <Search size={16} color={COLORS.inkSoft} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 py-1.5 bg-transparent"
        style={{ color: COLORS.ink, fontSize: 13, outline: "none", border: "none" }}
      />
      {value && (
        <button onClick={() => onChange("")} className="shrink-0">
          <X size={14} color={COLORS.inkSoft} />
        </button>
      )}
    </div>
  );
}

function TopBar({ title, onBack, rightSlot, onOpenMenu, onSwitchApp }) {
  return (
    <div className="flex items-center justify-between gap-2 pt-4 pb-4">
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
          style={{ background: COLORS.card, boxShadow: "0 2px 8px rgba(43,42,37,0.10)" }}
        >
          <ArrowLeft size={17} color={COLORS.ink} />
        </button>
        <h1 className="truncate" style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 22, color: COLORS.primary }}>
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {rightSlot}
        {onSwitchApp && (
          <button
            onClick={onSwitchApp}
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: COLORS.card, boxShadow: "0 2px 8px rgba(43,42,37,0.10)" }}
            title="Ganti aplikasi"
          >
            <LayoutGrid size={16} color={COLORS.ink} />
          </button>
        )}
        <button
          onClick={onOpenMenu}
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: COLORS.card, boxShadow: "0 2px 8px rgba(43,42,37,0.10)" }}
        >
          <Menu size={16} color={COLORS.ink} />
        </button>
      </div>
    </div>
  );
}

function BottomNav({ view, setView }) {
  const tabs = [
    { key: "dashboard", label: "Beranda", icon: Home },
    { key: "transactions", label: "Transaksi", icon: Receipt },
    { key: "wallets", label: "Dompet", icon: Wallet },
    { key: "analysis", label: "Analisis", icon: PieChart },
  ];
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40"
      style={{ background: COLORS.card, borderTop: `1px solid ${COLORS.border}`, paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
    >
      <div className="max-w-2xl mx-auto flex items-stretch justify-around px-1.5 py-2">
        {tabs.map((t) => {
          const active = view === t.key;
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setView(t.key)} className="flex-1 flex flex-col items-center gap-1 py-1">
              <Icon size={19} color={active ? COLORS.primary : COLORS.inkSoft} />
              <span className="text-[10.5px] font-medium" style={{ color: active ? COLORS.primary : COLORS.inkSoft }}>
                {t.label}
              </span>
              <span className="w-1 h-1 rounded-full" style={{ background: active ? COLORS.primary : "transparent" }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MoneyIllustration() {
  return (
    <svg
      viewBox="0 0 140 120"
      width="86"
      height="74"
      className="absolute right-0 pointer-events-none select-none"
      style={{ opacity: 0.95, bottom: 0 }}
    >
      <ellipse cx="70" cy="106" rx="46" ry="5" fill="#E4E0D4" />
      <rect x="46" y="34" width="42" height="28" rx="3" fill="#C9DFCF" />
      <rect x="54" y="27" width="42" height="28" rx="3" fill="#FBF0DD" />
      <circle cx="75" cy="41" r="6" fill="#C98A3E" opacity="0.6" />
      <rect x="24" y="50" width="92" height="52" rx="9" fill="#2F4A3C" />
      <rect x="24" y="64" width="92" height="38" rx="9" fill="#3C5C4B" />
      <rect x="80" y="70" width="28" height="14" rx="7" fill="#C98A3E" />
      <circle cx="94" cy="77" r="4" fill="#FBF0DD" />
      <circle cx="118" cy="30" r="8" fill="#C98A3E" opacity="0.4" />
      <circle cx="30" cy="26" r="5" fill="#C9DFCF" />
    </svg>
  );
}

// --- App utama ----------------------------------------------------------
export default function KasRumahApp({ userName, onBackToPicker, onLogout, onSwitchApp }) {
  const [view, setView] = useState("dashboard");
  const [loading, setLoading] = useState(true);

  const [wallets, setWallets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);

  const [txSearch, setTxSearch] = useState("");
  const [txFilter, setTxFilter] = useState("all"); // all | income | expense | transfer

  const [txModal, setTxModal] = useState(null);
  const [walletModal, setWalletModal] = useState(null);
  const [transferModal, setTransferModal] = useState(false);
  const [categoryPanel, setCategoryPanel] = useState(false);
  const [categoryModal, setCategoryModal] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [scanModal, setScanModal] = useState(false);
  const [toBuy, setToBuy] = useState([]);
  const [aliases, setAliases] = useState({});
  const [saving, setSaving] = useState(false);

  // --- Sinkron Firestore ------------------------------------------------
  const seededRef = useRef(false);
  useEffect(() => {
    let pending = 3;
    const markLoaded = () => {
      pending -= 1;
      if (pending <= 0) setLoading(false);
    };

    const unsubs = [
      storageSubscribe("kas-wallets", (data) => {
        if (Array.isArray(data)) {
          setWallets(data);
        } else if (!seededRef.current) {
          seededRef.current = true;
          setWallets(DEFAULT_WALLETS);
          storageSet("kas-wallets", DEFAULT_WALLETS);
        }
        markLoaded();
      }),
      storageSubscribe("kas-categories", (data) => {
        if (Array.isArray(data) && data.length) {
          setCategories(data);
        } else {
          setCategories(DEFAULT_CATEGORIES);
          if (!Array.isArray(data)) storageSet("kas-categories", DEFAULT_CATEGORIES);
        }
        markLoaded();
      }),
      storageSubscribe("kas-transactions", (data) => {
        setTransactions(Array.isArray(data) ? data : []);
        markLoaded();
      }),
      // Daftar "Akan Dibeli" dari Stok Rumah — dibaca saja, buat pencocokan
      // hasil scan struk. Tidak pernah ditulis ulang dari sini kecuali saat
      // pengguna menyetujui pencocokan.
      storageSubscribe("stock-tobuy", (data) => setToBuy(Array.isArray(data) ? data : [])),
      storageSubscribe("kas-aliases", (data) => setAliases(data && typeof data === "object" ? data : {})),
    ];
    return () => unsubs.forEach((u) => u && u());
  }, []);

  const persistWallets = async (next) => {
    setWallets(next);
    await storageSet("kas-wallets", next);
  };
  const persistCategories = async (next) => {
    setCategories(next);
    await storageSet("kas-categories", next);
  };
  const persistTransactions = async (next) => {
    setTransactions(next);
    await storageSet("kas-transactions", next);
  };

  // --- Aksi transaksi ---------------------------------------------------
  const handleSaveTx = async (data, existing) => {
    setSaving(true);
    const now = new Date().toISOString();
    let next;
    if (existing) {
      next = transactions.map((t) =>
        t.id === existing.id ? { ...t, ...data, updatedBy: userName, updatedAt: now } : t
      );
    } else {
      next = [
        { id: uid("tx"), ...data, createdBy: userName, createdAt: now, updatedBy: userName, updatedAt: now },
        ...transactions,
      ];
    }
    await persistTransactions(next);
    setSaving(false);
    setTxModal(null);
    setTransferModal(false);
  };

  const handleDeleteTx = async (id) => {
    await persistTransactions(transactions.filter((t) => t.id !== id));
  };

  // Centang item di daftar "Akan Dibeli" milik Stok Rumah setelah pengguna
  // menyetujui pencocokan hasil scan struk.
  const handleMarkBought = async (entryIds) => {
    if (!entryIds || !entryIds.length) return;
    const now = new Date().toISOString();
    const next = toBuy.map((e) =>
      entryIds.includes(e.id) && !e.bought ? { ...e, bought: true, boughtBy: userName, boughtAt: now } : e
    );
    setToBuy(next);
    await storageSet("stock-tobuy", next);
  };

  const handleSaveAliases = async (next) => {
    setAliases(next);
    await storageSet("kas-aliases", next);
  };

  // --- Aksi dompet ------------------------------------------------------
  const handleSaveWallet = async (data, existing) => {
    setSaving(true);
    let next;
    if (existing) {
      next = wallets.map((w) => (w.id === existing.id ? { ...w, ...data } : w));
    } else {
      next = [...wallets, { id: uid("wal"), ...data }];
    }
    await persistWallets(next);
    setSaving(false);
    setWalletModal(null);
  };

  const handleDeleteWallet = async (id) => {
    await persistWallets(wallets.filter((w) => w.id !== id));
  };

  // --- Aksi kategori ----------------------------------------------------
  const handleSaveCategory = async (data, existing) => {
    setSaving(true);
    let next;
    if (existing) {
      next = categories.map((c) => (c.id === existing.id ? { ...c, ...data } : c));
    } else {
      next = [...categories, { id: uid("cat"), ...data }];
    }
    await persistCategories(next);
    setSaving(false);
    setCategoryModal(null);
  };

  const handleDeleteCategory = async (id) => {
    await persistCategories(categories.filter((c) => c.id !== id));
  };

  const handleConfirmedDelete = async () => {
    if (!confirmDelete) return;
    if (confirmDelete.type === "tx") await handleDeleteTx(confirmDelete.id);
    else if (confirmDelete.type === "wallet") await handleDeleteWallet(confirmDelete.id);
    else if (confirmDelete.type === "category") await handleDeleteCategory(confirmDelete.id);
    setConfirmDelete(null);
  };

  // --- Turunan ----------------------------------------------------------
  const catById = useMemo(() => {
    const m = {};
    categories.forEach((c) => (m[c.id] = c));
    return m;
  }, [categories]);

  const walById = useMemo(() => {
    const m = {};
    wallets.forEach((w) => (m[w.id] = w));
    return m;
  }, [wallets]);

  const sortedTx = useMemo(
    () => transactions.slice().sort((a, b) => new Date(b.date) - new Date(a.date)),
    [transactions]
  );

  // Semua tag yang pernah dipakai, buat saran di modal transaksi.
  const allTags = useMemo(() => {
    const set = new Set();
    transactions.forEach((t) => (t.tags || []).forEach((tag) => set.add(tag)));
    return Array.from(set).sort();
  }, [transactions]);

  const totals = useMemo(() => {
    const ref = new Date();
    let income = 0,
      expense = 0;
    transactions.forEach((t) => {
      if (!isSameMonth(t.date, ref)) return;
      if (t.type === "income") income += Number(t.amount) || 0;
      else if (t.type === "expense") expense += Number(t.amount) || 0;
    });
    const balance = wallets.reduce((sum, w) => sum + walletBalance(w, transactions), 0);
    return { income, expense, balance, monthCount: transactions.filter((t) => isSameMonth(t.date, ref)).length };
  }, [transactions, wallets]);

  // --- Geser kiri/kanan antar tab --------------------------------------
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
    const THRESHOLD = 60;
    if (dragModeRef.current === "horizontal") {
      if (dx < -THRESHOLD && idx < TAB_ORDER.length - 1) setView(TAB_ORDER[idx + 1]);
      else if (dx > THRESHOLD && idx > 0) setView(TAB_ORDER[idx - 1]);
    }
    resetDrag();
  };

  if (loading) {
    return (
      <div style={{ background: COLORS.bg, minHeight: "100vh", color: COLORS.inkSoft }} className="flex items-center justify-center text-sm">
        Memuat data...
      </div>
    );
  }

  const fabAction = () => {
    if (view === "wallets") setWalletModal({ mode: "add" });
    else setTxModal({ mode: "add", type: "expense" });
  };

  return (
    <div style={{ background: COLORS.bg, height: "100dvh", color: COLORS.ink, fontFamily: "'Inter', sans-serif", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        ::placeholder { color: #A6A296; }
        @keyframes scanPulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.12); opacity: 0.75; } }
        .scan-pulse { animation: scanPulse 1.1s ease-in-out infinite; }
      `}</style>

      <div className="h-full overflow-hidden">
        <div
          className="flex h-full"
          style={{
            width: "400vw",
            transform: `translateX(calc(${-TAB_ORDER.indexOf(view) * 100}vw + ${dragX}px))`,
            transition: isDragging ? "none" : "transform 320ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={resetDrag}
        >
          <div className="h-full" style={{ width: "100vw" }}>
            <DashboardPage
              userName={userName}
              totals={totals}
              recent={sortedTx.slice(0, 3)}
              catById={catById}
              walById={walById}
              onOpenMenu={() => setShowMenu(true)}
              onSeeAll={() => setView("transactions")}
              onBackToPicker={onBackToPicker}
            />
          </div>

          <div className="h-full" style={{ width: "100vw" }}>
            <TransactionsPage
              transactions={sortedTx}
              catById={catById}
              walById={walById}
              search={txSearch}
              setSearch={setTxSearch}
              filter={txFilter}
              setFilter={setTxFilter}
              onBack={() => setView("dashboard")}
              onOpenMenu={() => setShowMenu(true)}
              onSwitchApp={onBackToPicker}
              onEdit={(tx) => (tx.type === "transfer" ? setTransferModal(tx) : setTxModal({ mode: "edit", tx }))}
              onDelete={(tx) => setConfirmDelete({ type: "tx", id: tx.id, label: tx.note || "transaksi ini" })}
              onDuplicate={(tx) =>
                setTxModal({
                  mode: "duplicate",
                  tx: { ...tx, id: undefined, date: new Date().toISOString() },
                })
              }
            />
          </div>

          <div className="h-full" style={{ width: "100vw" }}>
            <WalletsPage
              wallets={wallets}
              transactions={transactions}
              onBack={() => setView("dashboard")}
              onOpenMenu={() => setShowMenu(true)}
              onSwitchApp={onBackToPicker}
              onEdit={(w) => setWalletModal({ mode: "edit", wallet: w })}
              onDelete={(w) => setConfirmDelete({ type: "wallet", id: w.id, label: w.name })}
              onTransfer={() => setTransferModal(true)}
            />
          </div>

          <div className="h-full" style={{ width: "100vw" }}>
            <AnalysisPage
              transactions={transactions}
              catById={catById}
              walById={walById}
              onBack={() => setView("dashboard")}
              onOpenMenu={() => setShowMenu(true)}
              onSwitchApp={onBackToPicker}
            />
          </div>
        </div>
      </div>

      {(view === "dashboard" || view === "transactions") && (
        <button
          onClick={() => setScanModal(true)}
          className="fixed right-6 rounded-full flex items-center justify-center shadow-lg z-30"
          style={{ width: 46, height: 46, background: COLORS.card, color: COLORS.primary, border: `1.5px solid ${COLORS.border}`, bottom: "calc(176px + env(safe-area-inset-bottom))" }}
          title="Scan struk"
        >
          <ScanLine size={20} />
        </button>
      )}

      {view !== "analysis" && (
        <button
          onClick={fabAction}
          className="fixed right-6 rounded-full flex items-center justify-center shadow-lg z-30"
          style={{ width: 56, height: 56, background: COLORS.primary, color: "#fff", bottom: "calc(112px + env(safe-area-inset-bottom))" }}
        >
          <Plus size={26} />
        </button>
      )}

      <BottomNav view={view} setView={setView} />

      {txModal && (
        <TransactionModal
          mode={txModal.mode}
          tx={txModal.tx}
          initialType={txModal.type}
          categories={categories}
          wallets={wallets}
          allTags={allTags}
          saving={saving}
          onClose={() => setTxModal(null)}
          onSubmit={(data) => handleSaveTx(data, txModal.mode === "edit" ? txModal.tx : null)}
        />
      )}

      {transferModal && (
        <TransferModal
          tx={typeof transferModal === "object" ? transferModal : null}
          wallets={wallets}
          saving={saving}
          onClose={() => setTransferModal(false)}
          onSubmit={(data) => handleSaveTx(data, typeof transferModal === "object" ? transferModal : null)}
        />
      )}

      {walletModal && (
        <WalletModal
          mode={walletModal.mode}
          wallet={walletModal.wallet}
          saving={saving}
          onClose={() => setWalletModal(null)}
          onSubmit={(data) => handleSaveWallet(data, walletModal.wallet)}
        />
      )}

      {categoryPanel && (
        <CategoryPanel
          categories={categories}
          onClose={() => setCategoryPanel(false)}
          onAdd={(kind) => setCategoryModal({ mode: "add", kind })}
          onEdit={(c) => setCategoryModal({ mode: "edit", category: c })}
          onDelete={(c) => setConfirmDelete({ type: "category", id: c.id, label: c.name })}
        />
      )}

      {categoryModal && (
        <CategoryModal
          mode={categoryModal.mode}
          category={categoryModal.category}
          initialKind={categoryModal.kind}
          saving={saving}
          onClose={() => setCategoryModal(null)}
          onSubmit={(data) => handleSaveCategory(data, categoryModal.category)}
        />
      )}

      {scanModal && (
        <ReceiptScanModal
          categories={categories}
          wallets={wallets}
          transactions={transactions}
          toBuy={toBuy}
          aliases={aliases}
          saving={saving}
          onClose={() => setScanModal(false)}
          onSubmit={async (data) => {
            await handleSaveTx(data, null);
            setScanModal(false);
          }}
          onMarkBought={handleMarkBought}
          onSaveAliases={handleSaveAliases}
        />
      )}

      {confirmDelete && (
        <Overlay onClose={() => setConfirmDelete(null)}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={18} color={COLORS.out} />
            <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 18, color: COLORS.ink }}>Hapus?</div>
          </div>
          <p className="text-sm mb-4" style={{ color: COLORS.inkSoft }}>
            "{confirmDelete.label}" bakal dihapus permanen.
            {confirmDelete.type === "wallet" && " Transaksi yang memakai dompet ini tetap tersimpan."}
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

      {showMenu && (
        <MenuPanel
          userName={userName}
          onClose={() => setShowMenu(false)}
          onOpenCategories={() => setCategoryPanel(true)}
          onSwitchApp={onSwitchApp || onBackToPicker}
          onLogout={onLogout}
        />
      )}
    </div>
  );
}

// --- Beranda ------------------------------------------------------------
function DashboardPage({ userName, totals, recent, catById, walById, onOpenMenu, onSeeAll, onBackToPicker }) {
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 10) return "Selamat pagi";
    if (h < 15) return "Selamat siang";
    if (h < 18) return "Selamat sore";
    return "Selamat malam";
  }, []);

  const todayLabel = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="h-full overflow-y-auto" style={{ overscrollBehaviorY: "contain", WebkitOverflowScrolling: "touch" }}>
      <div className="max-w-2xl mx-auto px-4 pb-32" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="relative pt-8 pb-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-sm flex items-center gap-1.5" style={{ color: COLORS.inkSoft }}>
                {greeting}
                {userName ? `, ${userName}` : ""} <span>👋</span>
              </div>
              <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 30, lineHeight: 1.15 }}>
                <span style={{ color: COLORS.primary }}>Kas</span>
                <br />
                <span style={{ color: COLORS.inkSoft, fontWeight: 500 }}>Rumah</span>
              </h1>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={onBackToPicker}
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: COLORS.card, boxShadow: "0 2px 8px rgba(43,42,37,0.10)" }}
                title="Ganti aplikasi"
              >
                <LayoutGrid size={16} color={COLORS.ink} />
              </button>
              <button
                onClick={onOpenMenu}
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: COLORS.card, boxShadow: "0 2px 8px rgba(43,42,37,0.10)" }}
                title="Menu"
              >
                <Menu size={16} color={COLORS.ink} />
              </button>
            </div>
          </div>
          <div className="text-sm mt-3 flex items-center gap-1.5 capitalize" style={{ color: COLORS.inkSoft }}>
            <Calendar size={14} color={COLORS.inkSoft} />
            {todayLabel}
          </div>
          <MoneyIllustration />
        </div>

        <div className="rounded-2xl p-4 mb-3" style={{ background: COLORS.primary }}>
          <div className="text-xs" style={{ color: "rgba(255,255,255,0.75)" }}>
            Saldo semua dompet
          </div>
          <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 26, color: "#fff", lineHeight: 1.2 }}>
            {fmtRupiah(totals.balance)}
          </div>
          <div className="flex gap-4 mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.16)" }}>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] flex items-center gap-1" style={{ color: "rgba(255,255,255,0.75)" }}>
                <ArrowDownLeft size={12} /> Masuk
              </div>
              <div className="text-sm font-semibold mt-0.5 truncate" style={{ color: "#fff" }}>
                {fmtRupiah(totals.income)}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] flex items-center gap-1" style={{ color: "#F0C994" }}>
                <ArrowUpRight size={12} /> Keluar
              </div>
              <div className="text-sm font-semibold mt-0.5 truncate" style={{ color: "#fff" }}>
                {fmtRupiah(totals.expense)}
              </div>
            </div>
          </div>
        </div>

        <div className="relative w-full rounded-2xl p-4" style={{ background: COLORS.card, border: `1.5px solid ${COLORS.border}` }}>
          <button onClick={onSeeAll} className="w-full flex items-center gap-3 text-left">
            <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: COLORS.iconAgendaBg }}>
              <Receipt size={20} color={COLORS.iconAgendaFg} />
            </div>
            <div className="flex-1 min-w-0">
              <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 16, color: COLORS.ink }}>Transaksi Terbaru</div>
              <div className="text-xs mt-0.5" style={{ color: COLORS.iconAgendaFg }}>
                {totals.monthCount > 0 ? `${totals.monthCount} transaksi bulan ini` : "Belum ada transaksi bulan ini"}
              </div>
            </div>
            <ChevronRight size={18} color={COLORS.inkSoft} className="shrink-0" />
          </button>

          {recent.length > 0 && (
            <div className="flex flex-col gap-1.5 mt-3.5 pl-14">
              {recent.map((t) => (
                <div key={t.id} className="rounded-lg px-3 py-2 flex items-center justify-between gap-2" style={{ background: COLORS.bg }}>
                  <span className="text-xs truncate" style={{ color: COLORS.ink }}>
                    {t.note || (t.type === "transfer" ? "Transfer" : catById[t.categoryId]?.name || "Tanpa kategori")}
                  </span>
                  <span
                    className="text-xs font-medium shrink-0"
                    style={{ color: t.type === "income" ? COLORS.safe : t.type === "expense" ? COLORS.out : COLORS.inkSoft }}
                  >
                    {t.type === "income" ? "+" : t.type === "expense" ? "-" : ""}
                    {fmtShortRupiah(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Halaman transaksi --------------------------------------------------
function TransactionsPage({ transactions, catById, walById, search, setSearch, filter, setFilter, onBack, onOpenMenu, onSwitchApp, onEdit, onDelete, onDuplicate }) {
  const counts = useMemo(() => {
    let income = 0,
      expense = 0,
      transfer = 0;
    transactions.forEach((t) => {
      if (t.type === "income") income++;
      else if (t.type === "expense") expense++;
      else transfer++;
    });
    return { all: transactions.length, income, expense, transfer };
  }, [transactions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions
      .filter((t) => filter === "all" || t.type === filter)
      .filter((t) => {
        if (!q) return true;
        const cat = catById[t.categoryId]?.name || "";
        const wal = walById[t.walletId]?.name || "";
        return (
          (t.note || "").toLowerCase().includes(q) ||
          cat.toLowerCase().includes(q) ||
          wal.toLowerCase().includes(q) ||
          (t.tags || []).some((tag) => tag.toLowerCase().includes(q.replace(/^#/, ""))) ||
          String(t.amount).includes(q)
        );
      });
  }, [transactions, filter, search, catById, walById]);

  const groups = useMemo(() => {
    const out = [];
    for (const t of filtered) {
      const label = dayLabel(t.date);
      let g = out.find((x) => x.label === label);
      if (!g) {
        g = { label, items: [], total: 0 };
        out.push(g);
      }
      g.items.push(t);
      if (t.type === "income") g.total += Number(t.amount) || 0;
      else if (t.type === "expense") g.total -= Number(t.amount) || 0;
    }
    return out;
  }, [filtered]);

  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 max-w-2xl mx-auto w-full px-4 pb-3" style={{ paddingTop: "env(safe-area-inset-top)", background: COLORS.bg }}>
        <TopBar title="Transaksi" onBack={onBack} onOpenMenu={onOpenMenu} onSwitchApp={onSwitchApp} />

        <div className="grid grid-cols-4 gap-1.5 mb-3">
          <SummaryCard icon={LayoutGrid} label="Semua" value={counts.all} color={COLORS.primary} active={filter === "all"} onClick={() => setFilter("all")} />
          <SummaryCard icon={ArrowDownLeft} label="Masuk" value={counts.income} color={COLORS.safe} active={filter === "income"} onClick={() => setFilter("income")} />
          <SummaryCard icon={ArrowUpRight} label="Keluar" value={counts.expense} color={COLORS.out} active={filter === "expense"} onClick={() => setFilter("expense")} />
          <SummaryCard icon={ArrowLeftRight} label="Transfer" value={counts.transfer} color={COLORS.low} active={filter === "transfer"} onClick={() => setFilter("transfer")} />
        </div>

        <SearchBox value={search} onChange={setSearch} placeholder="Cari transaksi..." />
      </div>

      <div className="flex-1 overflow-y-auto" style={{ overscrollBehaviorY: "contain", WebkitOverflowScrolling: "touch" }}>
        <div className="max-w-2xl mx-auto px-4 pb-32">
          {groups.length === 0 ? (
            <div className="py-14 text-center rounded-2xl" style={{ background: COLORS.card, border: `1px dashed ${COLORS.border}` }}>
              <Receipt size={28} color={COLORS.inkSoft} style={{ margin: "0 auto 8px" }} />
              <div style={{ color: COLORS.inkSoft }} className="text-sm">
                {transactions.length === 0 ? "Belum ada transaksi." : "Tidak ada yang cocok."}
              </div>
            </div>
          ) : (
            groups.map((g, gi) => (
              <div key={g.label}>
                <div className="flex items-center justify-between" style={{ paddingTop: gi === 0 ? 0 : 18, paddingBottom: 8 }}>
                  <span className="uppercase" style={{ fontSize: 11, letterSpacing: 0.6, fontWeight: 700, color: COLORS.primaryLight }}>
                    {g.label}
                  </span>
                  <span className="text-xs font-medium" style={{ color: g.total >= 0 ? COLORS.safe : COLORS.out }}>
                    {g.total >= 0 ? "+" : "-"}
                    {fmtShortRupiah(g.total)}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {g.items.map((t) => (
                    <TransactionRow
                      key={t.id}
                      tx={t}
                      category={catById[t.categoryId]}
                      wallet={walById[t.walletId]}
                      toWallet={walById[t.toWalletId]}
                      catById={catById}
                      onEdit={() => onEdit(t)}
                      onDelete={() => onDelete(t)}
                      onDuplicate={() => onDuplicate(t)}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function TransactionRow({ tx, category, wallet, toWallet, catById, onEdit, onDelete, onDuplicate }) {
  const isIncome = tx.type === "income";
  const isTransfer = tx.type === "transfer";
  const hasSplit = !!(tx.splits && tx.splits.length);
  const [openSplit, setOpenSplit] = useState(false);
  const Icon = isTransfer ? ArrowLeftRight : hasSplit ? Split : CATEGORY_ICONS[category?.icon] || Tag;
  const color = isTransfer ? COLORS.low : isIncome ? COLORS.safe : category?.color || COLORS.out;
  const amountColor = isTransfer ? COLORS.inkSoft : isIncome ? COLORS.safe : COLORS.out;

  return (
    <div className="rounded-2xl p-3" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
      <div className="flex items-start gap-2.5">
        <span className="shrink-0 rounded-full flex items-center justify-center" style={{ width: 36, height: 36, background: `${color}1F` }}>
          <Icon size={16} color={color} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-semibold truncate" style={{ color: COLORS.ink, fontSize: 13 }}>
                {isTransfer
                  ? `${wallet?.name || "?"} → ${toWallet?.name || "?"}`
                  : hasSplit
                  ? `${tx.splits.length} kategori`
                  : category?.name || "Tanpa kategori"}
              </div>
              {tx.note && (
                <div className="text-xs mt-0.5 truncate" style={{ color: COLORS.inkSoft }}>
                  {tx.note}
                </div>
              )}
            </div>
            <div className="font-bold shrink-0" style={{ fontSize: 14, color: amountColor }}>
              {isIncome ? "+" : isTransfer ? "" : "-"}
              {fmtShortRupiah(tx.amount)}
            </div>
          </div>

          {tx.tags && tx.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {tx.tags.map((t) => (
                <span key={t} className="px-1.5 py-0.5 rounded-full text-[10px] font-medium" style={{ background: COLORS.bg, color: COLORS.primaryLight }}>
                  #{t}
                </span>
              ))}
            </div>
          )}

          <div className="text-[11px] mt-1" style={{ color: COLORS.inkSoft }}>
            {!isTransfer && `${wallet?.name || "?"} · `}
            {fmtDateTime(tx.date)}
          </div>

          {hasSplit && (
            <>
              <button onClick={() => setOpenSplit((v) => !v)} className="text-[11px] font-medium mt-1.5 flex items-center gap-1" style={{ color: COLORS.primary }}>
                {openSplit ? "Sembunyikan rincian" : "Lihat rincian"}
                <ChevronRight size={11} style={{ transform: openSplit ? "rotate(90deg)" : "none" }} />
              </button>
              {openSplit && (
                <div className="flex flex-col gap-1 mt-1.5">
                  {tx.splits.map((s, i) => (
                    <div key={i} className="rounded-lg px-2.5 py-1.5 flex items-center justify-between gap-2" style={{ background: COLORS.bg }}>
                      <span className="text-[11px] truncate" style={{ color: COLORS.ink }}>
                        {catById?.[s.categoryId]?.name || "Tanpa kategori"}
                      </span>
                      <span className="text-[11px] font-medium shrink-0" style={{ color: COLORS.inkSoft }}>
                        {fmtShortRupiah(s.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between mt-2.5 pt-2.5" style={{ borderTop: `1px solid ${COLORS.border}` }}>
        <span className="text-[11px] truncate" style={{ color: COLORS.inkSoft }}>
          {tx.createdBy || "?"}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {!isTransfer && (
            <button onClick={onDuplicate} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ border: `1px solid ${COLORS.border}` }} title="Duplikat">
              <Copy size={12} color={COLORS.ink} />
            </button>
          )}
          <button onClick={onEdit} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ border: `1px solid ${COLORS.border}` }}>
            <Pencil size={12} color={COLORS.ink} />
          </button>
          <button onClick={onDelete} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ border: `1px solid ${COLORS.out}55` }}>
            <Trash2 size={12} color={COLORS.out} />
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Halaman dompet -----------------------------------------------------
function WalletsPage({ wallets, transactions, onBack, onOpenMenu, onSwitchApp, onEdit, onDelete, onTransfer }) {
  const total = useMemo(
    () => wallets.reduce((sum, w) => sum + walletBalance(w, transactions), 0),
    [wallets, transactions]
  );

  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 max-w-2xl mx-auto w-full px-4 pb-3" style={{ paddingTop: "env(safe-area-inset-top)", background: COLORS.bg }}>
        <TopBar
          title="Dompet"
          onBack={onBack}
          onOpenMenu={onOpenMenu}
          onSwitchApp={onSwitchApp}
          rightSlot={
            <button
              onClick={onTransfer}
              className="px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-medium"
              style={{ background: COLORS.card, boxShadow: "0 2px 8px rgba(43,42,37,0.10)", color: COLORS.ink }}
              title="Transfer antar dompet"
            >
              <ArrowLeftRight size={13} /> Transfer
            </button>
          }
        />
        <div className="rounded-2xl p-3.5" style={{ background: COLORS.primary }}>
          <div className="text-xs" style={{ color: "rgba(255,255,255,0.75)" }}>
            Total saldo
          </div>
          <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 23, color: "#fff", lineHeight: 1.2 }}>
            {fmtRupiah(total)}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ overscrollBehaviorY: "contain", WebkitOverflowScrolling: "touch" }}>
        <div className="max-w-2xl mx-auto px-4 pb-32">
          {wallets.length === 0 ? (
            <div className="py-14 text-center rounded-2xl" style={{ background: COLORS.card, border: `1px dashed ${COLORS.border}` }}>
              <Wallet size={28} color={COLORS.inkSoft} style={{ margin: "0 auto 8px" }} />
              <div style={{ color: COLORS.inkSoft }} className="text-sm">
                Belum ada dompet. Tambahkan yang pertama.
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {wallets.map((w) => {
                const Icon = WALLET_ICONS[w.icon] || Wallet;
                const bal = walletBalance(w, transactions);
                return (
                  <div key={w.id} className="rounded-2xl p-3.5" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
                    <div className="flex items-center gap-3">
                      <span className="shrink-0 rounded-full flex items-center justify-center" style={{ width: 42, height: 42, background: `${w.color}1F` }}>
                        <Icon size={19} color={w.color} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate" style={{ color: COLORS.ink, fontSize: 14 }}>
                          {w.name}
                        </div>
                        <div className="font-bold mt-0.5" style={{ fontSize: 16, color: bal < 0 ? COLORS.out : COLORS.primary }}>
                          {fmtRupiah(bal)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => onEdit(w)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ border: `1px solid ${COLORS.border}` }}>
                          <Pencil size={12} color={COLORS.ink} />
                        </button>
                        <button onClick={() => onDelete(w)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ border: `1px solid ${COLORS.out}55` }}>
                          <Trash2 size={12} color={COLORS.out} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Analisis -----------------------------------------------------------
// Rentang waktu yang bisa dipilih. Semuanya dihitung dari hari ini.
const PERIODS = [
  { key: "week", label: "7 Hari" },
  { key: "month", label: "Bulan Ini" },
  { key: "3m", label: "3 Bulan" },
  { key: "6m", label: "6 Bulan" },
  { key: "year", label: "Tahun Ini" },
  { key: "custom", label: "Pilih Sendiri" },
];

const DIMENSIONS = [
  { key: "category", label: "Kategori" },
  { key: "wallet", label: "Dompet" },
  { key: "person", label: "Orang" },
  { key: "tag", label: "Tag" },
];

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function getRange(period, customFrom, customTo) {
  const now = new Date();
  const end = endOfDay(now);
  let start;
  switch (period) {
    case "week":
      start = startOfDay(now);
      start.setDate(start.getDate() - 6);
      break;
    case "month":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "3m":
      start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      break;
    case "6m":
      start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      break;
    case "year":
      start = new Date(now.getFullYear(), 0, 1);
      break;
    case "custom":
      return {
        start: customFrom ? startOfDay(new Date(customFrom)) : startOfDay(now),
        end: customTo ? endOfDay(new Date(customTo)) : end,
      };
    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return { start, end };
}

// Rentang sebelumnya dengan panjang yang sama, tepat sebelum rentang ini.
function previousRange({ start, end }) {
  const span = end - start;
  return { start: new Date(start.getTime() - span - 1), end: new Date(start.getTime() - 1) };
}

function inRange(iso, { start, end }) {
  const t = new Date(iso).getTime();
  return t >= start.getTime() && t <= end.getTime();
}

function fmtRangeLabel({ start, end }) {
  const opt = { day: "numeric", month: "short" };
  const sameYear = start.getFullYear() === end.getFullYear();
  const s = start.toLocaleDateString("id-ID", sameYear ? opt : { ...opt, year: "numeric" });
  const e = end.toLocaleDateString("id-ID", { ...opt, year: "numeric" });
  return `${s} – ${e}`;
}

// Pecah satu transaksi jadi beberapa bagian sesuai dimensi yang dipilih,
// supaya transaksi yang di-split tetap dihitung ke kategori masing-masing.
function breakdownParts(tx, dimension, catById, walById) {
  if (dimension === "category") {
    if (tx.splits && tx.splits.length) {
      return tx.splits.map((s) => ({
        key: s.categoryId || "none",
        label: catById[s.categoryId]?.name || "Tanpa kategori",
        color: catById[s.categoryId]?.color || COLORS.inkSoft,
        amount: Number(s.amount) || 0,
      }));
    }
    return [
      {
        key: tx.categoryId || "none",
        label: catById[tx.categoryId]?.name || "Tanpa kategori",
        color: catById[tx.categoryId]?.color || COLORS.inkSoft,
        amount: Number(tx.amount) || 0,
      },
    ];
  }
  if (dimension === "wallet") {
    return [
      {
        key: tx.walletId || "none",
        label: walById[tx.walletId]?.name || "Tanpa dompet",
        color: walById[tx.walletId]?.color || COLORS.inkSoft,
        amount: Number(tx.amount) || 0,
      },
    ];
  }
  if (dimension === "person") {
    const who = tx.createdBy || "Tidak diketahui";
    return [{ key: who, label: who, color: COLORS.primary, amount: Number(tx.amount) || 0 }];
  }
  // tag: satu transaksi bisa punya beberapa tag, tiap tag dapat nilai penuh
  const tags = tx.tags && tx.tags.length ? tx.tags : ["tanpa-tag"];
  return tags.map((t) => ({ key: t, label: `#${t}`, color: COLORS.primaryLight, amount: Number(tx.amount) || 0 }));
}

function DonutChart({ slices, total, size = 168, stroke = 22 }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={COLORS.border} strokeWidth={stroke} />
        {slices.map((s) => {
          const frac = total > 0 ? s.total / total : 0;
          const len = frac * circumference;
          const el = (
            <circle
              key={s.key}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeDasharray={`${len} ${circumference - len}`}
              strokeDashoffset={-offset}
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
        <div className="text-[10px]" style={{ color: COLORS.inkSoft }}>
          Total
        </div>
        <div className="font-bold leading-tight" style={{ fontSize: 15, color: COLORS.ink }}>
          {fmtShortRupiah(total)}
        </div>
      </div>
    </div>
  );
}

function TrendChart({ months }) {
  const max = Math.max(1, ...months.map((m) => Math.max(m.income, m.expense)));
  return (
    <div className="flex items-end justify-between gap-2" style={{ height: 130 }}>
      {months.map((m) => (
        <div key={m.label} className="flex-1 flex flex-col items-center gap-1.5 h-full">
          <div className="flex-1 w-full flex items-end justify-center gap-1">
            <div
              className="rounded-t"
              style={{ width: "42%", height: `${Math.max(2, (m.income / max) * 100)}%`, background: COLORS.safe }}
              title={`Masuk ${fmtRupiah(m.income)}`}
            />
            <div
              className="rounded-t"
              style={{ width: "42%", height: `${Math.max(2, (m.expense / max) * 100)}%`, background: COLORS.out }}
              title={`Keluar ${fmtRupiah(m.expense)}`}
            />
          </div>
          <div className="text-[10px] shrink-0" style={{ color: COLORS.inkSoft }}>
            {m.label}
          </div>
        </div>
      ))}
    </div>
  );
}

function AnalysisPage({ transactions, catById, walById, onBack, onOpenMenu, onSwitchApp }) {
  const [period, setPeriod] = useState("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [dimension, setDimension] = useState("category");
  const [txType, setTxType] = useState("expense");
  const [drill, setDrill] = useState(null);

  const range = useMemo(() => getRange(period, customFrom, customTo), [period, customFrom, customTo]);
  const prev = useMemo(() => previousRange(range), [range]);

  const scoped = useMemo(
    () => transactions.filter((t) => t.type === txType && inRange(t.date, range)),
    [transactions, txType, range]
  );
  const scopedPrev = useMemo(
    () => transactions.filter((t) => t.type === txType && inRange(t.date, prev)),
    [transactions, txType, prev]
  );

  const total = useMemo(() => scoped.reduce((s, t) => s + (Number(t.amount) || 0), 0), [scoped]);
  const totalPrev = useMemo(() => scopedPrev.reduce((s, t) => s + (Number(t.amount) || 0), 0), [scopedPrev]);

  const groups = useMemo(() => {
    const map = new Map();
    scoped.forEach((t) => {
      breakdownParts(t, dimension, catById, walById).forEach((p) => {
        const cur = map.get(p.key) || { key: p.key, label: p.label, color: p.color, total: 0, count: 0 };
        cur.total += p.amount;
        cur.count += 1;
        map.set(p.key, cur);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [scoped, dimension, catById, walById]);

  const groupsPrev = useMemo(() => {
    const map = new Map();
    scopedPrev.forEach((t) => {
      breakdownParts(t, dimension, catById, walById).forEach((p) => {
        map.set(p.key, (map.get(p.key) || 0) + p.amount);
      });
    });
    return map;
  }, [scopedPrev, dimension, catById, walById]);

  // Tren 6 bulan terakhir (selalu, terlepas dari rentang yang dipilih).
  const trendMonths = useMemo(() => {
    const out = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const ref = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const from = ref;
      const to = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999);
      let income = 0,
        expense = 0;
      transactions.forEach((t) => {
        const d = new Date(t.date);
        if (d < from || d > to) return;
        if (t.type === "income") income += Number(t.amount) || 0;
        else if (t.type === "expense") expense += Number(t.amount) || 0;
      });
      out.push({ label: ref.toLocaleDateString("id-ID", { month: "short" }), income, expense });
    }
    return out;
  }, [transactions]);

  const insights = useMemo(() => {
    const out = [];
    const days = Math.max(1, Math.round((range.end - range.start) / 86400000) + 1);
    const kindWord = txType === "expense" ? "pengeluaran" : "pemasukan";

    if (total > 0) {
      out.push({ tone: "neutral", text: `Rata-rata ${kindWord} ${fmtRupiah(total / days)} per hari selama ${days} hari.` });
    }

    if (totalPrev > 0 && total > 0) {
      const diff = ((total - totalPrev) / totalPrev) * 100;
      const naik = diff >= 0;
      out.push({
        tone: txType === "expense" ? (naik ? "bad" : "good") : naik ? "good" : "bad",
        text: `Total ${kindWord} ${naik ? "naik" : "turun"} ${Math.abs(diff).toFixed(0)}% dibanding periode sebelumnya (${fmtRupiah(totalPrev)}).`,
      });
    }

    if (groups.length > 0 && total > 0) {
      const top = groups[0];
      const share = ((top.total / total) * 100).toFixed(0);
      out.push({ tone: "neutral", text: `Terbesar: ${top.label}, ${fmtRupiah(top.total)} (${share}% dari total).` });

      // Kategori yang melonjak paling tajam dibanding periode sebelumnya.
      let spike = null;
      groups.forEach((g) => {
        const before = groupsPrev.get(g.key) || 0;
        if (before <= 0) return;
        const change = ((g.total - before) / before) * 100;
        if (change >= 30 && (!spike || change > spike.change)) spike = { ...g, change, before };
      });
      if (spike) {
        out.push({
          tone: txType === "expense" ? "bad" : "good",
          text: `${spike.label} melonjak ${spike.change.toFixed(0)}% (dari ${fmtRupiah(spike.before)} jadi ${fmtRupiah(spike.total)}).`,
        });
      }
    }

    // Proyeksi khusus kalau lagi lihat bulan berjalan.
    if (period === "month" && total > 0) {
      const now = new Date();
      const passed = now.getDate();
      const inMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      if (passed < inMonth) {
        const projected = (total / passed) * inMonth;
        out.push({ tone: "neutral", text: `Kalau polanya sama, akhir bulan diperkirakan ${fmtRupiah(projected)}.` });
      }
    }

    // Hari kerja vs akhir pekan.
    let weekday = 0,
      weekend = 0,
      wdDays = new Set(),
      weDays = new Set();
    scoped.forEach((t) => {
      const d = new Date(t.date);
      const key = d.toDateString();
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      if (isWeekend) {
        weekend += Number(t.amount) || 0;
        weDays.add(key);
      } else {
        weekday += Number(t.amount) || 0;
        wdDays.add(key);
      }
    });
    if (wdDays.size > 0 && weDays.size > 0) {
      const wdAvg = weekday / wdDays.size;
      const weAvg = weekend / weDays.size;
      const higher = weAvg > wdAvg;
      out.push({
        tone: "neutral",
        text: `Akhir pekan rata-rata ${fmtRupiah(weAvg)} per hari, hari kerja ${fmtRupiah(wdAvg)} — ${higher ? "lebih boros di akhir pekan" : "lebih hemat di akhir pekan"}.`,
      });
    }

    return out;
  }, [total, totalPrev, groups, groupsPrev, range, period, scoped, txType]);

  const drillTx = useMemo(() => {
    if (!drill) return [];
    return scoped
      .filter((t) => breakdownParts(t, dimension, catById, walById).some((p) => p.key === drill.key))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [drill, scoped, dimension, catById, walById]);

  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 max-w-2xl mx-auto w-full px-4 pb-3" style={{ paddingTop: "env(safe-area-inset-top)", background: COLORS.bg }}>
        <TopBar title="Analisis" onBack={onBack} onOpenMenu={onOpenMenu} onSwitchApp={onSwitchApp} />

        <div className="flex gap-1 p-1 rounded-xl mb-2" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
          {[
            { key: "expense", label: "Pengeluaran", color: COLORS.out },
            { key: "income", label: "Pemasukan", color: COLORS.safe },
          ].map((o) => (
            <button
              key={o.key}
              onClick={() => {
                setTxType(o.key);
                setDrill(null);
              }}
              className="flex-1 py-2 rounded-lg text-sm font-medium"
              style={{ background: txType === o.key ? o.color : "transparent", color: txType === o.key ? "#fff" : COLORS.inkSoft }}
            >
              {o.label}
            </button>
          ))}
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => {
                setPeriod(p.key);
                setDrill(null);
              }}
              className="px-2.5 py-1.5 rounded-full text-xs font-medium shrink-0"
              style={{
                background: period === p.key ? COLORS.primary : COLORS.card,
                color: period === p.key ? "#fff" : COLORS.inkSoft,
                border: `1px solid ${period === p.key ? COLORS.primary : COLORS.border}`,
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ overscrollBehaviorY: "contain", WebkitOverflowScrolling: "touch" }}>
        <div className="max-w-2xl mx-auto px-4 pb-32">
          {period === "custom" && (
            <div className="rounded-2xl p-3 mb-3 flex gap-2" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
              <Field label="Dari" className="flex-1 min-w-0">
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="w-full px-2 py-2 rounded-lg text-xs"
                  style={{ border: `1px solid ${COLORS.border}`, color: COLORS.ink }}
                />
              </Field>
              <Field label="Sampai" className="flex-1 min-w-0">
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="w-full px-2 py-2 rounded-lg text-xs"
                  style={{ border: `1px solid ${COLORS.border}`, color: COLORS.ink }}
                />
              </Field>
            </div>
          )}

          <div className="rounded-2xl p-4 mb-3" style={{ background: COLORS.primary }}>
            <div className="text-xs" style={{ color: "rgba(255,255,255,0.75)" }}>
              {txType === "expense" ? "Total pengeluaran" : "Total pemasukan"} · {fmtRangeLabel(range)}
            </div>
            <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 26, color: "#fff", lineHeight: 1.25 }}>
              {fmtRupiah(total)}
            </div>
            {totalPrev > 0 && (
              <div className="text-xs mt-1.5 flex items-center gap-1" style={{ color: total >= totalPrev ? "#F0C994" : "#BEE0CB" }}>
                {total >= totalPrev ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {total >= totalPrev ? "Naik" : "Turun"} {Math.abs(((total - totalPrev) / totalPrev) * 100).toFixed(0)}% dari periode sebelumnya
              </div>
            )}
          </div>

          {total === 0 ? (
            <div className="py-14 text-center rounded-2xl" style={{ background: COLORS.card, border: `1px dashed ${COLORS.border}` }}>
              <PieChart size={28} color={COLORS.inkSoft} style={{ margin: "0 auto 8px" }} />
              <div style={{ color: COLORS.inkSoft }} className="text-sm">
                Belum ada data di rentang ini.
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-2xl p-4 mb-3" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
                <div className="flex items-center gap-2 mb-3">
                  <PieChart size={16} color={COLORS.primary} />
                  <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 16, color: COLORS.ink }}>Komposisi</div>
                </div>

                <div className="flex gap-1.5 mb-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                  {DIMENSIONS.map((d) => (
                    <button
                      key={d.key}
                      onClick={() => {
                        setDimension(d.key);
                        setDrill(null);
                      }}
                      className="px-2.5 py-1 rounded-full text-[11px] font-medium shrink-0"
                      style={{
                        background: dimension === d.key ? COLORS.primaryLight : COLORS.bg,
                        color: dimension === d.key ? "#fff" : COLORS.inkSoft,
                        border: `1px solid ${dimension === d.key ? COLORS.primaryLight : COLORS.border}`,
                      }}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>

                <DonutChart slices={groups.slice(0, 8)} total={total} />

                <div className="flex flex-col gap-1.5 mt-4">
                  {groups.map((g) => {
                    const before = groupsPrev.get(g.key) || 0;
                    const share = ((g.total / total) * 100).toFixed(0);
                    return (
                      <button
                        key={g.key}
                        onClick={() => setDrill(drill?.key === g.key ? null : g)}
                        className="w-full rounded-xl px-3 py-2.5 text-left"
                        style={{ background: drill?.key === g.key ? `${g.color}14` : COLORS.bg, border: `1px solid ${drill?.key === g.key ? g.color : "transparent"}` }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: g.color }} />
                          <span className="flex-1 min-w-0 text-xs font-medium truncate" style={{ color: COLORS.ink }}>
                            {g.label}
                          </span>
                          <span className="text-xs font-semibold shrink-0" style={{ color: COLORS.ink }}>
                            {fmtShortRupiah(g.total)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: COLORS.border }}>
                            <div style={{ width: `${share}%`, height: "100%", background: g.color }} />
                          </div>
                          <span className="text-[10px] shrink-0" style={{ color: COLORS.inkSoft }}>
                            {share}%
                          </span>
                          {before > 0 && (
                            <span className="text-[10px] shrink-0" style={{ color: g.total >= before ? COLORS.out : COLORS.safe }}>
                              {g.total >= before ? "▲" : "▼"}
                              {Math.abs(((g.total - before) / before) * 100).toFixed(0)}%
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {drill && (
                  <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${COLORS.border}` }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-semibold" style={{ color: COLORS.ink }}>
                        Transaksi {drill.label} ({drillTx.length})
                      </div>
                      <button onClick={() => setDrill(null)}>
                        <X size={14} color={COLORS.inkSoft} />
                      </button>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {drillTx.map((t) => (
                        <div key={t.id} className="rounded-lg px-3 py-2 flex items-center justify-between gap-2" style={{ background: COLORS.bg }}>
                          <div className="min-w-0">
                            <div className="text-xs truncate" style={{ color: COLORS.ink }}>
                              {t.note || catById[t.categoryId]?.name || "Tanpa catatan"}
                            </div>
                            <div className="text-[10px]" style={{ color: COLORS.inkSoft }}>
                              {fmtDateTime(t.date)}
                            </div>
                          </div>
                          <span className="text-xs font-semibold shrink-0" style={{ color: COLORS.ink }}>
                            {fmtShortRupiah(t.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-2xl p-4 mb-3" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 size={16} color={COLORS.primary} />
                    <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 16, color: COLORS.ink }}>Tren 6 Bulan</div>
                  </div>
                  <div className="flex items-center gap-2.5 text-[10px]" style={{ color: COLORS.inkSoft }}>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-sm" style={{ background: COLORS.safe }} /> Masuk
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-sm" style={{ background: COLORS.out }} /> Keluar
                    </span>
                  </div>
                </div>
                <TrendChart months={trendMonths} />
              </div>

              {insights.length > 0 && (
                <div className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={16} color={COLORS.primary} />
                    <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 16, color: COLORS.ink }}>Yang Menarik</div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {insights.map((ins, i) => (
                      <div key={i} className="rounded-xl px-3 py-2.5 text-xs leading-relaxed" style={{ background: COLORS.bg, color: COLORS.ink }}>
                        <span style={{ color: ins.tone === "bad" ? COLORS.out : ins.tone === "good" ? COLORS.safe : COLORS.primaryLight }}>●</span>{" "}
                        {ins.text}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ComingSoonPage({ title, icon: Icon, message, onBack, onOpenMenu, onSwitchApp }) {
  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 max-w-2xl mx-auto w-full px-4 pb-3" style={{ paddingTop: "env(safe-area-inset-top)", background: COLORS.bg }}>
        <TopBar title={title} onBack={onBack} onOpenMenu={onOpenMenu} onSwitchApp={onSwitchApp} />
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 pb-32">
          <div className="rounded-2xl p-8 text-center" style={{ background: COLORS.card, border: `1.5px solid ${COLORS.border}` }}>
            <span className="rounded-full flex items-center justify-center mx-auto mb-3" style={{ width: 44, height: 44, background: COLORS.iconAgendaBg }}>
              <Icon size={20} color={COLORS.iconAgendaFg} />
            </span>
            <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 16, color: COLORS.ink }} className="mb-1">
              Segera hadir
            </div>
            <p className="text-xs" style={{ color: COLORS.iconAgendaFg }}>
              {message}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Modal transaksi ----------------------------------------------------
function TransactionModal({ mode, tx, initialType, categories, wallets, allTags, saving, onClose, onSubmit }) {
  const [type, setType] = useState(tx?.type || initialType || "expense");
  const [amount, setAmount] = useState(tx ? String(tx.amount) : "");
  const [categoryId, setCategoryId] = useState(tx?.categoryId || "");
  const [walletId, setWalletId] = useState(tx?.walletId || wallets[0]?.id || "");
  const [date, setDate] = useState(toLocalInput(tx?.date));
  const [note, setNote] = useState(tx?.note || "");
  const [tags, setTags] = useState(tx?.tags || []);
  const [tagDraft, setTagDraft] = useState("");
  const [isSplit, setIsSplit] = useState(!!(tx?.splits && tx.splits.length));
  const [splits, setSplits] = useState(
    tx?.splits && tx.splits.length ? tx.splits.map((s) => ({ ...s, amount: String(s.amount) })) : [{ categoryId: "", amount: "" }]
  );
  const [error, setError] = useState("");

  const catOptions = categories.filter((c) => c.kind === type);

  useEffect(() => {
    if (categoryId && !catOptions.some((c) => c.id === categoryId)) setCategoryId("");
    setSplits((prev) => prev.map((s) => (catOptions.some((c) => c.id === s.categoryId) ? s : { ...s, categoryId: "" })));
  }, [type]); // eslint-disable-line react-hooks/exhaustive-deps

  // Nominal utama: hasil hitungan kalkulator kalau dipakai.
  const computedAmount = evalAmount(amount);
  const isExpression = amount && !/^[0-9]+$/.test(String(amount).replace(/\s/g, ""));

  const splitTotal = useMemo(
    () => splits.reduce((sum, s) => sum + (evalAmount(s.amount) || 0), 0),
    [splits]
  );

  const addTag = (raw) => {
    const clean = String(raw).trim().replace(/^#/, "").replace(/\s+/g, "-").toLowerCase();
    if (!clean) return;
    setTags((prev) => (prev.includes(clean) ? prev : [...prev, clean]));
    setTagDraft("");
  };

  const suggestions = (allTags || []).filter((t) => !tags.includes(t)).slice(0, 8);

  const updateSplit = (i, patch) => setSplits((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const addSplitRow = () => setSplits((prev) => [...prev, { categoryId: "", amount: "" }]);
  const removeSplitRow = (i) => setSplits((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)));

  const submit = () => {
    const value = computedAmount;
    if (!value || value <= 0) {
      setError("Isi nominalnya dulu.");
      return;
    }
    if (!walletId) {
      setError("Pilih dompetnya dulu.");
      return;
    }

    let splitPayload = null;
    if (isSplit) {
      const rows = splits
        .map((s) => ({ categoryId: s.categoryId, amount: evalAmount(s.amount) || 0 }))
        .filter((s) => s.amount > 0);
      if (rows.length < 2) {
        setError("Isi minimal dua baris pembagian.");
        return;
      }
      if (rows.some((s) => !s.categoryId)) {
        setError("Setiap baris pembagian harus punya kategori.");
        return;
      }
      const sum = rows.reduce((a, s) => a + s.amount, 0);
      if (Math.round(sum) !== Math.round(value)) {
        setError(`Total pembagian (${fmtRupiah(sum)}) belum sama dengan nominal (${fmtRupiah(value)}).`);
        return;
      }
      splitPayload = rows;
    } else if (!categoryId) {
      setError("Pilih kategorinya dulu.");
      return;
    }

    onSubmit({
      type,
      amount: Math.round(value),
      categoryId: isSplit ? splitPayload[0].categoryId : categoryId,
      splits: splitPayload,
      walletId,
      tags,
      date: new Date(date).toISOString(),
      note: note.trim(),
    });
  };

  return (
    <Overlay onClose={onClose}>
      <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 19, color: COLORS.primary }} className="mb-3">
        {mode === "edit" ? "Edit Transaksi" : mode === "duplicate" ? "Duplikat Transaksi" : "Transaksi Baru"}
      </div>

      <div className="flex gap-1 p-1 rounded-xl mb-3" style={{ background: COLORS.bg }}>
        {[
          { key: "expense", label: "Pengeluaran", color: COLORS.out },
          { key: "income", label: "Pemasukan", color: COLORS.safe },
        ].map((o) => (
          <button
            key={o.key}
            onClick={() => setType(o.key)}
            className="flex-1 py-2 rounded-lg text-sm font-medium"
            style={{ background: type === o.key ? o.color : "transparent", color: type === o.key ? "#fff" : COLORS.inkSoft }}
          >
            {o.label}
          </button>
        ))}
      </div>

      <Field label="Nominal" className="mb-3">
        <div className="flex items-center gap-2 px-3 rounded-lg" style={{ border: `1px solid ${COLORS.border}` }}>
          <span className="text-sm font-medium" style={{ color: COLORS.inkSoft }}>
            Rp
          </span>
          <input
            autoFocus
            inputMode="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d+\-*/().x×÷ ]/gi, ""))}
            placeholder="0"
            className="flex-1 py-2.5 bg-transparent font-bold"
            style={{ color: COLORS.ink, fontSize: 18, outline: "none", border: "none" }}
          />
        </div>
        <div className="text-xs mt-1" style={{ color: computedAmount === null && amount ? COLORS.out : COLORS.inkSoft }}>
          {amount
            ? computedAmount === null
              ? "Rumusnya belum benar"
              : isExpression
              ? `= ${fmtRupiah(computedAmount)}`
              : fmtRupiah(computedAmount)
            : "Bisa ketik hitungan, mis. 50000+25000"}
        </div>
      </Field>

      <button
        onClick={() => setIsSplit((v) => !v)}
        className="w-full mb-3 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5"
        style={{
          background: isSplit ? COLORS.primary : COLORS.bg,
          color: isSplit ? "#fff" : COLORS.primary,
          border: `1px solid ${isSplit ? COLORS.primary : COLORS.border}`,
        }}
      >
        <Split size={13} /> {isSplit ? "Pakai satu kategori saja" : "Bagi ke beberapa kategori"}
      </button>

      {isSplit ? (
        <Field label="Pembagian" className="mb-3">
          <div className="flex flex-col gap-2">
            {splits.map((s, i) => (
              <div key={i} className="rounded-lg p-2.5" style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}` }}>
                <div className="flex items-center gap-2 mb-2">
                  <select
                    value={s.categoryId}
                    onChange={(e) => updateSplit(i, { categoryId: e.target.value })}
                    className="flex-1 min-w-0 px-2 py-1.5 rounded-lg text-xs"
                    style={{ border: `1px solid ${COLORS.border}`, background: COLORS.card, color: COLORS.ink }}
                  >
                    <option value="">Pilih kategori</option>
                    {catOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {splits.length > 1 && (
                    <button onClick={() => removeSplitRow(i)} className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ border: `1px solid ${COLORS.out}55` }}>
                      <Trash2 size={12} color={COLORS.out} />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 px-2 rounded-lg" style={{ border: `1px solid ${COLORS.border}`, background: COLORS.card }}>
                  <span className="text-xs" style={{ color: COLORS.inkSoft }}>
                    Rp
                  </span>
                  <input
                    inputMode="text"
                    value={s.amount}
                    onChange={(e) => updateSplit(i, { amount: e.target.value.replace(/[^\d+\-*/().x×÷ ]/gi, "") })}
                    placeholder="0"
                    className="flex-1 py-1.5 bg-transparent text-sm font-semibold"
                    style={{ color: COLORS.ink, outline: "none", border: "none" }}
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={addSplitRow}
            className="w-full mt-2 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5"
            style={{ background: COLORS.card, border: `1px dashed ${COLORS.border}`, color: COLORS.primary }}
          >
            <Plus size={13} /> Tambah baris
          </button>

          <div className="flex items-center justify-between mt-2 text-xs">
            <span style={{ color: COLORS.inkSoft }}>Total pembagian</span>
            <span
              className="font-semibold"
              style={{ color: computedAmount && Math.round(splitTotal) === Math.round(computedAmount) ? COLORS.safe : COLORS.out }}
            >
              {fmtRupiah(splitTotal)}
              {computedAmount ? ` / ${fmtRupiah(computedAmount)}` : ""}
            </span>
          </div>
        </Field>
      ) : (
        <Field label="Kategori" className="mb-3">
          <div className="flex flex-wrap gap-1.5">
            {catOptions.map((c) => {
              const Icon = CATEGORY_ICONS[c.icon] || Tag;
              const active = categoryId === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setCategoryId(c.id)}
                  className="px-2.5 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-medium"
                  style={{
                    background: active ? c.color : COLORS.bg,
                    color: active ? "#fff" : COLORS.inkSoft,
                    border: `1px solid ${active ? c.color : COLORS.border}`,
                  }}
                >
                  <Icon size={12} />
                  {c.name}
                </button>
              );
            })}
          </div>
        </Field>
      )}

      <Field label="Dompet" className="mb-3">
        <div className="flex flex-wrap gap-1.5">
          {wallets.map((w) => {
            const active = walletId === w.id;
            return (
              <button
                key={w.id}
                onClick={() => setWalletId(w.id)}
                className="px-2.5 py-1.5 rounded-full text-xs font-medium"
                style={{
                  background: active ? w.color : COLORS.bg,
                  color: active ? "#fff" : COLORS.inkSoft,
                  border: `1px solid ${active ? w.color : COLORS.border}`,
                }}
              >
                {w.name}
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="Tag (opsional)" className="mb-3">
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {tags.map((t) => (
              <span
                key={t}
                className="px-2 py-1 rounded-full flex items-center gap-1 text-xs font-medium"
                style={{ background: COLORS.primary, color: "#fff" }}
              >
                #{t}
                <button onClick={() => setTags((prev) => prev.filter((x) => x !== t))}>
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        )}
        <input
          value={tagDraft}
          onChange={(e) => setTagDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addTag(tagDraft);
            }
          }}
          onBlur={() => tagDraft && addTag(tagDraft)}
          placeholder="ketik lalu Enter, mis. liburan"
          className="w-full px-3 py-2.5 rounded-lg text-sm"
          style={{ border: `1px solid ${COLORS.border}`, color: COLORS.ink }}
        />
        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {suggestions.map((t) => (
              <button
                key={t}
                onClick={() => addTag(t)}
                className="px-2 py-1 rounded-full text-xs"
                style={{ background: COLORS.bg, color: COLORS.inkSoft, border: `1px solid ${COLORS.border}` }}
              >
                #{t}
              </button>
            ))}
          </div>
        )}
      </Field>

      <Field label="Tanggal & jam" className="mb-3">
        <input
          type="datetime-local"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg text-sm"
          style={{ border: `1px solid ${COLORS.border}`, color: COLORS.ink }}
        />
      </Field>

      <Field label="Catatan (opsional)" className="mb-4">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="mis. belanja mingguan"
          className="w-full px-3 py-2.5 rounded-lg text-sm"
          style={{ border: `1px solid ${COLORS.border}`, color: COLORS.ink }}
        />
      </Field>

      {error && (
        <div className="text-xs mb-3" style={{ color: COLORS.out }}>
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-medium" style={{ border: `1px solid ${COLORS.border}`, color: COLORS.ink }}>
          Batal
        </button>
        <button onClick={submit} disabled={saving} className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white" style={{ background: COLORS.primary, opacity: saving ? 0.6 : 1 }}>
          {saving ? "Menyimpan..." : "Simpan"}
        </button>
      </div>
    </Overlay>
  );
}

// --- Scan struk ---------------------------------------------------------
function ReceiptScanModal({ categories, wallets, transactions, toBuy, aliases, saving, onClose, onSubmit, onMarkBought, onSaveAliases }) {
  const [step, setStep] = useState("pick"); // pick | loading | review
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");
  const [parsed, setParsed] = useState(null);
  const [walletId, setWalletId] = useState(wallets[0]?.id || "");
  const [date, setDate] = useState(toLocalInput());
  const [note, setNote] = useState("");
  const [saveMode, setSaveMode] = useState("single"); // single | split
  const [matches, setMatches] = useState({}); // itemId -> { entryId, name } | null
  const [duplicate, setDuplicate] = useState(null);
  const fileRef = useRef(null);

  const pendingToBuy = useMemo(() => (toBuy || []).filter((e) => !e.bought), [toBuy]);

  const runScan = async (picked) => {
    setStep("loading");
    setError("");
    try {
      const result = await scanReceipt(picked, {
        categories: categories.filter((c) => c.kind === "expense"),
        toBuyNames: pendingToBuy.map((e) => e.itemName),
        aliases: aliases || {},
      });
      setParsed(result);
      if (result.date) setDate(toLocalInput(result.date));
      if (result.store) setNote(result.store);
      const guessed = guessWallet(result.paymentMethod, wallets);
      if (guessed) setWalletId(guessed.id);
      setDuplicate(findDuplicate(result, transactions));
      // Siapkan saran pencocokan ke daftar Akan Dibeli.
      const initial = {};
      result.items.forEach((it) => {
        if (!it.toBuyMatch) return;
        const entry = pendingToBuy.find((e) => e.itemName.toLowerCase() === String(it.toBuyMatch).toLowerCase());
        if (entry) initial[it.id] = { entryId: entry.id, name: entry.itemName, accepted: null };
      });
      setMatches(initial);
      setStep("review");
    } catch (err) {
      if (err.message === "NO_API_KEY") {
        setError("NO_API_KEY");
      } else {
        setError(err.message || "Gagal membaca struk.");
      }
      setStep("pick");
    }
  };

  const handlePick = (e) => {
    const picked = Array.from(e.target.files || []);
    if (!picked.length) return;
    setFiles(picked);
    runScan(picked);
  };

  const updateItem = (id, patch) =>
    setParsed((p) => ({ ...p, items: p.items.map((it) => (it.id === id ? { ...it, ...patch } : it)) }));

  const removeItem = (id) => setParsed((p) => ({ ...p, items: p.items.filter((it) => it.id !== id) }));

  const addItem = () =>
    setParsed((p) => ({
      ...p,
      items: [
        ...p.items,
        { id: `ri-new-${Date.now()}`, rawName: "", name: "", qty: 1, unitPrice: 0, subtotal: 0, discount: 0, categoryId: "", toBuyMatch: null, confident: true },
      ],
    }));

  const itemsTotal = useMemo(
    () => (parsed ? parsed.items.reduce((s, it) => s + (Number(it.subtotal) || 0), 0) : 0),
    [parsed]
  );

  const expenseCats = categories.filter((c) => c.kind === "expense");

  const submit = () => {
    if (!parsed) return;
    const amount = Math.round(parsed.total || itemsTotal);
    if (!amount) {
      setError("Totalnya belum keisi.");
      return;
    }
    if (!walletId) {
      setError("Pilih dompetnya dulu.");
      return;
    }

    let splits = null;
    if (saveMode === "split") {
      const byCat = new Map();
      parsed.items.forEach((it) => {
        if (!it.categoryId || !it.subtotal) return;
        byCat.set(it.categoryId, (byCat.get(it.categoryId) || 0) + Number(it.subtotal));
      });
      if (byCat.size < 2) {
        setError("Butuh minimal dua kategori berbeda untuk dipecah. Pilih 'Satu transaksi' saja.");
        return;
      }
      const rows = Array.from(byCat.entries()).map(([categoryId, amt]) => ({ categoryId, amount: Math.round(amt) }));
      const sum = rows.reduce((a, r) => a + r.amount, 0);
      // Selisih pembulatan/pajak ditempelkan ke baris pertama supaya pas.
      if (sum !== amount && rows.length) rows[0].amount += amount - sum;
      splits = rows;
    }

    const fallbackCat = parsed.items.find((it) => it.categoryId)?.categoryId || expenseCats[0]?.id || "";

    onSubmit({
      type: "expense",
      amount,
      categoryId: splits ? splits[0].categoryId : fallbackCat,
      splits,
      walletId,
      tags: [],
      date: new Date(date).toISOString(),
      note: note.trim(),
    });

    // Centang item di Akan Dibeli yang disetujui, lalu simpan padanan namanya.
    const accepted = Object.entries(matches).filter(([, m]) => m && m.accepted === true);
    if (accepted.length) {
      onMarkBought(accepted.map(([, m]) => m.entryId));
      const newAliases = { ...(aliases || {}) };
      accepted.forEach(([itemId, m]) => {
        const it = parsed.items.find((x) => x.id === itemId);
        if (it && it.rawName) newAliases[it.rawName.toLowerCase()] = m.name;
      });
      onSaveAliases(newAliases);
    }
  };

  return (
    <Overlay onClose={onClose}>
      <div className="flex items-center gap-2 mb-3">
        <ScanLine size={18} color={COLORS.primary} />
        <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 19, color: COLORS.primary }}>Scan Struk</div>
      </div>

      {step === "pick" && (
        <>
          {error === "NO_API_KEY" ? (
            <div className="rounded-xl p-3.5 mb-3" style={{ background: COLORS.lowBg, border: `1px solid ${COLORS.low}55` }}>
              <div className="text-sm font-semibold mb-1" style={{ color: COLORS.low }}>
                Fitur scan belum aktif
              </div>
              <p className="text-xs leading-relaxed" style={{ color: COLORS.ink }}>
                API key Gemini belum dipasang. Buka Google AI Studio untuk ambil key gratis, lalu tambahkan sebagai
                <span className="font-semibold"> VITE_GEMINI_API_KEY</span> di pengaturan Vercel.
              </p>
            </div>
          ) : error ? (
            <div className="rounded-xl p-3 mb-3 text-xs" style={{ background: COLORS.outBg, color: COLORS.out }}>
              {error}
            </div>
          ) : null}

          <p className="text-sm mb-4" style={{ color: COLORS.inkSoft }}>
            Foto struknya, nanti AI yang baca isinya. Struk panjang boleh difoto beberapa kali sekaligus.
          </p>

          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePick} />

          <button
            onClick={() => fileRef.current?.click()}
            className="w-full py-3 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-2 mb-2"
            style={{ background: COLORS.primary }}
          >
            <Camera size={16} /> Pilih atau ambil foto
          </button>

          <button onClick={onClose} className="w-full py-2.5 rounded-lg text-sm font-medium" style={{ border: `1px solid ${COLORS.border}`, color: COLORS.ink }}>
            Batal
          </button>
        </>
      )}

      {step === "loading" && (
        <div className="py-10 text-center">
          <div className="scan-pulse rounded-full mx-auto mb-3 flex items-center justify-center" style={{ width: 52, height: 52, background: COLORS.iconAgendaBg }}>
            <ScanLine size={22} color={COLORS.iconAgendaFg} />
          </div>
          <div className="text-sm font-medium" style={{ color: COLORS.ink }}>
            Membaca struk...
          </div>
          <div className="text-xs mt-1" style={{ color: COLORS.inkSoft }}>
            {files.length > 1 ? `${files.length} foto` : "Sebentar ya"}
          </div>
        </div>
      )}

      {step === "review" && parsed && (
        <>
          {duplicate && (
            <div className="rounded-xl p-3 mb-3" style={{ background: COLORS.lowBg, border: `1px solid ${COLORS.low}55` }}>
              <div className="text-xs font-semibold mb-0.5" style={{ color: COLORS.low }}>
                Sepertinya sudah pernah dicatat
              </div>
              <div className="text-[11px]" style={{ color: COLORS.ink }}>
                Ada transaksi {fmtRupiah(duplicate.amount)} pada {fmtDateTime(duplicate.date)}. Cek dulu biar gak dobel.
              </div>
            </div>
          )}

          {parsed.mismatch !== 0 && (
            <div className="rounded-xl p-3 mb-3 text-[11px]" style={{ background: COLORS.outBg, color: COLORS.out }}>
              Jumlah barang belum pas dengan total struk (selisih {fmtRupiah(Math.abs(parsed.mismatch))}). Cek lagi daftarnya.
            </div>
          )}

          {parsed.notes && (
            <div className="rounded-xl p-3 mb-3 text-[11px]" style={{ background: COLORS.bg, color: COLORS.inkSoft }}>
              Catatan AI: {parsed.notes}
            </div>
          )}

          <Field label="Toko / catatan" className="mb-3">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm"
              style={{ border: `1px solid ${COLORS.border}`, color: COLORS.ink }}
            />
          </Field>

          <Field label={`Barang (${parsed.items.length})`} className="mb-3">
            <div className="flex flex-col gap-2">
              {parsed.items.map((it) => {
                const match = matches[it.id];
                return (
                  <div
                    key={it.id}
                    className="rounded-lg p-2.5"
                    style={{ background: COLORS.bg, border: `1px solid ${it.confident ? COLORS.border : COLORS.low}` }}
                  >
                    {!it.confident && (
                      <div className="text-[10px] mb-1.5 flex items-center gap-1" style={{ color: COLORS.low }}>
                        <AlertTriangle size={10} /> AI kurang yakin, cek nama & harganya
                      </div>
                    )}
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        value={it.name}
                        onChange={(e) => updateItem(it.id, { name: e.target.value })}
                        placeholder="Nama barang"
                        className="flex-1 min-w-0 px-2 py-1.5 rounded-lg text-xs"
                        style={{ border: `1px solid ${COLORS.border}`, background: COLORS.card, color: COLORS.ink }}
                      />
                      <button onClick={() => removeItem(it.id)} className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ border: `1px solid ${COLORS.out}55` }}>
                        <Trash2 size={12} color={COLORS.out} />
                      </button>
                    </div>

                    {it.rawName && it.rawName !== it.name && (
                      <div className="text-[10px] mb-1.5" style={{ color: COLORS.inkSoft }}>
                        Di struk: {it.rawName}
                      </div>
                    )}

                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center gap-1 px-2 rounded-lg shrink-0" style={{ border: `1px solid ${COLORS.border}`, background: COLORS.card }}>
                        <span className="text-[10px]" style={{ color: COLORS.inkSoft }}>
                          x
                        </span>
                        <input
                          inputMode="numeric"
                          value={it.qty}
                          onChange={(e) => updateItem(it.id, { qty: Number(e.target.value.replace(/[^\d]/g, "")) || 0 })}
                          className="py-1.5 bg-transparent text-xs"
                          style={{ width: 32, color: COLORS.ink, outline: "none", border: "none" }}
                        />
                      </div>
                      <div className="flex items-center gap-1 px-2 rounded-lg flex-1 min-w-0" style={{ border: `1px solid ${COLORS.border}`, background: COLORS.card }}>
                        <span className="text-[10px]" style={{ color: COLORS.inkSoft }}>
                          Rp
                        </span>
                        <input
                          inputMode="numeric"
                          value={it.subtotal}
                          onChange={(e) => updateItem(it.id, { subtotal: Number(e.target.value.replace(/[^\d]/g, "")) || 0 })}
                          className="flex-1 min-w-0 py-1.5 bg-transparent text-xs font-semibold"
                          style={{ color: COLORS.ink, outline: "none", border: "none" }}
                        />
                      </div>
                    </div>

                    <select
                      value={it.categoryId}
                      onChange={(e) => updateItem(it.id, { categoryId: e.target.value })}
                      className="w-full px-2 py-1.5 rounded-lg text-xs"
                      style={{ border: `1px solid ${COLORS.border}`, background: COLORS.card, color: COLORS.ink }}
                    >
                      <option value="">Tanpa kategori</option>
                      {expenseCats.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>

                    {match && match.accepted === null && (
                      <div className="mt-2 rounded-lg p-2" style={{ background: COLORS.card, border: `1px dashed ${COLORS.primaryLight}` }}>
                        <div className="text-[10px] mb-1.5" style={{ color: COLORS.ink }}>
                          Sepertinya ini <span className="font-semibold">{match.name}</span> di daftar Akan Dibeli. Cocokkan?
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => setMatches((m) => ({ ...m, [it.id]: { ...match, accepted: true } }))}
                            className="flex-1 py-1 rounded text-[10px] font-medium text-white"
                            style={{ background: COLORS.safe }}
                          >
                            Ya, cocok
                          </button>
                          <button
                            onClick={() => setMatches((m) => ({ ...m, [it.id]: { ...match, accepted: false } }))}
                            className="flex-1 py-1 rounded text-[10px] font-medium"
                            style={{ border: `1px solid ${COLORS.border}`, color: COLORS.inkSoft }}
                          >
                            Bukan
                          </button>
                        </div>
                      </div>
                    )}
                    {match && match.accepted === true && (
                      <div className="mt-2 text-[10px] flex items-center gap-1" style={{ color: COLORS.safe }}>
                        <Check size={11} /> Bakal dicentang di Akan Dibeli: {match.name}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={addItem}
              className="w-full mt-2 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5"
              style={{ background: COLORS.card, border: `1px dashed ${COLORS.border}`, color: COLORS.primary }}
            >
              <Plus size={13} /> Tambah barang
            </button>
          </Field>

          <div className="rounded-xl p-3 mb-3" style={{ background: COLORS.bg }}>
            {[
              ["Jumlah barang", itemsTotal],
              parsed.discountTotal ? ["Diskon", -parsed.discountTotal] : null,
              parsed.tax ? ["Pajak", parsed.tax] : null,
              parsed.serviceCharge ? ["Biaya layanan", parsed.serviceCharge] : null,
              parsed.rounding ? ["Pembulatan", parsed.rounding] : null,
            ]
              .filter(Boolean)
              .map(([label, val]) => (
                <div key={label} className="flex justify-between text-[11px] mb-1" style={{ color: COLORS.inkSoft }}>
                  <span>{label}</span>
                  <span>{fmtRupiah(val)}</span>
                </div>
              ))}
            <div className="flex justify-between items-center pt-2 mt-1" style={{ borderTop: `1px solid ${COLORS.border}` }}>
              <span className="text-xs font-semibold" style={{ color: COLORS.ink }}>
                Total
              </span>
              <div className="flex items-center gap-1 px-2 rounded-lg" style={{ border: `1px solid ${COLORS.border}`, background: COLORS.card }}>
                <span className="text-[10px]" style={{ color: COLORS.inkSoft }}>
                  Rp
                </span>
                <input
                  inputMode="numeric"
                  value={parsed.total}
                  onChange={(e) => setParsed((p) => ({ ...p, total: Number(e.target.value.replace(/[^\d]/g, "")) || 0 }))}
                  className="py-1.5 bg-transparent text-sm font-bold text-right"
                  style={{ width: 96, color: COLORS.ink, outline: "none", border: "none" }}
                />
              </div>
            </div>
          </div>

          <Field label="Simpan sebagai" className="mb-3">
            <div className="flex gap-1 p-1 rounded-xl" style={{ background: COLORS.bg }}>
              {[
                { key: "single", label: "Satu transaksi" },
                { key: "split", label: "Pecah per kategori" },
              ].map((o) => (
                <button
                  key={o.key}
                  onClick={() => setSaveMode(o.key)}
                  className="flex-1 py-2 rounded-lg text-xs font-medium"
                  style={{ background: saveMode === o.key ? COLORS.primary : "transparent", color: saveMode === o.key ? "#fff" : COLORS.inkSoft }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Dompet" className="mb-3">
            <div className="flex flex-wrap gap-1.5">
              {wallets.map((w) => (
                <button
                  key={w.id}
                  onClick={() => setWalletId(w.id)}
                  className="px-2.5 py-1.5 rounded-full text-xs font-medium"
                  style={{
                    background: walletId === w.id ? w.color : COLORS.bg,
                    color: walletId === w.id ? "#fff" : COLORS.inkSoft,
                    border: `1px solid ${walletId === w.id ? w.color : COLORS.border}`,
                  }}
                >
                  {w.name}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Tanggal & jam" className="mb-4">
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm"
              style={{ border: `1px solid ${COLORS.border}`, color: COLORS.ink }}
            />
          </Field>

          {error && error !== "NO_API_KEY" && (
            <div className="text-xs mb-3" style={{ color: COLORS.out }}>
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-medium" style={{ border: `1px solid ${COLORS.border}`, color: COLORS.ink }}>
              Batal
            </button>
            <button onClick={submit} disabled={saving} className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white" style={{ background: COLORS.primary, opacity: saving ? 0.6 : 1 }}>
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </>
      )}
    </Overlay>
  );
}

// --- Modal transfer -----------------------------------------------------
function TransferModal({ tx, wallets, saving, onClose, onSubmit }) {
  const [amount, setAmount] = useState(tx ? String(tx.amount) : "");
  const [fromId, setFromId] = useState(tx?.walletId || wallets[0]?.id || "");
  const [toId, setToId] = useState(tx?.toWalletId || wallets[1]?.id || "");
  const [fee, setFee] = useState(tx?.fee ? String(tx.fee) : "");
  const [date, setDate] = useState(toLocalInput(tx?.date));
  const [note, setNote] = useState(tx?.note || "");
  const [error, setError] = useState("");

  const submit = () => {
    const value = Number(String(amount).replace(/[^\d]/g, ""));
    if (!value || value <= 0) {
      setError("Isi nominalnya dulu.");
      return;
    }
    if (!fromId || !toId) {
      setError("Pilih dompet asal dan tujuan.");
      return;
    }
    if (fromId === toId) {
      setError("Dompet asal dan tujuan gak boleh sama.");
      return;
    }
    onSubmit({
      type: "transfer",
      amount: value,
      fee: Number(String(fee).replace(/[^\d]/g, "")) || 0,
      walletId: fromId,
      toWalletId: toId,
      categoryId: "",
      date: new Date(date).toISOString(),
      note: note.trim(),
    });
  };

  return (
    <Overlay onClose={onClose}>
      <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 19, color: COLORS.primary }} className="mb-3">
        {tx ? "Edit Transfer" : "Transfer Antar Dompet"}
      </div>

      <Field label="Nominal" className="mb-3">
        <div className="flex items-center gap-2 px-3 rounded-lg" style={{ border: `1px solid ${COLORS.border}` }}>
          <span className="text-sm font-medium" style={{ color: COLORS.inkSoft }}>
            Rp
          </span>
          <input
            autoFocus
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="0"
            className="flex-1 py-2.5 bg-transparent font-bold"
            style={{ color: COLORS.ink, fontSize: 18, outline: "none", border: "none" }}
          />
        </div>
      </Field>

      <Field label="Dari dompet" className="mb-3">
        <div className="flex flex-wrap gap-1.5">
          {wallets.map((w) => (
            <button
              key={w.id}
              onClick={() => setFromId(w.id)}
              className="px-2.5 py-1.5 rounded-full text-xs font-medium"
              style={{
                background: fromId === w.id ? w.color : COLORS.bg,
                color: fromId === w.id ? "#fff" : COLORS.inkSoft,
                border: `1px solid ${fromId === w.id ? w.color : COLORS.border}`,
              }}
            >
              {w.name}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Ke dompet" className="mb-3">
        <div className="flex flex-wrap gap-1.5">
          {wallets.map((w) => (
            <button
              key={w.id}
              onClick={() => setToId(w.id)}
              className="px-2.5 py-1.5 rounded-full text-xs font-medium"
              style={{
                background: toId === w.id ? w.color : COLORS.bg,
                color: toId === w.id ? "#fff" : COLORS.inkSoft,
                border: `1px solid ${toId === w.id ? w.color : COLORS.border}`,
              }}
            >
              {w.name}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Biaya admin (opsional)" className="mb-3">
        <input
          inputMode="numeric"
          value={fee}
          onChange={(e) => setFee(e.target.value.replace(/[^\d]/g, ""))}
          placeholder="0"
          className="w-full px-3 py-2.5 rounded-lg text-sm"
          style={{ border: `1px solid ${COLORS.border}`, color: COLORS.ink }}
        />
      </Field>

      <Field label="Tanggal & jam" className="mb-3">
        <input
          type="datetime-local"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg text-sm"
          style={{ border: `1px solid ${COLORS.border}`, color: COLORS.ink }}
        />
      </Field>

      <Field label="Catatan (opsional)" className="mb-4">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="mis. tarik tunai"
          className="w-full px-3 py-2.5 rounded-lg text-sm"
          style={{ border: `1px solid ${COLORS.border}`, color: COLORS.ink }}
        />
      </Field>

      {error && (
        <div className="text-xs mb-3" style={{ color: COLORS.out }}>
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-medium" style={{ border: `1px solid ${COLORS.border}`, color: COLORS.ink }}>
          Batal
        </button>
        <button onClick={submit} disabled={saving} className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white" style={{ background: COLORS.primary, opacity: saving ? 0.6 : 1 }}>
          {saving ? "Menyimpan..." : "Simpan"}
        </button>
      </div>
    </Overlay>
  );
}

// --- Modal dompet -------------------------------------------------------
function WalletModal({ mode, wallet, saving, onClose, onSubmit }) {
  const [name, setName] = useState(wallet?.name || "");
  const [icon, setIcon] = useState(wallet?.icon || "cash");
  const [color, setColor] = useState(wallet?.color || CATEGORY_COLORS[1]);
  const [initialBalance, setInitialBalance] = useState(wallet ? String(wallet.initialBalance || 0) : "");
  const [error, setError] = useState("");

  const submit = () => {
    if (!name.trim()) {
      setError("Isi nama dompetnya dulu.");
      return;
    }
    onSubmit({
      name: name.trim(),
      icon,
      color,
      initialBalance: Number(String(initialBalance).replace(/[^\d-]/g, "")) || 0,
    });
  };

  return (
    <Overlay onClose={onClose}>
      <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 19, color: COLORS.primary }} className="mb-3">
        {mode === "edit" ? "Edit Dompet" : "Dompet Baru"}
      </div>

      <Field label="Nama dompet" className="mb-3">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="mis. BCA, GoPay, Tunai"
          className="w-full px-3 py-2.5 rounded-lg text-sm"
          style={{ border: `1px solid ${COLORS.border}`, color: COLORS.ink }}
        />
      </Field>

      <Field label="Jenis" className="mb-3">
        <div className="flex gap-1.5">
          {[
            { key: "cash", label: "Tunai" },
            { key: "bank", label: "Bank" },
            { key: "ewallet", label: "E-Wallet" },
            { key: "card", label: "Kartu" },
          ].map((o) => {
            const Icon = WALLET_ICONS[o.key];
            const active = icon === o.key;
            return (
              <button
                key={o.key}
                onClick={() => setIcon(o.key)}
                className="flex-1 py-2 rounded-lg flex flex-col items-center gap-1 text-[11px] font-medium"
                style={{
                  background: active ? COLORS.primary : COLORS.bg,
                  color: active ? "#fff" : COLORS.inkSoft,
                  border: `1px solid ${active ? COLORS.primary : COLORS.border}`,
                }}
              >
                <Icon size={15} />
                {o.label}
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="Warna" className="mb-3">
        <div className="flex flex-wrap gap-2">
          {CATEGORY_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: c, border: color === c ? `2.5px solid ${COLORS.ink}` : "none" }}
            >
              {color === c && <Check size={14} color="#fff" />}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Saldo awal" className="mb-4">
        <div className="flex items-center gap-2 px-3 rounded-lg" style={{ border: `1px solid ${COLORS.border}` }}>
          <span className="text-sm font-medium" style={{ color: COLORS.inkSoft }}>
            Rp
          </span>
          <input
            inputMode="numeric"
            value={initialBalance}
            onChange={(e) => setInitialBalance(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="0"
            className="flex-1 py-2.5 bg-transparent text-sm"
            style={{ color: COLORS.ink, outline: "none", border: "none" }}
          />
        </div>
        <div className="text-[11px] mt-1" style={{ color: COLORS.inkSoft }}>
          Isi saldo yang ada sekarang. Transaksi berikutnya bakal dihitung dari sini.
        </div>
      </Field>

      {error && (
        <div className="text-xs mb-3" style={{ color: COLORS.out }}>
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-medium" style={{ border: `1px solid ${COLORS.border}`, color: COLORS.ink }}>
          Batal
        </button>
        <button onClick={submit} disabled={saving} className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white" style={{ background: COLORS.primary, opacity: saving ? 0.6 : 1 }}>
          {saving ? "Menyimpan..." : "Simpan"}
        </button>
      </div>
    </Overlay>
  );
}

// --- Panel & modal kategori --------------------------------------------
function CategoryPanel({ categories, onClose, onAdd, onEdit, onDelete }) {
  const [kind, setKind] = useState("expense");
  const list = categories.filter((c) => c.kind === kind);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: "rgba(43,42,37,0.45)" }} onClick={onClose}>
      <div
        className="w-full sm:max-w-sm h-full overflow-y-auto p-5"
        style={{ background: COLORS.bg, paddingTop: "calc(env(safe-area-inset-top) + 1.25rem)", overscrollBehaviorY: "contain" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Tag size={18} color={COLORS.primary} />
            <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 19, color: COLORS.primary }}>Kategori</div>
          </div>
          <button onClick={onClose}>
            <X size={18} color={COLORS.inkSoft} />
          </button>
        </div>

        <div className="flex gap-1 p-1 rounded-xl mb-3" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
          {[
            { key: "expense", label: "Pengeluaran" },
            { key: "income", label: "Pemasukan" },
          ].map((o) => (
            <button
              key={o.key}
              onClick={() => setKind(o.key)}
              className="flex-1 py-2 rounded-lg text-sm font-medium"
              style={{ background: kind === o.key ? COLORS.primary : "transparent", color: kind === o.key ? "#fff" : COLORS.ink }}
            >
              {o.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2 mb-3">
          {list.map((c) => {
            const Icon = CATEGORY_ICONS[c.icon] || Tag;
            return (
              <div key={c.id} className="rounded-xl p-3 flex items-center gap-2.5" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
                <span className="shrink-0 rounded-full flex items-center justify-center" style={{ width: 34, height: 34, background: `${c.color}1F` }}>
                  <Icon size={15} color={c.color} />
                </span>
                <span className="flex-1 min-w-0 text-sm font-medium truncate" style={{ color: COLORS.ink }}>
                  {c.name}
                </span>
                <button onClick={() => onEdit(c)} className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ border: `1px solid ${COLORS.border}` }}>
                  <Pencil size={12} color={COLORS.ink} />
                </button>
                <button onClick={() => onDelete(c)} className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ border: `1px solid ${COLORS.out}55` }}>
                  <Trash2 size={12} color={COLORS.out} />
                </button>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => onAdd(kind)}
          className="w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5"
          style={{ background: COLORS.card, border: `1px dashed ${COLORS.border}`, color: COLORS.primary }}
        >
          <Plus size={15} /> Tambah kategori
        </button>
      </div>
    </div>
  );
}

function CategoryModal({ mode, category, initialKind, saving, onClose, onSubmit }) {
  const [name, setName] = useState(category?.name || "");
  const [kind] = useState(category?.kind || initialKind || "expense");
  const [icon, setIcon] = useState(category?.icon || "tag");
  const [color, setColor] = useState(category?.color || CATEGORY_COLORS[0]);
  const [error, setError] = useState("");

  const submit = () => {
    if (!name.trim()) {
      setError("Isi nama kategorinya dulu.");
      return;
    }
    onSubmit({ name: name.trim(), kind, icon, color });
  };

  return (
    <Overlay onClose={onClose}>
      <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 19, color: COLORS.primary }} className="mb-3">
        {mode === "edit" ? "Edit Kategori" : "Kategori Baru"}
      </div>

      <Field label="Nama kategori" className="mb-3">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="mis. Jajan"
          className="w-full px-3 py-2.5 rounded-lg text-sm"
          style={{ border: `1px solid ${COLORS.border}`, color: COLORS.ink }}
        />
      </Field>

      <Field label="Ikon" className="mb-3">
        <div className="flex flex-wrap gap-1.5">
          {Object.keys(CATEGORY_ICONS).map((key) => {
            const Icon = CATEGORY_ICONS[key];
            const active = icon === key;
            return (
              <button
                key={key}
                onClick={() => setIcon(key)}
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{
                  background: active ? color : COLORS.bg,
                  border: `1px solid ${active ? color : COLORS.border}`,
                }}
              >
                <Icon size={16} color={active ? "#fff" : COLORS.inkSoft} />
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="Warna" className="mb-4">
        <div className="flex flex-wrap gap-2">
          {CATEGORY_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: c, border: color === c ? `2.5px solid ${COLORS.ink}` : "none" }}
            >
              {color === c && <Check size={14} color="#fff" />}
            </button>
          ))}
        </div>
      </Field>

      {error && (
        <div className="text-xs mb-3" style={{ color: COLORS.out }}>
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-medium" style={{ border: `1px solid ${COLORS.border}`, color: COLORS.ink }}>
          Batal
        </button>
        <button onClick={submit} disabled={saving} className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white" style={{ background: COLORS.primary, opacity: saving ? 0.6 : 1 }}>
          {saving ? "Menyimpan..." : "Simpan"}
        </button>
      </div>
    </Overlay>
  );
}

// --- Menu ---------------------------------------------------------------
function MenuPanel({ userName, onClose, onOpenCategories, onSwitchApp, onLogout }) {
  const runAndClose = (fn) => {
    onClose();
    if (fn) setTimeout(fn, 60);
  };

  const Item = ({ icon: Icon, label, onClick, last, danger }) => (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
      style={{ borderBottom: last ? "none" : `1px solid ${COLORS.border}` }}
    >
      <Icon size={16} color={danger ? COLORS.out : COLORS.ink} />
      <span className="text-sm font-medium" style={{ color: danger ? COLORS.out : COLORS.ink }}>
        {label}
      </span>
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: "rgba(43,42,37,0.45)" }} onClick={onClose}>
      <div
        className="w-full sm:max-w-sm h-full overflow-y-auto p-5"
        style={{ background: COLORS.bg, paddingTop: "calc(env(safe-area-inset-top) + 1.25rem)", overscrollBehaviorY: "contain" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: COLORS.iconAgendaBg }}>
              <User size={17} color={COLORS.iconAgendaFg} />
            </span>
            <div>
              <div className="text-sm font-semibold" style={{ color: COLORS.ink }}>
                {userName || "Pengguna"}
              </div>
              <div className="text-xs" style={{ color: COLORS.inkSoft }}>
                Kas Rumah
              </div>
            </div>
          </div>
          <button onClick={onClose}>
            <X size={18} color={COLORS.inkSoft} />
          </button>
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
          <Item icon={Tag} label="Kelola Kategori" onClick={() => runAndClose(onOpenCategories)} last />
        </div>

        <div className="rounded-2xl overflow-hidden mt-3" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
          <Item icon={LayoutGrid} label="Ganti Aplikasi" onClick={() => runAndClose(onSwitchApp)} />
          <Item icon={LogOut} label="Keluar" onClick={() => runAndClose(onLogout)} last danger />
        </div>
      </div>
    </div>
  );
}
