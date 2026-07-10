import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "sm";

const styles: Record<Variant, string> = {
  primary: "bg-ink text-white hover:opacity-85",
  secondary: "bg-surface text-ink border border-line hover:bg-sunken",
  ghost: "bg-transparent text-ink-2 hover:bg-sunken",
  danger: "bg-danger-bg text-danger hover:opacity-85",
};
const sizes: Record<Size, string> = {
  md: "text-sm font-semibold px-5 h-10",
  sm: "text-xs font-semibold px-3.5 h-8",
};

export const Button = forwardRef<HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }
>(function Button({ variant = "primary", size = "md", className = "", ...props }, ref) {
  return (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full transition-all duration-150 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none cursor-pointer ${styles[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  );
});
