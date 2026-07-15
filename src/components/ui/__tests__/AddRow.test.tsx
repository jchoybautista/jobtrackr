import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AddRow } from "@/components/ui/AddRow";

describe("AddRow", () => {
  it("submits with a visibly labeled button", () => {
    const onSubmit = vi.fn();
    render(
      <AddRow label="Add note" onSubmit={onSubmit}>
        <input aria-label="Note" />
      </AddRow>,
    );
    const button = screen.getByRole("button", { name: /add note/i });
    expect(button.textContent).toMatch(/add note/i);
    fireEvent.click(button);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("does not reload the page on submit", () => {
    const onSubmit = vi.fn();
    render(<AddRow label="Add tag" onSubmit={onSubmit}><input aria-label="Tag" /></AddRow>);
    const form = screen.getByRole("button", { name: /add tag/i }).closest("form")!;
    const event = new Event("submit", { bubbles: true, cancelable: true });
    form.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });
});
