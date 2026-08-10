import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LoginForm } from "@/components/auth/LoginForm";

const push = vi.fn();
const signInWithPassword = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(""),
}));

vi.mock("@/lib/supabase/client", () => ({
  createBrowserSupabase: () => ({ auth: { signInWithPassword } }),
}));

beforeEach(() => { push.mockClear(); signInWithPassword.mockReset(); });

describe("LoginForm", () => {
  it("offers a demo route that needs no account", () => {
    render(<LoginForm />);
    const demo = screen.getByRole("link", { name: /demo/i });
    expect(demo.getAttribute("href")).toBe("/auth/demo");
  });

  it("blocks submission of an invalid email without calling Supabase", async () => {
    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "nope" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "hunter22" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText(/valid email address/i)).toBeDefined();
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it("signs in and lands on the board", async () => {
    signInWithPassword.mockResolvedValue({ error: null });
    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "hunter22" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(signInWithPassword).toHaveBeenCalledWith({
      email: "a@b.com", password: "hunter22",
    }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
  });

  it("announces a failure without revealing whether the account exists", async () => {
    signInWithPassword.mockResolvedValue({ error: { message: "Invalid login credentials" } });
    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "wrongpass" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/email or password/i);
    expect(alert.textContent).not.toMatch(/no account/i);
    expect(push).not.toHaveBeenCalled();
  });

  it("links to sign-up and password recovery", () => {
    render(<LoginForm />);
    expect(screen.getByRole("link", { name: /create an account/i }).getAttribute("href")).toBe("/signup");
    expect(screen.getByRole("link", { name: /forgot/i }).getAttribute("href")).toBe("/forgot-password");
  });
});
