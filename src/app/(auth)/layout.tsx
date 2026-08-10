import { AuthHero } from "@/components/auth/AuthHero";

/**
 * Two columns inside a floating frame: the form on the left, the pipeline on
 * the right. The frame's inset border is what keeps the whole thing reading as
 * one object rather than a form dropped onto a background.
 *
 * The hero is decorative and marketing copy, so it drops away entirely below
 * lg — nothing in it is needed to sign in, and the demo link it carries also
 * lives at the bottom of the sign-in form.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* The background is its own fixed layer rather than a class on <main>.
          Painted on the element, any document wider than the viewport — or any
          overscroll — reveals the near-white <body> behind it as a band down
          one edge. Fixed to the viewport, there is nothing to out-run. */}
      <div
        aria-hidden
        className="fixed inset-0 -z-10 bg-gradient-to-br from-[#eeeeee] via-[#f4f4f4] to-[#e8e8e8]"
      />

      <main id="main" className="flex min-h-dvh items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-5xl rounded-[28px] bg-white/45 p-2 shadow-[0_30px_80px_-40px_rgba(26,26,26,0.35)] sm:p-3 xl:max-w-6xl 2xl:max-w-7xl">
          <div className="grid gap-3 rounded-[22px] bg-surface p-3 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <div className="flex items-center justify-center px-2 py-10 sm:px-8">
              {children}
            </div>
            <AuthHero />
          </div>
        </div>
      </main>
    </>
  );
}
