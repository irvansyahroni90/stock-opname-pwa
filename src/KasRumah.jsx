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
  MoreHorizontal,
  Landmark,
  Smartphone,
  CreditCard,
  Coins,
} from "lucide-react";
import { storageSet, storageSubscribe } from "./firebase";

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
  iconBuyBg: "#FCEBD8",
  iconBuyFg: "#C98A3E",
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

function TopBar({ title, onBack, rightSlot, onOpenMenu }) {
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
              onEdit={(tx) => (tx.type === "transfer" ? setTransferModal(tx) : setTxModal({ mode: "edit", tx }))}
              onDelete={(tx) => setConfirmDelete({ type: "tx", id: tx.id, label: tx.note || "transaksi ini" })}
            />
          </div>

          <div className="h-full" style={{ width: "100vw" }}>
            <WalletsPage
              wallets={wallets}
              transactions={transactions}
              onBack={() => setView("dashboard")}
              onOpenMenu={() => setShowMenu(true)}
              onEdit={(w) => setWalletModal({ mode: "edit", wallet: w })}
              onDelete={(w) => setConfirmDelete({ type: "wallet", id: w.id, label: w.name })}
              onTransfer={() => setTransferModal(true)}
            />
          </div>

          <div className="h-full" style={{ width: "100vw" }}>
            <ComingSoonPage
              title="Analisis"
              icon={PieChart}
              message="Grafik pengeluaran, tren bulanan, dan insight otomatis lagi disiapkan di tahap berikutnya."
              onBack={() => setView("dashboard")}
              onOpenMenu={() => setShowMenu(true)}
            />
          </div>
        </div>
      </div>

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
          saving={saving}
          onClose={() => setTxModal(null)}
          onSubmit={(data) => handleSaveTx(data, txModal.tx)}
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
            <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: COLORS.iconBuyBg }}>
              <Receipt size={20} color={COLORS.iconBuyFg} />
            </div>
            <div className="flex-1 min-w-0">
              <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 16, color: COLORS.ink }}>Transaksi Terbaru</div>
              <div className="text-xs mt-0.5" style={{ color: COLORS.iconBuyFg }}>
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
function TransactionsPage({ transactions, catById, walById, search, setSearch, filter, setFilter, onBack, onOpenMenu, onEdit, onDelete }) {
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
        <TopBar title="Transaksi" onBack={onBack} onOpenMenu={onOpenMenu} />

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
                      onEdit={() => onEdit(t)}
                      onDelete={() => onDelete(t)}
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

function TransactionRow({ tx, category, wallet, toWallet, onEdit, onDelete }) {
  const isIncome = tx.type === "income";
  const isTransfer = tx.type === "transfer";
  const Icon = isTransfer ? ArrowLeftRight : CATEGORY_ICONS[category?.icon] || Tag;
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
                {isTransfer ? `${wallet?.name || "?"} → ${toWallet?.name || "?"}` : category?.name || "Tanpa kategori"}
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
          <div className="text-[11px] mt-1" style={{ color: COLORS.inkSoft }}>
            {!isTransfer && `${wallet?.name || "?"} · `}
            {fmtDateTime(tx.date)}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between mt-2.5 pt-2.5" style={{ borderTop: `1px solid ${COLORS.border}` }}>
        <span className="text-[11px] truncate" style={{ color: COLORS.inkSoft }}>
          {tx.createdBy || "?"}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
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
function WalletsPage({ wallets, transactions, onBack, onOpenMenu, onEdit, onDelete, onTransfer }) {
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

function ComingSoonPage({ title, icon: Icon, message, onBack, onOpenMenu }) {
  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 max-w-2xl mx-auto w-full px-4 pb-3" style={{ paddingTop: "env(safe-area-inset-top)", background: COLORS.bg }}>
        <TopBar title={title} onBack={onBack} onOpenMenu={onOpenMenu} />
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 pb-32">
          <div className="rounded-2xl p-8 text-center" style={{ background: COLORS.card, border: `1.5px solid ${COLORS.border}` }}>
            <span className="rounded-full flex items-center justify-center mx-auto mb-3" style={{ width: 44, height: 44, background: COLORS.iconBuyBg }}>
              <Icon size={20} color={COLORS.iconBuyFg} />
            </span>
            <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 16, color: COLORS.ink }} className="mb-1">
              Segera hadir
            </div>
            <p className="text-xs" style={{ color: COLORS.iconBuyFg }}>
              {message}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Modal transaksi ----------------------------------------------------
function TransactionModal({ mode, tx, initialType, categories, wallets, saving, onClose, onSubmit }) {
  const [type, setType] = useState(tx?.type || initialType || "expense");
  const [amount, setAmount] = useState(tx ? String(tx.amount) : "");
  const [categoryId, setCategoryId] = useState(tx?.categoryId || "");
  const [walletId, setWalletId] = useState(tx?.walletId || wallets[0]?.id || "");
  const [date, setDate] = useState(toLocalInput(tx?.date));
  const [note, setNote] = useState(tx?.note || "");
  const [error, setError] = useState("");

  const catOptions = categories.filter((c) => c.kind === type);

  useEffect(() => {
    if (categoryId && !catOptions.some((c) => c.id === categoryId)) setCategoryId("");
  }, [type]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = () => {
    const value = Number(String(amount).replace(/[^\d.-]/g, ""));
    if (!value || value <= 0) {
      setError("Isi nominalnya dulu.");
      return;
    }
    if (!walletId) {
      setError("Pilih dompetnya dulu.");
      return;
    }
    if (!categoryId) {
      setError("Pilih kategorinya dulu.");
      return;
    }
    onSubmit({
      type,
      amount: value,
      categoryId,
      walletId,
      date: new Date(date).toISOString(),
      note: note.trim(),
    });
  };

  return (
    <Overlay onClose={onClose}>
      <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 19, color: COLORS.primary }} className="mb-3">
        {mode === "edit" ? "Edit Transaksi" : "Transaksi Baru"}
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
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="0"
            className="flex-1 py-2.5 bg-transparent font-bold"
            style={{ color: COLORS.ink, fontSize: 18, outline: "none", border: "none" }}
          />
        </div>
        {amount && (
          <div className="text-xs mt-1" style={{ color: COLORS.inkSoft }}>
            {fmtRupiah(amount)}
          </div>
        )}
      </Field>

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
