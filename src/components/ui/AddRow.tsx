"use client";

import type { ReactNode } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";

/** Fields stack full-width; the submit button sits BELOW them, right-aligned.
 *  Keeping the button out of the field row is what stops inputs from being
 *  squeezed to a different width in every section. */
export function AddRow({ label, onSubmit, children }: {
  label: string;
  onSubmit: () => void;
  children: ReactNode;
}) {
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
    >
      <div className="flex flex-col gap-2 sm:grid sm:grid-cols-2 sm:gap-2">{children}</div>
      <div className="flex justify-end">
        <Button type="submit" variant="secondary" size="sm">
          <Plus className="h-3.5 w-3.5" aria-hidden /> {label}
        </Button>
      </div>
    </form>
  );
}
