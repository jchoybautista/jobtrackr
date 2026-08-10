"use client";

import { create } from "zustand";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, Info, AlertTriangle } from "lucide-react";

interface ToastItem { id: number; message: string; kind: "info" | "success" | "error"; }
const useToasts = create<{ items: ToastItem[] }>(() => ({ items: [] }));
let counter = 0;

export function toast(message: string, kind: ToastItem["kind"] = "info") {
  const id = ++counter;
  useToasts.setState((s) => ({ items: [...s.items, { id, message, kind }] }));
  setTimeout(() => {
    useToasts.setState((s) => ({ items: s.items.filter((t) => t.id !== id) }));
  }, 3500);
}

const icons = {
  info: <Info className="h-4 w-4" aria-hidden />,
  success: <CheckCircle2 className="h-4 w-4 text-success" aria-hidden />,
  error: <AlertTriangle className="h-4 w-4 text-danger" aria-hidden />,
};

export function Toaster() {
  const items = useToasts((s) => s.items);
  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
      <AnimatePresence>
        {items.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            className="flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2.5 text-sm font-medium shadow-lg"
          >
            {icons[t.kind]} {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
