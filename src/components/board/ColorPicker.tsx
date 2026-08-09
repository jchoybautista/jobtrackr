"use client";

import { useEffect, useRef, type RefObject } from "react";
import { PALETTE, PALETTE_KEYS } from "@/lib/palette";
import type { PaletteKey } from "@/lib/types";

export function ColorPicker({
  value, onChange, onClose, excludeRef,
}: {
  value: PaletteKey;
  onChange: (c: PaletteKey) => void;
  onClose: () => void;
  /** Element (e.g. the trigger button) whose clicks should not count as outside clicks. */
  excludeRef?: RefObject<HTMLElement | null>;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (excludeRef?.current?.contains(target)) return;
      if (ref.current && !ref.current.contains(target)) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [onClose, excludeRef]);

  return (
    <div
      ref={ref}
      role="group"
      aria-label="Column color"
      className="absolute left-0 top-7 z-30 w-44 rounded-2xl border border-line-2 bg-surface p-3 shadow-xl"
    >
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-3">Column color</p>
      <div className="grid grid-cols-5 gap-2">
        {PALETTE_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            aria-label={PALETTE[key].name}
            aria-pressed={key === value}
            onClick={() => { onChange(key); onClose(); }}
            className={`h-6 w-6 rounded-full transition-transform hover:scale-110 ${
              key === value ? "ring-2 ring-ink ring-offset-2" : ""
            }`}
            style={{ background: PALETTE[key].hex }}
          />
        ))}
      </div>
    </div>
  );
}
