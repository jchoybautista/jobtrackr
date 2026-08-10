import { ShieldCheck, Info } from "lucide-react";
import type { TemplateId } from "@/cv/types";

/** Pure-CSS thumbnail of each template — never imports react-pdf. */
export function MiniMock({
  templateId, accent, className = "",
}: { templateId: TemplateId; accent: string; className?: string }) {
  return (
    <div
      aria-hidden
      className={`aspect-[1/1.414] overflow-hidden rounded-lg border border-line-2 bg-white p-2.5 ${className}`}
    >
      {templateId === "classic" && (
        <div className="flex h-full flex-col gap-[3px]">
          <div className="mb-1 h-1.5 w-1/2 rounded-full bg-ink/60" />
          <div className="mb-1.5 h-1 w-1/3 rounded-full bg-line" />
          {[..."abcdefgh"].map((k, i) => (
            <div key={k} className="h-1 rounded-full bg-line" style={{ width: `${[92, 78, 96, 70, 88, 60, 90, 74][i]}%` }} />
          ))}
        </div>
      )}

      {templateId === "modern" && (
        <div className="flex h-full gap-1.5">
          <div className="flex w-1/3 flex-col gap-1">
            <div className="h-8 w-full rounded" style={{ backgroundColor: accent }} />
            {[..."abcd"].map((k) => <div key={k} className="h-1 w-full rounded-full bg-line" />)}
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <div className="mb-0.5 h-1.5 w-3/4 rounded-full bg-ink/60" />
            {[..."abcdef"].map((k, i) => (
              <div key={k} className="h-1 rounded-full bg-line" style={{ width: `${[95, 80, 90, 72, 88, 66][i]}%` }} />
            ))}
          </div>
        </div>
      )}

      {templateId === "elegant" && (
        <div className="flex h-full flex-col items-center gap-1.5 pt-1">
          <div className="font-serif text-lg font-semibold leading-none text-ink/70">Aa</div>
          <div className="h-px w-2/3" style={{ backgroundColor: accent }} />
          {[..."abcde"].map((k, i) => (
            <div key={k} className="h-1 rounded-full bg-line" style={{ width: `${[60, 80, 70, 84, 64][i]}%` }} />
          ))}
        </div>
      )}
    </div>
  );
}

/** ATS parse-safety badge — icon + text (never color alone). */
export function AtsBadge({ atsSafe }: { atsSafe: boolean }) {
  return atsSafe ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-success-bg px-2 py-0.5 text-[10px] font-bold text-success">
      <ShieldCheck className="h-3 w-3" aria-hidden /> ATS-safe
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-warn-bg px-2 py-0.5 text-[10px] font-bold text-warn">
      <Info className="h-3 w-3" aria-hidden /> Stylized
    </span>
  );
}
