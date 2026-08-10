import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SettingsPage } from "@/components/settings/SettingsPage";

const renameStage = vi.fn();
const removeStage = vi.fn(async () => true);

// Settings now hosts the account/sign-out section, which uses the router.
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/supabase/client", () => ({
  createBrowserSupabase: () => ({ auth: { signOut: vi.fn() } }),
}));

vi.mock("@/lib/store", () => ({
  useApp: () => ({
    stages: [
      { id: "s1", name: "Saved", order: 0, color: "lavender", role: "saved", pinned: true },
      { id: "s2", name: "Applied", order: 1, color: "blush" },
      { id: "s3", name: "Screening", order: 2, color: "sky", role: "screening" },
      { id: "s4", name: "Offer", order: 3, color: "mint", role: "offer", pinned: true },
      { id: "s5", name: "Networking", order: 4, color: "peach" },
    ],
    tags: [{ id: "t1", name: "Remote" }],
    settings: { nudgeDays: 7, ghostDays: 14, currency: "USD" },
    renameStage, removeStage, addStage: vi.fn(), moveStage: vi.fn(), recolorStage: vi.fn(),
    renameTag: vi.fn(), addTag: vi.fn(), removeTag: vi.fn(),
    updateSettings: vi.fn(), exportJson: vi.fn(), importData: vi.fn(), resetAllData: vi.fn(),
    resetLocal: vi.fn(),
  }),
}));

beforeEach(() => { renameStage.mockClear(); removeStage.mockClear(); });

describe("Settings pipeline", () => {
  it("reorders by drag handle, not arrow buttons", () => {
    render(<SettingsPage email={null} />);
    expect(screen.getByRole("button", { name: /reorder applied/i })).toBeDefined();
    expect(screen.queryByRole("button", { name: /move applied up/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /move applied down/i })).toBeNull();
  });

  it("does not rename on blur", () => {
    render(<SettingsPage email={null} />);
    const field = screen.getByLabelText(/applied column name/i);
    fireEvent.change(field, { target: { value: "Shortlist" } });
    fireEvent.blur(field);
    expect(renameStage).not.toHaveBeenCalled();
  });

  it("renames every changed column on one Save", () => {
    render(<SettingsPage email={null} />);
    fireEvent.change(screen.getByLabelText(/applied column name/i), { target: { value: "Shortlist" } });
    fireEvent.change(screen.getByLabelText(/networking column name/i), { target: { value: "Outreach" } });
    fireEvent.click(screen.getAllByRole("button", { name: /save changes/i })[0]);
    expect(renameStage).toHaveBeenCalledTimes(2);
    expect(renameStage).toHaveBeenCalledWith("s2", "Shortlist");
    expect(renameStage).toHaveBeenCalledWith("s5", "Outreach");
  });

  it("confirms before deleting a column", () => {
    render(<SettingsPage email={null} />);
    fireEvent.click(screen.getByRole("button", { name: /delete applied column/i }));
    expect(removeStage).not.toHaveBeenCalled();
    expect(screen.getByText(/delete the .*applied.* column/i)).toBeDefined();
  });

  it("locks default stage name inputs and hides delete on pinned stages", () => {
    render(<SettingsPage email={null} />);
    const savedInput = screen.getByLabelText(/saved column name/i) as HTMLInputElement;
    expect(savedInput.disabled).toBe(true);
    expect(screen.queryByLabelText(/delete saved column/i)).toBeNull(); // pinned → no delete
    expect(screen.queryByLabelText(/delete offer column/i)).toBeNull(); // pinned → no delete
    expect(screen.getByLabelText(/delete screening column/i)).toBeDefined(); // default, deletable
    expect(screen.queryByRole("button", { name: /reorder saved/i })).toBeNull(); // pinned → not draggable
  });
});

describe("Settings tags and preferences", () => {
  it("gives every buffered card its own save footer", () => {
    render(<SettingsPage email={null} />);
    // Pipeline, Tags, Preferences.
    expect(screen.getAllByRole("button", { name: /save changes/i })).toHaveLength(3);
  });

  it("adds a tag with an explicitly labeled button", () => {
    render(<SettingsPage email={null} />);
    expect(screen.getByRole("button", { name: /add tag/i })).toBeDefined();
  });

  it("confirms before deleting a tag", () => {
    render(<SettingsPage email={null} />);
    fireEvent.click(screen.getByRole("button", { name: /delete tag remote/i }));
    expect(screen.getByText(/delete the .*remote.* tag/i)).toBeDefined();
  });

  it("buffers preference edits behind save", () => {
    render(<SettingsPage email={null} />);
    fireEvent.change(screen.getByLabelText(/follow-up nudge after/i), { target: { value: "14" } });
    const footers = screen.getAllByRole("button", { name: /save changes/i });
    // The Preferences footer is the last one on the page.
    expect(footers[footers.length - 1].hasAttribute("disabled")).toBe(false);
  });

  it("exposes a Ghosted-after preference bound to ghostDays", () => {
    render(<SettingsPage email={null} />);
    const ghostInput = screen.getByLabelText(/ghosted after/i) as HTMLInputElement;
    expect(ghostInput.value).toBe("14");
  });
});
