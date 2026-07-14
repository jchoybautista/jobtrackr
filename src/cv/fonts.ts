import { Font } from "@react-pdf/renderer";

let registered = false;

export function registerCvFonts(base: string = "/fonts"): void {
  if (registered) return;
  registered = true;
  // NOTE: On the client, @react-pdf resolves each font `src` with fetch() during
  // rendering and logs a benign `TypeError: Failed to fetch` warning the first
  // time a family is resolved, even though the request itself succeeds (the
  // /fonts/*.ttf files return 200/304 and the PDF renders with the correct
  // fonts). This is pre-existing @react-pdf/font behaviour — not a broken URL —
  // and there is no clean, low-risk way to silence just that internal warning
  // (an absolute same-origin URL does not change it). It is harmless; do NOT
  // patch it by suppressing console output globally.
  Font.register({
    family: "Jakarta",
    fonts: [
      { src: `${base}/PlusJakartaSans-Regular.ttf` },
      { src: `${base}/PlusJakartaSans-Bold.ttf`, fontWeight: 700 },
      { src: `${base}/PlusJakartaSans-Italic.ttf`, fontStyle: "italic" },
    ],
  });
  Font.register({
    family: "Lora",
    fonts: [
      { src: `${base}/Lora-Regular.ttf` },
      { src: `${base}/Lora-Bold.ttf`, fontWeight: 700 },
    ],
  });
  Font.registerHyphenationCallback((word) => [word]); // no mid-word breaks in CVs
}
