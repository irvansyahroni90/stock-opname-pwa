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
  SlidersHorizontal,
  Gem,
  RefreshCw,
  ChevronUp,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { storageSet, storageSubscribe } from "./firebase";
import { SharedStyles } from "./SharedStyles";
import { scanReceipt, guessWallet, findDuplicate } from "./receiptScan";
import { GOLD_BRANDS, BRAND_BY_KEY, isAutoBrand, todayWIB, fetchLatestPrices, fetchPriceHistory } from "./goldPrice";
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
  Stepper,
  AreaChart,
  PairBars,
  Donut,
  HeroBar,
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

const TAB_ORDER = ["dashboard", "transactions", "wallets", "analysis"];

const KAS_TABS = [
  { key: "dashboard", label: "Beranda", icon: Home },
  { key: "transactions", label: "Transaksi", icon: Receipt },
  { key: "wallets", label: "Aset", icon: Wallet },
  { key: "analysis", label: "Analisis", icon: PieChart },
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
  stock: TrendingUp,
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

// Dompet saham/investasi: nilainya naik-turun mengikuti pasar, jadi
// perubahan nilainya BUKAN pemasukan/pengeluaran.
function isInvestment(wallet) {
  return !!wallet && wallet.icon === "stock";
}

// Transaksi yang dihitung sebagai pemasukan/pengeluaran (ringkasan bulanan &
// analisis). Pembaruan nilai saham tidak ikut.
function countsAsFlow(t) {
  return !t.valuation;
}

// "Irvan · 1 Okt 2026, 15.41"
function stamp(by, at) {
  if (!at) return by || "?";
  return `${by || "?"} · ${fmtDateTime(at)}`;
}

// Kapan & oleh siapa sebuah dompet terakhir berubah: dompetnya sendiri
// diedit, atau ada transaksi yang memakai dompet itu.
function walletLastActivity(wallet, transactions) {
  let best = wallet.updatedAt ? { at: wallet.updatedAt, by: wallet.updatedBy } : null;
  for (const t of transactions) {
    if (t.walletId !== wallet.id && t.toWalletId !== wallet.id) continue;
    const at = t.updatedAt || t.createdAt;
    if (at && (!best || at > best.at)) best = { at, by: t.updatedBy || t.createdBy };
  }
  return best;
}

// --- Emas: harga & nilai -------------------------------------------------
const EMPTY_PRICES = { days: {}, sources: {}, historyLoaded: {} };

function fmtGram(g) {
  const n = Math.round((Number(g) || 0) * 1000) / 1000;
  return String(n).replace(".", ",");
}

// Indeks harga per merek: daftar tanggal terurut + harganya, untuk mencari
// "harga terakhir pada/ sebelum tanggal X" dengan cepat.
function buildPriceIndex(prices) {
  const byBrand = {};
  Object.keys((prices && prices.days) || {})
    .sort()
    .forEach((date) => {
      const day = prices.days[date] || {};
      Object.entries(day).forEach(([brand, p]) => {
        if (!p || !(p.s > 0)) return;
        (byBrand[brand] = byBrand[brand] || []).push({ date, s: p.s, b: p.b || null });
      });
    });
  // Riwayat sering tanpa harga buyback. Supaya grafik "buyback" tidak tampak
  // anjlok/melonjak palsu, buyback yang kosong diperkirakan dari rasio
  // buyback/jual di tanggal terdekat yang lengkap.
  Object.values(byBrand).forEach((list) => {
    const known = list.map((p, i) => (p.b ? i : -1)).filter((i) => i >= 0);
    if (!known.length) return;
    let k = 0;
    list.forEach((p, i) => {
      if (p.b) return;
      while (k < known.length - 1 && Math.abs(known[k + 1] - i) <= Math.abs(known[k] - i)) k++;
      const ref = list[known[k]];
      p.b = Math.round(p.s * (ref.b / ref.s));
      p.estimated = true;
    });
  });
  return byBrand;
}

// Harga per gram sebuah merek pada tanggal tertentu (YYYY-MM-DD). Memakai
// harga terakhir yang diketahui sebelum/pada tanggal itu; kalau belum ada,
// harga paling awal yang tersimpan.
function priceAt(index, brand, date, basis) {
  const list = index[brand];
  if (!list || !list.length) return null;
  let lo = 0,
    hi = list.length - 1,
    found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (list[mid].date <= date) {
      found = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  const p = list[found >= 0 ? found : 0];
  const perGram = basis === "buyback" && p.b ? p.b : p.s;
  return { perGram, date: p.date, s: p.s, b: p.b };
}

function holdingPerGram(h, index, date, basis) {
  if (!isAutoBrand(h.brand)) return Number(h.manualPrice) > 0 ? { perGram: Number(h.manualPrice), date: null, manual: true } : null;
  return priceAt(index, h.brand, date, basis);
}

function holdingValue(h, index, date, basis) {
  const p = holdingPerGram(h, index, date, basis);
  return p ? (Number(h.grams) || 0) * p.perGram : 0;
}

// Sejak kapan emas dihitung. Tanpa tanggal beli, dianggap sudah dimiliki
// sejak awal — jadi grafik menunjukkan naik-turun nilainya karena harga.
function holdingStart(h) {
  return h.buyDate || "0000-00-00";
}

function goldValueAt(gold, index, date, basis) {
  return gold.reduce((sum, h) => (holdingStart(h) <= date ? sum + holdingValue(h, index, date, basis) : sum), 0);
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
let kasCache = { wallets: null, categories: null, transactions: null, toBuy: null, aliases: null, log: null, gold: null, goldPrices: null, settings: null };

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

  // Emas: kepemilikan (gram per pemilik & merek), harga harian, pengaturan.
  const [gold, setGold] = useState(() => kasCache.gold || []);
  const [goldPrices, setGoldPrices] = useState(() => kasCache.goldPrices || EMPTY_PRICES);
  const [kasSettings, setKasSettings] = useState(() => kasCache.settings || {});
  const [goldStatus, setGoldStatus] = useState("idle"); // idle | loading | ok | error
  const [goldModal, setGoldModal] = useState(null); // { mode, holding? }
  const [assetChooser, setAssetChooser] = useState(false);
  const goldBasis = kasSettings.goldBasis === "buyback" ? "buyback" : "sell";

  const [txSearch, setTxSearch] = useState("");
  const [txFilter, setTxFilter] = useState("all"); // all | income | expense | transfer

  const [txModal, setTxModal] = useState(null);
  const [txDetailId, setTxDetailId] = useState(null);
  // Sesuaikan saldo: null = tertutup, { walletId } = terbuka.
  const [adjustModal, setAdjustModal] = useState(null);
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
  // Catatan perubahan Kas Rumah: siapa mengubah apa, kapan (termasuk hapus).
  const [kasLog, setKasLog] = useState(() => kasCache.log || []);
  const [showLog, setShowLog] = useState(false);
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
      storageSubscribe("kas-gold", (data) => {
        const next = Array.isArray(data) ? data : [];
        kasCache.gold = next;
        setGold(next);
      }),
      storageSubscribe("kas-gold-prices", (data) => {
        const next = data && typeof data === "object" && data.days ? data : EMPTY_PRICES;
        kasCache.goldPrices = next;
        setGoldPrices(next);
      }),
      storageSubscribe("kas-settings", (data) => {
        const next = data && typeof data === "object" ? data : {};
        kasCache.settings = next;
        setKasSettings(next);
      }),
      storageSubscribe("kas-log", (data) => {
        const next = Array.isArray(data) ? data : [];
        kasCache.log = next;
        setKasLog(next);
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

  // --- Catatan perubahan ------------------------------------------------
  const kasLogRef = useRef(kasLog);
  kasLogRef.current = kasLog;
  const logKas = (kind, text) => {
    const entry = { id: uid("log"), at: new Date().toISOString(), by: userName || "?", kind, text };
    const next = [entry, ...kasLogRef.current].slice(0, 300);
    kasLogRef.current = next;
    kasCache.log = next;
    setKasLog(next);
    return storageSet("kas-log", next);
  };

  const catName = (id) => categories.find((c) => c.id === id)?.name;
  const walName = (id) => wallets.find((w) => w.id === id)?.name || "?";
  const describeTx = (t) => {
    const nominal = fmtRupiah(t.amount);
    if (t.type === "transfer") return `transfer ${nominal} dari ${walName(t.walletId)} ke ${walName(t.toWalletId)}`;
    if (t.valuation) return `nilai saham ${walName(t.walletId)} ${t.type === "income" ? "naik" : "turun"} ${nominal}`;
    if (t.adjustment) return `penyesuaian saldo ${walName(t.walletId)} ${t.type === "income" ? "+" : "−"}${nominal}`;
    const what = t.note || catName(t.categoryId) || (t.splits && t.splits.length ? `${t.splits.length} kategori` : "");
    return `${t.type === "income" ? "pemasukan" : "pengeluaran"} ${nominal}${what ? ` (${what})` : ""} · ${walName(t.walletId)}`;
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
    const merged = existing ? { ...existing, ...data } : data;
    const verb = existing ? "mengubah" : data.valuation ? "memperbarui" : data.adjustment ? "mencatat" : "mencatat";
    const saveP = persistTransactions(next);
    setSaving(false);
    setTxModal(null);
    setTransferModal(false);
    await Promise.all([saveP, logKas("tx", `${verb} ${describeTx(merged)}`)]);
  };

  const handleDeleteTx = async (id) => {
    const t = transactions.find((x) => x.id === id);
    await Promise.all([
      persistTransactions(transactions.filter((x) => x.id !== id)),
      t ? logKas("tx", `menghapus ${describeTx(t)}`) : null,
    ]);
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
    const now = new Date().toISOString();
    let next;
    if (existing) {
      next = wallets.map((w) => (w.id === existing.id ? { ...w, ...data, updatedBy: userName, updatedAt: now } : w));
    } else {
      next = [...wallets, { id: uid("wal"), ...data, createdBy: userName, createdAt: now, updatedBy: userName, updatedAt: now }];
    }
    logKas("wallet", existing ? `mengubah dompet ${data.name}` : `menambahkan dompet ${data.name} (${fmtRupiah(data.initialBalance)})`);
    await persistWallets(next);
    setSaving(false);
    setWalletModal(null);
  };

  const handleDeleteWallet = async (id) => {
    const w = wallets.find((x) => x.id === id);
    await Promise.all([persistWallets(wallets.filter((x) => x.id !== id)), w ? logKas("wallet", `menghapus dompet ${w.name}`) : null]);
  };

  // --- Aksi kategori ----------------------------------------------------
  const handleSaveCategory = async (data, existing) => {
    setSaving(true);
    let next;
    const now = new Date().toISOString();
    if (existing) {
      next = categories.map((c) => (c.id === existing.id ? { ...c, ...data, updatedBy: userName, updatedAt: now } : c));
    } else {
      next = [...categories, { id: uid("cat"), ...data, createdBy: userName, createdAt: now, updatedBy: userName, updatedAt: now }];
    }
    logKas("category", existing ? `mengubah kategori ${data.name}` : `menambahkan kategori ${data.name}`);
    await persistCategories(next);
    setSaving(false);
    setCategoryModal(null);
  };

  const handleDeleteCategory = async (id) => {
    const c = categories.find((x) => x.id === id);
    await Promise.all([persistCategories(categories.filter((x) => x.id !== id)), c ? logKas("category", `menghapus kategori ${c.name}`) : null]);
  };

  // --- Emas -------------------------------------------------------------
  const goldLabel = (h) => `${BRAND_BY_KEY[h.brand]?.label || "Emas"} ${fmtGram(h.grams)} gr milik ${h.owner}`;

  const goldSavingRef = useRef(false);
  const handleSaveGold = async (data, existing) => {
    if (goldSavingRef.current) return;
    goldSavingRef.current = true;
    setTimeout(() => (goldSavingRef.current = false), 600);
    const now = new Date().toISOString();
    const next = existing
      ? gold.map((g) => (g.id === existing.id ? { ...g, ...data, updatedBy: userName, updatedAt: now } : g))
      : [...gold, { id: uid("gold"), ...data, createdBy: userName, createdAt: now, updatedBy: userName, updatedAt: now }];
    setGold(next);
    kasCache.gold = next;
    setGoldModal(null);
    await Promise.all([
      storageSet("kas-gold", next),
      logKas("gold", existing ? `mengubah emas jadi ${goldLabel({ ...existing, ...data })}` : `menambahkan emas ${goldLabel(data)}`),
    ]);
  };

  const handleDeleteGold = async (id) => {
    const h = gold.find((g) => g.id === id);
    const next = gold.filter((g) => g.id !== id);
    setGold(next);
    kasCache.gold = next;
    await Promise.all([storageSet("kas-gold", next), h ? logKas("gold", `menghapus emas ${goldLabel(h)}`) : null]);
  };

  const setGoldBasis = async (basis) => {
    const next = { ...kasSettings, goldBasis: basis };
    setKasSettings(next);
    kasCache.settings = next;
    await storageSet("kas-settings", next);
  };

  // Harga emas otomatis: dicek saat Kas dibuka (paling sering tiap 3 jam per
  // perangkat), plus riwayat ke belakang sekali per merek untuk grafik.
  const goldPricesRef = useRef(goldPrices);
  goldPricesRef.current = goldPrices;
  const goldBusyRef = useRef(false);
  const goldBrandsUsed = useMemo(() => [...new Set(gold.map((g) => g.brand))].filter(isAutoBrand).sort(), [gold]);

  const refreshGoldPrices = async ({ force = false } = {}) => {
    const brands = goldBrandsUsed;
    if (!brands.length || goldBusyRef.current) return;
    const today = todayWIB();
    const cur = goldPricesRef.current || EMPTY_PRICES;
    const hasToday = brands.every((b) => cur.days[today] && cur.days[today][b]);
    const tried = cur.historyTriedAt || {};
    // Riwayat dicoba lagi paling cepat sehari sekali kalau sebelumnya gagal.
    const needHistory = brands.some((b) => !(cur.historyLoaded || {})[b] && Date.now() - (tried[b] || 0) > 24 * 3600 * 1000);
    let lastCheck = 0;
    try {
      lastCheck = Number(localStorage.getItem("kas-gold-checked") || 0);
    } catch {
      /* abaikan */
    }
    if (!force && hasToday && !needHistory) return;
    if (!force && !needHistory && Date.now() - lastCheck < 3 * 3600 * 1000) return;
    const markChecked = () => {
      try {
        localStorage.setItem("kas-gold-checked", String(Date.now()));
      } catch {
        /* abaikan */
      }
    };

    goldBusyRef.current = true;
    setGoldStatus("loading");
    try {
      const latest = await fetchLatestPrices(brands);
      const added = {}; // date -> brand -> {s,b}
      const addedSources = {};
      const historyDone = {};
      const historyTried = {};
      Object.entries(latest).forEach(([brand, p]) => {
        added[p.date] = { ...(added[p.date] || {}), [brand]: { s: p.s, b: p.b } };
        addedSources[brand] = p.source;
      });
      for (const brand of brands) {
        const base = goldPricesRef.current || EMPTY_PRICES;
        if ((base.historyLoaded || {})[brand]) continue;
        if (!force && Date.now() - ((base.historyTriedAt || {})[brand] || 0) <= 24 * 3600 * 1000) continue;
        historyTried[brand] = Date.now();
        const hist = await fetchPriceHistory(brand);
        if (!hist) continue;
        Object.entries(hist).forEach(([date, p]) => {
          added[date] = { ...(added[date] || {}), [brand]: added[date]?.[brand] || p };
        });
        historyDone[brand] = true;
      }

      // Gabungkan dengan data TERBARU (mungkin baru diubah perangkat lain
      // selama menunggu), lalu simpan hanya kalau ada yang berubah.
      const base = goldPricesRef.current || EMPTY_PRICES;
      let changed = false;
      const days = { ...base.days };
      Object.entries(added).forEach(([date, brandsOfDay]) => {
        Object.entries(brandsOfDay).forEach(([brand, p]) => {
          const old = days[date] && days[date][brand];
          // Harga yang sudah ada dari "harga terbaru" tidak ditimpa riwayat,
          // kecuali tanggal hari ini yang memang bisa diperbarui.
          if (old && (old.s === p.s && old.b === p.b)) return;
          if (old && !latest[brand]) return;
          if (old && latest[brand] && latest[brand].date !== date) return;
          days[date] = { ...(days[date] || {}), [brand]: p };
          changed = true;
        });
      });
      const next = {
        days,
        sources: { ...(base.sources || {}), ...addedSources },
        historyLoaded: { ...(base.historyLoaded || {}), ...historyDone },
        historyTriedAt: { ...(base.historyTriedAt || {}), ...historyTried },
        checkedAt: new Date().toISOString(),
      };
      if (Object.keys(historyDone).length || Object.keys(historyTried).length) changed = true;
      if (Object.keys(addedSources).some((k) => (base.sources || {})[k] !== addedSources[k])) changed = true;
      if (changed) {
        const keep = Object.keys(next.days).sort().slice(-800);
        next.days = Object.fromEntries(keep.map((d) => [d, next.days[d]]));
        setGoldPrices(next);
        kasCache.goldPrices = next;
        goldPricesRef.current = next;
        await storageSet("kas-gold-prices", next);
      }
      setGoldStatus(Object.keys(latest).length ? "ok" : "error");
    } catch {
      setGoldStatus("error");
    } finally {
      markChecked();
      goldBusyRef.current = false;
    }
  };

  useEffect(() => {
    if (loading) return;
    refreshGoldPrices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, goldBrandsUsed.join(",")]);

  const goldIndex = useMemo(() => buildPriceIndex(goldPrices), [goldPrices]);

  const handleConfirmedDelete = async () => {
    if (!confirmDelete) return;
    if (confirmDelete.type === "gold") await handleDeleteGold(confirmDelete.id);
    else if (confirmDelete.type === "tx") await handleDeleteTx(confirmDelete.id);
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
      if (!isSameMonth(t.date, ref) || !countsAsFlow(t)) return;
      if (t.type === "income") income += Number(t.amount) || 0;
      else if (t.type === "expense") expense += Number(t.amount) || 0;
    });
    const balance = wallets.reduce((sum, w) => sum + walletBalance(w, transactions), 0);
    const equity = wallets.filter(isInvestment).reduce((sum, w) => sum + walletBalance(w, transactions), 0);
    const hasEquity = wallets.some(isInvestment);
    const lastLog = kasLog[0] || null;
    return { income, expense, balance, equity, hasEquity, lastLog, monthCount: transactions.filter((t) => isSameMonth(t.date, ref)).length };
  }, [transactions, wallets, kasLog]);

  // Data pertama kali belum siap: kartu sambutan tetap langsung tampil (jadi
  // kartu dari halaman awal tetap punya tempat mendarat), sisanya menunggu.
  if (loading) {
    return (
      <div className="h-full" style={{ color: COLORS.ink, fontFamily: KAS_FONT }}>
        <SharedStyles />
        <Backdrop color={COLORS.bg} />
        <div className="relative max-w-2xl mx-auto px-4">
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

  const assetsNow = assetSnapshot(wallets, transactions, gold, goldIndex, goldBasis);
  const txDetail = txDetailId ? transactions.find((t) => t.id === txDetailId) || null : null;

  const fabAction = () => {
    if (view === "wallets") setAssetChooser(true);
    else setTxModal({ mode: "add", type: "expense" });
  };

  // Calon nama pemilik emas: pengguna ini, semua yang pernah mencatat di Kas,
  // dan pemilik emas yang sudah ada (jadi nama istri otomatis muncul).
  const ownerOptions = [
    ...new Set(
      [userName, ...gold.map((g) => g.owner), ...transactions.map((t) => t.createdBy), ...kasLog.map((e) => e.by)].filter(
        (n) => n && n !== "?"
      )
    ),
  ];

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
            onAdjustBalance={wallets.length ? () => setAdjustModal({ walletId: (wallets.find((w) => !isInvestment(w)) || wallets[0]).id }) : undefined}
            onOpenLog={() => setShowLog(true)}
            assets={assetsNow}
            onOpenAnalysis={() => setView("analysis")}
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

          <AssetsPage
            wallets={wallets}
            transactions={transactions}
            gold={gold}
            goldIndex={goldIndex}
            goldBasis={goldBasis}
            goldPrices={goldPrices}
            goldStatus={goldStatus}
            onRefreshGold={() => refreshGoldPrices({ force: true })}
            onSetGoldBasis={setGoldBasis}
            onAddGold={() => setGoldModal({ mode: "add" })}
            onEditGold={(h) => setGoldModal({ mode: "edit", holding: h })}
            onBack={() => setView("dashboard")}
            onOpenMenu={() => setShowMenu(true)}
            onSwitchApp={onBackToPicker}
            notifSlot={view === "wallets" ? notifSlot : null}
            onEdit={(w) => setWalletModal({ mode: "edit", wallet: w })}
            onDelete={(w) => setConfirmDelete({ type: "wallet", id: w.id, label: w.name })}
            onAdjust={(w) => setAdjustModal({ walletId: w.id })}
          />

          <AnalysisPage
            transactions={transactions}
            wallets={wallets}
            gold={gold}
            goldIndex={goldIndex}
            goldBasis={goldBasis}
            catById={catById}
            walById={walById}
            onBack={() => setView("dashboard")}
            onOpenMenu={() => setShowMenu(true)}
            onSwitchApp={onBackToPicker}
            notifSlot={view === "analysis" ? notifSlot : null}
            onGoAssets={() => setView("wallets")}
          />
        </TabPager>
      </div>

      <NavBar
        id="kas-nav"
        tabs={KAS_TABS}
        active={view}
        onChange={setView}
        onAdd={fabAction}
        showAdd={view !== "analysis"}
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
            initialWalletId={txModal.walletId}
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
        {assetChooser && (
          <AssetChooserSheet
            key="asset-chooser"
            onClose={() => setAssetChooser(false)}
            onWallet={() => swapSheet(() => setAssetChooser(false), () => setWalletModal({ mode: "add" }))}
            onGold={() => swapSheet(() => setAssetChooser(false), () => setGoldModal({ mode: "add" }))}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {goldModal && (
          <GoldSheet
            key={`gold-${goldModal.holding ? goldModal.holding.id : "new"}`}
            mode={goldModal.mode}
            holding={goldModal.holding}
            ownerOptions={ownerOptions}
            goldIndex={goldIndex}
            goldBasis={goldBasis}
            saving={saving}
            onClose={() => setGoldModal(null)}
            onSubmit={(data) => handleSaveGold(data, goldModal.holding || null)}
            onDelete={
              goldModal.holding
                ? () => {
                    const h = goldModal.holding;
                    swapSheet(
                      () => setGoldModal(null),
                      () => setConfirmDelete({ type: "gold", id: h.id, label: `${BRAND_BY_KEY[h.brand]?.label || "Emas"} ${fmtGram(h.grams)} gr milik ${h.owner}` })
                    );
                  }
                : undefined
            }
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {adjustModal && (
          <BalanceAdjustSheet
            key="adjust-sheet"
            wallets={wallets}
            transactions={transactions}
            initialWalletId={adjustModal.walletId}
            categories={categories}
            saving={saving}
            onClose={() => setAdjustModal(null)}
            onSubmit={async (data) => {
              setAdjustModal(null);
              await handleSaveTx(data, null);
            }}
            onRecordIncome={(walletId) => swapSheet(() => setAdjustModal(null), () => setTxModal({ mode: "add", type: "income", walletId }))}
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
        {showLog && <KasLogPanel key="kas-log" log={kasLog} onClose={() => setShowLog(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {showMenu && (
          <MenuPanel
            key="menu"
            userName={userName}
            onClose={() => setShowMenu(false)}
            onOpenCategories={() => setCategoryPanel(true)}
            onOpenLog={() => setShowLog(true)}
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
function KasHero({ layoutId, fadeIn, notifSlot, onBackToPicker, onOpenMenu }) {
  const todayLabel = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const barBtn = { width: 44, height: 44, borderRadius: 999, border: "none", background: "rgba(255,255,255,0.14)", color: "#FFFFFF" };

  // Bilah hijau ringkas (sama seperti Agenda) — lapisan warnanya berubah
  // bentuk dari kartu di halaman awal; isinya menyusul.
  return (
    <HeroBar color={COLORS.primary} layoutId={layoutId} fadeIn={fadeIn}>
      <div className="flex items-center justify-between" style={{ gap: 10, minHeight: 44 }}>
        <div className="min-w-0">
          <div className="capitalize truncate" style={{ fontSize: 12.5, color: "rgba(255,255,255,0.72)" }}>
            {todayLabel}
          </div>
          <h1 style={{ fontFamily: KAS_FONT, fontWeight: 700, fontSize: 24, lineHeight: 1.15, color: "#FFFFFF" }}>Kas Rumah</h1>
        </div>
        {(onBackToPicker || onOpenMenu) && (
          <div className="flex items-center shrink-0" style={{ gap: 6 }}>
            {notifSlot}
            <button onClick={onBackToPicker} className="flex items-center justify-center" style={barBtn} title="Ganti aplikasi">
              <LayoutGrid size={18} />
            </button>
            <button onClick={onOpenMenu} className="flex items-center justify-center" style={barBtn} title="Menu">
              <Menu size={18} />
            </button>
          </div>
        )}
      </div>
    </HeroBar>
  );
}

function DashboardPage({ assets, onOpenAnalysis, onAdjustBalance, onOpenLog, userName, totals, recent, transactions, catById, walById, walletCount, onOpenMenu, onSeeAll, onOpenTx, onOpenTransfer, onSeeWallets, onBackToPicker, notifSlot, heroLayoutId, morphIn }) {
  return (
    <motion.div layoutScroll className="h-full overflow-y-auto" style={{ overscrollBehaviorY: "contain", WebkitOverflowScrolling: "touch" }}>
      <div className="max-w-2xl mx-auto px-4 pb-32">
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
          {totals.hasEquity && (
            <div className="flex items-center" style={{ gap: 5, fontSize: 12, color: COLORS.muted, marginTop: 2 }}>
              <TrendingUp size={13} className="shrink-0" />
              <span>
                termasuk saham <RollingNumber value={fmtRupiah(totals.equity)} />
              </span>
            </div>
          )}
          {onAdjustBalance && (
            <button
              type="button"
              onClick={onAdjustBalance}
              className="flex items-center"
              style={{ gap: 6, height: 34, marginTop: 6, padding: "0 12px", borderRadius: 999, border: `1px solid ${COLORS.border}`, background: "#FFFFFF", color: COLORS.primary, fontSize: 12, fontWeight: 600 }}
            >
              <SlidersHorizontal size={13} />
              Sesuaikan saldo
            </button>
          )}
          {totals.lastLog && (
            <button
              type="button"
              onClick={onOpenLog}
              className="flex items-center text-left w-full"
              style={{ gap: 5, marginTop: 10, fontSize: 11.5, color: COLORS.muted, border: "none", background: "transparent", padding: 0, minHeight: 24 }}
            >
              <Clock3 size={12} className="shrink-0" />
              <span className="truncate">Terakhir diperbarui {stamp(totals.lastLog.by, totals.lastLog.at)}</span>
              <ChevronRight size={12} className="shrink-0" />
            </button>
          )}

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
            <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.ink, marginTop: 8 }}>Aset</div>
            <div style={{ fontSize: 11, color: COLORS.inkSoft, marginTop: 2 }}>{walletCount} dompet · emas · saham</div>
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

        {/* Ringkasan aset & pintu ke Analisis */}
        <button
          type="button"
          onClick={onOpenAnalysis}
          className="w-full text-left"
          style={{ marginTop: 14, background: COLORS.card, borderRadius: 22, boxShadow: TX_CARD_SHADOW, padding: 16 }}
        >
          <div className="flex items-center justify-between" style={{ gap: 8 }}>
            <span className="flex items-center" style={{ gap: 8, fontSize: 15.5, fontWeight: 600 }}>
              <PieChart size={16} color={COLORS.primary} />
              Aset & analisis
            </span>
            <span className="flex items-center" style={{ gap: 2, fontSize: 12, fontWeight: 600, color: COLORS.primaryLight }}>
              Lihat <ChevronRight size={13} />
            </span>
          </div>
          <div style={{ fontSize: 12.5, color: COLORS.muted, marginTop: 10 }}>Total aset</div>
          <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.2 }}>
            <RollingNumber value={fmtRupiah(assets.total)} />
          </div>
          <div style={{ marginTop: 10 }}>
            <ProportionBar
              parts={["kas", "saham", "emas"].map((k) => ({ key: k, value: assets[k], color: ASSET_COLORS[k] }))}
              track={COLORS.track}
            />
          </div>
          <div className="grid" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginTop: 10 }}>
            {["kas", "saham", "emas"].map((k) => (
              <div key={k} className="min-w-0">
                <div className="flex items-center" style={{ gap: 5, fontSize: 11, color: COLORS.muted }}>
                  <span style={{ width: 8, height: 8, borderRadius: 3, background: ASSET_COLORS[k] }} />
                  {ASSET_LABELS[k]}
                </div>
                <div className="truncate" style={{ fontSize: 13, fontWeight: 600 }}>
                  {fmtCompactRp(assets[k])}
                </div>
                {k === "emas" && assets.grams > 0 && <div style={{ fontSize: 11, color: COLORS.muted }}>{fmtGram(assets.grams)} gram</div>}
              </div>
            ))}
          </div>
        </button>
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
  const isAdjust = !!tx.adjustment;
  const isValuation = !!tx.valuation;
  const Icon = isTransfer ? ArrowLeftRight : isValuation ? (isIncome ? TrendingUp : TrendingDown) : hasSplit ? Split : isAdjust && !category ? SlidersHorizontal : CATEGORY_ICONS[category?.icon] || Tag;
  const color = isTransfer ? COLORS.muted : category?.color || (isAdjust ? "#8B6F47" : isIncome ? COLORS.safe : COLORS.out);
  const catName = isValuation
    ? `Nilai saham ${isIncome ? "naik" : "turun"}`
    : hasSplit
    ? `${tx.splits.length} kategori`
    : category?.name || (isAdjust ? "Penyesuaian saldo" : "Tanpa kategori");
  const title = isTransfer ? `${wallet?.name || "?"} → ${toWallet?.name || "?"}` : tx.note || catName;
  const clock = new Date(tx.date).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(":", ".");
  const time = withDay ? `${dayLabel(tx.date)}, ${clock}` : clock;
  const who = tx.updatedBy && tx.updatedAt && tx.createdAt && tx.updatedAt !== tx.createdAt ? tx.updatedBy : tx.createdBy;
  const meta = isTransfer
    ? `Transfer${Number(tx.fee) > 0 ? ` · biaya ${fmtRupiah(tx.fee)}` : ""} · ${time}`
    : `${isAdjust && category ? "Penyesuaian · " : ""}${tx.note ? catName + " · " : ""}${wallet?.name || "?"} · ${time}${who ? " · " + who : ""}`;
  const sign = isIncome ? "+" : isTransfer ? "" : "−";
  const amountColor = isTransfer ? COLORS.muted : isIncome ? COLORS.safe : COLORS.expenseText;
  return { isValuation, isAdjust, isIncome, isTransfer, hasSplit, category, wallet, toWallet, Icon, color, catName, title, meta, sign, amountColor };
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
    // id hanya untuk daftar di halaman Transaksi (dipakai untuk menggulir ke
    // transaksi yang dituju dari notifikasi), bukan untuk salinan di Beranda.
    <div id={withDay ? undefined : `kas-tx-${tx.id}`} className="relative">
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
              {v.isValuation && row("Jenis", `Perubahan nilai saham (${v.isIncome ? "naik" : "turun"})`)}
              {v.isAdjust && !v.isValuation && row("Jenis", `Penyesuaian saldo (${v.isIncome ? "bertambah" : "berkurang"})`)}
              {!v.hasSplit && !v.isValuation && row("Kategori", v.category?.name || (v.isAdjust ? "Tanpa rincian" : "Tanpa kategori"))}
              {row("Dompet", v.wallet?.name || "?")}
            </>
          )}
          {row("Tanggal", fmtDateTime(tx.date))}
          {tx.note && !v.isTransfer && v.title !== tx.note && row("Catatan", tx.note)}
          {tx.note && v.isTransfer && row("Catatan", tx.note)}
          {row("Dicatat", stamp(tx.createdBy, tx.createdAt || tx.date))}
          {tx.updatedAt && tx.createdAt && tx.updatedAt !== tx.createdAt && row("Terakhir diubah", stamp(tx.updatedBy, tx.updatedAt))}
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
            {!v.isTransfer && !v.isAdjust && (
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

// --- Halaman Aset (dompet, saham, emas) -----------------------------------
// Warna tetap tiap jenis aset (dipakai juga di Analisis). Sudah dicek
// lewat validator palet: terbedakan juga untuk buta warna.
const ASSET_COLORS = { kas: "#2E7D51", saham: "#3F6FB5", emas: "#B07A1E" };
const ASSET_LABELS = { kas: "Kas & bank", saham: "Saham", emas: "Emas" };

function fmtCompactRp(n) {
  const v = Math.abs(Number(n) || 0);
  const sign = n < 0 ? "−" : "";
  if (v >= 1e9) return `${sign}Rp ${(v / 1e9).toFixed(v >= 1e10 ? 1 : 2).replace(".", ",")} M`;
  if (v >= 1e6) return `${sign}Rp ${(v / 1e6).toFixed(v >= 1e8 ? 0 : 1).replace(".", ",")} jt`;
  if (v >= 1e3) return `${sign}Rp ${Math.round(v / 1e3)} rb`;
  return `${sign}Rp ${Math.round(v)}`;
}

function fmtShortDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

// Ringkasan aset saat ini — dipakai Beranda, Aset, dan Analisis.
function assetSnapshot(wallets, transactions, gold, goldIndex, basis) {
  let kas = 0,
    saham = 0;
  wallets.forEach((w) => {
    const b = walletBalance(w, transactions);
    if (isInvestment(w)) saham += b;
    else kas += b;
  });
  const today = todayWIB();
  const emas = gold.reduce((s, h) => s + holdingValue(h, goldIndex, today, basis), 0);
  const grams = gold.reduce((s, h) => s + (Number(h.grams) || 0), 0);
  return { kas, saham, emas, grams, total: kas + saham + emas };
}

// Batang proporsi: segmen bertumpuk dengan celah 2px warna permukaan.
function ProportionBar({ parts, height = 8, track = "rgba(255,255,255,0.18)" }) {
  const total = parts.reduce((s, p) => s + Math.max(0, p.value), 0);
  return (
    <div className="flex w-full overflow-hidden" style={{ height, borderRadius: 99, background: total > 0 ? "transparent" : track, gap: total > 0 ? 2 : 0 }}>
      {total > 0 &&
        parts
          .filter((p) => p.value > 0)
          .map((p) => (
            <motion.span
              key={p.key}
              initial={false}
              animate={{ flexGrow: p.value / total }}
              transition={SPRING.page}
              style={{ flexBasis: 0, background: p.color, borderRadius: 99, minWidth: 4 }}
            />
          ))}
    </div>
  );
}

function AssetsPage({
  wallets,
  transactions,
  gold,
  goldIndex,
  goldBasis,
  goldPrices,
  goldStatus,
  onRefreshGold,
  onSetGoldBasis,
  onAddGold,
  onEditGold,
  onBack,
  onOpenMenu,
  onSwitchApp,
  notifSlot,
  onEdit,
  onDelete,
  onAdjust,
}) {
  const snap = useMemo(() => assetSnapshot(wallets, transactions, gold, goldIndex, goldBasis), [wallets, transactions, gold, goldIndex, goldBasis]);
  const parts = ["kas", "saham", "emas"].map((k) => ({ key: k, value: snap[k], color: ASSET_COLORS[k] }));
  const today = todayWIB();

  // Harga per merek yang dipakai, beserta perubahan dari hari sebelumnya.
  const brandRows = useMemo(() => {
    const used = [...new Set(gold.map((h) => h.brand))].filter(isAutoBrand);
    return used.map((brand) => {
      const list = goldIndex[brand] || [];
      const last = list[list.length - 1] || null;
      const prev = list.length > 1 ? list[list.length - 2] : null;
      const pick = (p) => (p ? (goldBasis === "buyback" && p.b ? p.b : p.s) : null);
      return {
        brand,
        label: BRAND_BY_KEY[brand]?.label || brand,
        price: pick(last),
        sell: last?.s || null,
        buyback: last?.b || null,
        change: last && prev ? pick(last) - pick(prev) : null,
        date: last?.date || null,
        source: (goldPrices.sources || {})[brand] || "",
      };
    });
  }, [gold, goldIndex, goldBasis, goldPrices]);

  const owners = useMemo(() => {
    const map = new Map();
    gold.forEach((h) => {
      const key = h.owner || "Tanpa nama";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(h);
    });
    return [...map.entries()].map(([owner, items]) => {
      const grams = items.reduce((s, h) => s + (Number(h.grams) || 0), 0);
      const value = items.reduce((s, h) => s + holdingValue(h, goldIndex, today, goldBasis), 0);
      return { owner, items, grams, value };
    });
  }, [gold, goldIndex, goldBasis, today]);

  const stale = brandRows.some((r) => r.date && r.date < today);
  const missing = brandRows.some((r) => !r.price);

  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 max-w-2xl mx-auto w-full px-4 pb-3" style={{ paddingTop: "env(safe-area-inset-top)", background: COLORS.bg }}>
        <TopBar title="Aset" onBack={onBack} onOpenMenu={onOpenMenu} onSwitchApp={onSwitchApp} notifSlot={notifSlot} />
        <div style={{ background: COLORS.primary, borderRadius: 20, padding: "14px 16px" }}>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)" }}>Total aset</div>
          <div style={{ fontFamily: KAS_FONT, fontWeight: 700, fontSize: 25, color: "#fff", lineHeight: 1.2 }}>
            <RollingNumber value={fmtRupiah(snap.total)} />
          </div>
          <div style={{ marginTop: 10 }}>
            <ProportionBar parts={parts} />
          </div>
          <div className="grid" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginTop: 10 }}>
            {["kas", "saham", "emas"].map((k) => (
              <div key={k} className="min-w-0">
                <div className="flex items-center" style={{ gap: 5, fontSize: 11, color: "rgba(255,255,255,0.75)" }}>
                  <span style={{ width: 8, height: 8, borderRadius: 99, background: ASSET_COLORS[k], boxShadow: "0 0 0 1.5px rgba(255,255,255,0.85)" }} />
                  {ASSET_LABELS[k]}
                </div>
                <div className="truncate" style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginTop: 1 }}>
                  {fmtCompactRp(snap[k])}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <motion.div layoutScroll className="flex-1 overflow-y-auto" style={{ overscrollBehaviorY: "contain", WebkitOverflowScrolling: "touch" }}>
        <div className="max-w-2xl mx-auto px-4 pb-32">
          {/* ---- Emas ---- */}
          <div className="flex items-center justify-between" style={{ padding: "6px 4px 8px" }}>
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", color: ASSET_COLORS.emas }}>
              EMAS{snap.grams > 0 ? ` · ${fmtGram(snap.grams)} GR` : ""}
            </span>
            {gold.length > 0 && (
              <Segmented
                ariaLabel="Nilai emas memakai"
                value={goldBasis}
                onChange={onSetGoldBasis}
                height={30}
                fontSize={11.5}
                activeBg={COLORS.primary}
                inkSoft={COLORS.muted}
                trackBg={COLORS.soft}
                style={{ width: 168, borderRadius: 11, padding: 2 }}
                options={[
                  { value: "sell", label: "Harga jual" },
                  { value: "buyback", label: "Buyback" },
                ]}
              />
            )}
          </div>

          {gold.length === 0 ? (
            <div className="text-center" style={{ background: COLORS.card, borderRadius: 20, border: `1px dashed ${COLORS.border}`, padding: "22px 16px" }}>
              <Gem size={26} color={ASSET_COLORS.emas} style={{ margin: "0 auto 8px" }} />
              <div style={{ fontSize: 13, color: COLORS.muted, lineHeight: 1.45 }}>
                Catat emas milikmu atau keluarga dalam gram. Nilainya ikut harga emas hari ini secara otomatis.
              </div>
              <button
                type="button"
                onClick={onAddGold}
                className="inline-flex items-center"
                style={{ marginTop: 12, gap: 6, height: 40, padding: "0 16px", borderRadius: 999, border: "none", background: COLORS.primary, color: "#fff", fontSize: 13, fontWeight: 600 }}
              >
                <Plus size={15} /> Tambah emas
              </button>
            </div>
          ) : (
            <div className="flex flex-col" style={{ gap: 10 }}>
              {/* Harga hari ini */}
              {brandRows.length > 0 && (
                <div style={{ background: COLORS.card, borderRadius: 20, boxShadow: TX_CARD_SHADOW, padding: "12px 14px" }}>
                  <div className="flex items-center justify-between" style={{ gap: 8 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.muted }}>
                      {goldBasis === "buyback" ? "Harga buyback" : "Harga jual"} per gram
                    </span>
                    <button
                      type="button"
                      onClick={onRefreshGold}
                      disabled={goldStatus === "loading"}
                      aria-label="Perbarui harga emas"
                      title="Perbarui harga emas"
                      className="flex items-center justify-center shrink-0"
                      style={{ width: 34, height: 34, borderRadius: 999, border: "none", background: COLORS.soft, color: COLORS.primary }}
                    >
                      <motion.span
                        className="flex"
                        animate={goldStatus === "loading" ? { rotate: 360 } : { rotate: 0 }}
                        transition={goldStatus === "loading" ? { repeat: Infinity, duration: 0.9, ease: "linear" } : { duration: 0 }}
                      >
                        <RefreshCw size={15} />
                      </motion.span>
                    </button>
                  </div>
                  {brandRows.map((r, i) => (
                    <div key={r.brand} className="flex items-center" style={{ gap: 10, paddingTop: 8, marginTop: i ? 8 : 4, borderTop: i ? `1px solid ${COLORS.soft}` : "none" }}>
                      <span className="flex-1 min-w-0">
                        <span className="block" style={{ fontSize: 14, fontWeight: 600 }}>
                          {r.label}
                        </span>
                        <span className="block truncate" style={{ fontSize: 11.5, color: COLORS.muted }}>
                          {r.date ? `${fmtShortDate(r.date)}${r.source ? " · " + r.source : ""}` : "Belum ada harga"}
                          {r.price && goldBasis === "sell" && r.buyback ? ` · buyback ${fmtShortRupiah(r.buyback)}` : ""}
                          {r.price && goldBasis === "buyback" && r.sell ? ` · jual ${fmtShortRupiah(r.sell)}` : ""}
                        </span>
                      </span>
                      <span className="text-right shrink-0">
                        <span className="block" style={{ fontSize: 14, fontWeight: 700 }}>
                          {r.price ? fmtRupiah(r.price) : "–"}
                        </span>
                        {r.change !== null && r.change !== 0 && (
                          <span className="flex items-center justify-end" style={{ gap: 2, fontSize: 11.5, fontWeight: 600, color: r.change > 0 ? COLORS.safe : COLORS.expenseText }}>
                            {r.change > 0 ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            {fmtShortRupiah(Math.abs(r.change))}
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                  <AnimatePresence initial={false}>
                    {(goldStatus === "error" || (goldStatus !== "loading" && (stale || missing))) && (
                      <motion.div
                        key="warn"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{ overflow: "hidden" }}
                      >
                        <div style={{ marginTop: 10, fontSize: 11.5, color: COLORS.muted, background: COLORS.soft, borderRadius: 10, padding: "8px 10px", lineHeight: 1.4 }}>
                          {goldStatus === "error"
                            ? "Belum bisa mengambil harga terbaru (cek internet). Sementara memakai harga terakhir yang tersimpan."
                            : missing
                            ? "Harga sedang diambil otomatis…"
                            : "Harga hari ini biasanya terbit sekitar pukul 09.30 WIB. Sementara memakai harga terakhir."}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Per pemilik */}
              {owners.map((o) => (
                <div key={o.owner} style={{ background: COLORS.card, borderRadius: 20, boxShadow: TX_CARD_SHADOW }}>
                  <div className="flex items-center" style={{ gap: 10, padding: "12px 14px 6px" }}>
                    <span className="flex items-center justify-center shrink-0" style={{ width: 34, height: 34, borderRadius: 999, background: "#F6EBD7", color: ASSET_COLORS.emas, fontWeight: 700, fontSize: 14 }}>
                      {(o.owner || "?").charAt(0).toUpperCase()}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block truncate" style={{ fontSize: 14.5, fontWeight: 600 }}>
                        {o.owner}
                      </span>
                      <span className="block" style={{ fontSize: 12, color: COLORS.muted }}>
                        {fmtGram(o.grams)} gram
                      </span>
                    </span>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>{fmtRupiah(o.value)}</span>
                  </div>
                  {o.items.map((h) => {
                    const p = holdingPerGram(h, goldIndex, today, goldBasis);
                    const value = p ? (Number(h.grams) || 0) * p.perGram : 0;
                    const buy = Number(h.buyTotal) || 0;
                    const pl = buy > 0 && p ? value - buy : null;
                    return (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => onEditGold(h)}
                        className="w-full flex items-center text-left"
                        style={{ gap: 10, padding: "10px 14px", borderTop: `1px solid ${COLORS.soft}` }}
                      >
                        <Gem size={15} color={ASSET_COLORS.emas} className="shrink-0" />
                        <span className="flex-1 min-w-0">
                          <span className="block truncate" style={{ fontSize: 13.5, fontWeight: 500 }}>
                            {BRAND_BY_KEY[h.brand]?.label || "Emas"}
                            {h.brand === "lainnya" && h.label ? ` · ${h.label}` : ""} · {fmtGram(h.grams)} gr
                          </span>
                          <span className="block truncate" style={{ fontSize: 11.5, color: COLORS.muted }}>
                            {p ? `${fmtShortRupiah(p.perGram)}/gr` : "Harga belum ada"}
                            {pl !== null && (
                              <span style={{ color: pl >= 0 ? COLORS.safe : COLORS.expenseText }}>
                                {" "}
                                · {pl >= 0 ? "untung" : "rugi"} {fmtShortRupiah(Math.abs(pl))} ({buy > 0 ? `${pl >= 0 ? "+" : "−"}${Math.abs((pl / buy) * 100).toFixed(1).replace(".", ",")}%` : ""})
                              </span>
                            )}
                          </span>
                        </span>
                        <span className="shrink-0" style={{ fontSize: 13.5, fontWeight: 600 }}>
                          {p ? fmtShortRupiah(value) : "–"}
                        </span>
                        <ChevronRight size={14} color={COLORS.muted} className="shrink-0" />
                      </button>
                    );
                  })}
                </div>
              ))}

              <button
                type="button"
                onClick={onAddGold}
                className="flex items-center justify-center"
                style={{ height: 44, gap: 6, borderRadius: 14, border: `1px dashed ${COLORS.border}`, background: "transparent", color: COLORS.primary, fontSize: 13, fontWeight: 600 }}
              >
                <Plus size={15} /> Tambah emas
              </button>
            </div>
          )}

          {/* ---- Dompet ---- */}
          <div style={{ padding: "18px 4px 8px", fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", color: COLORS.safe }}>DOMPET · {wallets.length}</div>
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
                const invest = isInvestment(w);
                const last = walletLastActivity(w, transactions);
                return (
                  <div key={w.id} className="rounded-2xl p-3.5" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
                    <div className="flex items-center gap-3">
                      <span className="shrink-0 rounded-full flex items-center justify-center" style={{ width: 42, height: 42, background: `${w.color}1F` }}>
                        <Icon size={19} color={w.color} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center" style={{ gap: 6 }}>
                          <span className="font-semibold truncate" style={{ color: COLORS.ink, fontSize: 14 }}>
                            {w.name}
                          </span>
                          {invest && (
                            <span className="shrink-0" style={{ fontSize: 10.5, fontWeight: 600, color: "#fff", background: ASSET_COLORS.saham, borderRadius: 999, padding: "2px 8px" }}>
                              Saham
                            </span>
                          )}
                        </div>
                        <div className="font-bold mt-0.5" style={{ fontSize: 16, color: bal < 0 ? COLORS.out : COLORS.primary }}>
                          <RollingNumber value={fmtRupiah(bal)} />
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => onEdit(w)} title={`Edit ${w.name}`} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ border: `1px solid ${COLORS.border}` }}>
                          <Pencil size={13} color={COLORS.ink} />
                        </button>
                        <button onClick={() => onDelete(w)} title={`Hapus ${w.name}`} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ border: `1px solid ${COLORS.out}55` }}>
                          <Trash2 size={13} color={COLORS.out} />
                        </button>
                      </div>
                    </div>
                    {last && (
                      <div className="flex items-center truncate" style={{ gap: 5, marginTop: 8, fontSize: 11.5, color: COLORS.muted }}>
                        <Clock3 size={12} className="shrink-0" />
                        <span className="truncate">Diperbarui {stamp(last.by, last.at)}</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => onAdjust(w)}
                      className="w-full flex items-center justify-center"
                      style={{ marginTop: 10, height: 40, gap: 6, borderRadius: 12, border: "none", background: COLORS.soft, color: COLORS.primary, fontSize: 13, fontWeight: 600 }}
                    >
                      {invest ? <TrendingUp size={14} /> : <SlidersHorizontal size={14} />}
                      {invest ? "Update nilai saham" : "Sesuaikan saldo"}
                    </button>
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

// Tombol + di halaman Aset: pilih mau menambah apa.
function AssetChooserSheet({ onClose, onWallet, onGold }) {
  const opt = (Icon, color, title, sub, onClick) => (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center text-left"
      style={{ gap: 14, padding: "14px 14px", borderRadius: 18, border: `1px solid ${COLORS.border}`, background: "#fff" }}
    >
      <span className="flex items-center justify-center shrink-0" style={{ width: 46, height: 46, borderRadius: 15, background: `${color}1F`, color }}>
        <Icon size={21} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block" style={{ fontSize: 15, fontWeight: 600 }}>
          {title}
        </span>
        <span className="block" style={{ fontSize: 12.5, color: COLORS.muted }}>
          {sub}
        </span>
      </span>
      <ChevronRight size={16} color={COLORS.muted} />
    </button>
  );
  return (
    <Overlay onClose={onClose}>
      <div style={{ fontFamily: KAS_FONT, fontWeight: 700, fontSize: 19, marginBottom: 14 }}>Tambah aset</div>
      <div className="flex flex-col" style={{ gap: 10 }}>
        {opt(Wallet, ASSET_COLORS.kas, "Dompet / rekening / saham", "Tunai, bank, e-wallet, kartu, atau akun saham", onWallet)}
        {opt(Gem, ASSET_COLORS.emas, "Emas", "Dalam gram, nilainya ikut harga emas harian", onGold)}
      </div>
    </Overlay>
  );
}

// Tambah / edit kepemilikan emas.
function GoldSheet({ mode, holding, ownerOptions, goldIndex, goldBasis, saving, onClose, onSubmit, onDelete }) {
  const [owner, setOwner] = useState(holding?.owner || ownerOptions[0] || "");
  const [customOwner, setCustomOwner] = useState(false);
  const [brand, setBrand] = useState(holding?.brand || "antam");
  const [grams, setGrams] = useState(holding ? String(holding.grams) : "1");
  const [label, setLabel] = useState(holding?.label || "");
  const [manualPrice, setManualPrice] = useState(holding?.manualPrice ? String(holding.manualPrice) : "");
  const [buyTotal, setBuyTotal] = useState(holding?.buyTotal ? String(holding.buyTotal) : "");
  const [buyDate, setBuyDate] = useState(holding?.buyDate || "");
  const [showBuy, setShowBuy] = useState(!!(holding && (holding.buyTotal || holding.buyDate)));
  const [error, setError] = useState("");

  const g = parseFloat(String(grams).replace(",", "."));
  const manual = !isAutoBrand(brand);
  const draft = { brand, grams: g, manualPrice: Number(String(manualPrice).replace(/[^\d]/g, "")) || 0 };
  const p = Number.isFinite(g) && g > 0 ? holdingPerGram(draft, goldIndex, todayWIB(), goldBasis) : null;

  const fieldStyle = { height: 46, borderRadius: 14, border: `1px solid ${COLORS.border}`, background: "#FFFFFF", color: COLORS.ink, padding: "0 14px", "--inp-focus": COLORS.primary };
  const allOwners = [...new Set([...ownerOptions, ...(holding?.owner ? [holding.owner] : [])].filter(Boolean))];

  const submit = () => {
    const name = owner.trim();
    if (!name) return setError("Isi nama pemiliknya dulu.");
    if (!Number.isFinite(g) || g <= 0) return setError("Isi berat emasnya (gram).");
    if (manual && !(draft.manualPrice > 0)) return setError("Untuk merek lain, isi harga per gramnya.");
    setError("");
    onSubmit({
      owner: name,
      brand,
      grams: Math.round(g * 1000) / 1000,
      label: manual ? label.trim() : "",
      manualPrice: manual ? draft.manualPrice : null,
      buyTotal: Number(String(buyTotal).replace(/[^\d]/g, "")) || null,
      buyDate: showBuy && buyDate ? buyDate : null,
    });
  };

  return (
    <Overlay onClose={onClose}>
      <div className="flex flex-col" style={{ gap: 16 }}>
        <div className="flex items-center justify-between" style={{ gap: 10 }}>
          <div style={{ fontFamily: KAS_FONT, fontWeight: 700, fontSize: 20 }}>{mode === "edit" ? "Edit emas" : "Tambah emas"}</div>
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
          <div style={{ fontSize: 12.5, fontWeight: 500, color: COLORS.muted, marginBottom: 8 }}>Milik siapa?</div>
          <div className="flex flex-wrap" style={{ gap: 6 }}>
            {allOwners.map((o) => (
              <Chip
                key={o}
                active={!customOwner && owner === o}
                onClick={() => {
                  setCustomOwner(false);
                  setOwner(o);
                }}
                height={38}
                activeBg={COLORS.primary}
                ink={COLORS.ink}
                inkSoft={COLORS.muted}
                border={COLORS.border}
              >
                {o}
              </Chip>
            ))}
            <Chip
              dashed={!customOwner}
              active={customOwner}
              onClick={() => {
                if (!customOwner) {
                  setCustomOwner(true);
                  setOwner("");
                }
              }}
              height={38}
              activeBg={COLORS.primary}
              ink={COLORS.ink}
              inkSoft={COLORS.muted}
              border={COLORS.border}
            >
              + Nama lain
            </Chip>
          </div>
          <Collapse open={customOwner}>
            <div style={{ paddingTop: 8 }}>
              <input autoFocus={customOwner} value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="mis. nama istri / anak" aria-label="Nama pemilik" className="inp w-full" style={fieldStyle} />
            </div>
          </Collapse>
        </div>

        <div>
          <div style={{ fontSize: 12.5, fontWeight: 500, color: COLORS.muted, marginBottom: 8 }}>Merek</div>
          <div className="flex flex-wrap" style={{ gap: 6 }}>
            {GOLD_BRANDS.map((b) => (
              <Chip key={b.key} active={brand === b.key} onClick={() => setBrand(b.key)} height={38} activeBg={ASSET_COLORS.emas} ink={COLORS.ink} inkSoft={COLORS.muted} border={COLORS.border}>
                {b.label}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12.5, fontWeight: 500, color: COLORS.muted, marginBottom: 8 }}>Berat</div>
          <Stepper value={grams} onChange={setGrams} step={1} min={0} unit="gram" ariaLabel="Berat emas" trackBg={COLORS.soft} ink={COLORS.ink} inkSoft={COLORS.muted} />
        </div>

        <Collapse open={manual}>
          <div className="flex" style={{ gap: 8 }}>
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Jenis (opsional)" aria-label="Jenis emas" className="inp flex-1 min-w-0" style={fieldStyle} />
            <input
              value={manualPrice}
              onChange={(e) => setManualPrice(e.target.value.replace(/[^\d]/g, ""))}
              inputMode="numeric"
              placeholder="Harga / gram"
              aria-label="Harga per gram"
              className="inp flex-1 min-w-0"
              style={fieldStyle}
            />
          </div>
          <div style={{ fontSize: 11.5, color: COLORS.muted, marginTop: 6 }}>Merek lain belum punya harga otomatis — harga per gram diisi manual dan bisa diubah kapan saja.</div>
        </Collapse>

        <div className="flex items-center" style={{ gap: 12, background: "#FAF3E6", borderRadius: 16, padding: "12px 14px" }}>
          <Gem size={18} color={ASSET_COLORS.emas} className="shrink-0" />
          <span className="flex-1 min-w-0" style={{ fontSize: 12.5, color: COLORS.ink, lineHeight: 1.4 }}>
            {p
              ? `${goldBasis === "buyback" ? "Buyback" : "Harga jual"} ${BRAND_BY_KEY[brand]?.label || ""} ${fmtRupiah(p.perGram)}/gr${p.date ? ` (${fmtShortDate(p.date)})` : ""}`
              : manual
              ? "Isi harga per gram untuk melihat nilainya."
              : "Harga merek ini akan diambil otomatis setelah disimpan."}
          </span>
          <span className="shrink-0" style={{ fontSize: 15, fontWeight: 700 }}>
            {p && Number.isFinite(g) && g > 0 ? fmtShortRupiah(g * p.perGram) : ""}
          </span>
        </div>

        <div>
          {!showBuy && (
            <button type="button" onClick={() => setShowBuy(true)} style={{ height: 36, padding: "0 2px", border: "none", background: "transparent", color: COLORS.safe, fontSize: 13, fontWeight: 600 }}>
              + Harga & tanggal beli (untuk hitung untung/rugi)
            </button>
          )}
          <Collapse open={showBuy}>
            <div className="flex" style={{ gap: 8 }}>
              <label className="flex flex-col flex-1 min-w-0" style={{ gap: 6 }}>
                <span style={{ fontSize: 12, color: COLORS.muted }}>Total harga beli</span>
                <input
                  value={buyTotal}
                  onChange={(e) => setBuyTotal(e.target.value.replace(/[^\d]/g, ""))}
                  inputMode="numeric"
                  placeholder="Rp"
                  className="inp w-full"
                  style={fieldStyle}
                />
              </label>
              <label className="flex flex-col flex-1 min-w-0" style={{ gap: 6 }}>
                <span style={{ fontSize: 12, color: COLORS.muted }}>Tanggal beli</span>
                <input type="date" value={buyDate} max={todayWIB()} onChange={(e) => setBuyDate(e.target.value)} className="inp w-full" style={fieldStyle} />
              </label>
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

        <div className="flex flex-col" style={{ gap: 8 }}>
          <button type="button" onClick={submit} disabled={saving} style={{ height: 52, borderRadius: 16, border: "none", background: COLORS.primary, color: "#FFFFFF", fontSize: 15, fontWeight: 600 }}>
            {mode === "edit" ? "Simpan perubahan" : "Simpan emas"}
          </button>
          {mode === "edit" && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="flex items-center justify-center"
              style={{ height: 46, gap: 8, borderRadius: 14, border: "none", background: COLORS.outBg, color: COLORS.expenseText, fontSize: 14, fontWeight: 600 }}
            >
              <Trash2 size={15} /> Hapus (sudah dijual / tidak dimiliki)
            </button>
          )}
        </div>
      </div>
    </Overlay>
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
    if (tx.adjustment && !catById[tx.categoryId]) {
      return [{ key: "adjust", label: "Tanpa rincian (penyesuaian)", color: "#A9A08C", amount: Number(tx.amount) || 0 }];
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

// --- Halaman Analisis -------------------------------------------------------
const toLocalDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function axisRp(v) {
  if (v === 0) return "0";
  if (v >= 1e9) return `${(v / 1e9).toFixed(v % 1e9 ? 1 : 0).replace(".", ",")} M`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(v % 1e6 ? 1 : 0).replace(".", ",")} jt`;
  if (v >= 1e3) return `${Math.round(v / 1e3)} rb`;
  return String(Math.round(v));
}

function chartDate(dateStr, long) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("id-ID", long ? { weekday: "short", day: "numeric", month: "short", year: "numeric" } : { day: "numeric", month: "short" });
}

function pct(a, b) {
  if (!(b > 0)) return null;
  return ((a - b) / b) * 100;
}

function fmtPct(p) {
  if (p === null || !Number.isFinite(p)) return "";
  return `${p >= 0 ? "+" : "−"}${Math.abs(p).toFixed(1).replace(".", ",")}%`;
}

// Riwayat nilai aset per hari: Kas & bank, Saham (dari saldo dompet) dan
// Emas (gram × harga emas pada hari itu).
function buildWealthSeries({ wallets, transactions, gold, goldIndex, basis, start, end }) {
  const today = startOfDay(new Date());
  const last = end > today ? today : startOfDay(end);
  const first = startOfDay(start);
  const totalDays = Math.max(1, Math.round((last - first) / 86400000) + 1);
  const step = Math.max(1, Math.ceil(totalDays / 90));
  const sampleDates = [];
  for (let i = 0; i < totalDays; i += step) {
    const d = new Date(first);
    d.setDate(d.getDate() + i);
    sampleDates.push(d);
  }
  if (toLocalDateStr(sampleDates[sampleDates.length - 1]) !== toLocalDateStr(last)) sampleDates.push(new Date(last));

  const invest = new Set(wallets.filter(isInvestment).map((w) => w.id));
  const known = new Set(wallets.map((w) => w.id));
  let kas = 0,
    saham = 0;
  wallets.forEach((w) => {
    const b = Number(w.initialBalance) || 0;
    if (invest.has(w.id)) saham += b;
    else kas += b;
  });
  const apply = (walletId, delta) => {
    if (!known.has(walletId)) return;
    if (invest.has(walletId)) saham += delta;
    else kas += delta;
  };
  const txs = transactions.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
  let k = 0;
  const out = { dates: [], kas: [], saham: [], emas: [] };
  sampleDates.forEach((d) => {
    const limit = endOfDay(d).getTime();
    while (k < txs.length && new Date(txs[k].date).getTime() <= limit) {
      const t = txs[k];
      const amt = Number(t.amount) || 0;
      if (t.type === "income") apply(t.walletId, amt);
      else if (t.type === "expense") apply(t.walletId, -amt);
      else if (t.type === "transfer") {
        apply(t.walletId, -(amt + (Number(t.fee) || 0)));
        apply(t.toWalletId, amt);
      }
      k++;
    }
    const ds = toLocalDateStr(d);
    out.dates.push(ds);
    out.kas.push(kas);
    out.saham.push(saham);
    out.emas.push(goldValueAt(gold, goldIndex, ds, basis));
  });
  return out;
}

// Pengelompokan arus kas: harian (≤10 hari), mingguan (≤62 hari), bulanan.
function buildFlowBuckets(transactions, range) {
  const start = startOfDay(range.start);
  const end = range.end;
  const days = Math.round((startOfDay(end) - start) / 86400000) + 1;
  const buckets = [];
  if (days <= 10) {
    for (let i = 0; i < days; i++) {
      const s = new Date(start);
      s.setDate(s.getDate() + i);
      buckets.push({ from: s, to: endOfDay(s), label: String(s.getDate()), title: s.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short" }) });
    }
  } else if (days <= 62) {
    for (let s = new Date(start); s <= end; s.setDate(s.getDate() + 7)) {
      const from = new Date(s);
      const to = new Date(s);
      to.setDate(to.getDate() + 6);
      const toClamped = to > end ? new Date(end) : to;
      buckets.push({
        from,
        to: endOfDay(toClamped),
        label: `${from.getDate()}–${toClamped.getDate()}`,
        title: `${from.toLocaleDateString("id-ID", { day: "numeric", month: "short" })} – ${toClamped.toLocaleDateString("id-ID", { day: "numeric", month: "short" })}`,
      });
    }
  } else {
    for (let m = new Date(start.getFullYear(), start.getMonth(), 1); m <= end; m = new Date(m.getFullYear(), m.getMonth() + 1, 1)) {
      const from = m < start ? start : m;
      const to = endOfDay(new Date(m.getFullYear(), m.getMonth() + 1, 0));
      buckets.push({ from, to: to > end ? end : to, label: m.toLocaleDateString("id-ID", { month: "short" }), title: m.toLocaleDateString("id-ID", { month: "long", year: "numeric" }) });
    }
  }
  return buckets.map((b, i) => {
    let a = 0,
      c = 0;
    transactions.forEach((t) => {
      if (!countsAsFlow(t)) return;
      const tt = new Date(t.date);
      if (tt < b.from || tt > b.to) return;
      if (t.type === "income") a += Number(t.amount) || 0;
      else if (t.type === "expense") c += Number(t.amount) || 0;
    });
    return { key: `b${i}`, label: b.label, title: b.title, a, b: c };
  });
}

const ANALYSIS_PERIODS = [
  { key: "week", label: "7 Hari" },
  { key: "month", label: "Bulan Ini" },
  { key: "3m", label: "3 Bulan" },
  { key: "6m", label: "6 Bulan" },
  { key: "year", label: "Tahun Ini" },
];

function Card({ icon: Icon, iconColor, title, right, children, style }) {
  return (
    <div style={{ background: COLORS.card, borderRadius: 22, boxShadow: TX_CARD_SHADOW, padding: 16, ...style }}>
      {(title || right) && (
        <div className="flex items-center justify-between" style={{ gap: 8, marginBottom: 12 }}>
          <div className="flex items-center" style={{ gap: 8 }}>
            {Icon && <Icon size={16} color={iconColor || COLORS.primary} />}
            <span style={{ fontWeight: 600, fontSize: 15.5 }}>{title}</span>
          </div>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

function Delta({ value, percent, goodWhenUp = true, suffix }) {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  if (Math.round(value) === 0)
    return (
      <span style={{ fontSize: 12.5, color: COLORS.muted }}>
        Tidak berubah{suffix ? ` · ${suffix}` : ""}
      </span>
    );
  const up = value >= 0;
  const good = goodWhenUp ? up : !up;
  return (
    <span className="inline-flex items-center" style={{ gap: 3, fontSize: 12.5, fontWeight: 600, color: value === 0 ? COLORS.muted : good ? COLORS.safe : COLORS.expenseText }}>
      {value !== 0 && (up ? <TrendingUp size={13} /> : <TrendingDown size={13} />)}
      {up ? "+" : "−"}
      {fmtShortRupiah(Math.abs(value))}
      {percent !== null && percent !== undefined && Number.isFinite(percent) ? ` (${fmtPct(percent)})` : ""}
      {suffix ? <span style={{ fontWeight: 400, color: COLORS.muted }}>&nbsp;{suffix}</span> : null}
    </span>
  );
}

function LegendRow({ items }) {
  return (
    <div className="flex flex-wrap" style={{ gap: 12, marginTop: 10 }}>
      {items.map((it) => (
        <span key={it.label} className="flex items-center" style={{ gap: 6, fontSize: 12, color: COLORS.muted }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: it.color }} />
          {it.label}
          {it.value !== undefined && <b style={{ color: COLORS.ink, fontWeight: 600 }}>{it.value}</b>}
        </span>
      ))}
    </div>
  );
}

function AnalysisPage({ transactions, wallets, gold, goldIndex, goldBasis, catById, walById, onBack, onOpenMenu, onSwitchApp, notifSlot, onGoAssets }) {
  const [period, setPeriod] = useState("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [periodSheet, setPeriodSheet] = useState(false);
  const [draftPeriod, setDraftPeriod] = useState("custom");
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");
  const [txType, setTxType] = useState("expense");
  const [dimension, setDimension] = useState("category");
  const [drill, setDrill] = useState(null);

  const range = useMemo(() => getRange(period, customFrom, customTo), [period, customFrom, customTo]);
  const prev = useMemo(() => previousRange(range), [range]);
  const periodKey = `${period}-${customFrom}-${customTo}`;

  // --- Kekayaan
  const wealth = useMemo(
    () => buildWealthSeries({ wallets, transactions, gold, goldIndex, basis: goldBasis, start: range.start, end: range.end }),
    [wallets, transactions, gold, goldIndex, goldBasis, range]
  );
  const hasSaham = wallets.some(isInvestment);
  const hasEmas = gold.length > 0;
  const nPts = wealth.dates.length;
  const totalAt = (i) => (wealth.kas[i] || 0) + (wealth.saham[i] || 0) + (wealth.emas[i] || 0);
  const wealthNow = nPts ? totalAt(nPts - 1) : 0;
  const wealthStart = nPts ? totalAt(0) : 0;
  const wealthSeries = [
    { key: "kas", label: ASSET_LABELS.kas, color: ASSET_COLORS.kas, values: wealth.kas },
    ...(hasSaham ? [{ key: "saham", label: ASSET_LABELS.saham, color: ASSET_COLORS.saham, values: wealth.saham }] : []),
    ...(hasEmas ? [{ key: "emas", label: ASSET_LABELS.emas, color: ASSET_COLORS.emas, values: wealth.emas }] : []),
  ];

  // --- Arus kas
  const flow = useMemo(() => buildFlowBuckets(transactions, range), [transactions, range]);
  const flowTotals = useMemo(() => {
    let income = 0,
      expense = 0,
      incomePrev = 0,
      expensePrev = 0;
    transactions.forEach((t) => {
      if (!countsAsFlow(t)) return;
      const amt = Number(t.amount) || 0;
      if (inRange(t.date, range)) {
        if (t.type === "income") income += amt;
        else if (t.type === "expense") expense += amt;
      } else if (inRange(t.date, prev)) {
        if (t.type === "income") incomePrev += amt;
        else if (t.type === "expense") expensePrev += amt;
      }
    });
    return { income, expense, incomePrev, expensePrev, net: income - expense };
  }, [transactions, range, prev]);
  const savingRate = flowTotals.income > 0 ? (flowTotals.net / flowTotals.income) * 100 : null;

  // --- Komposisi
  const scoped = useMemo(() => transactions.filter((t) => t.type === txType && countsAsFlow(t) && inRange(t.date, range)), [transactions, txType, range]);
  const scopedPrev = useMemo(() => transactions.filter((t) => t.type === txType && countsAsFlow(t) && inRange(t.date, prev)), [transactions, txType, prev]);
  const compTotal = useMemo(() => scoped.reduce((s, t) => s + (Number(t.amount) || 0), 0), [scoped]);
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
    scopedPrev.forEach((t) => breakdownParts(t, dimension, catById, walById).forEach((p) => map.set(p.key, (map.get(p.key) || 0) + p.amount)));
    return map;
  }, [scopedPrev, dimension, catById, walById]);
  const drillTx = useMemo(() => {
    if (!drill) return [];
    return scoped.filter((t) => breakdownParts(t, dimension, catById, walById).some((p) => p.key === drill.key)).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [drill, scoped, dimension, catById, walById]);

  // --- Emas
  const goldInfo = useMemo(() => {
    if (!hasEmas) return null;
    const today = todayWIB();
    const startStr = wealth.dates[0] || today;
    const valueNow = gold.reduce((s, h) => s + holdingValue(h, goldIndex, today, goldBasis), 0);
    const valueStart = goldValueAt(gold, goldIndex, startStr, goldBasis);
    const grams = gold.reduce((s, h) => s + (Number(h.grams) || 0), 0);
    // Merek dengan gram terbanyak — dipakai untuk "harga per gram".
    const byBrand = {};
    gold.forEach((h) => (byBrand[h.brand] = (byBrand[h.brand] || 0) + (Number(h.grams) || 0)));
    const mainBrand = Object.entries(byBrand).sort((a, b) => b[1] - a[1])[0]?.[0];
    const pNow = mainBrand ? (isAutoBrand(mainBrand) ? priceAt(goldIndex, mainBrand, today, goldBasis) : null) : null;
    const pStart = mainBrand && isAutoBrand(mainBrand) ? priceAt(goldIndex, mainBrand, startStr, goldBasis) : null;
    const owners = {};
    gold.forEach((h) => {
      const o = h.owner || "Tanpa nama";
      owners[o] = owners[o] || { owner: o, grams: 0, value: 0 };
      owners[o].grams += Number(h.grams) || 0;
      owners[o].value += holdingValue(h, goldIndex, today, goldBasis);
    });
    // Perubahan nilai karena HARGA saja (emas yang baru dibeli di tengah
    // periode dihitung dari harga di tanggal belinya, bukan dari nol).
    let priceGain = 0,
      refValue = 0;
    gold.forEach((h) => {
      const refDate = holdingStart(h) > startStr ? holdingStart(h) : startStr;
      const pN = holdingPerGram(h, goldIndex, today, goldBasis);
      const pR = holdingPerGram(h, goldIndex, refDate, goldBasis);
      if (!pN || !pR) return;
      const gr = Number(h.grams) || 0;
      priceGain += gr * (pN.perGram - pR.perGram);
      refValue += gr * pR.perGram;
    });
    const buyTotal = gold.reduce((s, h) => s + (Number(h.buyTotal) || 0), 0);
    const valueWithBuy = gold.filter((h) => Number(h.buyTotal) > 0).reduce((s, h) => s + holdingValue(h, goldIndex, today, goldBasis), 0);
    return {
      valueNow,
      valueStart,
      priceGain,
      refValue,
      grams,
      mainBrand,
      pNow,
      pStart,
      owners: Object.values(owners).sort((a, b) => b.value - a.value),
      buyTotal,
      pl: buyTotal > 0 ? valueWithBuy - buyTotal : null,
    };
  }, [hasEmas, gold, goldIndex, goldBasis, wealth.dates]);

  // --- Saham
  const sahamNow = hasSaham && nPts ? wealth.saham[nPts - 1] : 0;
  const sahamStart = hasSaham && nPts ? wealth.saham[0] : 0;
  // Untung/rugi pasar = jumlah "Update nilai saham" di periode ini (setoran
  // lewat transfer tidak dihitung sebagai untung).
  const sahamGain = useMemo(
    () =>
      transactions
        .filter((t) => t.valuation && inRange(t.date, range))
        .reduce((s, t) => s + (t.type === "income" ? 1 : -1) * (Number(t.amount) || 0), 0),
    [transactions, range]
  );

  // --- Yang menarik
  const insights = useMemo(() => {
    const out = [];
    if (nPts > 1 && wealthStart > 0) {
      const d = wealthNow - wealthStart;
      out.push({ tone: d >= 0 ? "good" : "bad", text: `Total aset ${d >= 0 ? "naik" : "turun"} ${fmtRupiah(Math.abs(d))} di periode ini (termasuk tabungan & aset baru).` });
    }
    if (savingRate !== null) {
      out.push({
        tone: savingRate >= 20 ? "good" : savingRate >= 0 ? "neutral" : "bad",
        text:
          savingRate >= 0
            ? `${Math.round(savingRate)}% dari pemasukan tersisa (tidak terpakai) — ${fmtRupiah(flowTotals.net)}.`
            : `Pengeluaran lebih besar ${fmtRupiah(Math.abs(flowTotals.net))} dari pemasukan.`,
      });
    }
    const ep = pct(flowTotals.expense, flowTotals.expensePrev);
    if (ep !== null && flowTotals.expense > 0) {
      out.push({ tone: ep > 0 ? "bad" : "good", text: `Pengeluaran ${ep > 0 ? "naik" : "turun"} ${Math.abs(ep).toFixed(0)}% dibanding periode sebelumnya (${fmtRupiah(flowTotals.expensePrev)}).` });
    }
    if (txType === "expense" && groups.length && compTotal > 0) {
      const top = groups[0];
      out.push({ tone: "neutral", text: `Pengeluaran terbesar: ${top.label}, ${fmtRupiah(top.total)} (${Math.round((top.total / compTotal) * 100)}%).` });
      let spike = null;
      groups.forEach((g) => {
        const before = groupsPrev.get(g.key) || 0;
        if (before <= 0) return;
        const ch = ((g.total - before) / before) * 100;
        if (ch >= 30 && (!spike || ch > spike.ch)) spike = { ...g, ch, before };
      });
      if (spike) out.push({ tone: "bad", text: `${spike.label} melonjak ${spike.ch.toFixed(0)}% (dari ${fmtRupiah(spike.before)} jadi ${fmtRupiah(spike.total)}).` });
    }
    if (period === "month" && flowTotals.expense > 0) {
      const now = new Date();
      const passed = now.getDate();
      const inMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      if (passed < inMonth) out.push({ tone: "neutral", text: `Kalau polanya sama, pengeluaran akhir bulan diperkirakan ${fmtRupiah((flowTotals.expense / passed) * inMonth)}.` });
    }
    if (goldInfo && goldInfo.pNow && goldInfo.pStart && goldInfo.pNow.perGram !== goldInfo.pStart.perGram) {
      const p = pct(goldInfo.pNow.perGram, goldInfo.pStart.perGram);
      out.push({ tone: p >= 0 ? "good" : "bad", text: `Harga emas ${BRAND_BY_KEY[goldInfo.mainBrand]?.label || ""} ${p >= 0 ? "naik" : "turun"} ${fmtPct(p)} — dari ${fmtRupiah(goldInfo.pStart.perGram)} jadi ${fmtRupiah(goldInfo.pNow.perGram)} per gram.` });
    }
    if (hasSaham && sahamGain !== 0) {
      out.push({ tone: sahamGain >= 0 ? "good" : "bad", text: `Nilai saham ${sahamGain >= 0 ? "naik" : "turun"} ${fmtRupiah(Math.abs(sahamGain))} di periode ini (di luar setoran/penarikan).` });
    }
    return out;
  }, [nPts, wealthNow, wealthStart, savingRate, flowTotals, txType, groups, groupsPrev, compTotal, period, goldInfo, hasSaham, sahamGain]);

  const openCustom = () => {
    setDraftPeriod("custom");
    setDraftFrom(customFrom || toLocalDateStr(range.start));
    setDraftTo(customTo || toLocalDateStr(new Date()));
    setPeriodSheet(true);
  };

  const chip = (active, label, onClick) => (
    <Chip key={label} active={active} onClick={onClick} height={34} activeBg={COLORS.primary} ink={COLORS.ink} inkSoft={COLORS.muted} border={COLORS.border} style={{ flexShrink: 0, padding: "0 13px", fontSize: 12.5 }}>
      {label}
    </Chip>
  );

  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 max-w-2xl mx-auto w-full px-4" style={{ paddingTop: "env(safe-area-inset-top)", background: COLORS.bg }}>
        <TopBar title="Analisis" onBack={onBack} onOpenMenu={onOpenMenu} onSwitchApp={onSwitchApp} notifSlot={notifSlot} />
        {/* Rentang waktu — satu baris di atas, berlaku untuk semua grafik. */}
        <div className="flex overflow-x-auto" style={{ gap: 6, margin: "0 -16px", padding: "0 16px 10px", scrollbarWidth: "none" }}>
          {ANALYSIS_PERIODS.map((p) =>
            chip(period === p.key, p.label, () => {
              setPeriod(p.key);
              setDrill(null);
            })
          )}
          {chip(period === "custom", period === "custom" ? fmtRangeLabel(range) : "Pilih tanggal…", openCustom)}
        </div>
      </div>

      <motion.div layoutScroll className="flex-1 overflow-y-auto" style={{ overscrollBehaviorY: "contain", WebkitOverflowScrolling: "touch" }}>
        <FadeSwap swapKey={periodKey} className="max-w-2xl mx-auto px-4 pb-32 flex flex-col" style={{ gap: 12 }}>
          {/* 1. Total aset */}
          <Card>
            <div style={{ fontSize: 12.5, color: COLORS.muted }}>Total aset sekarang</div>
            <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.2 }}>{fmtRupiah(wealthNow)}</div>
            {nPts > 1 && (
              <Delta
                value={wealthNow - wealthStart}
                percent={wealthStart > 0 && wealthStart >= wealthNow * 0.1 ? pct(wealthNow, wealthStart) : null}
                suffix={`sejak ${chartDate(wealth.dates[0])}`}
              />
            )}
            <div style={{ marginTop: 12, marginLeft: -4 }}>
              <AreaChart
                dates={wealth.dates}
                series={wealthSeries}
                height={190}
                fmtValue={fmtRupiah}
                fmtAxis={axisRp}
                fmtDate={chartDate}
                revealKey={`w-${periodKey}`}
              />
            </div>
            <LegendRow
              items={wealthSeries.map((s) => ({ label: s.label, color: s.color, value: fmtCompactRp(s.values[s.values.length - 1] || 0) }))}
            />
            <div style={{ fontSize: 11.5, color: COLORS.muted, marginTop: 8 }}>Sentuh & geser grafik untuk melihat nilai di tanggal tertentu.</div>
          </Card>

          {/* 2. Arus kas */}
          <Card icon={BarChart3} title="Pemasukan vs pengeluaran">
            <div className="grid" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
              {[
                { label: "Masuk", value: flowTotals.income, color: COLORS.safe, bg: COLORS.safeBg },
                { label: "Keluar", value: flowTotals.expense, color: COLORS.expenseText, bg: COLORS.outBg },
                { label: "Sisa", value: flowTotals.net, color: COLORS.ink, bg: COLORS.soft },
              ].map((s) => (
                <div key={s.label} className="min-w-0" style={{ background: s.bg, borderRadius: 14, padding: "10px 10px" }}>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: s.color }}>{s.label}</div>
                  <div className="truncate" style={{ fontSize: 14, fontWeight: 700 }}>
                    {fmtCompactRp(s.value)}
                  </div>
                </div>
              ))}
            </div>
            {savingRate !== null && (
              <div style={{ marginTop: 10 }}>
                <div className="flex justify-between" style={{ fontSize: 12, color: COLORS.muted, marginBottom: 5 }}>
                  <span>Bagian pemasukan yang tersisa</span>
                  <b style={{ color: savingRate >= 0 ? COLORS.safe : COLORS.expenseText }}>{Math.round(savingRate)}%</b>
                </div>
                <div style={{ height: 8, borderRadius: 99, background: COLORS.track, overflow: "hidden" }}>
                  <motion.div
                    style={{ height: "100%", borderRadius: 99, background: savingRate >= 0 ? COLORS.safe : COLORS.expenseText }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, Math.abs(savingRate))}%` }}
                    transition={{ ...SPRING.page, delay: 0.15 }}
                  />
                </div>
              </div>
            )}
            <div style={{ marginTop: 14, marginLeft: -4 }}>
              <PairBars
                buckets={flow}
                colorA={COLORS.safe}
                colorB="#C0472F"
                labelA="Masuk"
                labelB="Keluar"
                fmtValue={fmtRupiah}
                fmtAxis={axisRp}
                revealKey={`f-${periodKey}`}
              />
            </div>
            <LegendRow
              items={[
                { label: "Masuk", color: COLORS.safe },
                { label: "Keluar", color: "#C0472F" },
              ]}
            />
          </Card>

          {/* 3. Komposisi */}
          <Card icon={PieChart} title="Ke mana uangnya?">
            <Segmented
              ariaLabel="Jenis"
              value={txType}
              onChange={(v) => {
                setTxType(v);
                setDrill(null);
              }}
              height={36}
              fontSize={12.5}
              inkSoft={COLORS.muted}
              trackBg={COLORS.soft}
              options={[
                { value: "expense", label: "Pengeluaran", activeBg: COLORS.expenseText },
                { value: "income", label: "Pemasukan", activeBg: COLORS.safe },
              ]}
            />
            <div className="flex overflow-x-auto" style={{ gap: 6, marginTop: 10, scrollbarWidth: "none" }}>
              {DIMENSIONS.map((d) =>
                chip(dimension === d.key, d.label, () => {
                  setDimension(d.key);
                  setDrill(null);
                })
              )}
            </div>
            <FadeSwap swapKey={`${txType}-${dimension}`}>
              {compTotal === 0 ? (
                <div className="text-center" style={{ padding: "26px 8px", fontSize: 13, color: COLORS.muted }}>
                  Belum ada {txType === "expense" ? "pengeluaran" : "pemasukan"} di rentang ini.
                </div>
              ) : (
                <>
                  <div style={{ marginTop: 14 }}>
                    <Donut
                      slices={groups.slice(0, 8)}
                      total={compTotal}
                      centerLabel={drill ? drill.label : "Total"}
                      centerValue={fmtCompactRp(drill ? drill.total : compTotal)}
                      activeKey={drill?.key}
                      onSelect={(g) => setDrill(drill?.key === g.key ? null : g)}
                    />
                  </div>
                  <div className="flex flex-col" style={{ gap: 6, marginTop: 14 }}>
                    {groups.map((g) => {
                      const before = groupsPrev.get(g.key) || 0;
                      const share = Math.round((g.total / compTotal) * 100);
                      const ch = before > 0 ? ((g.total - before) / before) * 100 : null;
                      const on = drill?.key === g.key;
                      return (
                        <button
                          key={g.key}
                          type="button"
                          onClick={() => setDrill(on ? null : g)}
                          className="w-full text-left"
                          style={{ borderRadius: 14, padding: "9px 11px", background: on ? `${g.color}14` : COLORS.soft, border: `1px solid ${on ? g.color : "transparent"}` }}
                        >
                          <div className="flex items-center" style={{ gap: 8 }}>
                            <span style={{ width: 10, height: 10, borderRadius: 3, background: g.color, flexShrink: 0 }} />
                            <span className="flex-1 min-w-0 truncate" style={{ fontSize: 13, fontWeight: 500 }}>
                              {g.label}
                            </span>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{fmtShortRupiah(g.total)}</span>
                          </div>
                          <div className="flex items-center" style={{ gap: 8, marginTop: 6 }}>
                            <div className="flex-1" style={{ height: 6, borderRadius: 99, background: COLORS.track, overflow: "hidden" }}>
                              <motion.div style={{ height: "100%", borderRadius: 99, background: g.color }} initial={{ width: 0 }} animate={{ width: `${share}%` }} transition={SPRING.page} />
                            </div>
                            <span style={{ fontSize: 11, color: COLORS.muted, width: 32, textAlign: "right" }}>{share}%</span>
                            {ch !== null && (
                              <span style={{ fontSize: 11, fontWeight: 600, width: 46, textAlign: "right", color: (txType === "expense" ? ch > 0 : ch < 0) ? COLORS.expenseText : COLORS.safe }}>
                                {ch >= 0 ? "▲" : "▼"}
                                {Math.abs(ch).toFixed(0)}%
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <Collapse open={!!drill}>
                    {drill && (
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${COLORS.soft}` }}>
                        <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                          <span style={{ fontSize: 12.5, fontWeight: 600 }}>
                            {drill.label} · {drillTx.length} transaksi
                          </span>
                          <button type="button" aria-label="Tutup rincian" onClick={() => setDrill(null)} className="flex items-center justify-center" style={{ width: 32, height: 32, borderRadius: 999, border: "none", background: COLORS.soft, color: COLORS.muted }}>
                            <X size={14} />
                          </button>
                        </div>
                        <div className="flex flex-col" style={{ gap: 6 }}>
                          {drillTx.slice(0, 30).map((t) => (
                            <div key={t.id} className="flex items-center justify-between" style={{ gap: 8, background: COLORS.soft, borderRadius: 12, padding: "8px 10px" }}>
                              <div className="min-w-0">
                                <div className="truncate" style={{ fontSize: 12.5 }}>
                                  {t.note || catById[t.categoryId]?.name || "Tanpa catatan"}
                                </div>
                                <div style={{ fontSize: 11, color: COLORS.muted }}>
                                  {fmtDateTime(t.date)}
                                  {t.createdBy ? ` · ${t.createdBy}` : ""}
                                </div>
                              </div>
                              <span style={{ fontSize: 12.5, fontWeight: 600 }}>{fmtShortRupiah(t.amount)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </Collapse>
                </>
              )}
            </FadeSwap>
          </Card>

          {/* 4. Emas */}
          {goldInfo ? (
            <Card icon={Gem} iconColor={ASSET_COLORS.emas} title="Emas" right={<span style={{ fontSize: 12, color: COLORS.muted }}>{goldBasis === "buyback" ? "harga buyback" : "harga jual"}</span>}>
              <div className="flex items-end justify-between" style={{ gap: 10 }}>
                <div className="min-w-0">
                  <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.2 }}>{fmtRupiah(goldInfo.valueNow)}</div>
                  <Delta value={goldInfo.priceGain} percent={goldInfo.refValue > 0 ? (goldInfo.priceGain / goldInfo.refValue) * 100 : null} suffix="dari perubahan harga" />
                </div>
                <div className="text-right shrink-0">
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{fmtGram(goldInfo.grams)} gr</div>
                  <div style={{ fontSize: 11.5, color: COLORS.muted }}>total</div>
                </div>
              </div>
              <div style={{ marginTop: 12, marginLeft: -4 }}>
                <AreaChart
                  dates={wealth.dates}
                  series={[{ key: "emas", label: "Nilai emas", color: ASSET_COLORS.emas, values: wealth.emas }]}
                  height={150}
                  fmtValue={fmtRupiah}
                  fmtAxis={axisRp}
                  fmtDate={chartDate}
                  revealKey={`g-${periodKey}`}
                />
              </div>
              {goldInfo.pNow && (
                <div className="flex items-center justify-between" style={{ gap: 8, marginTop: 10, background: "#FAF3E6", borderRadius: 14, padding: "10px 12px" }}>
                  <span style={{ fontSize: 12.5, color: COLORS.muted }}>Harga {BRAND_BY_KEY[goldInfo.mainBrand]?.label} / gram</span>
                  <span className="text-right">
                    <span style={{ fontSize: 13.5, fontWeight: 700 }}>{fmtRupiah(goldInfo.pNow.perGram)}</span>
                    {goldInfo.pStart && goldInfo.pStart.perGram !== goldInfo.pNow.perGram && (
                      <span style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: goldInfo.pNow.perGram >= goldInfo.pStart.perGram ? COLORS.safe : COLORS.expenseText }}>
                        {fmtPct(pct(goldInfo.pNow.perGram, goldInfo.pStart.perGram))} dari {fmtShortRupiah(goldInfo.pStart.perGram)}
                      </span>
                    )}
                  </span>
                </div>
              )}
              {goldInfo.pl !== null && (
                <div className="flex items-center justify-between" style={{ marginTop: 8, fontSize: 12.5 }}>
                  <span style={{ color: COLORS.muted }}>Untung/rugi dari harga beli</span>
                  <b style={{ color: goldInfo.pl >= 0 ? COLORS.safe : COLORS.expenseText }}>
                    {goldInfo.pl >= 0 ? "+" : "−"}
                    {fmtRupiah(Math.abs(goldInfo.pl))} ({fmtPct(pct(goldInfo.buyTotal + goldInfo.pl, goldInfo.buyTotal))})
                  </b>
                </div>
              )}
              <div className="flex flex-col" style={{ gap: 8, marginTop: 12 }}>
                {goldInfo.owners.map((o) => (
                  <div key={o.owner}>
                    <div className="flex justify-between" style={{ fontSize: 12.5, marginBottom: 4 }}>
                      <span>
                        <b style={{ fontWeight: 600 }}>{o.owner}</b> <span style={{ color: COLORS.muted }}>· {fmtGram(o.grams)} gr</span>
                      </span>
                      <b style={{ fontWeight: 600 }}>{fmtCompactRp(o.value)}</b>
                    </div>
                    <div style={{ height: 6, borderRadius: 99, background: COLORS.track, overflow: "hidden" }}>
                      <motion.div
                        style={{ height: "100%", borderRadius: 99, background: ASSET_COLORS.emas }}
                        initial={{ width: 0 }}
                        animate={{ width: `${goldInfo.valueNow > 0 ? (o.value / goldInfo.valueNow) * 100 : 0}%` }}
                        transition={SPRING.page}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <button type="button" onClick={onGoAssets} className="w-full text-left flex items-center" style={{ gap: 12, background: COLORS.card, borderRadius: 22, boxShadow: TX_CARD_SHADOW, padding: 16 }}>
              <span className="flex items-center justify-center shrink-0" style={{ width: 42, height: 42, borderRadius: 14, background: "#FAF3E6", color: ASSET_COLORS.emas }}>
                <Gem size={19} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block" style={{ fontSize: 14.5, fontWeight: 600 }}>
                  Pantau emas di sini
                </span>
                <span className="block" style={{ fontSize: 12.5, color: COLORS.muted }}>
                  Tambahkan emas di tab Aset — grafiknya muncul otomatis.
                </span>
              </span>
              <ChevronRight size={16} color={COLORS.muted} />
            </button>
          )}

          {/* 5. Saham */}
          {hasSaham && (
            <Card icon={TrendingUp} iconColor={ASSET_COLORS.saham} title="Saham">
              <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.2 }}>{fmtRupiah(sahamNow)}</div>
              <Delta value={sahamGain} percent={sahamNow - sahamGain > 0 ? (sahamGain / (sahamNow - sahamGain)) * 100 : null} suffix="naik-turun nilai" />
              <div style={{ marginTop: 12, marginLeft: -4 }}>
                <AreaChart
                  dates={wealth.dates}
                  series={[{ key: "saham", label: "Nilai saham", color: ASSET_COLORS.saham, values: wealth.saham }]}
                  height={150}
                  fmtValue={fmtRupiah}
                  fmtAxis={axisRp}
                  fmtDate={chartDate}
                  revealKey={`s-${periodKey}`}
                />
              </div>
              <div style={{ fontSize: 11.5, color: COLORS.muted, marginTop: 6 }}>Garisnya berubah setiap kali "Update nilai saham" atau ada transfer ke/dari akun saham.</div>
            </Card>
          )}

          {/* 6. Yang menarik */}
          {insights.length > 0 && (
            <Card icon={Sparkles} title="Yang menarik">
              <div className="flex flex-col" style={{ gap: 8 }}>
                {insights.map((ins, i) => (
                  <div key={i} className="flex items-start" style={{ gap: 9, background: COLORS.soft, borderRadius: 14, padding: "10px 12px", fontSize: 12.5, lineHeight: 1.45 }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 99,
                        marginTop: 5,
                        flexShrink: 0,
                        background: ins.tone === "bad" ? COLORS.expenseText : ins.tone === "good" ? COLORS.safe : COLORS.muted,
                      }}
                    />
                    <span>{ins.text}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </FadeSwap>
      </motion.div>

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
            onApply={() => {
              setPeriod(draftPeriod);
              setCustomFrom(draftFrom);
              setCustomTo(draftTo);
              setDrill(null);
              setPeriodSheet(false);
            }}
            onClose={() => setPeriodSheet(false)}
          />
        )}
      </AnimatePresence>
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

function TransactionModal({ mode, tx, initialType, initialWalletId, categories, wallets, allTags, saving, onClose, onSubmit, onOpenScan }) {
  const [type, setType] = useState(tx?.type || initialType || "expense");
  const [amount, setAmount] = useState(tx ? String(tx.amount) : "");
  const [categoryId, setCategoryId] = useState(tx?.categoryId || "");
  // Dompet lama yang sudah dihapus tidak dipakai lagi — pindah ke dompet pertama.
  const [walletId, setWalletId] = useState(() => {
    const want = tx?.walletId || initialWalletId;
    return want && wallets.some((w) => w.id === want) ? want : wallets[0]?.id || "";
  });
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
    } else if (!categoryId && !tx?.adjustment) {
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

// --- Sesuaikan saldo ----------------------------------------------------
// Untuk saat tidak sempat mencatat tiap transaksi: cukup isi saldo yang
// sebenarnya ada sekarang. Selisihnya dicatat sebagai SATU transaksi
// "Penyesuaian saldo" — berkurang = pengeluaran (ikut dihitung di ringkasan
// & analisis), bertambah = pemasukan. Saldo jadi pas dan riwayatnya tetap
// jelas.
function BalanceAdjustSheet({ wallets, transactions, initialWalletId, categories, saving, onClose, onSubmit, onRecordIncome }) {
  const [walletId, setWalletId] = useState(() =>
    initialWalletId && wallets.some((w) => w.id === initialWalletId) ? initialWalletId : wallets[0]?.id || ""
  );
  const [actual, setActual] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const wallet = wallets.find((w) => w.id === walletId);
  const invest = isInvestment(wallet);
  const current = wallet ? walletBalance(wallet, transactions) : 0;
  const actualValue = evalAmount(actual);
  const hasValue = actual !== "" && actualValue !== null;
  const diff = hasValue ? Math.round(actualValue) - Math.round(current) : 0;
  const kind = diff < 0 ? "expense" : diff > 0 ? "income" : null;
  const catOptions = kind ? categories.filter((c) => c.kind === kind) : [];

  // Kategori yang dipilih harus sesuai arah selisihnya.
  useEffect(() => {
    if (categoryId && !catOptions.some((c) => c.id === categoryId)) setCategoryId("");
  }, [kind]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = () => {
    if (!wallet) return setError("Pilih dompetnya dulu.");
    if (!hasValue) return setError("Isi saldo yang sebenarnya ada sekarang.");
    if (actualValue < 0) return setError("Saldo tidak bisa minus.");
    if (!kind) return onClose();
    setError("");
    onSubmit({
      type: kind,
      amount: Math.abs(diff),
      categoryId,
      splits: null,
      walletId,
      tags: [],
      date: new Date().toISOString(),
      note: note.trim(),
      adjustment: true,
      // Saham: perubahan nilai, tidak dihitung sebagai pemasukan/pengeluaran.
      ...(invest ? { valuation: true, categoryId: "" } : {}),
    });
  };

  const fieldStyle = { height: 46, borderRadius: 14, border: `1px solid ${COLORS.border}`, background: "#FFFFFF", color: COLORS.ink, "--inp-focus": COLORS.primary };
  const diffColor = kind === "expense" ? COLORS.expenseText : kind === "income" ? COLORS.safe : COLORS.muted;

  return (
    <Overlay onClose={onClose}>
      <div className="flex flex-col" style={{ gap: 16 }}>
        <div className="flex items-center justify-between" style={{ gap: 10 }}>
          <div className="min-w-0">
            <div style={{ fontFamily: KAS_FONT, fontWeight: 700, fontSize: 20, lineHeight: 1.2 }}>{invest ? "Update nilai saham" : "Sesuaikan saldo"}</div>
            <div style={{ fontSize: 12.5, color: COLORS.muted, marginTop: 2 }}>
              {invest ? "Isi total equity saham sekarang." : "Isi uang yang benar-benar ada sekarang."}
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

        {wallets.length > 1 && (
          <div className="flex overflow-x-auto" style={{ gap: 6, margin: "-4px -20px", padding: "4px 20px", scrollbarWidth: "none" }}>
            {wallets.map((w) => (
              <Chip
                key={w.id}
                active={walletId === w.id}
                onClick={() => setWalletId(w.id)}
                height={38}
                activeBg={COLORS.primary}
                ink={COLORS.ink}
                inkSoft={COLORS.muted}
                border={COLORS.border}
                style={{ flexShrink: 0, padding: "0 16px" }}
              >
                {w.name}
              </Chip>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between" style={{ background: COLORS.soft, borderRadius: 16, padding: "12px 14px" }}>
          <span style={{ fontSize: 13, color: COLORS.muted }}>
            {invest ? "Nilai" : "Saldo"} {wallet ? wallet.name : ""} di aplikasi
          </span>
          <span style={{ fontSize: 15, fontWeight: 700 }}>
            <RollingNumber value={fmtRupiah(current)} />
          </span>
        </div>

        <div className="text-center">
          <div style={{ fontSize: 13, color: COLORS.muted }}>{invest ? "Nilai saham sekarang (total equity)" : "Saldo sebenarnya sekarang"}</div>
          <label className="flex items-baseline justify-center" style={{ gap: 6, cursor: "text" }}>
            <span style={{ fontSize: 22, fontWeight: 600, color: actual ? COLORS.ink : "#B9BDB5" }}>Rp</span>
            <input
              autoFocus
              inputMode="text"
              aria-label="Saldo sebenarnya sekarang"
              value={actual}
              onChange={(e) => {
                setActual(e.target.value.replace(/[^\d+\-*/().x×÷ ]/gi, ""));
                setError("");
              }}
              placeholder="0"
              className="fs-38"
              style={{
                width: `calc(${Math.max(1, String(actual).length)}ch + 8px)`,
                maxWidth: "80%",
                minWidth: 30,
                border: "none",
                outline: "none",
                background: "transparent",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: COLORS.ink,
                padding: 0,
              }}
            />
          </label>
          <div style={{ fontSize: 12, color: actual && actualValue === null ? COLORS.out : COLORS.muted }}>
            {actual ? (actualValue === null ? "Rumusnya belum benar" : fmtRupiah(actualValue)) : "Bisa juga ketik hitungan, mis. 200000+50000"}
          </div>
        </div>

        <Collapse open={hasValue}>
          <div className="flex flex-col" style={{ gap: 14 }}>
            <motion.div
              className="flex items-center"
              initial={false}
              animate={{ backgroundColor: kind === "expense" ? COLORS.outBg : kind === "income" ? COLORS.safeBg : COLORS.soft }}
              transition={{ duration: DUR.fast }}
              style={{ gap: 12, borderRadius: 16, padding: "12px 14px" }}
            >
              <span className="flex-1 min-w-0" style={{ fontSize: 13, color: COLORS.ink, lineHeight: 1.35 }}>
                {invest && kind
                  ? `Nilai saham ${kind === "income" ? "naik" : "turun"}. Dicatat sebagai perubahan nilai — tidak dihitung sebagai pemasukan/pengeluaran.`
                  : kind === "expense"
                  ? "Selisihnya dicatat sebagai pengeluaran (ikut dihitung di Keluar bulan ini)."
                  : kind === "income"
                  ? "Selisihnya dicatat sebagai pemasukan."
                  : "Saldo sudah cocok — tidak ada yang perlu dicatat."}
              </span>
              <motion.span initial={false} animate={{ color: diffColor }} transition={{ duration: DUR.fast }} className="shrink-0" style={{ fontSize: 16, fontWeight: 700 }}>
                <RollingNumber value={`${diff > 0 ? "+" : diff < 0 ? "−" : ""}${fmtRupiah(Math.abs(diff))}`} />
              </motion.span>
            </motion.div>

            <Collapse open={!!kind}>
              <div className="flex flex-col" style={{ gap: 12 }}>
                {!invest && (
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 500, color: COLORS.muted, marginBottom: 8 }}>
                    {kind === "income" ? "Dari mana? (opsional)" : "Kebanyakan untuk apa? (opsional)"}
                  </div>
                  <div className="flex flex-wrap" style={{ gap: 6 }}>
                    <Chip active={!categoryId} onClick={() => setCategoryId("")} height={34} activeBg={COLORS.primary} ink={COLORS.ink} inkSoft={COLORS.muted} border={COLORS.border} style={{ padding: "0 12px", fontSize: 12.5 }}>
                      Tanpa rincian
                    </Chip>
                    {catOptions.map((c) => (
                      <Chip
                        key={c.id}
                        active={categoryId === c.id}
                        onClick={() => setCategoryId(c.id)}
                        height={34}
                        activeBg={c.color || COLORS.primary}
                        ink={COLORS.ink}
                        inkSoft={COLORS.muted}
                        border={COLORS.border}
                        style={{ padding: "0 12px", fontSize: 12.5 }}
                      >
                        {c.name}
                      </Chip>
                    ))}
                  </div>
                </div>
                )}
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={invest ? "Catatan (opsional), mis. update dari aplikasi sekuritas" : "Catatan (opsional), mis. belanja minggu ini"}
                  aria-label="Catatan penyesuaian"
                  className="inp w-full"
                  style={{ ...fieldStyle, padding: "0 14px" }}
                />
              </div>
            </Collapse>
          </div>
        </Collapse>

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

        <div className="flex flex-col" style={{ gap: 6 }}>
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            style={{ height: 52, borderRadius: 16, border: "none", background: COLORS.primary, color: "#FFFFFF", fontSize: 15, fontWeight: 600, opacity: saving ? 0.6 : 1 }}
          >
            {saving ? "Menyimpan..." : hasValue && !kind ? "Tutup" : invest ? "Simpan nilai saham" : "Simpan saldo"}
          </button>
          {onRecordIncome && !invest && (
            <button
              type="button"
              onClick={() => onRecordIncome(walletId)}
              style={{ height: 40, border: "none", background: "transparent", color: COLORS.safe, fontSize: 12.5, fontWeight: 600 }}
            >
              Ada pemasukan yang jelas (gaji, bonus)? Catat sebagai pemasukan
            </button>
          )}
        </div>
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
            { key: "stock", label: "Saham" },
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

      <Field label={icon === "stock" ? "Nilai saham sekarang (total equity)" : "Saldo awal"} className="mb-4">
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
          {icon === "stock"
            ? "Naik-turunnya nilai saham nanti diperbarui lewat \"Update nilai saham\" dan tidak dihitung sebagai pemasukan/pengeluaran."
            : "Isi saldo yang ada sekarang. Transaksi berikutnya bakal dihitung dari sini."}
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
// Riwayat perubahan Kas Rumah: siapa mengubah apa dan kapan, termasuk yang
// sudah dihapus. Dikelompokkan per hari, terbaru di atas.
const LOG_ICON = { tx: Receipt, wallet: Wallet, category: Tag, gold: Gem };

function KasLogPanel({ log, onClose }) {
  const groups = useMemo(() => {
    const out = [];
    for (const e of log) {
      const label = dayLabel(e.at);
      let g = out.find((x) => x.label === label);
      if (!g) {
        g = { label, items: [] };
        out.push(g);
      }
      g.items.push(e);
    }
    return out;
  }, [log]);

  return (
    <SidePanel onClose={onClose}>
      <Stagger>
        <StaggerItem className="flex items-center justify-between" style={{ marginBottom: 16 }}>
          <div className="flex items-center" style={{ gap: 8 }}>
            <Clock3 size={18} color={COLORS.primary} />
            <div style={{ fontFamily: KAS_FONT, fontWeight: 700, fontSize: 19 }}>Riwayat Perubahan</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="flex items-center justify-center"
            style={{ width: 44, height: 44, borderRadius: 999, border: "none", background: COLORS.soft, color: COLORS.muted }}
          >
            <X size={17} />
          </button>
        </StaggerItem>
        {groups.length === 0 ? (
          <StaggerItem>
            <div className="text-center" style={{ padding: "28px 16px", borderRadius: 20, border: `1px dashed ${COLORS.border}`, fontSize: 13, color: COLORS.muted }}>
              Belum ada perubahan yang tercatat. Mulai sekarang setiap tambah, ubah, dan hapus di Kas Rumah dicatat di sini.
            </div>
          </StaggerItem>
        ) : (
          groups.map((g) => (
            <StaggerItem key={g.label} style={{ marginBottom: 16 }}>
              <div className="uppercase" style={{ padding: "0 4px 8px", fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", color: COLORS.safe }}>
                {g.label}
              </div>
              <div style={{ background: COLORS.card, borderRadius: 20, boxShadow: TX_CARD_SHADOW }}>
                {g.items.map((e, i) => {
                  const Ic = LOG_ICON[e.kind] || Clock3;
                  return (
                    <div key={e.id}>
                      {i > 0 && <div style={{ height: 1, background: "#F1EFE7", marginLeft: 58 }} />}
                      <div className="flex items-start" style={{ gap: 12, padding: "12px 14px" }}>
                        <span className="shrink-0 flex items-center justify-center" style={{ width: 32, height: 32, borderRadius: 11, background: COLORS.soft, color: COLORS.primary }}>
                          <Ic size={15} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div style={{ fontSize: 13.5, color: COLORS.ink, lineHeight: 1.35 }}>
                            <b style={{ fontWeight: 600 }}>{e.by}</b> {e.text}
                          </div>
                          <div style={{ fontSize: 11.5, color: COLORS.muted, marginTop: 2 }}>{fmtDateTime(e.at)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </StaggerItem>
          ))
        )}
      </Stagger>
    </SidePanel>
  );
}

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

function MenuPanel({ userName, onClose, onOpenCategories, onOpenLog, onTransfer, onSwitchApp, onLogout }) {
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
        <MenuItem icon={Clock3} label="Riwayat Perubahan" onClick={() => runAndClose(onOpenLog)} />
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
