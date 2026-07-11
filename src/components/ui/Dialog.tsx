"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

export function Dialog({
  open, onClose, title, children, maxWidth = "max-w-lg",
}: {
  open: boolean; onClose: () => void; title: string;
  children: React.ReactNode; maxWidth?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      // Native showModal() moves focus to the first focusable descendant — the
      // header "Close dialog" button — which defeats a child's autoFocus. Redirect
      // focus to the primary field (input/textarea/select) if the content has one.
      el.querySelector<HTMLElement>("[autofocus], input, textarea, select")?.focus();
    }
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <dialog
          ref={ref}
          aria-label={title}
          onClose={onClose}
          onClick={(e) => { if (e.target === ref.current) onClose(); }}
          className="m-auto w-[calc(100vw-32px)] rounded-2xl bg-transparent p-0 backdrop:bg-ink/30"
          style={{ maxWidth: "inherit" }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", duration: 0.35, bounce: 0.2 }}
            className={`mx-auto w-full ${maxWidth} rounded-2xl bg-surface p-6 shadow-2xl`}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold">{title}</h2>
              <button
                type="button" onClick={onClose} aria-label="Close dialog"
                className="rounded-full p-2 text-ink-3 hover:bg-sunken"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            {children}
          </motion.div>
        </dialog>
      )}
    </AnimatePresence>
  );
}
