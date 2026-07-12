import { Font } from "@react-pdf/renderer";

let registered = false;

export function registerCvFonts(base: string = "/fonts"): void {
  if (registered) return;
  registered = true;
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
