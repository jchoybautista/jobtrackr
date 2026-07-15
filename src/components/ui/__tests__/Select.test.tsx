import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Select } from "@/components/ui/Select";

describe("Select", () => {
  it("renders options and forwards change events", () => {
    const onChange = vi.fn();
    render(
      <>
        <label htmlFor="s">Stage</label>
        <Select id="s" value="a" onChange={onChange}>
          <option value="a">A</option>
          <option value="b">B</option>
        </Select>
      </>,
    );
    const select = screen.getByLabelText("Stage") as HTMLSelectElement;
    expect(select.value).toBe("a");
    fireEvent.change(select, { target: { value: "b" } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("suppresses the native arrow and reserves room for the custom chevron", () => {
    render(
      <>
        <label htmlFor="s2">Mode</label>
        <Select id="s2" value="" onChange={() => {}}><option value="">—</option></Select>
      </>,
    );
    const select = screen.getByLabelText("Mode");
    // appearance-none removes the OS arrow; inline padding-right leaves room.
    expect(select.className).toContain("appearance-none");
    expect((select as HTMLSelectElement).style.paddingRight).toBe("2rem");
  });
});
