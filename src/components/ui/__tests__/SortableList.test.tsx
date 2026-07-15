import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SortableList } from "@/components/ui/SortableList";

const items = [{ id: "a", name: "Saved" }, { id: "b", name: "Applied" }];

const renderList = () =>
  render(
    <SortableList
      items={items}
      getId={(i) => i.id}
      getLabel={(i) => i.name}
      onReorder={vi.fn()}
    >
      {(item, handle) => <li>{handle}<span>{item.name}</span></li>}
    </SortableList>,
  );

describe("SortableList", () => {
  it("renders a keyboard-reachable drag handle per item", () => {
    renderList();
    expect(screen.getByRole("button", { name: /reorder saved/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /reorder applied/i })).toBeDefined();
  });

  it("renders every item's content", () => {
    renderList();
    expect(screen.getByText("Saved")).toBeDefined();
    expect(screen.getByText("Applied")).toBeDefined();
  });
});
