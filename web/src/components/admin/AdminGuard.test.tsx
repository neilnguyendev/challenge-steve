import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { readToken, storeToken } from "@/lib/auth";

import { AdminGuard } from "./AdminGuard";
import { LoginForm } from "./LoginForm";

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AS-020: reaching an admin page without a session", () => {
  it("sends the visitor to sign in instead of rendering the page", async () => {
    const onRedirect = vi.fn();

    render(
      <AdminGuard onRedirect={onRedirect} currentPath="/admin/trading-days">
        <p>Week editor</p>
      </AdminGuard>,
    );

    await waitFor(() => expect(onRedirect).toHaveBeenCalled());
    expect(screen.queryByText("Week editor")).not.toBeInTheDocument();
  });

  it("carries where they were headed, so signing in finishes the journey", async () => {
    const onRedirect = vi.fn();

    render(
      <AdminGuard onRedirect={onRedirect} currentPath="/admin/trading-days?week=2026-08-10">
        <p>Week editor</p>
      </AdminGuard>,
    );

    await waitFor(() =>
      expect(onRedirect).toHaveBeenCalledWith(
        "/admin/login?next=%2Fadmin%2Ftrading-days%3Fweek%3D2026-08-10",
      ),
    );
  });

  it("renders the page when a session exists", async () => {
    storeToken("test-token");
    const onRedirect = vi.fn();

    render(
      <AdminGuard onRedirect={onRedirect} currentPath="/admin/trading-days">
        <p>Week editor</p>
      </AdminGuard>,
    );

    expect(await screen.findByText("Week editor")).toBeInTheDocument();
    expect(onRedirect).not.toHaveBeenCalled();
  });
});

describe("AS-018: signing in successfully", () => {
  it("keeps the session and moves on to where the manager was headed", async () => {
    const user = userEvent.setup();
    const onSignedIn = vi.fn();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          token: "issued.token.value",
          admin: { email: "admin@example.com" },
        }),
      }),
    );

    render(<LoginForm next="/admin/trading-days" onSignedIn={onSignedIn} />);

    await user.type(screen.getByLabelText("Email"), "admin@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(onSignedIn).toHaveBeenCalledWith("/admin/trading-days"));
    expect(readToken()).toBe("issued.token.value");
  });
});

describe("AS-019: signing in with the wrong password", () => {
  it("stays on the page, shows why, keeps the email and stores no session", async () => {
    const user = userEvent.setup();
    const onSignedIn = vi.fn();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: "Invalid email or password" }),
      }),
    );

    render(<LoginForm next={null} onSignedIn={onSignedIn} />);

    await user.type(screen.getByLabelText("Email"), "admin@example.com");
    await user.type(screen.getByLabelText("Password"), "wrong");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Invalid email or password",
    );
    expect(onSignedIn).not.toHaveBeenCalled();
    expect(readToken()).toBeNull();

    // Retyping the email after a password typo is pure friction.
    expect(screen.getByLabelText("Email")).toHaveValue("admin@example.com");
    expect(screen.getByLabelText("Password")).toHaveValue("");
  });
});
