import React from "react";
import { Plus } from "lucide-react";

// Navigasi bawah berbentuk kapsul melayang — satu komponen untuk Stok Rumah,
// Kas Rumah, dan Agenda Rumah (dulu disalin tiga kali). Tab aktif ditandai
// kapsul putih berisi ikon dan namanya, sisanya cuma ikon. Tombol tambah
// menyatu di ujung kanan.
//
// tabs: [{ key, label, icon }]
export function BottomNav({ tabs, active, onChange, onAdd, showAdd = true, color, accent, shadowRgb = "38,49,77", addTitle = "Tambah" }) {
  return (
    <div
      className="fixed left-0 right-0 z-40 flex justify-center px-4 pointer-events-none"
      style={{ bottom: "max(16px, env(safe-area-inset-bottom))" }}
    >
      <nav
        className="flex items-center gap-1.5 pointer-events-auto"
        style={{ background: color, borderRadius: 28, padding: 8, boxShadow: `0 10px 24px rgba(${shadowRgb},0.30)` }}
      >
        {tabs.map((t) => {
          const Icon = t.icon;
          if (t.key === active) {
            return (
              <div
                key={t.key}
                className="flex items-center gap-2"
                style={{ background: "#fff", borderRadius: 22, padding: "10px 16px", color }}
                aria-current="page"
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
              onClick={() => onChange(t.key)}
              className="flex items-center justify-center"
              style={{ width: 44, height: 42 }}
              title={t.label}
            >
              <Icon size={20} color="rgba(255,255,255,0.8)" />
            </button>
          );
        })}

        {showAdd && onAdd && (
          <button
            onClick={onAdd}
            className="flex items-center justify-center shrink-0"
            style={{ width: 42, height: 42, borderRadius: 999, background: accent, color: "#fff" }}
            title={addTitle}
          >
            <Plus size={22} />
          </button>
        )}
      </nav>
    </div>
  );
}
