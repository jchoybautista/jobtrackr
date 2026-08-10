import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/auth/confirm/route";

const verifyOtp = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: async () => ({ auth: { verifyOtp } }),
}));

beforeEach(() => {
  verifyOtp.mockReset();
  verifyOtp.mockResolvedValue({ error: null });
});

function req(qs: string) {
  return new NextRequest(`http://localhost:3000/auth/confirm${qs}`);
}

describe("GET /auth/confirm", () => {
  it("honours a normal in-app next", async () => {
    const res = await GET(req("?token_hash=abc&type=email&next=%2Fdashboard"));
    expect(res.headers.get("location")).toBe("http://localhost:3000/dashboard");
  });

  it("honours the password-recovery flow's own next", async () => {
    const res = await GET(req("?token_hash=abc&type=recovery&next=%2Freset-password"));
    expect(res.headers.get("location")).toBe("http://localhost:3000/reset-password");
  });

  it("lands on the board when there is no next", async () => {
    const res = await GET(req("?token_hash=abc&type=email"));
    expect(res.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("refuses a protocol-relative next — the open-redirect vector", async () => {
    const res = await GET(req("?token_hash=abc&type=email&next=%2F%2Fevil.com"));
    expect(res.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("refuses an absolute URL next", async () => {
    const res = await GET(req("?token_hash=abc&type=email&next=https%3A%2F%2Fevil.com"));
    expect(res.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("sends a missing token to login with an error, verifying nothing", async () => {
    const res = await GET(req("?next=%2Fdashboard"));
    expect(res.headers.get("location")).toBe("http://localhost:3000/login?error=link");
    expect(verifyOtp).not.toHaveBeenCalled();
  });

  it("sends a failed verification to login with an error, ignoring next", async () => {
    verifyOtp.mockResolvedValue({ error: { message: "Token has expired" } });
    const res = await GET(req("?token_hash=abc&type=email&next=%2F%2Fevil.com"));
    expect(res.headers.get("location")).toBe("http://localhost:3000/login?error=link");
  });
});
