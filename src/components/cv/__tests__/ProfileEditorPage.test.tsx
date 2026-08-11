import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProfileEditorPage } from "@/components/cv/ProfileEditorPage";
import { emptyCvContent } from "@/cv/types";

const saveProfile = vi.fn();
const setProfilePhoto = vi.fn();

vi.mock("@/lib/store", () => ({
  useApp: (sel: (s: unknown) => unknown) =>
    sel({ profile: mockProfile, saveProfile, setProfilePhoto }),
}));

// Reassigned per test before render — read by the mock above.
let mockProfile: { content: ReturnType<typeof emptyCvContent> } | null = null;

const valueOf = (label: RegExp) => (screen.getByLabelText(label) as HTMLInputElement).value;

describe("ProfileEditorPage — default content", () => {
  it("prefills only the email when nobody has saved a profile yet", () => {
    // Signup collects nothing but an email — the master profile should show
    // exactly that until the person fills in the rest themselves.
    mockProfile = null;
    render(<ProfileEditorPage accountEmail="mika@example.com" />);

    expect(valueOf(/^email$/i)).toBe("mika@example.com");
    expect(valueOf(/full name/i)).toBe("");
    expect(valueOf(/headline/i)).toBe("");
    expect(valueOf(/phone/i)).toBe("");
  });

  it("leaves every field blank in the demo sandbox, where there is no account email", () => {
    mockProfile = null;
    render(<ProfileEditorPage accountEmail={null} />);

    expect(valueOf(/^email$/i)).toBe("");
  });

  it("never overrides a saved profile's email with the account email", () => {
    // Once a profile exists — including one where the person cleared the
    // email field on purpose — the account email must not resurrect it.
    mockProfile = { content: { ...emptyCvContent(), fullName: "Real Person", email: "" } };
    render(<ProfileEditorPage accountEmail="mika@example.com" />);

    expect(valueOf(/^email$/i)).toBe("");
    expect(valueOf(/full name/i)).toBe("Real Person");
  });
});
