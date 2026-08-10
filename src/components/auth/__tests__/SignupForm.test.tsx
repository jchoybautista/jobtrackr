import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SignupForm } from "@/components/auth/SignupForm";

const signUp = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/supabase/client", () => ({ createBrowserSupabase: () => ({ auth: { signUp } }) }));

beforeEach(() => { signUp.mockReset(); });

const fill = (email: string, password: string) => {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: password } });
  fireEvent.click(screen.getByRole("button", { name: "Create account" }));
};

describe("SignupForm", () => {
  it("rejects a password under 8 characters before calling Supabase", async () => {
    render(<SignupForm />);
    fill("a@b.com", "short7!");
    expect(await screen.findByText(/at least 8 characters/i)).toBeDefined();
    expect(signUp).not.toHaveBeenCalled();
  });

  it("tells the user to check their inbox on success", async () => {
    signUp.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    render(<SignupForm />);
    fill("a@b.com", "eightchars");

    expect(await screen.findByText(/check your inbox/i)).toBeDefined();
    // The form is replaced by the confirmation state.
    expect(screen.queryByLabelText("Password")).toBeNull();
  });

  it("sends the confirmation link back to the app", async () => {
    signUp.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    render(<SignupForm />);
    fill("a@b.com", "eightchars");

    await waitFor(() => expect(signUp).toHaveBeenCalled());
    const arg = signUp.mock.calls[0][0];
    expect(arg.email).toBe("a@b.com");
    expect(arg.options.emailRedirectTo).toMatch(/\/auth\/confirm$/);
  });

  it("surfaces a Supabase failure as plain language", async () => {
    signUp.mockResolvedValue({ data: null, error: { message: "User already registered" } });
    render(<SignupForm />);
    fill("a@b.com", "eightchars");

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/already registered/i);
  });

  it("links back to sign in", () => {
    render(<SignupForm />);
    expect(screen.getByRole("link", { name: /sign in/i }).getAttribute("href")).toBe("/login");
  });
});
