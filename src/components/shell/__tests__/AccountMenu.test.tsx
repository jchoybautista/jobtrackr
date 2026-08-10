import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AccountMenu } from "@/components/shell/AccountMenu";

const push = vi.fn();
const signOut = vi.fn();
const resetLocal = vi.fn();
const getUser = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));
vi.mock("@/lib/supabase/client", () => ({
  createBrowserSupabase: () => ({ auth: { signOut, getUser } }),
}));
vi.mock("@/lib/store", () => ({ useApp: (sel: (s: unknown) => unknown) => sel({ resetLocal }) }));

beforeEach(() => {
  push.mockClear(); signOut.mockReset(); resetLocal.mockClear();
  getUser.mockResolvedValue({ data: { user: { email: "mika@example.com" } } });
});

describe("AccountMenu", () => {
  it("shows the signed-in email", async () => {
    render(<AccountMenu />);
    expect(await screen.findByText("mika@example.com")).toBeDefined();
  });

  it("signs out, clears the local store, and returns to login", async () => {
    signOut.mockResolvedValue({ error: null });
    render(<AccountMenu />);
    fireEvent.click(await screen.findByRole("button", { name: /sign out/i }));

    await waitFor(() => expect(signOut).toHaveBeenCalled());
    // Order matters: the store must be emptied so the next account never sees
    // the previous one's board flash on screen.
    await waitFor(() => expect(resetLocal).toHaveBeenCalled());
    await waitFor(() => expect(push).toHaveBeenCalledWith("/login"));
  });

  it("says Demo when there is no account", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    render(<AccountMenu />);
    expect(await screen.findByText(/demo/i)).toBeDefined();
    expect(screen.getByRole("link", { name: /create an account/i }).getAttribute("href")).toBe("/signup");
  });
});
