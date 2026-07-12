import { pdf, renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import type { ReactElement } from "react";
import { mixWithBlack, PALETTE } from "@/lib/palette";
import { registerCvFonts } from "./fonts";
import { getTemplate } from "./templates";
import type { CvDoc } from "./types";

function element(cv: CvDoc, photoUrl?: string): ReactElement<DocumentProps> {
  const accentSoft = PALETTE[cv.accent].hex;
  return getTemplate(cv.templateId).render({
    content: cv.content,
    sections: cv.sections,
    accent: mixWithBlack(accentSoft, 0.55),
    accentSoft,
    photoUrl: cv.showPhoto ? photoUrl : undefined,
  }) as ReactElement<DocumentProps>;
}

export async function renderCvBlob(cv: CvDoc, photoUrl?: string): Promise<Blob> {
  registerCvFonts();
  return pdf(element(cv, photoUrl)).toBlob();
}

export async function renderCvBuffer(cv: CvDoc, fontBase: string, photoUrl?: string) {
  registerCvFonts(fontBase);
  return renderToBuffer(element(cv, photoUrl));
}

export async function downloadCv(cv: CvDoc, photoUrl?: string): Promise<void> {
  const blob = await renderCvBlob(cv, photoUrl);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${cv.name.trim() || "cv"}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
