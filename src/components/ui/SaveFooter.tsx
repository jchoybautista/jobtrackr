"use client";

import { Button } from "@/components/ui/Button";

/** The one save affordance in the app. Always rendered — its presence when
 *  clean is what teaches the user that edits need saving. Both buttons are
 *  disabled while clean: an enabled Cancel with nothing to revert reads as
 *  "close", which is the ambiguity this component exists to remove. */
export function SaveFooter({ dirty, onSave, onCancel, className = "" }: {
  dirty: boolean;
  onSave: () => void;
  onCancel: () => void;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between gap-3 border-t border-line-2 bg-surface px-6 py-3 ${className}`}>
      <p role="status" aria-live="polite"
        className={`text-sm font-semibold ${dirty ? "text-ink" : "text-ink-3"}`}>
        {dirty ? "● Unsaved changes" : "No changes"}
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <Button variant="secondary" size="sm" disabled={!dirty} onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" disabled={!dirty} onClick={onSave}>
          Save changes
        </Button>
      </div>
    </div>
  );
}
