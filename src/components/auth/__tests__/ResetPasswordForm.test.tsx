import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

const push = vi.fn();
const updateUser = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));
vi.mock("@/lib/supabase/client", () => ({ createBrowserSupabase: () => ({ auth: { updateUser } }) }));

beforeEach(() => { push.mockClear(); updateUser.mockReset(); });

const submit = (password: string) => {
  fireEvent.change(screen.getByLabelText("New password"), { target: { value: password } });
  fireEvent.click(screen.getByRole("button", { name: /update password/i }));
};

describe("ResetPasswordForm", () => {
  it("enforces the 8-character minimum", async () => {
    render(<ResetPasswordForm />);
    submit("short7!");
    expect(await screen.findByText(/at least 8 characters/i)).toBeDefined();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("updates the password and lands on the board", async () => {
    updateUser.mockResolvedValue({ error: null });
    render(<ResetPasswordForm />);
    submit("eightchars");
    await waitFor(() => expect(updateUser).toHaveBeenCalledWith({ password: "eightchars" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
  });

  it("explains an expired link", async () => {
    updateUser.mockResolvedValue({ error: { message: "Token has expired" } });
    render(<ResetPasswordForm />);
    submit("eightchars");
    expect((await screen.findByRole("alert")).textContent).toMatch(/expired/i);
  });
});
