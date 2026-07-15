"use client";

import { forwardRef, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";

/** A native <select> with a custom chevron. Browsers each render the native
 *  dropdown arrow differently and jam it against the right edge; this
 *  normalises the look and guarantees the arrow has breathing room.
 *
 *  `className` styles the select box exactly as before. The right padding is
 *  set inline so it always wins over any `px-*` in `className`, leaving room
 *  for the chevron without the caller having to know it's there. */
export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & { wrapperClassName?: string }
>(function Select({ className = "", wrapperClassName = "", style, children, ...props }, ref) {
  return (
    <div className={`relative ${wrapperClassName}`}>
      <select
        ref={ref}
        {...props}
        style={{ paddingRight: "2rem", ...style }}
        className={`w-full appearance-none ${className}`}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3"
        aria-hidden
      />
    </div>
  );
});
