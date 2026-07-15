import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SaveFooter } from "@/components/ui/SaveFooter";

describe("SaveFooter", () => {
  it("renders when clean, with both buttons disabled", () => {
    render(<SaveFooter dirty={false} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText(/no changes/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /save changes/i }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: /cancel/i }).hasAttribute("disabled")).toBe(true);
  });

  it("announces dirty state as text, not colour alone", () => {
    render(<SaveFooter dirty onSave={vi.fn()} onCancel={vi.fn()} />);
    const status = screen.getByRole("status");
    expect(status.textContent).toMatch(/unsaved changes/i);
  });

  it("enables both buttons when dirty and fires their handlers", () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    render(<SaveFooter dirty onSave={onSave} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
