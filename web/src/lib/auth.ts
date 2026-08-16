import { apiFetch } from "./api";

const STORAGE_KEY = "revenue-dashboard.admin-token";

export interface SignInResult {
  token: string;
  admin: { email: string };
}

/**
 * The browser-side half of admin access.
 *
 * This is a convenience guard, not a security boundary: it stops a signed-out
 * manager landing on a screen that cannot load, nothing more. What actually
 * protects the figures is the API refusing every /admin request without a
 * valid token — see api/app/controllers/api/v1/admin/base_controller.rb.
 */
export function signIn(email: string, password: string): Promise<SignInResult> {
  return apiFetch<SignInResult>("/api/v1/admin/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function storeToken(token: string): void {
  window.localStorage.setItem(STORAGE_KEY, token);
}

export function readToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

export function clearToken(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}

export function authHeaders(): Record<string, string> {
  const token = readToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Where to send someone after they sign in.
 *
 * Only same-site paths are honoured. Taking the raw value would turn the
 * sign-in page into an open redirect: `/admin/login?next=https://evil.example`
 * would bounce a freshly-authenticated manager straight off the site.
 */
export function safeRedirectTarget(next: string | null): string {
  if (!next) return "/admin/trading-days";
  if (!next.startsWith("/") || next.startsWith("//")) return "/admin/trading-days";
  return next;
}
