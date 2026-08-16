import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  authHeaders,
  clearToken,
  readToken,
  safeRedirectTarget,
  signIn,
  storeToken,
} from "./auth";

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("token storage", () => {
  it("round-trips a token", () => {
    storeToken("abc.def.ghi");
    expect(readToken()).toBe("abc.def.ghi");
  });

  it("reports no token before signing in", () => {
    expect(readToken()).toBeNull();
  });

  it("forgets the token on sign-out", () => {
    storeToken("abc.def.ghi");
    clearToken();
    expect(readToken()).toBeNull();
  });

  it("sends no Authorization header when signed out", () => {
    expect(authHeaders()).toEqual({});
  });

  it("sends a bearer header when signed in", () => {
    storeToken("abc.def.ghi");
    expect(authHeaders()).toEqual({ Authorization: "Bearer abc.def.ghi" });
  });
});

describe("AS-019: signing in with wrong credentials", () => {
  it("surfaces the message the API sent and stores nothing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: "Invalid email or password" }),
      }),
    );

    await expect(signIn("admin@example.com", "wrong")).rejects.toThrow(
      "Invalid email or password",
    );
    expect(readToken()).toBeNull();
  });
});

describe("safeRedirectTarget", () => {
  it("honours a same-site path", () => {
    expect(safeRedirectTarget("/admin/trading-days?week=2026-08-10")).toBe(
      "/admin/trading-days?week=2026-08-10",
    );
  });

  it("falls back when nothing was requested", () => {
    expect(safeRedirectTarget(null)).toBe("/admin/trading-days");
  });

  it("refuses an absolute URL, so sign-in cannot bounce off-site", () => {
    expect(safeRedirectTarget("https://evil.example/steal")).toBe(
      "/admin/trading-days",
    );
  });

  it("refuses a protocol-relative URL", () => {
    expect(safeRedirectTarget("//evil.example/steal")).toBe("/admin/trading-days");
  });
});
