import { X } from "lucide-react";

export function TagPill({ name, onRemove }: { name: string; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-0.5 text-xs font-semibold text-ink-2">
      {name}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove tag ${name}`}
          className="-mr-1 rounded-full p-0.5 hover:bg-sunken"
        >
          <X className="h-3 w-3" aria-hidden />
        </button>
      )}
    </span>
  );
}
