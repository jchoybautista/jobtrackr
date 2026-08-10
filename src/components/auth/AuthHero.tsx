/**
 * The pipeline, as sculpture.
 *
 * A job hunt is a funnel — many saved, a handful screening, one offer — and
 * that shape is the truest thing about the product, so it is the hero rather
 * than a stock abstract. Cards are stacked in white-on-white with soft
 * shadows and a slight rake, so it reads as an object rather than a
 * screenshot of the board.
 */

/** Column of stacked cards: `count` sets how much survives this stage. */
function Stage({ label, count, delay }: { label: string; count: number; delay: number }) {
  return (
    <li className="flex flex-col items-center gap-3">
      <div className="flex flex-col items-center gap-2">
        {Array.from({ length: count }, (_, i) => (
          <div
            key={i}
            style={{ animationDelay: `${delay + i * 70}ms` }}
            className="h-10 w-24 animate-[rise_620ms_cubic-bezier(0.22,1,0.36,1)_both] rounded-xl border border-white/70 bg-white shadow-[0_10px_24px_-12px_rgba(26,26,26,0.28)] sm:h-12 sm:w-32 motion-reduce:animate-none"
          >
            {/* Two hairlines stand in for a company and a role — enough to read
                as a card without pretending to be real data. */}
            <span className="mt-3 ml-3 block h-1 w-8 rounded-full bg-ink/15 sm:mt-4 sm:w-14" />
            <span className="mt-1.5 ml-3 block h-1 w-5 rounded-full bg-ink/[0.08] sm:w-8" />
          </div>
        ))}
      </div>
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">
        {label}
      </span>
    </li>
  );
}

export function AuthHero() {
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
        <ul className="flex items-end gap-9 xl:gap-14">
          <Stage label="Saved" count={3} delay={80} />
          <Stage label="Screening" count={2} delay={300} />
          <Stage label="Offer" count={1} delay={520} />
        </ul>
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
