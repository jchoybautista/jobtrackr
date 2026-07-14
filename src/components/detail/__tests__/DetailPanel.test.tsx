import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DetailPanel } from "@/components/detail/DetailPanel";

const updateApplication = vi.fn();

const app = {
  id: "app1", stageId: "s1", company: "Linear", role: "Frontend Engineer",
  location: "Remote", tagIds: [] as string[], createdAt: "2026-07-01T00:00:00.000Z",
};

vi.mock("@/lib/store", () => ({
  useApp: () => ({
    applications: [app], selectedAppId: "app1",
    stages: [{ id: "s1", name: "Applied", order: 0, color: "lilac" }],
    tags: [{ id: "t1", name: "Remote" }],
    interviews: [], contacts: [], notes: [], events: [], reminders: [], cvdocs: [],
    updateApplication, moveApplication: vi.fn(), selectApp: vi.fn(),
    addNote: vi.fn(), addInterview: vi.fn(), addContact: vi.fn(), addReminder: vi.fn(),
    removeApplication: vi.fn(), removeInterview: vi.fn(), removeContact: vi.fn(),
    removeNote: vi.fn(), updateCv: vi.fn(),
  }),
}));

beforeEach(() => updateApplication.mockClear());

describe("DetailPanel buffered editing", () => {
  it("starts clean with a disabled save", () => {
    render(<DetailPanel />);
    expect(screen.getByText(/no changes/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /save changes/i }).hasAttribute("disabled")).toBe(true);
  });

  it("does NOT write to the store on blur", () => {
    render(<DetailPanel />);
    const role = screen.getByLabelText(/^role$/i);
    fireEvent.change(role, { target: { value: "Staff Engineer" } });
    fireEvent.blur(role);
    expect(updateApplication).not.toHaveBeenCalled();
    expect(screen.getByText(/unsaved changes/i)).toBeDefined();
  });

  it("commits every changed field in one call on Save", () => {
    render(<DetailPanel />);
    fireEvent.change(screen.getByLabelText(/^role$/i), { target: { value: "Staff Engineer" } });
    fireEvent.change(screen.getByLabelText(/^company$/i), { target: { value: "Vercel" } });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    expect(updateApplication).toHaveBeenCalledTimes(1);
    expect(updateApplication).toHaveBeenCalledWith("app1", { role: "Staff Engineer", company: "Vercel" });
  });

  it("reverts the draft on Cancel and writes nothing", () => {
    render(<DetailPanel />);
    const role = screen.getByLabelText(/^role$/i) as HTMLInputElement;
    fireEvent.change(role, { target: { value: "Staff Engineer" } });
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect((screen.getByLabelText(/^role$/i) as HTMLInputElement).value).toBe("Frontend Engineer");
    expect(updateApplication).not.toHaveBeenCalled();
    expect(screen.getByText(/no changes/i)).toBeDefined();
  });

  it("returns to clean when a tag is toggled on and back off", () => {
    render(<DetailPanel />);
    const tag = screen.getByRole("button", { name: "Remote" });
    fireEvent.click(tag);
    expect(screen.getByText(/unsaved changes/i)).toBeDefined();
    fireEvent.click(tag);
    expect(screen.getByText(/no changes/i)).toBeDefined();
  });

  it("asks before discarding when Escape is pressed dirty", () => {
    render(<DetailPanel />);
    fireEvent.change(screen.getByLabelText(/^role$/i), { target: { value: "Staff Engineer" } });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByText(/discard unsaved changes/i)).toBeDefined();
  });
});

describe("DetailPanel add-forms", () => {
  it("labels every add action explicitly and never says 'Save' outside the footer", () => {
    render(<DetailPanel />);
    expect(screen.getByRole("button", { name: /add interview/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /add contact/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /add reminder/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /add note/i })).toBeDefined();

    const saveish = screen.getAllByRole("button").filter((b) => /save/i.test(b.textContent ?? ""));
    expect(saveish).toHaveLength(1);
    expect(saveish[0].textContent).toMatch(/save changes/i);
  });
});
