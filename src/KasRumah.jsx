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
  ChevronDown,
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
  Clock3,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { storageSet, storageSubscribe } from "./firebase";
import { SharedStyles } from "./SharedStyles";
import { scanReceipt, guessWallet, findDuplicate } from "./receiptScan";
import {
  Sheet,
  Drawer,
  BottomNav as NavBar,
  FilterTile as Tile,
  TabPager,
  RollingNumber,
  Backdrop,
  Rise,
  FadeSwap,
  AnimatedList,
  Stagger,
  StaggerItem,
  Collapse,
  CardRings,
  AutoHeight,
  CollapseList,
  Segmented,
  Chip,
  Hero,
  highlightMotion,
  SPRING,
  DUR,
  EASE,
} from "./ui";

// Palet khusus Kas Rumah — hijau hutan pekat dengan aksen oranye.
const COLORS = {
  bg: "#F7F6F0",
  card: "#FFFFFF",
  ink: "#12301E",
  inkSoft: "#7A867D",
  primary: "#12301E",
  primaryDeep: "#0D2417",
  primaryHover: "#17402A",
  primaryLight: "#2E7D51",
  mint: "#6FB68A",
  accent: "#DC8A2C",
  accentDeep: "#B9741F",
  safe: "#2E7D51",
  safeBg: "#E4F0E6",
  low: "#DC8A2C",
  lowBg: "#F7EADC",
  out: "#C0472F",
  outBg: "#F8E4DF",
  border: "#E5E3D8",
  soft: "#F2F0E7",
  track: "#EFEDE4",
  // Teks yang lebih pekat supaya tetap terbaca di atas putih.
  muted: "#66736A",
  expenseText: "#9A3A26",
  // Latar ikon bulat
  iconBuyBg: "#F7EADC",
  iconBuyFg: "#B9741F",
  iconBuyText: "#B9741F",
  iconAgendaBg: "#E4F0E6",
  iconAgendaFg: "#2E7D51",
  iconAgendaText: "#2E7D51",
  iconStockBg: "#EAF3EC",
  iconStockFg: "#2E7D51",
};

const KAS_FONT = "'Poppins', system-ui, sans-serif";

// Warna pendar saat transaksi dituju dari beranda/notifikasi.
const HIGHLIGHT_RGB = "220,138,44";

const TAB_ORDER = ["dashboard", "transactions", "wallets"];

const KAS_TABS = [
  { key: "dashboard", label: "Beranda", icon: Home },
  { key: "transactions", label: "Transaksi", icon: Receipt },
  { key: "wallets", label: "Dompet", icon: Wallet },
];

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
// Jendela formulir Kas — Sheet bersama dengan font dan warna Kas Rumah.
// Sheet dirender lewat portal ke <body>, jadi font dan warna teks harus
// diberikan di sini (tidak lagi mewarisi dari halaman).
function Overlay({ children, onClose, padded = true }) {
  return (
    <Sheet onClose={onClose} background={COLORS.card} font={KAS_FONT} color={COLORS.ink} padded={padded}>
      {children}
    </Sheet>
  );
}

// Panel samping Kas (menu, kategori) — Drawer bersama.
function SidePanel({ children, onClose }) {
  return (
    <Drawer onClose={onClose} background={COLORS.bg} font={KAS_FONT} color={COLORS.ink}>
      {children}
    </Drawer>
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

// Kartu filter — komponen bersama dengan warna hijau pekat Kas Rumah.
function FilterTile(props) {
  return <Tile activeBg={COLORS.primary} inkSoft={COLORS.inkSoft} valueFont={KAS_FONT} shadowRgb="18,48,30" {...props} />;
}

function SearchBox({ value, onChange, placeholder }) {
  return (
    <div
      className="flex items-center gap-2.5"
      style={{ background: COLORS.card, borderRadius: 999, padding: "12px 18px", boxShadow: "0 2px 10px rgba(18,48,30,0.05)" }}
    >
      <Search size={18} color={COLORS.inkSoft} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent"
        style={{ color: COLORS.ink, fontSize: 14, outline: "none", border: "none" }}
      />
      {value && (
        <button onClick={() => onChange("")} className="shrink-0">
          <X size={15} color={COLORS.inkSoft} />
        </button>
      )}
    </div>
  );
}

function TopBar({ title, onBack, rightSlot, onOpenMenu, onSwitchApp, notifSlot }) {
  return (
    <div className="flex items-center justify-between gap-2 pt-4 pb-4">
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
          style={{ background: COLORS.card, boxShadow: "0 2px 8px rgba(43,42,37,0.10)" }}
          title="Kembali"
        >
          <ArrowLeft size={17} color={COLORS.ink} />
        </button>
        <h1 className="truncate" style={{ fontFamily: KAS_FONT, fontWeight: 700, fontSize: 26, color: COLORS.primary }}>
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {rightSlot}
        {notifSlot}
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
          title="Menu"
        >
          <Menu size={16} color={COLORS.ink} />
        </button>
      </div>
    </div>
  );
}

// --- App utama ----------------------------------------------------------
// Simpanan data terakhir selama aplikasi masih terbuka. Tanpa ini, Kas Rumah
// menampilkan layar "Memuat data..." setiap kali dibuka ulang dari halaman
// awal.
let kasCache = { wallets: null, categories: null, transactions: null, toBuy: null, aliases: null };

export default function KasRumahApp({
  userName,
  onBackToPicker,
  onLogout,
  onSwitchApp,
  notifSlot,
  notifSlotDark,
  initialHighlightId,
  onInitialHighlightDone,
  morphIn,
  heroLayoutId,
  onViewChange,
  onApplyPurchases,
}) {
  // Dibuka dari notifikasi transaksi → langsung di tab Transaksi sejak awal,
  // supaya tidak sempat terlihat beranda lalu bergeser.
  const [view, setView] = useState(() => (initialHighlightId ? "transactions" : "dashboard"));

  // Laporkan tab yang terbuka ke App, supaya saat pulang ke halaman awal App
  // tahu apakah kartu sambutan sedang terlihat (untuk animasi mengerut).
  useEffect(() => {
    onViewChange && onViewChange(view);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);
  // Kalau data sebelumnya masih tersimpan, langsung tampilkan tanpa layar muat.
  const [loading, setLoading] = useState(() => !(kasCache.wallets && kasCache.categories && kasCache.transactions));

  const [wallets, setWallets] = useState(() => kasCache.wallets || []);
  const [categories, setCategories] = useState(() => kasCache.categories || []);
  const [transactions, setTransactions] = useState(() => kasCache.transactions || []);

  const [txSearch, setTxSearch] = useState("");
  const [txFilter, setTxFilter] = useState("all"); // all | income | expense | transfer

  const [txModal, setTxModal] = useState(null);
  const [txDetailId, setTxDetailId] = useState(null);
  // Pindah dari satu jendela ke jendela lain (mis. detail → edit): jendela
  // pertama turun dulu sebentar, baru berikutnya naik, supaya dua lapisan
  // gelapnya tidak menumpuk.
  const swapSheet = (closeFn, openFn) => {
    closeFn();
    setTimeout(openFn, 170);
  };
  const [walletModal, setWalletModal] = useState(null);
  const [transferModal, setTransferModal] = useState(false);
  const [categoryPanel, setCategoryPanel] = useState(false);
  const [categoryModal, setCategoryModal] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [scanModal, setScanModal] = useState(false);
  // Transaksi yang sedang disorot setelah dibuka dari beranda/notifikasi.
  const [highlightId, setHighlightId] = useState(null);

  // Dibuka dari notifikasi halaman awal: langsung ke tab Transaksi lalu
  // sorot transaksi yang dimaksud.
  useEffect(() => {
    if (!initialHighlightId) return;
    setView("transactions");
    setHighlightId(initialHighlightId);
    onInitialHighlightDone && onInitialHighlightDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialHighlightId]);
  const [toBuy, setToBuy] = useState(() => kasCache.toBuy || []);
  const [aliases, setAliases] = useState(() => kasCache.aliases || {});
  const [saving, setSaving] = useState(false);

  // --- Sinkron Firestore ------------------------------------------------
  const seededRef = useRef(false);
  useEffect(() => {
    let pending = 3;
    const markLoaded = () => {
      pending -= 1;
      if (pending <= 0) setLoading(false);
    };

    // Tiap data yang masuk ikut disimpan, supaya kunjungan berikutnya langsung
    // tampil tanpa layar muat.
    const unsubs = [
      storageSubscribe("kas-wallets", (data) => {
        if (Array.isArray(data)) {
          kasCache.wallets = data;
          setWallets(data);
        } else if (!seededRef.current) {
          seededRef.current = true;
          kasCache.wallets = DEFAULT_WALLETS;
          setWallets(DEFAULT_WALLETS);
          storageSet("kas-wallets", DEFAULT_WALLETS);
        }
        markLoaded();
      }),
      storageSubscribe("kas-categories", (data) => {
        const next = Array.isArray(data) && data.length ? data : DEFAULT_CATEGORIES;
        kasCache.categories = next;
        setCategories(next);
        if (!Array.isArray(data)) storageSet("kas-categories", DEFAULT_CATEGORIES);
        markLoaded();
      }),
      storageSubscribe("kas-transactions", (data) => {
        const next = Array.isArray(data) ? data : [];
        kasCache.transactions = next;
        setTransactions(next);
        markLoaded();
      }),
      // Daftar "Akan Dibeli" dari Stok Rumah — dibaca saja, buat pencocokan
      // hasil scan struk. Tidak pernah ditulis ulang dari sini kecuali saat
      // pengguna menyetujui pencocokan.
      storageSubscribe("stock-tobuy", (data) => {
        const next = Array.isArray(data) ? data : [];
        kasCache.toBuy = next;
        setToBuy(next);
      }),
      storageSubscribe("kas-aliases", (data) => {
        const next = data && typeof data === "object" ? data : {};
        kasCache.aliases = next;
        setAliases(next);
      }),
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
  // menyetujui pencocokan hasil scan struk. Stoknya ikut bertambah sesuai
  // jumlah di struk (logikanya milik Stok Rumah, lewat onApplyPurchases).
  // purchases: [{ entryId, qty }]
  const handleMarkBought = async (purchases) => {
    if (!purchases || !purchases.length) return;
    if (onApplyPurchases) {
      await onApplyPurchases(purchases);
      return;
    }
    const ids = purchases.map((p) => p.entryId);
    const now = new Date().toISOString();
    const next = toBuy.map((e) =>
      ids.includes(e.id) && !e.bought ? { ...e, bought: true, boughtBy: userName, boughtAt: now } : e
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

  // Data pertama kali belum siap: kartu sambutan tetap langsung tampil (jadi
  // kartu dari halaman awal tetap punya tempat mendarat), sisanya menunggu.
  if (loading) {
    return (
      <div className="h-full" style={{ color: COLORS.ink, fontFamily: KAS_FONT }}>
        <SharedStyles />
        <Backdrop color={COLORS.bg} />
        <div className="relative max-w-2xl mx-auto px-4" style={{ paddingTop: "env(safe-area-inset-top)" }}>
          <KasHero userName={userName} layoutId={heroLayoutId} fadeIn={!morphIn} />
          <motion.div
            className="text-center text-sm"
            style={{ color: COLORS.inkSoft, marginTop: 40 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 0.3, duration: DUR.base } }}
          >
            Memuat data...
          </motion.div>
        </div>
      </div>
    );
  }

  const txDetail = txDetailId ? transactions.find((t) => t.id === txDetailId) || null : null;

  const fabAction = () => {
    if (view === "wallets") setWalletModal({ mode: "add" });
    else setTxModal({ mode: "add", type: "expense" });
  };

  return (
    <div className="h-full" style={{ color: COLORS.ink, fontFamily: KAS_FONT }}>
      <SharedStyles />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
      `}</style>
      <Backdrop color={COLORS.bg} />

      <div className="fixed inset-0">
        <TabPager index={TAB_ORDER.indexOf(view)} onIndexChange={(i) => setView(TAB_ORDER[i])}>
          <DashboardPage
            userName={userName}
            totals={totals}
            recent={sortedTx.slice(0, 4)}
            transactions={transactions}
            catById={catById}
            walById={walById}
            onOpenMenu={() => setShowMenu(true)}
            walletCount={wallets.length}
            onSeeAll={() => setView("transactions")}
            onOpenTransfer={() => setTransferModal(true)}
            onSeeWallets={() => setView("wallets")}
            notifSlot={view === "dashboard" ? notifSlotDark || notifSlot : null}
            onOpenTx={(tx) => setTxDetailId(tx.id)}
            onBackToPicker={onBackToPicker}
            heroLayoutId={view === "dashboard" ? heroLayoutId : undefined}
            morphIn={morphIn}
          />

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
            notifSlot={view === "transactions" ? notifSlot : null}
            onOpen={(tx) => setTxDetailId(tx.id)}
            highlightId={highlightId}
            onHighlightDone={() => setHighlightId(null)}
          />

          <WalletsPage
            wallets={wallets}
            transactions={transactions}
            onBack={() => setView("dashboard")}
            onOpenMenu={() => setShowMenu(true)}
            onSwitchApp={onBackToPicker}
            notifSlot={view === "wallets" ? notifSlot : null}
            onEdit={(w) => setWalletModal({ mode: "edit", wallet: w })}
            onDelete={(w) => setConfirmDelete({ type: "wallet", id: w.id, label: w.name })}
          />
        </TabPager>
      </div>

      <NavBar
        id="kas-nav"
        tabs={KAS_TABS}
        active={view}
        onChange={setView}
        onAdd={fabAction}
        color={COLORS.primary}
        accent={COLORS.accent}
        shadowRgb="18,48,30"
      />

      {/* Setiap jendela dibungkus AnimatePresence supaya animasi keluarnya
          tetap diputar walau state-nya sudah dikosongkan. */}
      <AnimatePresence>
        {txModal && (
          <TransactionModal
            key={`tx-modal-${txModal.mode}-${txModal.tx && txModal.tx.id ? txModal.tx.id : "new"}`}
            mode={txModal.mode}
            tx={txModal.tx}
            initialType={txModal.type}
            categories={categories}
            wallets={wallets}
            allTags={allTags}
            saving={saving}
            onClose={() => setTxModal(null)}
            onSubmit={(data) => handleSaveTx(data, txModal.mode === "edit" ? txModal.tx : null)}
            onOpenScan={txModal.mode === "add" ? () => swapSheet(() => setTxModal(null), () => setScanModal(true)) : undefined}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {txDetail && (
          <TxDetailSheet
            key={`tx-detail-${txDetail.id}`}
            tx={txDetail}
            catById={catById}
            walById={walById}
            onClose={() => setTxDetailId(null)}
            onEdit={() =>
              swapSheet(
                () => setTxDetailId(null),
                () => (txDetail.type === "transfer" ? setTransferModal(txDetail) : setTxModal({ mode: "edit", tx: txDetail }))
              )
            }
            onDuplicate={() =>
              swapSheet(
                () => setTxDetailId(null),
                () => setTxModal({ mode: "duplicate", tx: { ...txDetail, id: undefined, date: new Date().toISOString() } })
              )
            }
            onDelete={() =>
              swapSheet(
                () => setTxDetailId(null),
                () => setConfirmDelete({ type: "tx", id: txDetail.id, label: txDetail.note || "transaksi ini" })
              )
            }
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {transferModal && (
          <TransferModal
            key="transfer-modal"
            tx={typeof transferModal === "object" ? transferModal : null}
            wallets={wallets}
            saving={saving}
            onClose={() => setTransferModal(false)}
            onSubmit={(data) => handleSaveTx(data, typeof transferModal === "object" ? transferModal : null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {walletModal && (
          <WalletModal
            key="wallet-modal"
            mode={walletModal.mode}
            wallet={walletModal.wallet}
            saving={saving}
            onClose={() => setWalletModal(null)}
            onSubmit={(data) => handleSaveWallet(data, walletModal.wallet)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {categoryPanel && (
          <CategoryPanel
            key="category-panel"
            categories={categories}
            onClose={() => setCategoryPanel(false)}
            onAdd={(kind) => setCategoryModal({ mode: "add", kind })}
            onEdit={(c) => setCategoryModal({ mode: "edit", category: c })}
            onDelete={(c) => setConfirmDelete({ type: "category", id: c.id, label: c.name })}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {categoryModal && (
          <CategoryModal
            key="category-modal"
            mode={categoryModal.mode}
            category={categoryModal.category}
            initialKind={categoryModal.kind}
            saving={saving}
            onClose={() => setCategoryModal(null)}
            onSubmit={(data) => handleSaveCategory(data, categoryModal.category)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {scanModal && (
          <ReceiptScanModal
            key="scan-modal"
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
      </AnimatePresence>

      <AnimatePresence>
        {confirmDelete && (
          <Overlay key="confirm-delete" onClose={() => setConfirmDelete(null)}>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={18} color={COLORS.out} />
              <div style={{ fontFamily: KAS_FONT, fontWeight: 600, fontSize: 18, color: COLORS.ink }}>Hapus?</div>
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
      </AnimatePresence>

      <AnimatePresence>
        {showMenu && (
          <MenuPanel
            key="menu"
            userName={userName}
            onClose={() => setShowMenu(false)}
            onOpenCategories={() => setCategoryPanel(true)}
            onTransfer={view === "wallets" ? () => setTransferModal(true) : null}
            onSwitchApp={onSwitchApp || onBackToPicker}
            onLogout={onLogout}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Beranda ------------------------------------------------------------
// Kartu sambutan hijau pekat. Dipisah jadi komponen sendiri karena juga
// dipakai di layar tunggu (supaya kartu dari halaman awal selalu punya
// tempat mendarat walau datanya belum siap).
function KasHero({ userName, layoutId, fadeIn, notifSlot, onBackToPicker, onOpenMenu }) {
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 10) return "Selamat pagi";
    if (h < 15) return "Selamat siang";
    if (h < 18) return "Selamat sore";
    return "Selamat malam";
  }, []);
  const todayLabel = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <Hero color={COLORS.primary} layoutId={layoutId} fadeIn={fadeIn}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.72)" }}>
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
            Kas
            <br />
            Rumah
          </h1>
        </div>
        {(onBackToPicker || onOpenMenu) && (
          <div className="flex items-center gap-2 shrink-0">
            {notifSlot}
            <button
              onClick={onBackToPicker}
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.14)" }}
              title="Ganti aplikasi"
            >
              <LayoutGrid size={19} color="#EAF3EC" />
            </button>
            <button
              onClick={onOpenMenu}
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.14)" }}
              title="Menu"
            >
              <Menu size={19} color="#EAF3EC" />
            </button>
          </div>
        )}
      </div>
      <div
        className="inline-flex items-center gap-2 capitalize self-start"
        style={{ background: "rgba(255,255,255,0.12)", borderRadius: 22, padding: "8px 14px", fontSize: 13, color: "rgba(255,255,255,0.88)" }}
      >
        <Calendar size={15} color="rgba(255,255,255,0.88)" />
        {todayLabel}
      </div>
    </Hero>
  );
}

function DashboardPage({ userName, totals, recent, transactions, catById, walById, walletCount, onOpenMenu, onSeeAll, onOpenTx, onOpenTransfer, onSeeWallets, onBackToPicker, notifSlot, heroLayoutId, morphIn }) {
  return (
    <motion.div layoutScroll className="h-full overflow-y-auto" style={{ overscrollBehaviorY: "contain", WebkitOverflowScrolling: "touch" }}>
      <div className="max-w-2xl mx-auto px-4 pb-32" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <KasHero
          userName={userName}
          layoutId={heroLayoutId}
          fadeIn={!morphIn}
          notifSlot={notifSlot}
          onBackToPicker={onBackToPicker}
          onOpenMenu={onOpenMenu}
        />

        {/* Kartu saldo — putih dengan dua kotak Masuk/Keluar dan batang yang
            menunjukkan berapa dari pemasukan bulan ini yang masih tersisa. */}
        <Rise
          delay={0.12}
          style={{
            background: COLORS.card,
            borderRadius: 26,
            padding: "20px 22px",
            marginTop: 14,
            border: `1px solid rgba(18,48,30,0.08)`,
            boxShadow: "0 10px 24px -18px rgba(16,40,26,0.4)",
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <span
              className="uppercase"
              style={{ fontSize: 12.5, fontWeight: 500, color: "#5C6B60", letterSpacing: "0.04em" }}
            >
              Saldo semua dompet
            </span>
            {totals.income > 0 && (
              <span
                style={{ fontSize: 11, fontWeight: 600, color: COLORS.primaryLight, background: COLORS.safeBg, padding: "5px 10px", borderRadius: 99 }}
              >
                {totals.expense <= totals.income ? "+" : ""}
                {Math.round(((totals.income - totals.expense) / totals.income) * 100)}%
              </span>
            )}
          </div>

          <div style={{ fontSize: 33, fontWeight: 700, color: COLORS.ink, marginTop: 8, letterSpacing: "-0.02em" }}>
            <RollingNumber value={fmtRupiah(totals.balance)} />
          </div>

          <div className="flex gap-2.5" style={{ marginTop: 16 }}>
            <div className="flex-1 min-w-0" style={{ padding: "13px 14px", borderRadius: 18, background: COLORS.safeBg }}>
              <div className="flex items-center gap-1.5" style={{ fontSize: 12, fontWeight: 600, color: COLORS.primaryLight }}>
                <ArrowDownLeft size={14} /> Masuk
              </div>
              <div className="truncate" style={{ fontSize: 15.5, fontWeight: 700, color: COLORS.ink, marginTop: 5 }}>
                <RollingNumber value={fmtRupiah(totals.income)} />
              </div>
            </div>
            <div className="flex-1 min-w-0" style={{ padding: "13px 14px", borderRadius: 18, background: COLORS.lowBg }}>
              <div className="flex items-center gap-1.5" style={{ fontSize: 12, fontWeight: 600, color: COLORS.accentDeep }}>
                <ArrowUpRight size={14} /> Keluar
              </div>
              <div className="truncate" style={{ fontSize: 15.5, fontWeight: 700, color: COLORS.ink, marginTop: 5 }}>
                <RollingNumber value={fmtRupiah(totals.expense)} />
              </div>
            </div>
          </div>

          {totals.income > 0 && (
            <>
              {/* Batang sisa pemasukan — mengisi dari kiri saat muncul dan
                  bergeser halus saat angkanya berubah. */}
              <div className="flex" style={{ marginTop: 16, height: 8, borderRadius: 99, background: COLORS.track, overflow: "hidden" }}>
                <motion.span
                  style={{ background: `linear-gradient(90deg, ${COLORS.primaryLight}, ${COLORS.mint})` }}
                  initial={{ width: "0%" }}
                  animate={{ width: `${Math.max(0, Math.min(100, ((totals.income - totals.expense) / totals.income) * 100))}%` }}
                  transition={{ ...SPRING.page, delay: 0.25 }}
                />
                <motion.span
                  style={{ background: COLORS.accent }}
                  initial={{ width: "0%" }}
                  animate={{ width: `${Math.max(0, Math.min(100, (totals.expense / totals.income) * 100))}%` }}
                  transition={{ ...SPRING.page, delay: 0.3 }}
                />
              </div>
              <div style={{ marginTop: 9, fontSize: 11.5, color: COLORS.inkSoft }}>
                {Math.max(0, Math.round(((totals.income - totals.expense) / totals.income) * 100))}% dari pemasukan bulan ini masih tersisa
              </div>
            </>
          )}
        </Rise>

        {/* Dua pintasan cepat */}
        <Rise delay={0.17} className="flex gap-2.5" style={{ marginTop: 14 }}>
          <button
            onClick={onOpenTransfer}
            className="flex-1 text-left"
            style={{ padding: 16, borderRadius: 22, background: COLORS.primary }}
          >
            <ArrowLeftRight size={19} color={COLORS.mint} />
            <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginTop: 8 }}>Catat transfer</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>Antar dompet</div>
          </button>
          <button
            onClick={onSeeWallets}
            className="flex-1 text-left"
            style={{ padding: 16, borderRadius: 22, background: COLORS.card, border: `1px solid rgba(18,48,30,0.08)` }}
          >
            <Wallet size={19} color={COLORS.accent} />
            <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.ink, marginTop: 8 }}>Dompet</div>
            <div style={{ fontSize: 11, color: COLORS.inkSoft, marginTop: 2 }}>{walletCount} aktif</div>
          </button>
        </Rise>

        <Rise delay={0.22}>
        {/* Transaksi terbaru */}
        <div className="flex items-center justify-between" style={{ marginTop: 22 }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: COLORS.ink }}>Transaksi terbaru</span>
          <button onClick={onSeeAll} className="flex items-center gap-1" style={{ fontSize: 12, fontWeight: 600, color: COLORS.primaryLight }}>
            Lihat semua <ChevronRight size={13} />
          </button>
        </div>

        <div style={{ marginTop: 12 }}>
          {recent.length === 0 ? (
            <div
              className="text-center"
              style={{ background: COLORS.card, borderRadius: 22, padding: "28px 16px", border: `1px dashed ${COLORS.border}`, color: COLORS.inkSoft, fontSize: 13 }}
            >
              Belum ada transaksi bulan ini.
            </div>
          ) : (
            <div style={{ background: COLORS.card, borderRadius: 20, boxShadow: TX_CARD_SHADOW }}>
              <CollapseList>
                {recent.map((t, i) => (
                  <TransactionRow key={t.id} tx={t} catById={catById} walById={walById} first={i === 0} withDay onOpen={() => onOpenTx && onOpenTx(t)} />
                ))}
              </CollapseList>
            </div>
          )}
        </div>

        <AnalysisSection transactions={transactions} catById={catById} walById={walById} />
        </Rise>
      </div>
    </motion.div>
  );
}

// --- Halaman transaksi --------------------------------------------------
const TX_CARD_SHADOW = "0 1px 2px rgba(18,48,30,0.04), 0 6px 18px rgba(18,48,30,0.05)";

// Tampilan satu transaksi (dipakai daftar, beranda, dan detail).
function txVisual(tx, catById, walById, withDay = false) {
  const isIncome = tx.type === "income";
  const isTransfer = tx.type === "transfer";
  const hasSplit = !!(tx.splits && tx.splits.length);
  const category = catById[tx.categoryId];
  const wallet = walById[tx.walletId];
  const toWallet = walById[tx.toWalletId];
  const Icon = isTransfer ? ArrowLeftRight : hasSplit ? Split : CATEGORY_ICONS[category?.icon] || Tag;
  const color = isTransfer ? COLORS.muted : category?.color || (isIncome ? COLORS.safe : COLORS.out);
  const catName = hasSplit ? `${tx.splits.length} kategori` : category?.name || "Tanpa kategori";
  const title = isTransfer ? `${wallet?.name || "?"} → ${toWallet?.name || "?"}` : tx.note || catName;
  const clock = new Date(tx.date).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(":", ".");
  const time = withDay ? `${dayLabel(tx.date)}, ${clock}` : clock;
  const meta = isTransfer
    ? `Transfer${Number(tx.fee) > 0 ? ` · biaya ${fmtRupiah(tx.fee)}` : ""} · ${time}`
    : `${tx.note ? catName + " · " : ""}${wallet?.name || "?"} · ${time}`;
  const sign = isIncome ? "+" : isTransfer ? "" : "−";
  const amountColor = isTransfer ? COLORS.muted : isIncome ? COLORS.safe : COLORS.expenseText;
  return { isIncome, isTransfer, hasSplit, category, wallet, toWallet, Icon, color, catName, title, meta, sign, amountColor };
}

function TxIcon({ Icon, color, isTransfer, size = 42, radius = 14 }) {
  return (
    <span
      className="shrink-0 flex items-center justify-center"
      style={{ width: size, height: size, borderRadius: radius, background: isTransfer ? COLORS.soft : `${color}22`, color }}
    >
      <Icon size={Math.round(size * 0.43)} />
    </span>
  );
}

function TransactionsPage({ transactions, catById, walById, search, setSearch, filter, setFilter, onBack, onOpenMenu, onSwitchApp, notifSlot, onOpen, highlightId, onHighlightDone }) {
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

  useEffect(() => {
    if (!highlightId) return;
    // Tunggu halaman selesai bergeser dulu, baru digulir ke transaksinya.
    const t1 = setTimeout(() => {
      const el = document.getElementById(`kas-tx-${highlightId}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    }, 360);
    const t2 = setTimeout(() => onHighlightDone && onHighlightDone(), 2000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightId]);

  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 max-w-2xl mx-auto w-full px-4 pb-3" style={{ paddingTop: "env(safe-area-inset-top)", background: COLORS.bg }}>
        <TopBar title="Transaksi" onBack={onBack} onOpenMenu={onOpenMenu} onSwitchApp={onSwitchApp} notifSlot={notifSlot} />

        <div className="grid gap-2 mb-3" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
          <FilterTile group="kas-tx" label="Semua" value={counts.all} color={COLORS.primary} active={filter === "all"} onClick={() => setFilter("all")} />
          <FilterTile group="kas-tx" label="Masuk" value={counts.income} color={COLORS.safe} active={filter === "income"} onClick={() => setFilter("income")} />
          <FilterTile group="kas-tx" label="Keluar" value={counts.expense} color="#9A5F17" active={filter === "expense"} onClick={() => setFilter("expense")} />
          <FilterTile group="kas-tx" label="Transfer" value={counts.transfer} color={COLORS.muted} active={filter === "transfer"} onClick={() => setFilter("transfer")} />
        </div>

        <SearchBox value={search} onChange={setSearch} placeholder="Cari transaksi..." />
      </div>

      <motion.div layoutScroll className="flex-1 overflow-y-auto" style={{ overscrollBehaviorY: "contain", WebkitOverflowScrolling: "touch" }}>
        <FadeSwap swapKey={filter} className="max-w-2xl mx-auto px-4 pt-1 pb-32">
          {groups.length === 0 ? (
            <div className="py-14 text-center rounded-[20px]" style={{ background: COLORS.card, border: `1px dashed ${COLORS.border}` }}>
              <Receipt size={28} color={COLORS.inkSoft} style={{ margin: "0 auto 8px" }} />
              <div style={{ color: COLORS.muted }} className="text-sm">
                {transactions.length === 0 ? "Belum ada transaksi. Tekan + untuk mencatat." : "Tidak ada yang cocok."}
              </div>
            </div>
          ) : (
            <CollapseList spacing={16}>
              {groups.map((g) => (
                <section key={g.label} className="flex flex-col" style={{ gap: 8 }}>
                  <div className="flex items-center justify-between" style={{ padding: "0 4px", fontSize: 12, fontWeight: 700, letterSpacing: "0.06em" }}>
                    <span className="uppercase" style={{ color: COLORS.safe }}>
                      {g.label}
                    </span>
                    <span style={{ color: g.total >= 0 ? COLORS.safe : COLORS.expenseText }}>
                      <RollingNumber value={`${g.total > 0 ? "+" : g.total < 0 ? "−" : ""}Rp ${fmtShortRupiah(g.total)}`} />
                    </span>
                  </div>
                  <div style={{ background: COLORS.card, borderRadius: 20, boxShadow: TX_CARD_SHADOW }}>
                    <CollapseList>
                      {g.items.map((t, i) => (
                        <TransactionRow key={t.id} tx={t} catById={catById} walById={walById} first={i === 0} highlighted={t.id === highlightId} onOpen={() => onOpen(t)} />
                      ))}
                    </CollapseList>
                  </div>
                </section>
              ))}
            </CollapseList>
          )}
        </FadeSwap>
      </motion.div>
    </div>
  );
}

function TransactionRow({ tx, catById, walById, first, highlighted, withDay, onOpen }) {
  const v = txVisual(tx, catById, walById, withDay);
  return (
    <div id={`kas-tx-${tx.id}`} className="relative">
      {!first && <div aria-hidden="true" style={{ height: 1, background: "#F1EFE7", marginLeft: 68 }} />}
      <button type="button" onClick={onOpen} className="relative w-full flex items-center text-left" style={{ gap: 12, padding: "12px 14px", minHeight: 66 }}>
        <CardRings radius={16} highlighted={!!highlighted} glowRgb={HIGHLIGHT_RGB} />
        <TxIcon Icon={v.Icon} color={v.color} isTransfer={v.isTransfer} />
        <span className="flex-1 min-w-0">
          <span className="block truncate" style={{ fontSize: 14.5, fontWeight: 600, color: COLORS.ink }}>
            {v.title}
          </span>
          <span className="block truncate" style={{ fontSize: 12, color: COLORS.muted }}>
            {v.meta}
          </span>
        </span>
        <span className="shrink-0" style={{ fontSize: 14.5, fontWeight: 700, color: v.amountColor }}>
          {v.sign}
          {fmtShortRupiah(tx.amount)}
        </span>
      </button>
    </div>
  );
}

// Sentuh transaksi → detail: tag, rincian split, edit / duplikat / hapus.
function TxDetailSheet({ tx, catById, walById, onClose, onEdit, onDuplicate, onDelete }) {
  const v = txVisual(tx, catById, walById);
  const row = (label, value) => (
    <div className="flex items-start justify-between" style={{ gap: 12, padding: "10px 0", borderTop: `1px solid ${COLORS.soft}` }}>
      <span style={{ fontSize: 13, color: COLORS.muted }}>{label}</span>
      <span className="text-right min-w-0" style={{ fontSize: 13.5, fontWeight: 500, color: COLORS.ink }}>
        {value}
      </span>
    </div>
  );
  return (
    <Overlay onClose={onClose}>
      <div className="flex flex-col" style={{ gap: 14 }}>
        <div className="flex items-center" style={{ gap: 14 }}>
          <TxIcon Icon={v.Icon} color={v.color} isTransfer={v.isTransfer} size={52} radius={17} />
          <div className="flex-1 min-w-0">
            <div className="truncate" style={{ fontSize: 16, fontWeight: 600 }}>
              {v.title}
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: v.amountColor, lineHeight: 1.2 }}>
              {v.sign}
              {fmtRupiah(tx.amount)}
            </div>
          </div>
          <button
            type="button"
            aria-label="Tutup"
            title="Tutup"
            onClick={onClose}
            className="flex items-center justify-center shrink-0"
            style={{ width: 44, height: 44, borderRadius: 999, border: "none", background: COLORS.soft, color: COLORS.muted }}
          >
            <X size={17} strokeWidth={2.2} />
          </button>
        </div>

        <div>
          {v.isTransfer ? (
            <>
              {row("Dari", v.wallet?.name || "?")}
              {row("Ke", v.toWallet?.name || "?")}
              {Number(tx.fee) > 0 && row("Biaya", fmtRupiah(tx.fee))}
            </>
          ) : (
            <>
              {!v.hasSplit && row("Kategori", v.category?.name || "Tanpa kategori")}
              {row("Dompet", v.wallet?.name || "?")}
            </>
          )}
          {row("Tanggal", fmtDateTime(tx.date))}
          {tx.note && !v.isTransfer && v.title !== tx.note && row("Catatan", tx.note)}
          {tx.note && v.isTransfer && row("Catatan", tx.note)}
          {row("Dicatat", tx.createdBy || "?")}
        </div>

        {v.hasSplit && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", color: COLORS.muted, marginBottom: 8 }}>RINCIAN SPLIT</div>
            <div className="flex flex-col" style={{ gap: 6 }}>
              {tx.splits.map((s, i) => {
                const c = catById[s.categoryId];
                const Ic = CATEGORY_ICONS[c?.icon] || Tag;
                return (
                  <div key={i} className="flex items-center" style={{ gap: 10, background: COLORS.soft, borderRadius: 14, padding: "8px 12px" }}>
                    <Ic size={15} color={c?.color || COLORS.muted} />
                    <span className="flex-1 min-w-0 truncate" style={{ fontSize: 13 }}>
                      {c?.name || "Tanpa kategori"}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{fmtRupiah(s.amount)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tx.tags && tx.tags.length > 0 && (
          <div className="flex flex-wrap" style={{ gap: 6 }}>
            {tx.tags.map((t) => (
              <span key={t} style={{ fontSize: 12, fontWeight: 600, color: COLORS.safe, background: COLORS.safeBg, borderRadius: 999, padding: "5px 10px" }}>
                #{t}
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-col" style={{ gap: 8, marginTop: 4 }}>
          <button
            type="button"
            onClick={onEdit}
            className="flex items-center justify-center"
            style={{ height: 50, borderRadius: 14, border: "none", background: COLORS.primary, color: "#FFFFFF", fontSize: 14.5, fontWeight: 600, gap: 8 }}
          >
            <Pencil size={16} />
            Edit transaksi
          </button>
          <div className="flex" style={{ gap: 8 }}>
            {!v.isTransfer && (
              <button
                type="button"
                onClick={onDuplicate}
                className="flex-1 flex items-center justify-center"
                style={{ height: 46, borderRadius: 14, border: "none", background: COLORS.safeBg, color: COLORS.safe, fontSize: 14, fontWeight: 600, gap: 8 }}
              >
                <Copy size={15} />
                Duplikat
              </button>
            )}
            <button
              type="button"
              onClick={onDelete}
              className="flex-1 flex items-center justify-center"
              style={{ height: 46, borderRadius: 14, border: "none", background: COLORS.outBg, color: COLORS.expenseText, fontSize: 14, fontWeight: 600, gap: 8 }}
            >
              <Trash2 size={15} />
              Hapus
            </button>
          </div>
        </div>
      </div>
    </Overlay>
  );
}

// --- Halaman dompet -----------------------------------------------------
function WalletsPage({ wallets, transactions, onBack, onOpenMenu, onSwitchApp, notifSlot, onEdit, onDelete }) {
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
          notifSlot={notifSlot}
        />
        <div className="rounded-2xl p-3.5" style={{ background: COLORS.primary }}>
          <div className="text-xs" style={{ color: "rgba(255,255,255,0.75)" }}>
            Total saldo
          </div>
          <div style={{ fontFamily: KAS_FONT, fontWeight: 600, fontSize: 23, color: "#fff", lineHeight: 1.2 }}>
            <RollingNumber value={fmtRupiah(total)} />
          </div>
        </div>
      </div>

      <motion.div layoutScroll className="flex-1 overflow-y-auto" style={{ overscrollBehaviorY: "contain", WebkitOverflowScrolling: "touch" }}>
        <div className="max-w-2xl mx-auto px-4 pb-32">
          {wallets.length === 0 ? (
            <div className="py-14 text-center rounded-2xl" style={{ background: COLORS.card, border: `1px dashed ${COLORS.border}` }}>
              <Wallet size={28} color={COLORS.inkSoft} style={{ margin: "0 auto 8px" }} />
              <div style={{ color: COLORS.inkSoft }} className="text-sm">
                Belum ada dompet. Tambahkan yang pertama.
              </div>
            </div>
          ) : (
            <AnimatedList className="flex flex-col gap-2.5">
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
                          <RollingNumber value={fmtRupiah(bal)} />
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
            </AnimatedList>
          )}
        </div>
      </motion.div>
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

// Panel pemilih periode yang muncul dari bawah layar. Pilihan baru diterapkan
// setelah tombol "Terapkan" ditekan, jadi tidak langsung mengubah tampilan
// setiap kali disentuh. Memakai Sheet bersama, jadi ikut punya pegangan
// tarik-ke-bawah dan animasi masuk/keluar yang sama dengan jendela lain.
function PeriodSheet({ draftPeriod, setDraftPeriod, draftFrom, setDraftFrom, draftTo, setDraftTo, onApply, onClose }) {
  const needsDates = draftPeriod === "custom";
  const invalid = needsDates && (!draftFrom || !draftTo || new Date(draftFrom) > new Date(draftTo));

  return (
    <Overlay onClose={onClose}>
      <div className="text-center pb-2" style={{ fontFamily: KAS_FONT, fontWeight: 600, fontSize: 16, color: COLORS.ink }}>
        Periode
      </div>

      {PERIODS.map((p, i) => {
        const active = draftPeriod === p.key;
        return (
          <button
            key={p.key}
            onClick={() => setDraftPeriod(p.key)}
            className="w-full flex items-center justify-between gap-3 py-3.5 text-left"
            style={{ borderTop: i === 0 ? "none" : `1px solid ${COLORS.border}` }}
          >
            <span className="text-sm" style={{ color: COLORS.ink, fontWeight: active ? 600 : 400 }}>
              {p.label}
            </span>
            <span
              className="shrink-0 rounded-full flex items-center justify-center"
              style={{
                width: 21,
                height: 21,
                background: active ? COLORS.primary : "transparent",
                border: active ? "none" : `1.5px solid ${COLORS.border}`,
              }}
            >
              {active && <Check size={13} color="#fff" />}
            </span>
          </button>
        );
      })}

      {needsDates && (
        <div className="flex gap-2 pt-1 pb-2">
          <Field label="Dari" className="flex-1 min-w-0">
            <input
              type="date"
              value={draftFrom}
              onChange={(e) => setDraftFrom(e.target.value)}
              className="w-full px-2 py-2 rounded-lg text-xs"
              style={{ border: `1px solid ${COLORS.border}`, color: COLORS.ink }}
            />
          </Field>
          <Field label="Sampai" className="flex-1 min-w-0">
            <input
              type="date"
              value={draftTo}
              onChange={(e) => setDraftTo(e.target.value)}
              className="w-full px-2 py-2 rounded-lg text-xs"
              style={{ border: `1px solid ${COLORS.border}`, color: COLORS.ink }}
            />
          </Field>
        </div>
      )}

      <div className="pt-3">
        <button
          onClick={onApply}
          disabled={invalid}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white"
          style={{ background: COLORS.primary, opacity: invalid ? 0.5 : 1 }}
        >
          Terapkan
        </button>
      </div>
    </Overlay>
  );
}

function AnalysisSection({ transactions, catById, walById }) {
  const [period, setPeriod] = useState("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [dimension, setDimension] = useState("category");
  const [txType, setTxType] = useState("expense");
  const [drill, setDrill] = useState(null);
  // Panel pemilih periode yang muncul dari bawah (pola seperti Stockbit):
  // pilihan baru baru diterapkan setelah tombol "Terapkan" ditekan.
  const [periodSheet, setPeriodSheet] = useState(false);
  const [draftPeriod, setDraftPeriod] = useState("month");
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");

  const openPeriodSheet = () => {
    setDraftPeriod(period);
    setDraftFrom(customFrom);
    setDraftTo(customTo);
    setPeriodSheet(true);
  };

  const applyPeriod = () => {
    setPeriod(draftPeriod);
    setCustomFrom(draftFrom);
    setCustomTo(draftTo);
    setDrill(null);
    setPeriodSheet(false);
  };

  const periodLabel = PERIODS.find((p) => p.key === period)?.label || "Bulan Ini";

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
    <div className="mt-3">
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <PieChart size={16} color={COLORS.primary} />
          <div style={{ fontFamily: KAS_FONT, fontWeight: 600, fontSize: 17, color: COLORS.ink }}>Analisis</div>
        </div>
        <button
          onClick={openPeriodSheet}
          className="px-2.5 py-1.5 rounded-full flex items-center gap-1 text-xs font-medium"
          style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, color: COLORS.primary }}
        >
          {periodLabel}
          <ChevronDown size={13} />
        </button>
      </div>

      {/* Pilihan Pengeluaran/Pemasukan — latar warnanya meluncur ke pilihan
          yang disentuh. */}
      <div className="flex gap-1 p-1 rounded-xl mb-3" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
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
            className="relative flex-1 py-2 rounded-lg text-sm font-medium"
            style={{ color: txType === o.key ? "#fff" : COLORS.inkSoft }}
          >
            {txType === o.key && (
              <motion.span
                layoutId="kas-analysis-type"
                className="absolute inset-0"
                style={{ borderRadius: 8 }}
                initial={false}
                animate={{ backgroundColor: o.color }}
                transition={SPRING.snappy}
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {periodSheet && (
          <PeriodSheet
            key="period-sheet"
            draftPeriod={draftPeriod}
            setDraftPeriod={setDraftPeriod}
            draftFrom={draftFrom}
            setDraftFrom={setDraftFrom}
            draftTo={draftTo}
            setDraftTo={setDraftTo}
            onApply={applyPeriod}
            onClose={() => setPeriodSheet(false)}
          />
        )}
      </AnimatePresence>

      <div>
        <div>
          <div className="rounded-2xl p-4 mb-3" style={{ background: COLORS.primary }}>
            <div className="text-xs" style={{ color: "rgba(255,255,255,0.75)" }}>
              {txType === "expense" ? "Total pengeluaran" : "Total pemasukan"} · {fmtRangeLabel(range)}
            </div>
            <div style={{ fontFamily: KAS_FONT, fontWeight: 600, fontSize: 26, color: "#fff", lineHeight: 1.25 }}>
              <RollingNumber value={fmtRupiah(total)} />
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
                  <div style={{ fontFamily: KAS_FONT, fontWeight: 600, fontSize: 16, color: COLORS.ink }}>Komposisi</div>
                </div>

                <div className="flex gap-1.5 mb-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                  {DIMENSIONS.map((d) => (
                    <button
                      key={d.key}
                      onClick={() => {
                        setDimension(d.key);
                        setDrill(null);
                      }}
                      className="relative px-2.5 py-1 rounded-full text-[11px] font-medium shrink-0"
                      style={{
                        background: COLORS.bg,
                        color: dimension === d.key ? "#fff" : COLORS.inkSoft,
                        border: `1px solid ${dimension === d.key ? COLORS.primaryLight : COLORS.border}`,
                      }}
                    >
                      {dimension === d.key && (
                        <motion.span
                          layoutId="kas-analysis-dim"
                          className="absolute inset-0"
                          style={{ background: COLORS.primaryLight, borderRadius: 999 }}
                          transition={SPRING.snappy}
                        />
                      )}
                      <span className="relative">{d.label}</span>
                    </button>
                  ))}
                </div>

                <FadeSwap swapKey={`${dimension}-${txType}-${period}-${customFrom}-${customTo}`}>
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
                </FadeSwap>

                <Collapse open={!!drill}>
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
                </Collapse>
              </div>

              <div className="rounded-2xl p-4 mb-3" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 size={16} color={COLORS.primary} />
                    <div style={{ fontFamily: KAS_FONT, fontWeight: 600, fontSize: 16, color: COLORS.ink }}>Tren 6 Bulan</div>
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
                    <div style={{ fontFamily: KAS_FONT, fontWeight: 600, fontSize: 16, color: COLORS.ink }}>Yang Menarik</div>
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

// --- Modal transaksi ----------------------------------------------------
// "Hari ini, 12.20" / "Kemarin, 08.00" / "3 Okt, 19.05"
function fmtWhen(localValue) {
  const d = new Date(localValue);
  if (Number.isNaN(d.getTime())) return "Pilih tanggal";
  const time = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(":", ".");
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today - day) / 86400000);
  const label = diff === 0 ? "Hari ini" : diff === 1 ? "Kemarin" : d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  return `${label}, ${time}`;
}

// Tampilkan hitungan dengan titik ribuan: "50000+25000" → "50.000 + 25.000".
function prettyExpr(raw) {
  return String(raw)
    .replace(/\s/g, "")
    .replace(/\d+/g, (n) => Number(n).toLocaleString("id-ID"))
    .replace(/([+\-*/×÷x])/gi, " $1 ");
}

function CategoryTile({ category, active, onClick }) {
  const Icon = CATEGORY_ICONS[category.icon] || Tag;
  const c = category.color || COLORS.primary;
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className="no-tx flex flex-col items-center min-w-0" style={{ gap: 5, padding: 0, border: "none", background: "transparent" }}>
      <motion.span
        className="flex items-center justify-center"
        initial={false}
        animate={{
          backgroundColor: active ? c : `${c}22`,
          color: active ? "#FFFFFF" : c,
          boxShadow: active ? `0 0 0 3px #FFFFFF, 0 0 0 5px ${c}` : `0 0 0 0px #FFFFFF, 0 0 0 0px ${c}`,
        }}
        transition={{ duration: DUR.fast, ease: EASE.standard }}
        style={{ width: 52, height: 52, borderRadius: 17 }}
      >
        <Icon size={21} />
      </motion.span>
      <span className="truncate w-full text-center" style={{ fontSize: 11, fontWeight: active ? 600 : 400, color: active ? COLORS.ink : COLORS.muted }}>
        {category.name}
      </span>
    </button>
  );
}

function TransactionModal({ mode, tx, initialType, categories, wallets, allTags, saving, onClose, onSubmit, onOpenScan }) {
  const [type, setType] = useState(tx?.type || initialType || "expense");
  const [amount, setAmount] = useState(tx ? String(tx.amount) : "");
  const [categoryId, setCategoryId] = useState(tx?.categoryId || "");
  // Dompet lama yang sudah dihapus tidak dipakai lagi — pindah ke dompet pertama.
  const [walletId, setWalletId] = useState(() => (tx?.walletId && wallets.some((w) => w.id === tx.walletId) ? tx.walletId : wallets[0]?.id || ""));
  const [date, setDate] = useState(toLocalInput(tx?.date));
  const [note, setNote] = useState(tx?.note || "");
  const [tags, setTags] = useState(tx?.tags || []);
  const [tagDraft, setTagDraft] = useState("");
  const [showTags, setShowTags] = useState(!!(tx?.tags && tx.tags.length));
  const [isSplit, setIsSplit] = useState(!!(tx?.splits && tx.splits.length));
  const [splits, setSplits] = useState(
    tx?.splits && tx.splits.length ? tx.splits.map((s) => ({ ...s, amount: String(s.amount) })) : [{ categoryId: "", amount: "" }, { categoryId: "", amount: "" }]
  );
  const [error, setError] = useState("");

  const catOptions = categories.filter((c) => c.kind === type);

  useEffect(() => {
    if (categoryId && !catOptions.some((c) => c.id === categoryId)) setCategoryId("");
    setSplits((prev) => prev.map((s) => (catOptions.some((c) => c.id === s.categoryId) ? s : { ...s, categoryId: "" })));
  }, [type]); // eslint-disable-line react-hooks/exhaustive-deps

  const computedAmount = evalAmount(amount);
  const isExpression = amount && !/^[0-9]+$/.test(String(amount).replace(/\s/g, ""));
  const splitTotal = useMemo(() => splits.reduce((sum, s) => sum + (evalAmount(s.amount) || 0), 0), [splits]);

  const addTag = (raw) => {
    const clean = String(raw).trim().replace(/^#/, "").replace(/\s+/g, "-").toLowerCase();
    if (!clean) return;
    setTags((prev) => (prev.includes(clean) ? prev : [...prev, clean]));
    setTagDraft("");
  };
  const suggestions = (allTags || []).filter((t) => !tags.includes(t)).slice(0, 8);

  const updateSplit = (i, patch) => setSplits((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const addSplitRow = () => setSplits((prev) => [...prev, { categoryId: "", amount: "" }]);
  const removeSplitRow = (i) => setSplits((prev) => (prev.length <= 2 ? prev : prev.filter((_, idx) => idx !== i)));

  const submit = () => {
    const value = computedAmount;
    if (!value || value <= 0) return setError("Isi nominalnya dulu.");
    if (!walletId || !wallets.some((w) => w.id === walletId)) return setError("Pilih dompetnya dulu.");

    let splitPayload = null;
    if (isSplit) {
      const rows = splits.map((s) => ({ categoryId: s.categoryId, amount: evalAmount(s.amount) || 0 })).filter((s) => s.amount > 0);
      if (rows.length < 2) return setError("Isi minimal dua baris pembagian.");
      if (rows.some((s) => !s.categoryId)) return setError("Setiap baris pembagian harus punya kategori.");
      const sum = rows.reduce((a, s) => a + s.amount, 0);
      if (Math.round(sum) !== Math.round(value)) return setError(`Total pembagian (${fmtRupiah(sum)}) belum sama dengan nominal (${fmtRupiah(value)}).`);
      splitPayload = rows;
    } else if (!categoryId) {
      return setError("Pilih kategorinya dulu.");
    }
    setError("");
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

  const hint = amount
    ? computedAmount === null
      ? "Rumusnya belum benar"
      : isExpression
      ? `${prettyExpr(amount)} = ${fmtRupiah(computedAmount)}`
      : fmtRupiah(computedAmount)
    : "Bisa ketik hitungan, mis. 50000+25000";
  const saveLabel = mode === "edit" ? "Simpan perubahan" : type === "income" ? "Simpan pemasukan" : "Simpan pengeluaran";
  const fieldStyle = { height: 46, borderRadius: 14, border: `1px solid ${COLORS.border}`, background: "#FFFFFF", color: COLORS.ink, "--inp-focus": COLORS.primary };
  const linkBtn = { height: 36, padding: "0 2px", border: "none", background: "transparent", color: COLORS.safe, fontSize: 12.5, fontWeight: 600 };

  return (
    <Overlay onClose={onClose}>
      <div className="flex flex-col" style={{ gap: 14 }}>
        {mode !== "add" && (
          <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.muted, marginTop: -4 }}>{mode === "edit" ? "Edit transaksi" : "Duplikat transaksi"}</div>
        )}
        <div className="flex items-center" style={{ gap: 10 }}>
          <Segmented
            ariaLabel="Jenis transaksi"
            value={type}
            onChange={setType}
            height={40}
            inkSoft={COLORS.muted}
            trackBg={COLORS.soft}
            style={{ flex: 1 }}
            options={[
              { value: "expense", label: "Pengeluaran", activeBg: COLORS.expenseText },
              { value: "income", label: "Pemasukan", activeBg: COLORS.safe },
            ]}
          />
          {onOpenScan ? (
            <button
              type="button"
              onClick={onOpenScan}
              aria-label="Scan struk"
              title="Scan struk"
              className="flex items-center justify-center shrink-0"
              style={{ width: 46, height: 46, borderRadius: 14, border: `1px solid ${COLORS.border}`, background: "#FFFFFF", color: COLORS.ink }}
            >
              <ScanLine size={19} />
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              title="Tutup"
              className="flex items-center justify-center shrink-0"
              style={{ width: 44, height: 44, borderRadius: 999, border: "none", background: COLORS.soft, color: COLORS.muted }}
            >
              <X size={17} strokeWidth={2.2} />
            </button>
          )}
        </div>

        {/* Nominal besar */}
        <div className="text-center" style={{ padding: "4px 0 0" }}>
          <div style={{ fontSize: 13, color: COLORS.muted }}>Nominal</div>
          <label className="flex items-baseline justify-center" style={{ gap: 6, cursor: "text" }}>
            <span style={{ fontSize: 22, fontWeight: 600, color: amount ? COLORS.ink : "#B9BDB5" }}>Rp</span>
            <input
              autoFocus={mode === "add"}
              inputMode="text"
              aria-label="Nominal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d+\-*/().x×÷ ]/gi, ""))}
              placeholder="0"
              className="fs-38"
              style={{
                width: `calc(${Math.max(1, String(amount).length)}ch + 8px)`,
                maxWidth: "80%",
                minWidth: 30,
                border: "none",
                outline: "none",
                background: "transparent",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: COLORS.ink,
                textAlign: "left",
                padding: 0,
              }}
            />
          </label>
          <div style={{ fontSize: 12, color: amount && computedAmount === null ? COLORS.out : COLORS.muted }}>{hint}</div>
        </div>

        <AutoHeight swapKey={isSplit ? "split" : `single-${type}`}>
          <FadeSwap swapKey={isSplit ? "split" : `single-${type}`}>
            {isSplit ? (
              <div className="flex flex-col" style={{ gap: 8 }}>
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: 12.5, fontWeight: 500, color: COLORS.muted }}>Pembagian kategori</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: computedAmount && Math.round(splitTotal) === Math.round(computedAmount) ? COLORS.safe : COLORS.expenseText }}>
                    {fmtRupiah(splitTotal)}
                    {computedAmount ? ` / ${fmtRupiah(computedAmount)}` : ""}
                  </span>
                </div>
                {splits.map((s, i) => (
                  <div key={i} className="flex items-center" style={{ gap: 8 }}>
                    <select
                      value={s.categoryId}
                      onChange={(e) => updateSplit(i, { categoryId: e.target.value })}
                      aria-label={`Kategori baris ${i + 1}`}
                      className="inp flex-1 min-w-0"
                      style={{ ...fieldStyle, padding: "0 10px" }}
                    >
                      <option value="">Pilih kategori</option>
                      {catOptions.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <input
                      inputMode="text"
                      value={s.amount}
                      onChange={(e) => updateSplit(i, { amount: e.target.value.replace(/[^\d+\-*/().x×÷ ]/gi, "") })}
                      placeholder="Rp 0"
                      aria-label={`Nominal baris ${i + 1}`}
                      className="inp"
                      style={{ ...fieldStyle, width: 116, padding: "0 12px", fontWeight: 600 }}
                    />
                    <button
                      type="button"
                      onClick={() => removeSplitRow(i)}
                      disabled={splits.length <= 2}
                      aria-label={`Hapus baris ${i + 1}`}
                      className="flex items-center justify-center shrink-0"
                      style={{ width: 40, height: 40, borderRadius: 12, border: "none", background: COLORS.outBg, color: COLORS.expenseText, opacity: splits.length <= 2 ? 0.35 : 1 }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addSplitRow}
                  className="flex items-center justify-center"
                  style={{ height: 42, gap: 6, borderRadius: 14, border: `1px dashed ${COLORS.border}`, background: "transparent", color: COLORS.primary, fontSize: 13, fontWeight: 600 }}
                >
                  <Plus size={14} /> Tambah baris
                </button>
              </div>
            ) : (
              <div className="flex flex-col" style={{ gap: 8 }}>
                <div style={{ fontSize: 12.5, fontWeight: 500, color: COLORS.muted }}>Kategori</div>
                {catOptions.length === 0 ? (
                  <div style={{ fontSize: 13, color: COLORS.muted }}>Belum ada kategori. Tambahkan lewat menu → Kategori.</div>
                ) : (
                  <div className="grid" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8, rowGap: 10 }}>
                    {catOptions.map((c) => (
                      <CategoryTile key={c.id} category={c} active={categoryId === c.id} onClick={() => setCategoryId(c.id)} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </FadeSwap>
        </AutoHeight>

        <div className="flex flex-col" style={{ gap: 8 }}>
          <div style={{ fontSize: 12.5, fontWeight: 500, color: COLORS.muted }}>Dompet</div>
          <div className="flex overflow-x-auto" style={{ gap: 6, margin: "-4px -20px", padding: "4px 20px", scrollbarWidth: "none" }}>
            {wallets.map((w) => (
              <Chip key={w.id} active={walletId === w.id} onClick={() => setWalletId(w.id)} height={38} activeBg={COLORS.primary} ink={COLORS.ink} inkSoft={COLORS.muted} border={COLORS.border} style={{ flexShrink: 0, padding: "0 16px" }}>
                {w.name}
              </Chip>
            ))}
          </div>
        </div>

        <div className="flex" style={{ gap: 8 }}>
          {/* Kolom tanggal asli dibuat transparan di atas tombol, jadi sentuhan
              langsung membuka pemilih tanggal & jam bawaan HP. */}
          <div className="relative flex-1 min-w-0">
            <div className="flex items-center justify-center" style={{ ...fieldStyle, gap: 6, fontSize: 13, padding: "0 10px" }}>
              <Clock3 size={15} className="shrink-0" />
              <span className="truncate">{fmtWhen(date)}</span>
            </div>
            <input
              type="datetime-local"
              aria-label="Tanggal & jam"
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              onClick={(e) => {
                try {
                  e.currentTarget.showPicker();
                } catch {
                  /* browser lama */
                }
              }}
              className="absolute inset-0"
              style={{ opacity: 0, width: "100%", height: "100%", cursor: "pointer" }}
            />
          </div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Catatan"
            aria-label="Catatan"
            className="inp flex-1 min-w-0"
            style={{ ...fieldStyle, padding: "0 14px" }}
          />
        </div>

        <div>
          <div className="flex flex-wrap" style={{ columnGap: 14 }}>
            <button type="button" onClick={() => setShowTags((v) => !v)} style={linkBtn}>
              {showTags ? "Sembunyikan tag" : tags.length ? `# ${tags.length} tag` : "# Tambah tag"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSplit((v) => !v);
                setError("");
              }}
              style={linkBtn}
            >
              {isSplit ? "Pakai satu kategori" : "Bagi ke beberapa kategori"}
            </button>
          </div>
          <Collapse open={showTags}>
            <div className="flex flex-col" style={{ gap: 8, paddingTop: 6 }}>
              {tags.length > 0 && (
                <div className="flex flex-wrap" style={{ gap: 6 }}>
                  {tags.map((t) => (
                    <span key={t} className="flex items-center" style={{ gap: 4, fontSize: 12.5, fontWeight: 600, color: "#FFFFFF", background: COLORS.primary, borderRadius: 999, padding: "4px 6px 4px 11px" }}>
                      #{t}
                      <button type="button" aria-label={`Hapus tag ${t}`} onClick={() => setTags((prev) => prev.filter((x) => x !== t))} className="flex items-center justify-center" style={{ width: 22, height: 22, borderRadius: 999, border: "none", background: "rgba(255,255,255,0.18)", color: "#FFFFFF" }}>
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
                aria-label="Tag baru"
                className="inp w-full"
                style={{ ...fieldStyle, padding: "0 14px" }}
              />
              {suggestions.length > 0 && (
                <div className="flex flex-wrap" style={{ gap: 6 }}>
                  {suggestions.map((t) => (
                    <Chip key={t} onClick={() => addTag(t)} height={32} ink={COLORS.muted} inkSoft={COLORS.muted} border={COLORS.border} style={{ padding: "0 11px", fontSize: 12 }}>
                      #{t}
                    </Chip>
                  ))}
                </div>
              )}
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
              style={{ fontSize: 12.5, color: COLORS.out, overflow: "hidden" }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="button"
          onClick={submit}
          disabled={saving}
          style={{ height: 52, borderRadius: 16, border: "none", background: COLORS.primary, color: "#FFFFFF", fontSize: 15, fontWeight: 600, opacity: saving ? 0.6 : 1 }}
        >
          {saving ? "Menyimpan..." : saveLabel}
        </button>
      </div>
    </Overlay>
  );
}

// --- Scan struk ---------------------------------------------------------
function ReceiptScanModal({ categories, wallets, transactions, toBuy, aliases, saving, onClose, onSubmit, onMarkBought, onSaveAliases }) {
  const [step, setStep] = useState("pick"); // pick | loading | review
  const [files, setFiles] = useState([]);
  const [progress, setProgress] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const abortRef = useRef(null);
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
    setProgress("Menyiapkan foto...");
    setElapsed(0);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const result = await scanReceipt(
        picked,
        {
          categories: categories.filter((c) => c.kind === "expense"),
          toBuyNames: pendingToBuy.map((e) => e.itemName),
          aliases: aliases || {},
        },
        { signal: ctrl.signal, onProgress: setProgress }
      );
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
      if (err.message === "DIBATALKAN") {
        setError("");
      } else if (err.message === "NO_API_KEY") {
        setError("NO_API_KEY");
      } else {
        setError(err.message || "Gagal membaca struk.");
      }
      setStep("pick");
    } finally {
      abortRef.current = null;
    }
  };

  const cancelScan = () => {
    if (abortRef.current) abortRef.current.abort();
    setStep("pick");
  };

  // Hentikan pemindaian kalau jendelanya ditutup di tengah jalan.
  useEffect(() => () => abortRef.current && abortRef.current.abort(), []);

  // Penghitung detik supaya terlihat prosesnya masih berjalan.
  useEffect(() => {
    if (step !== "loading") return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [step]);

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
      onMarkBought(
        accepted.map(([itemId, m]) => {
          const it = parsed.items.find((x) => x.id === itemId);
          return { entryId: m.entryId, qty: it && Number(it.qty) > 0 ? Number(it.qty) : 1 };
        })
      );
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
        <div style={{ fontFamily: KAS_FONT, fontWeight: 600, fontSize: 19, color: COLORS.primary }}>Scan Struk</div>
      </div>

      <FadeSwap swapKey={step}>
      {step === "pick" && (
        <>
          {error === "NO_API_KEY" ? (
            <div className="rounded-xl p-3.5 mb-3" style={{ background: COLORS.lowBg, border: `1px solid ${COLORS.low}55` }}>
              <div className="text-sm font-semibold mb-1" style={{ color: COLORS.low }}>
                Fitur scan belum aktif
              </div>
              <p className="text-xs leading-relaxed" style={{ color: COLORS.ink }}>
                API key belum dipasang. Ambil key gratis di Groq (atau Google AI Studio), lalu tambahkan sebagai
                <span className="font-semibold"> VITE_GROQ_API_KEY</span> di pengaturan Vercel.
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
        <div className="py-8 text-center">
          {/* Denyut halus selama struk dibaca. */}
          <motion.div
            className="rounded-full mx-auto mb-3 flex items-center justify-center"
            style={{ width: 52, height: 52, background: COLORS.iconAgendaBg }}
            animate={{ scale: [1, 1.08, 1], opacity: [1, 0.8, 1] }}
            transition={{ duration: 1.4, ease: "easeInOut", repeat: Infinity }}
          >
            <ScanLine size={22} color={COLORS.iconAgendaFg} />
          </motion.div>
          <div className="text-sm font-medium" style={{ color: COLORS.ink }}>
            {progress || "Membaca struk..."}
          </div>
          <div className="text-xs mt-1" style={{ color: COLORS.inkSoft }}>
            {elapsed} detik{files.length > 1 ? ` · ${files.length} foto` : ""}
          </div>
          {elapsed >= 15 && (
            <div className="text-xs mt-2 px-4" style={{ color: COLORS.low }}>
              Agak lama nih, mungkin servernya lagi ramai.
            </div>
          )}
          <button
            onClick={cancelScan}
            className="mt-4 px-4 py-2 rounded-lg text-sm font-medium"
            style={{ border: `1px solid ${COLORS.border}`, color: COLORS.ink }}
          >
            Batalkan
          </button>
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
      </FadeSwap>
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
      <div style={{ fontFamily: KAS_FONT, fontWeight: 600, fontSize: 19, color: COLORS.primary }} className="mb-3">
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
      <div style={{ fontFamily: KAS_FONT, fontWeight: 600, fontSize: 19, color: COLORS.primary }} className="mb-3">
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
    <SidePanel onClose={onClose}>
      <Stagger>
      <StaggerItem className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Tag size={18} color={COLORS.primary} />
          <div style={{ fontFamily: KAS_FONT, fontWeight: 600, fontSize: 19, color: COLORS.primary }}>Kategori</div>
        </div>
        <button onClick={onClose}>
          <X size={18} color={COLORS.inkSoft} />
        </button>
      </StaggerItem>

      <StaggerItem className="flex gap-1 p-1 rounded-xl mb-3" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
        {[
          { key: "expense", label: "Pengeluaran" },
          { key: "income", label: "Pemasukan" },
        ].map((o) => (
          <button
            key={o.key}
            onClick={() => setKind(o.key)}
            className="relative flex-1 py-2 rounded-lg text-sm font-medium"
            style={{ color: kind === o.key ? "#fff" : COLORS.ink }}
          >
            {kind === o.key && (
              <motion.span
                layoutId="kas-category-kind"
                className="absolute inset-0"
                style={{ background: COLORS.primary, borderRadius: 8 }}
                transition={SPRING.snappy}
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        ))}
      </StaggerItem>

      <StaggerItem>
      <FadeSwap swapKey={kind}>
      <AnimatedList className="flex flex-col gap-2 mb-3">
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
      </AnimatedList>
      </FadeSwap>

      <button
        onClick={() => onAdd(kind)}
        className="w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5"
        style={{ background: COLORS.card, border: `1px dashed ${COLORS.border}`, color: COLORS.primary }}
      >
        <Plus size={15} /> Tambah kategori
      </button>
      </StaggerItem>
      </Stagger>
    </SidePanel>
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
      <div style={{ fontFamily: KAS_FONT, fontWeight: 600, fontSize: 19, color: COLORS.primary }} className="mb-3">
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
function MenuItem({ icon: Icon, label, onClick, last, danger }) {
  return (
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
}

function MenuPanel({ userName, onClose, onOpenCategories, onTransfer, onSwitchApp, onLogout }) {
  // Drawer ditutup dulu (animasi keluarnya jalan sendiri), lalu aksinya
  // langsung dijalankan.
  const runAndClose = (fn) => {
    onClose();
    if (fn) fn();
  };

  return (
    <SidePanel onClose={onClose}>
      <Stagger>
      <StaggerItem className="flex items-center justify-between mb-4">
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
      </StaggerItem>

      <StaggerItem className="rounded-2xl overflow-hidden" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
        <MenuItem icon={Tag} label="Kelola Kategori" onClick={() => runAndClose(onOpenCategories)} last={!onTransfer} />
        {onTransfer && (
          <MenuItem icon={ArrowLeftRight} label="Transfer Antar Dompet" onClick={() => runAndClose(onTransfer)} last />
        )}
      </StaggerItem>

      <StaggerItem className="rounded-2xl overflow-hidden mt-3" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
        <MenuItem icon={LayoutGrid} label="Ganti Aplikasi" onClick={() => runAndClose(onSwitchApp)} />
        <MenuItem icon={LogOut} label="Keluar" onClick={() => runAndClose(onLogout)} last danger />
      </StaggerItem>
      </Stagger>
    </SidePanel>
  );
}
