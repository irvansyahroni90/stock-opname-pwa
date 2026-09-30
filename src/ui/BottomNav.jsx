import React from "react";
import { motion, AnimatePresence, LayoutGroup } from "motion/react";
import { Plus } from "lucide-react";
import { SPRING, DUR } from "./motion";

// Navigasi bawah berbentuk kapsul melayang — satu komponen untuk Stok Rumah,
// Kas Rumah, dan Agenda Rumah.
//
// Kapsul putih penanda tab aktif MELUNCUR ke tab tujuan (bukan loncat), tab
// melebar/menyempit dengan halus, dan tombol + menyelinap masuk/keluar.
//
// tabs: [{ key, label, icon }]
// id: nama unik per aplikasi, supaya kapsul tiap aplikasi tidak tertukar.
export function BottomNav({ id, tabs, active, onChange, onAdd, showAdd = true, color, accent, shadowRgb = "38,49,77", addTitle = "Tambah" }) {
  return (
    <motion.div
      className="fixed left-0 right-0 z-40 flex justify-center px-4 pointer-events-none"
      style={{ bottom: "max(16px, env(safe-area-inset-bottom))" }}
      initial={{ y: 28, opacity: 0 }}
      animate={{ y: 0, opacity: 1, transition: { ...SPRING.panel, delay: 0.14 } }}
    >
      <LayoutGroup id={id}>
        <motion.nav
          layout
          transition={SPRING.snappy}
          className="relative flex items-center gap-1.5 pointer-events-auto"
          style={{ background: color, borderRadius: 28, padding: 8, boxShadow: `0 10px 24px rgba(${shadowRgb},0.30)` }}
        >
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = t.key === active;
            return (
              <motion.button
                key={t.key}
                layout
                transition={SPRING.snappy}
                onClick={() => !isActive && onChange(t.key)}
                className="relative flex items-center justify-center"
                style={{ height: 42, minWidth: 44, padding: isActive ? "0 16px" : 0, borderRadius: 22 }}
                title={t.label}
                aria-current={isActive ? "page" : undefined}
              >
                {isActive && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0"
                    style={{ background: "#fff", borderRadius: 22 }}
                    transition={SPRING.snappy}
                  />
                )}
                <motion.span
                  layout="position"
                  className="relative flex items-center gap-2"
                  initial={false}
                  animate={{ color: isActive ? color : "rgba(255,255,255,0.8)" }}
                  transition={{ duration: DUR.fast }}
                >
                  <Icon size={20} />
                  {isActive && (
                    <motion.span
                      className="font-semibold"
                      style={{ fontSize: 13, whiteSpace: "nowrap" }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1, transition: { delay: 0.08, duration: DUR.fast } }}
                    >
                      {t.label}
                    </motion.span>
                  )}
                </motion.span>
              </motion.button>
            );
          })}

          <AnimatePresence initial={false} mode="popLayout">
            {showAdd && onAdd && (
              <motion.button
                key="add"
                layout
                onClick={onAdd}
                className="flex items-center justify-center shrink-0"
                style={{ width: 42, height: 42, borderRadius: 999, background: accent, color: "#fff" }}
                title={addTitle}
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1, transition: SPRING.snappy }}
                exit={{ scale: 0.4, opacity: 0, transition: { duration: DUR.micro } }}
              >
                <Plus size={22} />
              </motion.button>
            )}
          </AnimatePresence>
        </motion.nav>
      </LayoutGroup>
    </motion.div>
  );
}
