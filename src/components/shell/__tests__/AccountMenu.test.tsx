import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AccountMenu } from "@/components/shell/AccountMenu";

// Recorded in one array so the ORDER is assertable, not just the calls.
// resetLocal must land before navigation or the next account sees the previous
// account's board flash while its own data loads.
const calls: string[] = [];
const push = vi.fn(() => { calls.push("push"); });
const signOut = vi.fn();
const resetLocal = vi.fn(() => { calls.push("resetLocal"); });

vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));
vi.mock("@/lib/supabase/client", () => ({
  createBrowserSupabase: () => ({ auth: { signOut } }),
}));
vi.mock("@/lib/store", () => ({ useApp: (sel: (s: unknown) => unknown) => sel({ resetLocal }) }));

beforeEach(() => {
  calls.length = 0;
  push.mockClear(); signOut.mockReset(); resetLocal.mockClear();
  signOut.mockImplementation(async () => { calls.push("signOut"); return { error: null }; });
});

describe("AccountMenu", () => {
  it("shows the signed-in email", async () => {
    render(<AccountMenu email="mika@example.com" />);
    expect(await screen.findByText("mika@example.com")).toBeDefined();
  });

  it("signs out, clears the local store, and returns to login — in that order", async () => {
    render(<AccountMenu email="mika@example.com" />);
    fireEvent.click(await screen.findByRole("button", { name: /sign out/i }));

    await waitFor(() => expect(calls).toContain("push"));
    expect(calls).toEqual(["signOut", "resetLocal", "push"]);
  });

  it("says Demo when there is no account", async () => {
    render(<AccountMenu email={null} />);
    expect(await screen.findByText("Demo mode")).toBeDefined();
    expect(screen.getByRole("link", { name: /create an account/i }).getAttribute("href")).toBe("/signup");
  });

  it("lets a demo visitor leave and land back on sign-in", async () => {
    // Without this the demo cookie had no UI that could clear it: every visit
    // resumed the sandbox and the sign-in page was unreachable.
    document.cookie = "jobtrackr-demo=1; Path=/";
    render(<AccountMenu email={null} />);

    fireEvent.click(await screen.findByRole("button", { name: /exit demo/i }));

    await waitFor(() => expect(calls).toContain("push"));
    expect(push).toHaveBeenCalledWith("/login");
    expect(document.cookie).not.toContain("jobtrackr-demo=1");
  });
});
