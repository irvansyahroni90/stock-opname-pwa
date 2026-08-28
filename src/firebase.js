import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

// Isi nilai-nilai ini di file .env (lihat .env.example) — JANGAN hardcode di sini.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// --- Login (khusus kamu & istri) ---------------------------------------
// Akun-akunnya dibuat manual di Firebase Console (Authentication > Users),
// BUKAN lewat app ini — jadi tidak ada tombol "daftar" di mana pun.

// Dengarkan status login (langsung dipanggil sekali saat pertama subscribe
// dengan status saat itu, lalu setiap kali login/logout berubah).
// Mengembalikan fungsi untuk berhenti mendengarkan.
export function subscribeAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

// Login pakai email + password yang sudah dibuat di Firebase Console.
export async function login(email, password) {
  await signInWithEmailAndPassword(auth, email, password);
}

export async function logout() {
  await signOut(auth);
}

// Semua perangkat yang pakai WORKSPACE_ID yang sama akan berbagi data yang sama.
// Ganti VITE_WORKSPACE_ID di .env kalau mau pisahkan beberapa toko/tim dalam
// satu project Firebase yang sama (opsional — default "default" sudah cukup
// untuk satu toko).
const WORKSPACE = import.meta.env.VITE_WORKSPACE_ID || "default";

function keyDoc(key) {
  return doc(db, "workspaces", WORKSPACE, "data", key);
}

// Ambil data sekali (dipakai kalau butuh nilai langsung, di luar listener).
export async function storageGet(key) {
  try {
    const snap = await getDoc(keyDoc(key));
    return snap.exists() ? snap.data().value : null;
  } catch (err) {
    console.error("storageGet gagal:", key, err);
    return null;
  }
}

// Simpan data ke cloud — otomatis terkirim ke semua perangkat yang sedang
// membuka app ini (lewat storageSubscribe di bawah).
export async function storageSet(key, value) {
  try {
    await setDoc(keyDoc(key), { value, updatedAt: serverTimestamp() });
    return true;
  } catch (err) {
    console.error("storageSet gagal:", key, err);
    return false;
  }
}

// Dengarkan perubahan data secara real-time. Mengembalikan fungsi untuk
// berhenti mendengarkan (panggil saat komponen unmount).
export function storageSubscribe(key, callback) {
  return onSnapshot(
    keyDoc(key),
    (snap) => callback(snap.exists() ? snap.data().value : null),
    (err) => {
      console.error("storageSubscribe gagal:", key, err);
      callback(null);
    }
  );
}
