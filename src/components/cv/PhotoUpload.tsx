"use client";

import { useEffect, useId, useMemo, useRef } from "react";
import { UserRound, Upload, X } from "lucide-react";
import { useApp } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

export function PhotoUpload() {
  const photo = useApp((s) => s.profile?.photo);
  const setProfilePhoto = useApp((s) => s.setProfilePhoto);
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  // Derive a preview object URL from the stored Blob; revoke on change/unmount.
  const previewUrl = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);
  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset the input so re-selecting the same file still fires onChange.
    e.target.value = "";
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      toast("Photo must be a JPG, PNG, or WebP image", "error");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast("Photo must be 2 MB or smaller", "error");
      return;
    }
    void setProfilePhoto(file);
  }

  return (
    <div className="flex items-center gap-4">
      <div
        className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-sunken"
        aria-hidden={!previewUrl}
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="Profile photo preview" className="h-full w-full object-cover" />
        ) : (
          <UserRound className="h-8 w-8 text-ink-3" aria-hidden />
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-xs font-semibold text-ink-2">
          Profile photo
        </label>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFile}
            className="sr-only"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="h-3.5 w-3.5" aria-hidden /> {previewUrl ? "Replace" : "Upload"}
          </Button>
          {previewUrl && (
            <Button type="button" variant="ghost" size="sm" onClick={() => void setProfilePhoto(undefined)}>
              <X className="h-3.5 w-3.5" aria-hidden /> Remove
            </Button>
          )}
        </div>
        <p className="text-xs text-ink-3">JPG, PNG, or WebP · up to 2 MB</p>
      </div>
    </div>
  );
}
