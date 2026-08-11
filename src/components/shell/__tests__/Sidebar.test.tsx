import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Sidebar } from "@/components/shell/Sidebar";

// AccountMenu (rendered inside Sidebar) reaches useSignOut, which needs both
// of these — router for the post-sign-out redirect, store for resetLocal.
vi.mock("next/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/supabase/client", () => ({ createBrowserSupabase: () => ({ auth: { signOut: vi.fn() } }) }));
vi.mock("@/lib/store", () => ({
  useApp: (sel: (s: unknown) => unknown) => sel({ reminders: [], resetLocal: vi.fn() }),
}));

describe("Sidebar", () => {
  it("links Profile to the master-profile editor", () => {
    render(<Sidebar email={null} />);
    const profileLink = screen.getByRole("link", { name: /^profile$/i });
    expect(profileLink.getAttribute("href")).toBe("/cv/profile");
  });
});
