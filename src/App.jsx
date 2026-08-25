import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  AlertTriangle,
  ClipboardList,
  ShoppingCart,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ArrowLeft,
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
} from "lucide-react";
import { storageGet, storageSet, storageSubscribe } from "./firebase";

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
  // Warna latar ikon bulat gaya baru (Beranda)
  iconStockBg: "#FCEBD8",
  iconStockFg: "#C98A3E",
  iconBuyBg: "#FCEBD8",
  iconBuyFg: "#C98A3E",
  iconAgendaBg: "#E7F0EA",
  iconAgendaFg: "#3F7D5C",
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

export default function App() {
  const [items, setItems] = useState([]);
  const [history, setHistory] = useState([]);
  const [toBuy, setToBuy] = useState([]);
  const [places, setPlaces] = useState(DEFAULT_PLACES);
  const [tasks, setTasks] = useState([]);
  const [dueThreshold, setDueThreshold] = useState(3);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [nameDraft, setNameDraft] = useState("");
  const [askName, setAskName] = useState(false);

  const [view, setView] = useState("dashboard"); // 'dashboard' | 'stock' | 'tobuy' | 'agenda'

  const [stockSearch, setStockSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("all"); // 'all' | 'low' | 'out'
  const [tobuySearch, setTobuySearch] = useState("");
  const [tobuyFilter, setTobuyFilter] = useState("pending"); // 'pending' | 'bought'
  const [agendaSearch, setAgendaSearch] = useState("");
  const [agendaFilter, setAgendaFilter] = useState("all"); // 'all' | 'soon' | 'overdue' | 'done'

  // Target "loncat & sorot" dari preview Beranda ke item spesifik di halaman penuh
  const [highlightTarget, setHighlightTarget] = useState(null); // { type: 'stock'|'tobuy'|'agenda', id }

  const goToStockItem = (item) => {
    const status = statusOf(item);
    setStockSearch("");
    setStockFilter(status === "safe" ? "all" : status);
    setHighlightTarget({ type: "stock", id: item.id });
    setView("stock");
  };

  const goToToBuyEntry = (entry) => {
    setTobuySearch("");
    setTobuyFilter(entry.bought ? "bought" : "pending");
    setHighlightTarget({ type: "tobuy", id: entry.id });
    setView("tobuy");
  };

  const goToTask = (task) => {
    const urgency = taskUrgency(task, dueThreshold);
    setAgendaSearch("");
    setAgendaFilter(task.done ? "done" : urgency === "overdue" ? "overdue" : urgency === "soon" ? "soon" : "all");
    setHighlightTarget({ type: "agenda", id: task.id });
    setView("agenda");
  };

  const [showHistory, setShowHistory] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
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
  useEffect(() => {
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
      storageSubscribe("agenda-due-threshold", (data) => {
        setDueThreshold(typeof data === "number" && data > 0 ? data : 3);
        markLoaded();
      }),
    ];

    return () => unsubs.forEach((fn) => fn && fn());
  }, []);

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

  if (loading) {
    return (
      <div style={{ background: COLORS.bg, minHeight: "100vh", color: COLORS.inkSoft }} className="flex items-center justify-center text-sm">
        Memuat data...
      </div>
    );
  }

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", color: COLORS.ink, fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');
        * { box-sizing: border-box; }
        input:focus, button:focus, textarea:focus { outline: 2px solid ${COLORS.primary}; outline-offset: 1px; }
        ::placeholder { color: #A6A296; }
      `}</style>

      <input ref={fileInputRef} type="file" accept=".json,application/json" style={{ display: "none" }} onChange={handleFileSelected} />

      <div className="max-w-2xl mx-auto px-4 pb-32" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        {view === "dashboard" && (
          <>
            <div className="relative pt-8 pb-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm flex items-center gap-1.5" style={{ color: COLORS.inkSoft }}>
                    {greeting}
                    {userName ? `, ${userName}` : ""} <span>👋</span>
                  </div>
                  <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 30, lineHeight: 1.15 }}>
                    <span style={{ color: COLORS.primary }}>Frinirvan</span>
                    <br />
                    <span style={{ color: COLORS.inkSoft, fontWeight: 500 }}>Tracker</span>
                  </h1>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => loadAll()}
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: COLORS.card, boxShadow: "0 2px 8px rgba(43,42,37,0.10)" }}
                    title="Muat ulang data"
                  >
                    <RotateCcw size={16} color={COLORS.ink} />
                  </button>
                  <button
                    onClick={() => setShowUserMenu(true)}
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
              <HomeIllustration />
            </div>

            <div className="flex flex-col gap-3">
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
                    <SeeAllButton count={stockPreview.total - stockPreview.list.length} onClick={() => setView("stock")} />
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
                    <SeeAllButton count={toBuyPreview.total - toBuyPreview.list.length} onClick={() => setView("tobuy")} />
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
                onOpen={() => setView("agenda")}
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
                    <SeeAllButton count={agendaPreview.total - agendaPreview.list.length} onClick={() => setView("agenda")} />
                  )
                }
              />
            </div>
          </>
        )}

        {view === "stock" && (
          <StockPage
            items={items}
            search={stockSearch}
            setSearch={setStockSearch}
            filter={stockFilter}
            setFilter={setStockFilter}
            onBack={() => setView("dashboard")}
            onAdd={() => setModal({ mode: "add" })}
            onEditItem={(item) => setModal({ mode: "edit", item })}
            onDeleteItem={(item) => setConfirmDelete({ type: "item", id: item.id, label: item.name })}
            onAdjust={handleQuickAdjust}
            onLevelChange={handleLevelChange}
            userName={userName}
            onOpenUserMenu={() => setShowUserMenu(true)}
            onRefresh={loadAll}
            highlightId={highlightTarget?.type === "stock" ? highlightTarget.id : null}
            onHighlightDone={() => setHighlightTarget(null)}
          />
        )}

        {view === "tobuy" && (
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
            onRefresh={loadAll}
            highlightId={highlightTarget?.type === "tobuy" ? highlightTarget.id : null}
            onHighlightDone={() => setHighlightTarget(null)}
          />
        )}

        {view === "agenda" && (
          <AgendaPage
            tasks={tasks}
            dueThreshold={dueThreshold}
            search={agendaSearch}
            setSearch={setAgendaSearch}
            filter={agendaFilter}
            setFilter={setAgendaFilter}
            onBack={() => setView("dashboard")}
            onAddTask={() => setTaskModal({ mode: "add" })}
            onEditTask={(task) => setTaskModal({ mode: "edit", task })}
            onDeleteTask={(task) => setConfirmDelete({ type: "task", id: task.id, label: task.title })}
            onToggleDone={handleToggleTaskDone}
            onOpenThreshold={() => setThresholdModal(true)}
            userName={userName}
            onOpenUserMenu={() => setShowUserMenu(true)}
            onRefresh={loadAll}
            highlightId={highlightTarget?.type === "agenda" ? highlightTarget.id : null}
            onHighlightDone={() => setHighlightTarget(null)}
          />
        )}
      </div>

      <BottomNav view={view} setView={setView} />

      {/* Name modal */}
      {askName && (
        <Overlay onClose={() => userName && setAskName(false)}>
          <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 20, color: COLORS.primary }} className="mb-1">
            Siapa kamu?
          </div>
          <p className="text-sm mb-4" style={{ color: COLORS.inkSoft }}>
            Nama ini bakal dicatat tiap kali kamu update stok, akan dibeli, atau agenda, biar kelihatan siapa yang mengubah apa.
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
            <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 18, color: COLORS.ink }}>
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

      {/* History panel */}
      {showHistory && <HistoryPanel history={history} onClose={() => setShowHistory(false)} />}

      {/* User menu drawer */}
      {showUserMenu && (
        <UserMenuPanel
          userName={userName}
          onClose={() => setShowUserMenu(false)}
          onChangeName={() => setAskName(true)}
          onOpenHistory={() => setShowHistory(true)}
          onBackup={handleBackupDownload}
          onRestore={triggerRestorePicker}
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
            <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 18, color: COLORS.ink }}>
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
            <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 18, color: COLORS.ink }}>
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

function UserMenuPanel({ userName, onClose, onChangeName, onOpenHistory, onBackup, onRestore }) {
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
        className="relative w-full sm:max-w-xs h-full overflow-y-auto p-5"
        style={{
          background: COLORS.bg,
          paddingTop: "calc(env(safe-area-inset-top) + 1.25rem)",
          transform: `translateX(${entered ? "0" : "100%"})`,
          transition: "transform 260ms ease-out",
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
              <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 16, color: COLORS.ink }}>{userName || "Belum diisi"}</div>
              <div className="text-xs" style={{ color: COLORS.inkSoft }}>Frinirvan Tracker</div>
            </div>
          </div>
          <button onClick={handleClose}>
            <X size={18} color={COLORS.inkSoft} />
          </button>
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
          <UserMenuItem icon={User} label="Ganti Nama" onClick={() => runAndClose(onChangeName)} />
          <UserMenuItem icon={History} label="Riwayat" onClick={() => runAndClose(onOpenHistory)} />
          <UserMenuItem icon={Download} label="Unduh Backup" onClick={() => runAndClose(onBackup)} />
          <UserMenuItem icon={Upload} label="Pulihkan dari File" onClick={() => runAndClose(onRestore)} last />
        </div>
      </div>
    </div>
  );
}

function UserMenuItem({ icon: Icon, label, onClick, last }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-left"
      style={{ color: COLORS.ink, borderBottom: last ? "none" : `1px solid ${COLORS.border}` }}
    >
      <Icon size={16} color={COLORS.inkSoft} />
      {label}
    </button>
  );
}

function TopBar({ title, subtitle, icon: Icon, iconBg, iconFg, onBack, rightSlot, userName, onOpenUserMenu }) {
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
          <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: onBack ? 26 : 30, lineHeight: 1.15 }}>{title}</h1>
          {subtitle && (
            <div className="text-sm mt-0.5" style={{ color: COLORS.inkSoft }}>
              {subtitle}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {rightSlot}
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
    <div className="relative w-full rounded-2xl p-4" style={{ background: COLORS.card, border: `1.5px solid ${COLORS.border}` }}>
      {badge > 0 && (
        <span
          className="absolute top-3.5 right-3.5 min-w-[22px] h-[22px] px-1.5 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
          style={{ background: badgeColor }}
        >
          {badge}
        </span>
      )}
      <button onClick={onOpen} className="w-full flex items-center gap-3 text-left pr-8">
        <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: iconBg }}>
          <Icon size={20} color={iconFg} />
        </div>
        <div className="flex-1 min-w-0">
          <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 16, color: COLORS.ink }}>{title}</div>
          <div className="text-xs mt-0.5" style={{ color: iconFg }}>
            {subtitle}
          </div>
        </div>
      </button>
      {rows && React.Children.count(rows) > 0 && (
        <div className="flex flex-col gap-1.5 mt-3.5 pl-14">{rows}</div>
      )}
      {moreButton}
    </div>
  );
}

function SeeAllButton({ count, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-center gap-1 py-2 text-sm font-semibold"
      style={{ color: COLORS.primary }}
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
    <button onClick={onClick} className="w-full flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left" style={{ background: COLORS.bg }}>
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
    <div className="w-full flex items-center gap-2.5 rounded-xl px-2.5 py-1.5" style={{ background: COLORS.bg }}>
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
    <div className="w-full flex items-center gap-2.5 rounded-xl px-2.5 py-1.5" style={{ background: COLORS.bg }}>
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

function BottomNav({ view, setView }) {
  const tabs = [
    { key: "dashboard", label: "Beranda", icon: Home },
    { key: "stock", label: "Stok", icon: Package },
    { key: "tobuy", label: "Beli", icon: ShoppingCart },
    { key: "agenda", label: "Agenda", icon: CalendarCheck2 },
  ];
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40"
      style={{ background: COLORS.card, borderTop: `1px solid ${COLORS.border}`, paddingBottom: "env(safe-area-inset-bottom)" }}
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

function HomeIllustration() {
  return (
    <svg
      viewBox="0 0 140 120"
      width="112"
      height="96"
      className="absolute right-0 pointer-events-none select-none"
      style={{ opacity: 0.95, top: 58 }}
    >
      {/* soft floor shadow */}
      <ellipse cx="70" cy="108" rx="60" ry="7" fill={COLORS.border} opacity="0.5" />
      {/* hanging lamp */}
      <line x1="112" y1="6" x2="112" y2="28" stroke={COLORS.inkSoft} strokeWidth="1.5" />
      <path d="M100 28 h24 l-4 12 h-16 z" fill={COLORS.accent} opacity="0.85" />
      {/* small side table */}
      <rect x="96" y="72" width="26" height="4" rx="1.5" fill={COLORS.accent} />
      <line x1="100" y1="76" x2="100" y2="96" stroke={COLORS.accent} strokeWidth="2.5" />
      <line x1="118" y1="76" x2="118" y2="96" stroke={COLORS.accent} strokeWidth="2.5" />
      {/* plant on table */}
      <rect x="102" y="58" width="12" height="12" rx="2" fill={COLORS.primaryLight} opacity="0.35" />
      <path d="M108 58 C104 50 104 44 108 38 C112 44 112 50 108 58 Z" fill={COLORS.primary} />
      <path d="M108 58 C102 52 100 46 103 40 C108 44 109 52 108 58 Z" fill={COLORS.primaryLight} />
      <path d="M108 58 C114 52 116 46 113 40 C108 44 107 52 108 58 Z" fill={COLORS.primaryLight} />
      {/* armchair */}
      <rect x="8" y="60" width="80" height="34" rx="14" fill={COLORS.primaryLight} opacity="0.28" />
      <rect x="14" y="50" width="68" height="30" rx="12" fill={COLORS.primaryLight} opacity="0.55" />
      <rect x="26" y="40" width="44" height="20" rx="10" fill={COLORS.primaryLight} opacity="0.75" />
      <rect x="30" y="44" width="20" height="12" rx="5" fill={COLORS.card} opacity="0.85" />
      <line x1="14" y1="90" x2="14" y2="98" stroke={COLORS.inkSoft} strokeWidth="3" strokeLinecap="round" />
      <line x1="82" y1="90" x2="82" y2="98" stroke={COLORS.inkSoft} strokeWidth="3" strokeLinecap="round" />
    </svg>
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

function SummaryCard({ icon: Icon, label, value, color, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl p-3 text-left flex flex-col gap-2.5 transition-shadow"
      style={{
        background: active ? color : COLORS.card,
        border: `1.5px solid ${active ? color : COLORS.border}`,
        boxShadow: active ? `0 4px 14px ${color}4D` : "none",
      }}
    >
      {Icon && (
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: active ? "rgba(255,255,255,0.22)" : `${color}1F` }}
        >
          <Icon size={17} color={active ? "#fff" : color} />
        </div>
      )}
      <div>
        <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 21, color: active ? "#fff" : COLORS.ink }}>{value}</div>
        <div className="text-[11px] leading-tight mt-0.5" style={{ color: active ? "rgba(255,255,255,0.85)" : COLORS.inkSoft }}>
          {label}
        </div>
      </div>
    </button>
  );
}

/* ---------------- Stock page ---------------- */

function StockPage({ items, search, setSearch, filter, setFilter, onBack, onAdd, onEditItem, onDeleteItem, onAdjust, onLevelChange, userName, onOpenUserMenu, onRefresh, highlightId, onHighlightDone }) {
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

  useEffect(() => {
    if (!highlightId) return;
    const el = document.getElementById(`stock-item-${highlightId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    const t = setTimeout(() => onHighlightDone && onHighlightDone(), 1300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightId]);

  return (
    <>
      <TopBar
        title="Stok Rumah"
        subtitle="Kelola dan pantau stok barang di rumah"
        onBack={onBack}
        userName={userName}
        onOpenUserMenu={onOpenUserMenu}
        rightSlot={
          <button
            onClick={onRefresh}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: COLORS.card, boxShadow: "0 2px 8px rgba(43,42,37,0.10)" }}
            title="Muat ulang data"
          >
            <RotateCcw size={15} color={COLORS.ink} />
          </button>
        }
      />

      <div className="grid grid-cols-3 gap-2 mb-4">
        <SummaryCard icon={Package} label="Total" value={counts.total} color={COLORS.primary} active={filter === "all"} onClick={() => setFilter("all")} />
        <SummaryCard icon={Clock} label="Menipis" value={counts.low} color={COLORS.low} active={filter === "low"} onClick={() => setFilter("low")} />
        <SummaryCard icon={CheckCircle2} label="Habis" value={counts.out} color={COLORS.out} active={filter === "out"} onClick={() => setFilter("out")} />
      </div>

      <div className="flex items-center gap-2 px-3 rounded-xl mb-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
        <Search size={16} color={COLORS.inkSoft} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari item stok..."
          className="flex-1 py-2.5 bg-transparent text-sm"
          style={{ color: COLORS.ink }}
        />
      </div>

      {filteredSorted.length === 0 ? (
        <div className="py-14 text-center rounded-2xl" style={{ background: COLORS.card, border: `1px dashed ${COLORS.border}` }}>
          <Package size={28} color={COLORS.inkSoft} style={{ margin: "0 auto 8px" }} />
          <div style={{ color: COLORS.inkSoft }} className="text-sm">
            {items.length === 0 ? "Belum ada item. Tambahkan yang pertama." : "Tidak ada item yang cocok."}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filteredSorted.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onAdjust={(d) => onAdjust(item.id, d)}
              onLevelChange={(lvl) => onLevelChange(item.id, lvl)}
              onEdit={() => onEditItem(item)}
              onDelete={() => onDeleteItem(item)}
              highlighted={item.id === highlightId}
            />
          ))}
        </div>
      )}

      <button
        onClick={onAdd}
        className="fixed right-6 rounded-full flex items-center justify-center shadow-lg"
        style={{ width: 56, height: 56, background: COLORS.primary, color: "#fff", bottom: "calc(112px + env(safe-area-inset-bottom))" }}
      >
        <Plus size={26} />
      </button>
    </>
  );
}

function ItemCard({ item, onAdjust, onLevelChange, onEdit, onDelete, highlighted }) {
  const status = statusOf(item);
  const meta = STATUS_META[status];
  const isLevel = item.type === "level";
  return (
    <div
      id={`stock-item-${item.id}`}
      className={`rounded-2xl overflow-hidden flex ${highlighted ? "highlight-blink" : ""}`}
      style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}
    >
      <div style={{ width: 4, background: meta.fg }} />
      <div className="flex-1 p-3.5">
        <div className="min-w-0">
          <div className="font-semibold text-base truncate" style={{ color: COLORS.ink, fontFamily: "'Fraunces', serif" }}>
            {item.name}
          </div>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: meta.bg, color: meta.fg }}>
              {meta.label}
            </span>
            {!isLevel && item.minQty > 0 && (
              <span className="text-xs" style={{ color: COLORS.inkSoft }}>
                min {item.minQty} {item.unit}
              </span>
            )}
          </div>
        </div>

        <div className="mt-3">
          {isLevel ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              {LEVEL_OPTIONS.map((opt) => {
                const active = item.level === opt.key;
                const optMeta = STATUS_META[opt.status];
                return (
                  <button
                    key={opt.key}
                    onClick={() => onLevelChange(opt.key)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold"
                    style={{
                      background: active ? optMeta.fg : COLORS.bg,
                      color: active ? "#fff" : COLORS.inkSoft,
                      border: `1px solid ${active ? optMeta.fg : COLORS.border}`,
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={() => onAdjust(-1)}
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{ border: `1.5px solid ${COLORS.border}` }}
              >
                <Minus size={15} color={COLORS.ink} />
              </button>
              <div className="text-center" style={{ minWidth: 56 }}>
                <span style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 20, color: COLORS.ink }}>{item.qty}</span>
                <span className="text-xs ml-1" style={{ color: COLORS.inkSoft }}>
                  {item.unit}
                </span>
              </div>
              <button
                onClick={() => onAdjust(1)}
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{ border: `1.5px solid ${COLORS.border}` }}
              >
                <Plus size={15} color={COLORS.ink} />
              </button>
            </div>
          )}
        </div>

        {item.notes && (
          <div className="text-xs mt-2.5 italic" style={{ color: COLORS.inkSoft }}>
            {item.notes}
          </div>
        )}

        <div className="flex items-end justify-between mt-3 pt-3" style={{ borderTop: `1px solid ${COLORS.border}` }}>
          <div className="flex items-start gap-1.5 min-w-0">
            <Clock size={12} color={COLORS.inkSoft} className="mt-0.5 shrink-0" />
            <div className="text-xs leading-tight" style={{ color: COLORS.inkSoft }}>
              <div>Terakhir diperbarui</div>
              <div className="truncate">
                {item.lastUpdatedBy || "?"} &middot; {fmtDateTime(item.lastUpdatedAt)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={onEdit}
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ border: `1px solid ${COLORS.border}` }}
              title="Edit"
            >
              <Pencil size={13} color={COLORS.ink} />
            </button>
            <button
              onClick={onDelete}
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ border: `1px solid ${COLORS.out}55` }}
              title="Hapus"
            >
              <Trash2 size={13} color={COLORS.out} />
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
        <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 20, color: COLORS.primary }}>
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

function ToBuyPage({ toBuy, search, setSearch, filter, setFilter, onBack, onAddManual, onEditEntry, onDeleteEntry, onToggle, userName, onOpenUserMenu, onRefresh, highlightId, onHighlightDone }) {
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
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    const t = setTimeout(() => onHighlightDone && onHighlightDone(), 1300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightId]);

  return (
    <>
      <TopBar
        title="Akan Dibeli"
        subtitle="Daftar barang yang perlu dibeli"
        onBack={onBack}
        userName={userName}
        onOpenUserMenu={onOpenUserMenu}
        rightSlot={
          <button
            onClick={onRefresh}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: COLORS.card, boxShadow: "0 2px 8px rgba(43,42,37,0.10)" }}
            title="Muat ulang data"
          >
            <RotateCcw size={15} color={COLORS.ink} />
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-2 mb-4">
        <SummaryCard icon={ShoppingCart} label="Perlu Dibeli" value={pendingCount} color={COLORS.low} active={filter === "pending"} onClick={() => setFilter("pending")} />
        <SummaryCard icon={CheckCircle2} label="Sudah Dibeli" value={boughtCount} color={COLORS.safe} active={filter === "bought"} onClick={() => setFilter("bought")} />
      </div>

      <div className="flex items-center gap-2 px-3 rounded-xl mb-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
        <Search size={16} color={COLORS.inkSoft} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari di daftar ini..."
          className="flex-1 py-2.5 bg-transparent text-sm"
          style={{ color: COLORS.ink }}
        />
      </div>

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

      <button
        onClick={onAddManual}
        className="fixed right-6 rounded-full flex items-center justify-center shadow-lg"
        style={{ width: 56, height: 56, background: COLORS.primary, color: "#fff", bottom: "calc(112px + env(safe-area-inset-bottom))" }}
      >
        <Plus size={26} />
      </button>
    </>
  );
}

function ToBuyRow({ entry, onToggle, onEdit, onDelete, highlighted }) {
  const detailParts = [];
  if (entry.qty) detailParts.push(`${entry.qty}${entry.unit ? " " + entry.unit : ""}`);
  if (entry.place) detailParts.push(entry.place);

  return (
    <div
      id={`tobuy-item-${entry.id}`}
      className={`rounded-2xl p-3.5 ${highlighted ? "highlight-blink" : ""}`}
      style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={onToggle}
          className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: entry.bought ? COLORS.safe : "transparent", border: `1.5px solid ${entry.bought ? COLORS.safe : COLORS.border}` }}
        >
          {entry.bought && <Check size={14} color="#fff" />}
        </button>
        <div className="min-w-0 flex-1">
          <div
            className="font-semibold text-base truncate"
            style={{
              color: entry.bought ? COLORS.inkSoft : COLORS.ink,
              textDecoration: entry.bought ? "line-through" : "none",
              fontFamily: "'Fraunces', serif",
            }}
          >
            {entry.itemName}
          </div>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {!entry.bought && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: COLORS.lowBg, color: COLORS.low }}>
                Perlu Dibeli
              </span>
            )}
            {detailParts.length > 0 && (
              <span className="text-xs" style={{ color: COLORS.inkSoft }}>
                {detailParts.join(" \u00b7 ")}
              </span>
            )}
          </div>
          {entry.notes && (
            <div className="text-xs mt-1.5 italic" style={{ color: COLORS.inkSoft }}>
              {entry.notes}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-end justify-between mt-3 pt-3" style={{ borderTop: `1px solid ${COLORS.border}` }}>
        <div className="flex items-start gap-1.5 min-w-0">
          <Clock size={12} color={entry.bought ? COLORS.safe : COLORS.inkSoft} className="mt-0.5 shrink-0" />
          <div className="text-xs leading-tight" style={{ color: entry.bought ? COLORS.safe : COLORS.inkSoft }}>
            <div>{entry.bought ? "Sudah dibeli" : "Ditambahkan"}</div>
            <div className="truncate">
              {entry.bought ? `${entry.boughtBy || "?"} \u00b7 ${fmtDateTime(entry.boughtAt)}` : fmtDateTime(entry.addedAt)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={onEdit} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ border: `1px solid ${COLORS.border}` }} title="Edit">
            <Pencil size={13} color={COLORS.ink} />
          </button>
          <button
            onClick={onDelete}
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ border: `1px solid ${COLORS.out}55` }}
            title="Hapus"
          >
            <Trash2 size={13} color={COLORS.out} />
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
        <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 20, color: COLORS.primary }}>
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

function AgendaPage({ tasks, dueThreshold, search, setSearch, filter, setFilter, onBack, onAddTask, onEditTask, onDeleteTask, onToggleDone, onOpenThreshold, userName, onOpenUserMenu, onRefresh, highlightId, onHighlightDone }) {
  const [subView, setSubView] = useState("list"); // 'list' | 'calendar'
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
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    const t = setTimeout(() => onHighlightDone && onHighlightDone(), 1300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightId]);

  return (
    <>
      <TopBar
        title="Agenda Rumah"
        subtitle="Kelola agenda dan tugas rumah"
        onBack={onBack}
        userName={userName}
        onOpenUserMenu={onOpenUserMenu}
        rightSlot={
          <>
            <button
              onClick={onOpenThreshold}
              className="px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-medium"
              style={{ background: COLORS.card, boxShadow: "0 2px 8px rgba(43,42,37,0.10)", color: COLORS.ink }}
              title="Atur pengingat"
            >
              <SlidersHorizontal size={13} /> H-{dueThreshold}
            </button>
            <button
              onClick={onRefresh}
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: COLORS.card, boxShadow: "0 2px 8px rgba(43,42,37,0.10)" }}
              title="Muat ulang data"
            >
              <RotateCcw size={15} color={COLORS.ink} />
            </button>
          </>
        }
      />

      <div className="flex gap-1 p-1 rounded-xl mb-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
        <button
          onClick={() => setSubView("list")}
          className="flex-1 py-2 rounded-lg text-sm font-medium"
          style={{ background: subView === "list" ? COLORS.primary : "transparent", color: subView === "list" ? "#fff" : COLORS.ink }}
        >
          List
        </button>
        <button
          onClick={() => setSubView("calendar")}
          className="flex-1 py-2 rounded-lg text-sm font-medium"
          style={{ background: subView === "calendar" ? COLORS.primary : "transparent", color: subView === "calendar" ? "#fff" : COLORS.ink }}
        >
          Kalender
        </button>
      </div>

      {subView === "list" ? (
        <>
          <div className="grid grid-cols-4 gap-1.5 mb-4">
            <SummaryCard icon={LayoutGrid} label="Semua" value={counts.all} color={COLORS.primary} active={filter === "all"} onClick={() => setFilter("all")} />
            <SummaryCard icon={Clock} label="Hampir Deadline" value={counts.soon} color={COLORS.low} active={filter === "soon"} onClick={() => setFilter("soon")} />
            <SummaryCard icon={AlertTriangle} label="Terlambat" value={counts.overdue} color={COLORS.out} active={filter === "overdue"} onClick={() => setFilter("overdue")} />
            <SummaryCard icon={CheckCircle2} label="Selesai" value={counts.done} color={COLORS.safe} active={filter === "done"} onClick={() => setFilter("done")} />
          </div>

          <div className="flex items-center gap-2 px-3 rounded-xl mb-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
            <Search size={16} color={COLORS.inkSoft} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari tugas..."
              className="flex-1 py-2.5 bg-transparent text-sm"
              style={{ color: COLORS.ink }}
            />
          </div>

          {listToShow.length === 0 ? (
            <div className="py-10 text-center rounded-2xl mb-3" style={{ background: COLORS.card, border: `1px dashed ${COLORS.border}` }}>
              <ListTodo size={26} color={COLORS.inkSoft} style={{ margin: "0 auto 8px" }} />
              <div style={{ color: COLORS.inkSoft }} className="text-sm">
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
        <CalendarView tasks={tasks} dueThreshold={dueThreshold} onToggleDone={onToggleDone} onEditTask={onEditTask} onDeleteTask={onDeleteTask} />
      )}

      <button
        onClick={onAddTask}
        className="fixed right-6 rounded-full flex items-center justify-center shadow-lg"
        style={{ width: 56, height: 56, background: COLORS.primary, color: "#fff", bottom: "calc(112px + env(safe-area-inset-bottom))" }}
      >
        <Plus size={26} />
      </button>
    </>
  );
}

function CalendarView({ tasks, dueThreshold, onToggleDone, onEditTask, onDeleteTask }) {
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
    active.forEach((t) => {
      if (t.planDate) {
        if (!map[t.planDate]) map[t.planDate] = { plan: [], deadline: [] };
        map[t.planDate].plan.push(t);
      }
      if (t.deadline) {
        if (!map[t.deadline]) map[t.deadline] = { plan: [], deadline: [] };
        map[t.deadline].deadline.push(t);
      }
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

  const selectedTasks = active
    .filter((t) => t.planDate === selectedDate || t.deadline === selectedDate)
    .sort((a, b) => a.title.localeCompare(b.title, "id"));

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setCursor(new Date(year, month - 1, 1))}
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ border: `1px solid ${COLORS.border}` }}
        >
          <ChevronLeft size={16} color={COLORS.ink} />
        </button>
        <div className="capitalize" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 16, color: COLORS.ink }}>
          {monthLabel}
        </div>
        <button
          onClick={() => setCursor(new Date(year, month + 1, 1))}
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ border: `1px solid ${COLORS.border}` }}
        >
          <ChevronRight size={16} color={COLORS.ink} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((d) => (
          <div key={d} className="text-center text-[10px] font-medium" style={{ color: COLORS.inkSoft }}>
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 mb-4">
        {cells.map((c, i) => {
          const info = dateMap[c.dateStr];
          const isToday = c.dateStr === todayStr;
          const isSelected = c.dateStr === selectedDate;
          const deadlineColor =
            info && info.deadline.length > 0
              ? info.deadline.some((t) => taskUrgency(t, dueThreshold) === "overdue")
                ? COLORS.out
                : COLORS.low
              : null;
          return (
            <button
              key={i}
              onClick={() => c.inMonth && setSelectedDate(c.dateStr)}
              disabled={!c.inMonth}
              className="aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 text-xs"
              style={{
                background: isSelected ? COLORS.primary : "transparent",
                color: !c.inMonth ? COLORS.border : isSelected ? "#fff" : COLORS.ink,
                border: isToday && !isSelected ? `1.5px solid ${COLORS.primary}` : "1px solid transparent",
              }}
            >
              <span>{c.dayNum}</span>
              {info && c.inMonth && (
                <span className="flex gap-0.5">
                  {info.plan.length > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: isSelected ? "#fff" : COLORS.safe }} />
                  )}
                  {deadlineColor && (
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: isSelected ? "#fff" : deadlineColor }} />
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3 mb-3 text-xs" style={{ color: COLORS.inkSoft }}>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: COLORS.safe }} /> Rencana
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: COLORS.low }} /> Deadline
        </span>
      </div>

      <div className="text-xs font-medium mb-2" style={{ color: COLORS.inkSoft }}>
        {fmtDate(selectedDate)}
      </div>
      {selectedTasks.length === 0 ? (
        <div
          className="py-8 text-center rounded-2xl"
          style={{ background: COLORS.card, border: `1px dashed ${COLORS.border}`, color: COLORS.inkSoft }}
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
        </div>
      )}
    </div>
  );
}

function TaskRow({ task, threshold, onToggle, onEdit, onDelete, highlighted }) {
  const urgency = taskUrgency(task, threshold);
  const meta = URGENCY_META[urgency];
  return (
    <div
      id={`agenda-item-${task.id}`}
      className={`rounded-2xl p-3.5 ${highlighted ? "highlight-blink" : ""}`}
      style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={onToggle}
          className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: task.done ? COLORS.safe : "transparent", border: `1.5px solid ${task.done ? COLORS.safe : COLORS.border}` }}
        >
          {task.done && <Check size={14} color="#fff" />}
        </button>
        <div className="min-w-0 flex-1">
          <div
            className="font-semibold text-base truncate"
            style={{
              color: task.done ? COLORS.inkSoft : COLORS.ink,
              textDecoration: task.done ? "line-through" : "none",
              fontFamily: "'Fraunces', serif",
            }}
          >
            {task.title}
          </div>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {!task.done && (urgency === "overdue" || urgency === "soon") && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: meta.bg, color: meta.fg }}>
                {deadlineLabel(task)}
              </span>
            )}
            {task.recurrence && (
              <span className="text-xs flex items-center gap-1" style={{ color: COLORS.inkSoft }}>
                <Repeat size={11} /> Tiap {task.recurrence.every} {task.recurrence.unit === "bulan" ? "Bulan" : "Minggu"}
              </span>
            )}
          </div>
          {task.planDate && (
            <div className="text-xs mt-1.5" style={{ color: COLORS.inkSoft }}>
              Rencana: {fmtDate(task.planDate)}
            </div>
          )}
          {task.deadline && (
            <div className="text-xs mt-0.5" style={{ color: COLORS.inkSoft }}>
              Deadline: {fmtDate(task.deadline)}
            </div>
          )}
          {task.notes && (
            <div className="text-xs mt-1.5 italic" style={{ color: COLORS.inkSoft }}>
              {task.notes}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-end justify-between mt-3 pt-3" style={{ borderTop: `1px solid ${COLORS.border}` }}>
        <div className="flex items-start gap-1.5 min-w-0">
          <Clock size={12} color={task.done ? COLORS.safe : COLORS.inkSoft} className="mt-0.5 shrink-0" />
          <div className="text-xs leading-tight" style={{ color: task.done ? COLORS.safe : COLORS.inkSoft }}>
            <div>{task.done ? "Selesai" : "Dibuat"}</div>
            <div className="truncate">
              {task.done ? `${task.doneBy || "?"} \u00b7 ${fmtDateTime(task.doneAt)}` : `${task.createdBy || "?"} \u00b7 ${fmtDateTime(task.createdAt)}`}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={onEdit} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ border: `1px solid ${COLORS.border}` }} title="Edit">
            <Pencil size={13} color={COLORS.ink} />
          </button>
          <button
            onClick={onDelete}
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ border: `1px solid ${COLORS.out}55` }}
            title="Hapus"
          >
            <Trash2 size={13} color={COLORS.out} />
          </button>
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
        <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 20, color: COLORS.primary }}>
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
      <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 20, color: COLORS.primary }} className="mb-1">
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

function Overlay({ children, onClose }) {
  return (
    <div className="fixed inset-0 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" style={{ background: "rgba(43,42,37,0.45)" }} onClick={onClose}>
      <div
        className="w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl p-5 overflow-y-auto"
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

function HistoryPanel({ history, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: "rgba(43,42,37,0.45)" }} onClick={onClose}>
      <div className="w-full sm:max-w-sm h-full overflow-y-auto p-5" style={{ background: COLORS.bg, paddingTop: "calc(env(safe-area-inset-top) + 1.25rem)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ClipboardList size={18} color={COLORS.primary} />
            <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 19, color: COLORS.primary }}>Riwayat</div>
          </div>
          <button onClick={onClose}>
            <X size={18} color={COLORS.inkSoft} />
          </button>
        </div>

        {history.length === 0 ? (
          <div className="text-sm text-center py-10" style={{ color: COLORS.inkSoft }}>
            Belum ada riwayat perubahan.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {history.map((h) => (
              <div key={h.id} className="rounded-xl p-3" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
                <div className="text-sm font-medium" style={{ color: COLORS.ink }}>
                  {h.itemName}
                </div>
                <div className="text-xs mt-0.5" style={{ color: COLORS.inkSoft, fontFamily: "'IBM Plex Mono', monospace" }}>
                  {h.action === "add" && h.newLevel && `+ ditambahkan (${LEVEL_LABEL[h.newLevel] || h.newLevel})`}
                  {h.action === "add" && !h.newLevel && `+ ditambahkan (${h.newQty} ${h.unit})`}
                  {h.action === "update" && h.newLevel && `${LEVEL_LABEL[h.oldLevel] || h.oldLevel} \u2192 ${LEVEL_LABEL[h.newLevel] || h.newLevel}`}
                  {h.action === "update" && !h.newLevel && `${h.oldQty} \u2192 ${h.newQty} ${h.unit}`}
                  {h.action === "delete" && `dihapus (terakhir ${h.oldQty} ${h.unit})`}
                </div>
                <div className="text-xs mt-1" style={{ color: COLORS.inkSoft }}>
                  {h.user || "?"} &middot; {fmtDateTime(h.timestamp)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
