"use client";

import { inputClass, labelClass } from "@/components/cv/form-kit";

export function AuthField({
  id, label, type, value, onChange, error, autoComplete, required = false, autoFocus = false,
}: {
  id: string;
  label: string;
  type: "email" | "password" | "text";
  value: string;
  onChange: (value: string) => void;
  error?: string;
  autoComplete: string;
  required?: boolean;
  autoFocus?: boolean;
}) {
  const errorId = `${id}-error`;
  return (
    <div className="mb-4">
      <label htmlFor={id} className={labelClass}>{label}</label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        aria-required={required ? true : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass} h-11 ${error ? "border-danger" : ""}`}
      />
      {error && (
        <p id={errorId} className="mt-1.5 text-sm font-medium text-danger">{error}</p>
      )}
    </div>
  );
}
