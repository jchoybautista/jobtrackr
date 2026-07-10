import type { WorkMode } from "./types";

const SOURCE_MAP: [RegExp, string][] = [
  [/linkedin\./i, "LinkedIn"],
  [/indeed\./i, "Indeed"],
  [/jobstreet\./i, "JobStreet"],
  [/glassdoor\./i, "Glassdoor"],
  [/wellfound\.|angel\.co/i, "Wellfound"],
  [/greenhouse\.io|lever\.co|ashbyhq\.com|workable\.com/i, "Company site"],
];

export interface QuickAddParse {
  company?: string; role?: string; location?: string; workMode?: WorkMode;
  salaryMin?: number; salaryMax?: number; url?: string; source?: string; jdSnapshot?: string;
}

export function parseQuickAdd(text: string): QuickAddParse {
  const out: QuickAddParse = {};
  const trimmed = text.trim();
  if (!trimmed) return out;

  const urlMatch = trimmed.match(/https?:\/\/[^\s)>\]]+/);
  if (urlMatch) {
    out.url = urlMatch[0];
    try {
      const host = new URL(out.url).hostname;
      const hit = SOURCE_MAP.find(([re]) => re.test(host));
      if (hit) out.source = hit[1];
    } catch { /* unparseable URL — keep raw string, skip source */ }
  }

  const lines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean);
  const textLines = lines.filter((l) => !/^https?:\/\//.test(l));

  const atLine = textLines.find((l) => /\s+at\s+/i.test(l));
  if (atLine) {
    const m = atLine.match(/^(.+?)\s+at\s+(.+)$/i);
    if (m) {
      out.role = m[1].trim();
      out.company = m[2].trim().replace(/[.,;]$/, "");
    }
  }

  if (/\bremote\b/i.test(trimmed)) out.workMode = "remote";
  else if (/\bhybrid\b/i.test(trimmed)) out.workMode = "hybrid";
  else if (/\bon-?site\b/i.test(trimmed)) out.workMode = "onsite";

  // "$120k–$140k" or "$120,000 - $150,000"
  const kRange = trimmed.match(/\$?(\d{2,3})k\s*[-–—]\s*\$?(\d{2,3})k/i);
  const fullRange = trimmed.match(/\$(\d{1,3}(?:,\d{3})+)\s*[-–—]\s*\$(\d{1,3}(?:,\d{3})+)/);
  if (kRange) {
    out.salaryMin = parseInt(kRange[1], 10) * 1000;
    out.salaryMax = parseInt(kRange[2], 10) * 1000;
  } else if (fullRange) {
    out.salaryMin = parseInt(fullRange[1].replace(/,/g, ""), 10);
    out.salaryMax = parseInt(fullRange[2].replace(/,/g, ""), 10);
  }

  if (textLines.length > 1) out.jdSnapshot = trimmed;
  return out;
}
