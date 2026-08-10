"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

/**
 * The pipeline, as sculpture.
 *
 * A job hunt is a funnel — many saved, a handful screening, one offer — and
 * that shape is the truest thing about the product, so it is the hero rather
 * than a stock abstract. Cards are stacked in white-on-white with soft
 * shadows, so it reads as an object rather than a screenshot of the board.
 *
 * Every few seconds, one real card actually transfers to a different column:
 * it's removed from its old column's list (which closes the gap, so the
 * cards below it slide up) and appended to the bottom of the new column's
 * list (which pushes nothing — it just lands at the end). This is a one-way
 * move, not a swap, so the source column visibly loses a card rather than
 * being instantly backfilled by something arriving from elsewhere.
 */
const COLUMNS: { label: string }[] = [
  { label: "Saved" },
  { label: "Screening" },
  { label: "Offer" },
];

// Soft cap so a long-running loop can't pile every card into one column and
// leave the others empty-looking for too long.
const MAX_PER_COLUMN = 4;

type Card = { id: number; col: number; movedAt: number };

const INITIAL_CARDS: Card[] = [
  { id: 0, col: 0, movedAt: 0 }, { id: 1, col: 0, movedAt: 1 }, { id: 2, col: 0, movedAt: 2 },
  { id: 3, col: 1, movedAt: 3 }, { id: 4, col: 1, movedAt: 4 },
  { id: 5, col: 2, movedAt: 5 },
];

const EASE = [0.22, 1, 0.36, 1] as const;

export function AuthHero() {
  const prefersReducedMotion = useReducedMotion();
  const [cards, setCards] = useState<Card[]>(INITIAL_CARDS);

  useEffect(() => {
    if (prefersReducedMotion) return; // one static arrangement, no shuffling
    const id = setInterval(() => {
      setCards((prev) => {
        const counts = [0, 0, 0];
        for (const c of prev) counts[c.col] += 1;

        const from = Math.floor(Math.random() * prev.length);
        const candidates = [0, 1, 2].filter(
          (col) => col !== prev[from].col && counts[col] < MAX_PER_COLUMN,
        );
        if (candidates.length === 0) return prev; // fully capped this tick, skip
        const to = candidates[Math.floor(Math.random() * candidates.length)];

        return prev.map((c, i) => (i === from ? { ...c, col: to, movedAt: Date.now() } : c));
      });
    }, 2800);
    return () => clearInterval(id);
  }, [prefersReducedMotion]);

  // Row = a card's position within its own column, newest arrival last —
  // recomputed every render from `col`/`movedAt`, never stored directly.
  const rows = [0, 0, 0];
  const placed = [...cards]
    .sort((a, b) => a.movedAt - b.movedAt)
    .map((c) => ({ ...c, row: rows[c.col]++ }));

  return (
    <aside
      aria-label="About JobTrackr"
      className="relative hidden overflow-hidden rounded-[20px] bg-gradient-to-br from-[#f7f7f7] via-[#fbfbfb] to-[#efefef] lg:flex lg:flex-col"
    >
      {/* Soft light pooling behind the sculpture, so the panel has a centre. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-white/70 blur-3xl"
      />

      {/* No CTA up here on purpose: the form column already carries the demo
          link, and it is the one that survives to mobile. Two of the same
          button on one screen is worse than a quieter panel. */}
      <div className="relative flex flex-1 items-center justify-center px-10 pt-14">
        <div
          className="grid gap-x-9 gap-y-3 xl:gap-x-14"
          style={{ gridTemplateColumns: "repeat(3, 8rem)", gridTemplateRows: `auto repeat(${MAX_PER_COLUMN}, 3rem)` }}
        >
          {COLUMNS.map((c, col) => (
            <span
              key={c.label}
              style={{ gridColumn: col + 1, gridRow: 1 }}
              className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3"
            >
              {c.label}
            </span>
          ))}

          {placed.map(({ id, col, row }) => (
            <motion.div
              key={id}
              layout
              initial={{ opacity: 0, y: 14, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={prefersReducedMotion
                ? { duration: 0 }
                : { layout: { duration: 0.6, ease: EASE }, default: { duration: 0.5, ease: EASE } }}
              style={{ gridColumn: col + 1, gridRow: row + 2 }}
              className="h-12 w-32 rounded-xl border border-white/70 bg-white shadow-[0_10px_24px_-12px_rgba(26,26,26,0.28)]"
            >
              {/* Two hairlines stand in for a company and a role — enough to
                  read as a card without pretending to be real data. */}
              <span className="mt-4 ml-3 block h-1 w-14 rounded-full bg-ink/15" />
              <span className="mt-1.5 ml-3 block h-1 w-8 rounded-full bg-ink/[0.08]" />
            </motion.div>
          ))}
        </div>
      </div>

      <div className="relative px-10 pb-12 pt-10">
        <p className="max-w-md text-[28px] font-bold leading-[1.15] tracking-tight text-ink xl:text-[34px]">
          Every application, from saved to signed.
        </p>
        <p className="mt-4 max-w-md border-l-2 border-ink/15 pl-4 text-base leading-relaxed text-ink-2">
          See where each role stands, which ones have gone quiet, and what needs
          chasing — without digging back through your inbox.
        </p>
      </div>
    </aside>
  );
}
