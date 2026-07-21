"use client";

import { useEffect, useState } from "react";
import { getCvThumb } from "@/lib/repo";
import { MiniMock } from "./MiniMock";
import type { TemplateId } from "@/cv/types";

/**
 * Library-card thumbnail. Reads the cached page-1 raster from `cvthumbs`
 * once on mount and shows it as an <img>. Falls back to the MiniMock
 * wireframe when no thumbnail exists yet (new/never-opened CVs, or a CV
 * whose render was interrupted before its first thumbnail was written).
 *
 * Never imports react-pdf or pdfjs — the library page stays light.
 */
export function CvThumb({
  cvId, templateId, accent, className = "",
}: { cvId: string; templateId: TemplateId; accent: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    getCvThumb(cvId)
      .then((row) => {
        if (cancelled || !row) return;
        objectUrl = URL.createObjectURL(row.blob);
        setUrl(objectUrl);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [cvId]);

  if (!url) {
    return <MiniMock templateId={templateId} accent={accent} className={className} />;
  }

  return (
    <img
      src={url}
      alt=""
      className={`aspect-[1/1.414] w-full rounded-lg border border-line-2 bg-white object-cover object-top ${className}`}
    />
  );
}
