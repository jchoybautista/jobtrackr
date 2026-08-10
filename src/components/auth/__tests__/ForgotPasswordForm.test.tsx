import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

const resetPasswordForEmail = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createBrowserSupabase: () => ({ auth: { resetPasswordForEmail } }),
}));

beforeEach(() => { resetPasswordForEmail.mockReset(); });

const submit = (email: string) => {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } });
  fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));
};

describe("ForgotPasswordForm", () => {
  it("validates the email before sending", async () => {
    render(<ForgotPasswordForm />);
    submit("nope");
    expect(await screen.findByText(/valid email address/i)).toBeDefined();
    expect(resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("points the reset link at /reset-password", async () => {
    resetPasswordForEmail.mockResolvedValue({ error: null });
    render(<ForgotPasswordForm />);
    submit("a@b.com");
    await waitFor(() => expect(resetPasswordForEmail).toHaveBeenCalled());
    const [emailArg, options] = resetPasswordForEmail.mock.calls[0];
    expect(emailArg).toBe("a@b.com");
    expect(options.redirectTo).toMatch(/\/auth\/confirm\?next=%2Freset-password$/);
  });

  it("gives the same answer whether or not the account exists", async () => {
    // Non-disclosure: an unknown address must not produce a different screen.
    resetPasswordForEmail.mockResolvedValue({ error: { message: "User not found" } });
    render(<ForgotPasswordForm />);
    submit("ghost@nowhere.com");
    expect(await screen.findByText(/check your inbox/i)).toBeDefined();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("still reports rate limiting, which is not a disclosure", async () => {
    resetPasswordForEmail.mockResolvedValue({ error: { message: "Email rate limit exceeded" } });
    render(<ForgotPasswordForm />);
    submit("a@b.com");
    expect((await screen.findByRole("alert")).textContent).toMatch(/too many/i);
  });
});
