import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AuthField } from "@/components/auth/AuthField";

const base = {
  id: "email", label: "Email", type: "email" as const, value: "",
  onChange: () => {}, autoComplete: "email",
};

describe("AuthField", () => {
  it("associates the label with the input", () => {
    render(<AuthField {...base} />);
    expect(screen.getByLabelText("Email")).toBeDefined();
  });

  it("is clean when there is no error", () => {
    render(<AuthField {...base} />);
    const input = screen.getByLabelText("Email");
    expect(input.getAttribute("aria-invalid")).toBeNull();
    expect(input.getAttribute("aria-describedby")).toBeNull();
  });

  it("wires the error to the input for screen readers", () => {
    render(<AuthField {...base} error="Enter a valid email address" />);
    const input = screen.getByLabelText("Email");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy).toBe("email-error");
    expect(document.getElementById("email-error")?.textContent).toBe("Enter a valid email address");
  });

  it("marks required fields for assistive tech", () => {
    render(<AuthField {...base} required />);
    expect(screen.getByLabelText("Email").getAttribute("aria-required")).toBe("true");
  });

  it("passes the autoComplete token through", () => {
    render(<AuthField {...base} type="password" autoComplete="current-password" label="Password" id="password" />);
    expect(screen.getByLabelText("Password").getAttribute("autocomplete")).toBe("current-password");
  });

  it("reports typing", () => {
    const onChange = vi.fn();
    render(<AuthField {...base} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.com" } });
    expect(onChange).toHaveBeenCalledWith("a@b.com");
  });
});
