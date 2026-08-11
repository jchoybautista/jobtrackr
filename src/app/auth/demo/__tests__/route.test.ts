import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/auth/demo/route";
import { DEMO_COOKIE } from "@/lib/auth/routes";

const getUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: async () => ({ auth: { getUser } }),
}));

beforeEach(() => { getUser.mockResolvedValue({ data: { user: null } }); });

describe("GET /auth/demo", () => {
  it("redirects to the board", async () => {
    const res = await GET(new Request("http://localhost:3000/auth/demo"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("sets a demo cookie that middleware will accept", async () => {
    const res = await GET(new Request("http://localhost:3000/auth/demo"));
    const cookie = res.cookies.get(DEMO_COOKIE);
    expect(cookie?.value).toBe("1");
    expect(cookie?.sameSite).toBe("lax");
  });

  it("scopes the demo cookie to the browser session", async () => {
    // A persistent cookie made the sign-in page unreachable on later visits:
    // demo silently resumed and dropped returning visitors straight onto the
    // board. Omitting maxAge/expires means the demo lasts exactly as long as
    // the browser stays open, so sign-in is what a fresh visit lands on.
    const cookie = (await GET(new Request("http://localhost:3000/auth/demo")))
      .cookies.get(DEMO_COOKIE);
    expect(cookie?.maxAge).toBeUndefined();
    expect(cookie?.expires).toBeUndefined();
  });

  it("does not make the cookie httpOnly — it grants only a local sandbox", async () => {
    const res = await GET(new Request("http://localhost:3000/auth/demo"));
    expect(res.cookies.get(DEMO_COOKIE)?.httpOnly).toBeFalsy();
  });

  it("sends a signed-in visitor to their own board without a demo cookie", async () => {
    // resolveScope puts an account ahead of the cookie, so setting one here
    // would change nothing and leave a misleading cookie behind.
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const res = await GET(new Request("http://localhost:3000/auth/demo"));
    expect(res.headers.get("location")).toBe("http://localhost:3000/");
    expect(res.cookies.get(DEMO_COOKIE)).toBeUndefined();
  });
});
