"use client";

import { Component, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { Loader2, RotateCw } from "lucide-react";
import { renderCvBlob } from "@/cv/pdf";
import { generateCvThumb } from "@/cv/thumbnail";
import { Button } from "@/components/ui/Button";
import type { CvDoc } from "@/cv/types";

/**
 * Catches render-time failures from the PDF preview (react-pdf can throw on
 * malformed content) so the editor never white-screens. Remounted via `key`
 * on retry, which resets both the boundary and the inner render pipeline.
 */
class PreviewErrorBoundary extends Component<
  { children: ReactNode; onRetry: () => void },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-line-2 bg-surface p-8 text-center">
          <p className="max-w-xs text-sm font-semibold text-ink-2">
            Preview failed to render — your data is safe.
          </p>
          <Button variant="secondary" size="sm" onClick={this.props.onRetry}>
            <RotateCw className="h-3.5 w-3.5" aria-hidden /> Retry
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

function PreviewInner({
  cv, photoUrl, profileUpdatedAt,
}: { cv: CvDoc; photoUrl?: string; profileUpdatedAt?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [, startTransition] = useTransition();

  // Object-URL lifecycle. Chrome's PDF plugin fetches a blob: URL asynchronously
  // (and re-fetches it once more after the iframe navigates), so revoking a URL
  // whose fetch is still in flight logs `blob: ERR_FILE_NOT_FOUND`. Rules:
  //  - the live URL is never revoked while it is on screen;
  //  - a superseded URL is revoked only once we've seen it finish loading at
  //    least once (its own `onLoad` fired) — by then the plugin has read the
  //    blob and a revoke cannot race a live fetch;
  //  - a URL superseded *before* it ever loaded (e.g. the first render is
  //    replaced almost instantly on mount) is held until unmount, when the
  //    iframe is gone and nothing can request it.
  // Net: no in-flight fetch is ever revoked (no 404) and every URL is freed.
  const liveUrl = useRef<string | null>(null);
  const staleUrls = useRef<string[]>([]);
  const loadedUrls = useRef<Set<string>>(new Set());

  // Debounced (500ms) regeneration: every cv/photo change resets the timer so
  // rapid typing coalesces into a single render. useTransition keeps the URL
  // swap non-urgent so keystrokes stay responsive.
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      setRendering(true);
      renderCvBlob(cv, photoUrl)
        .then((blob) => {
          if (cancelled) return; // superseded before commit — blob is GC'd, never URL'd
          const next = URL.createObjectURL(blob);
          if (liveUrl.current) staleUrls.current.push(liveUrl.current);
          liveUrl.current = next;
          startTransition(() => setUrl(next));
          // Best-effort cache; never awaited, never throws. The stamp takes the
          // later of the CV and the profile revisions: swapping the profile photo
          // changes the rendered page without touching `cv.updatedAt`, so keying
          // on the CV alone would leave a stale thumbnail. Erring toward a newer
          // stamp only costs a redundant render; erring older ships a wrong image.
          const stamp =
            profileUpdatedAt && profileUpdatedAt > cv.updatedAt
              ? profileUpdatedAt
              : cv.updatedAt;
          void generateCvThumb(cv.id, blob, stamp);
        })
        .catch((e) => {
          if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
        })
        .finally(() => {
          if (!cancelled) setRendering(false);
        });
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [cv, photoUrl, profileUpdatedAt]);

  // Revoke any remaining URLs on unmount — no leak.
  useEffect(() => {
    return () => {
      staleUrls.current.forEach((u) => URL.revokeObjectURL(u));
      staleUrls.current = [];
      if (liveUrl.current) URL.revokeObjectURL(liveUrl.current);
      liveUrl.current = null;
    };
  }, []);

  // The iframe finished loading its current src. Record it as loaded, then
  // revoke any superseded URL that has itself already loaded (safe to free);
  // keep never-loaded superseded URLs until unmount so we never revoke one whose
  // fetch may still be in flight.
  const handleIframeLoad = () => {
    if (liveUrl.current) loadedUrls.current.add(liveUrl.current);
    staleUrls.current = staleUrls.current.filter((u) => {
      if (!loadedUrls.current.has(u)) return true;
      URL.revokeObjectURL(u);
      loadedUrls.current.delete(u);
      return false;
    });
  };

  // Route async render failures through the error boundary.
  if (error) throw error;

  return (
    <div className="relative h-full w-full">
      {url ? (
        <iframe
          title="CV preview (PDF)"
          src={url}
          onLoad={handleIframeLoad}
          className="h-full w-full rounded-2xl border border-line-2 bg-white"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-2xl border border-line-2 bg-white">
          <span className="inline-flex items-center gap-2 text-sm font-medium text-ink-3">
            <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden />
            Rendering…
          </span>
        </div>
      )}

      {/* Subtle "regenerating" overlay — only once a preview already exists. */}
      {url && rendering && (
        <div
          aria-live="polite"
          className="pointer-events-none absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-line-2 bg-surface/90 px-3 py-1.5 text-xs font-semibold text-ink-2 shadow-sm backdrop-blur"
        >
          <Loader2 className="h-3.5 w-3.5 motion-safe:animate-spin" aria-hidden />
          Rendering…
        </div>
      )}
    </div>
  );
}

export function CvPreview({
  cv, photoUrl, profileUpdatedAt,
}: { cv: CvDoc; photoUrl?: string; profileUpdatedAt?: string }) {
  const [nonce, setNonce] = useState(0);
  return (
    <PreviewErrorBoundary key={nonce} onRetry={() => setNonce((n) => n + 1)}>
      <PreviewInner cv={cv} photoUrl={photoUrl} profileUpdatedAt={profileUpdatedAt} />
    </PreviewErrorBoundary>
  );
}
