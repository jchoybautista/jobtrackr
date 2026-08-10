import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SettingsPage } from "@/components/settings/SettingsPage";

const renameStage = vi.fn();
const removeStage = vi.fn(async () => true);

vi.mock("@/lib/store", () => ({
  useApp: () => ({
    stages: [
      { id: "s1", name: "Saved", order: 0, color: "lavender" },
      { id: "s2", name: "Applied", order: 1, color: "blush" },
    ],
    tags: [{ id: "t1", name: "Remote" }],
    settings: { nudgeDays: 7, currency: "USD" },
    renameStage, removeStage, addStage: vi.fn(), moveStage: vi.fn(), recolorStage: vi.fn(),
    renameTag: vi.fn(), addTag: vi.fn(), removeTag: vi.fn(),
    updateSettings: vi.fn(), exportJson: vi.fn(), importData: vi.fn(), resetAllData: vi.fn(),
  }),
}));

beforeEach(() => { renameStage.mockClear(); removeStage.mockClear(); });

describe("Settings pipeline", () => {
  it("reorders by drag handle, not arrow buttons", () => {
    render(<SettingsPage />);
    expect(screen.getByRole("button", { name: /reorder saved/i })).toBeDefined();
    expect(screen.queryByRole("button", { name: /move saved up/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /move saved down/i })).toBeNull();
  });

  it("does not rename on blur", () => {
    render(<SettingsPage />);
    const field = screen.getByLabelText(/saved column name/i);
    fireEvent.change(field, { target: { value: "Shortlist" } });
    fireEvent.blur(field);
    expect(renameStage).not.toHaveBeenCalled();
  });

  it("renames every changed column on one Save", () => {
    render(<SettingsPage />);
    fireEvent.change(screen.getByLabelText(/saved column name/i), { target: { value: "Shortlist" } });
    fireEvent.change(screen.getByLabelText(/applied column name/i), { target: { value: "Submitted" } });
    fireEvent.click(screen.getAllByRole("button", { name: /save changes/i })[0]);
    expect(renameStage).toHaveBeenCalledTimes(2);
    expect(renameStage).toHaveBeenCalledWith("s1", "Shortlist");
    expect(renameStage).toHaveBeenCalledWith("s2", "Submitted");
  });

  it("confirms before deleting a column", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByRole("button", { name: /delete saved column/i }));
    expect(removeStage).not.toHaveBeenCalled();
    expect(screen.getByText(/delete the .*saved.* column/i)).toBeDefined();
  });
});

describe("Settings tags and preferences", () => {
  it("gives every buffered card its own save footer", () => {
    render(<SettingsPage />);
    // Pipeline, Tags, Preferences.
    expect(screen.getAllByRole("button", { name: /save changes/i })).toHaveLength(3);
  });

  it("adds a tag with an explicitly labeled button", () => {
    render(<SettingsPage />);
    expect(screen.getByRole("button", { name: /add tag/i })).toBeDefined();
  });

  it("confirms before deleting a tag", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByRole("button", { name: /delete tag remote/i }));
    expect(screen.getByText(/delete the .*remote.* tag/i)).toBeDefined();
  });

  it("buffers preference edits behind save", () => {
    render(<SettingsPage />);
    fireEvent.change(screen.getByLabelText(/follow-up nudge after/i), { target: { value: "14" } });
    const footers = screen.getAllByRole("button", { name: /save changes/i });
    // The Preferences footer is the last one on the page.
    expect(footers[footers.length - 1].hasAttribute("disabled")).toBe(false);
  });
});
