import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Dashboard } from "./Dashboard";
import type { RevenueTrend } from "@/lib/api";

const WEEK = "2026-08-10";

function trend(overrides: Partial<RevenueTrend> = {}): RevenueTrend {
  return {
    period: { start: WEEK, end: "2026-08-16" },
    previous_period: null,
    available_range: { earliest: "2026-07-27", latest: "2026-08-16" },
    summary: {
      total_revenue: { current: 16977, previous: null, delta_pct: null },
      average_per_day: { current: 2425, previous: null, delta_pct: null },
      total_covers: { current: 950, previous: null, delta_pct: null },
    },
    series: Array.from({ length: 7 }, (_, i) => ({
      date: `2026-08-${10 + i}`,
      weekday: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i],
      current: {
        pos_revenue: 1750,
        eatclub_revenue: 320,
        labour_cost: 590,
        covers: 118,
      },
      previous: null,
    })),
    ...overrides,
  };
}

let fetchMock: ReturnType<typeof vi.fn>;

/** Every URL the component has asked for, in order. */
function requestedUrls(): string[] {
  return fetchMock.mock.calls.map((call) => String(call[0]));
}

beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => trend(),
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AS-001: default load shows the current week", () => {
  it("names the week, requests it, and shows every series", async () => {
    render(<Dashboard initialWeekStart={WEEK} />);

    expect(
      await screen.findByRole("heading", { name: "This Week's Revenue Trend" }),
    ).toBeInTheDocument();

    expect(requestedUrls()[0]).toContain(`week_start=${WEEK}`);
    expect(requestedUrls()[0]).toContain("compare=false");

    for (const label of ["POS Revenue", "Eatclub Revenue", "Labour Costs"]) {
      expect(screen.getByRole("checkbox", { name: label })).toBeChecked();
    }
  });
});

describe("AS-002: turning on comparison reloads against the previous week", () => {
  it("renames the view, refetches with comparison, and marks the control active", async () => {
    const user = userEvent.setup();
    render(<Dashboard initialWeekStart={WEEK} />);
    await screen.findByRole("heading", { name: "This Week's Revenue Trend" });

    const toggle = screen.getByRole("button", { name: /compare to previous/i });
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    await user.click(toggle);

    expect(
      await screen.findByRole("heading", {
        name: "This Week's Revenue Trend vs Previous Period",
      }),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(requestedUrls().at(-1)).toContain("compare=true");
    });
    expect(toggle).toHaveAttribute("aria-pressed", "true");
  });
});

describe("AS-003: hiding a series updates the chart without refetching", () => {
  it("marks the series hidden and asks the API for nothing further", async () => {
    const user = userEvent.setup();
    render(<Dashboard initialWeekStart={WEEK} />);
    await screen.findByRole("heading", { name: "This Week's Revenue Trend" });

    const callsBefore = fetchMock.mock.calls.length;
    const labour = screen.getByRole("checkbox", { name: "Labour Costs" });

    await user.click(labour);

    expect(labour).not.toBeChecked();
    expect(screen.getByTestId("visible-series")).toHaveTextContent("pos,eatclub");
    expect(fetchMock.mock.calls.length).toBe(callsBefore);
  });
});

describe("AS-004: moving to an earlier week loads that week", () => {
  it("refetches the earlier week and keeps the comparison setting", async () => {
    const user = userEvent.setup();
    render(<Dashboard initialWeekStart={WEEK} />);
    await screen.findByRole("heading", { name: "This Week's Revenue Trend" });

    await user.click(screen.getByRole("button", { name: /compare to previous/i }));
    await waitFor(() => expect(requestedUrls().at(-1)).toContain("compare=true"));

    await user.click(screen.getByRole("button", { name: /earlier week/i }));

    await waitFor(() => {
      const last = requestedUrls().at(-1)!;
      expect(last).toContain("week_start=2026-08-03");
      expect(last).toContain("compare=true");
    });
  });
});

describe("AS-005: the API being unavailable", () => {
  it("reports the failure and leaves the controls usable", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "Internal Server Error" }),
    });

    render(<Dashboard initialWeekStart={WEEK} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/could not/i);

    // Controls must survive the failure, otherwise there is no way to retry.
    const toggle = screen.getByRole("button", { name: /compare to previous/i });
    expect(toggle).toBeEnabled();
    await user.click(toggle);
    await waitFor(() => expect(requestedUrls().at(-1)).toContain("compare=true"));
  });
});

describe("reaching the admin area", () => {
  it("offers a way in from the dashboard, aimed at the editor", async () => {
    render(<Dashboard initialWeekStart={WEEK} />);
    await screen.findByRole("heading", { name: "This Week's Revenue Trend" });

    // Aimed at the editor, not the sign-in page: the guard redirects anyone
    // without a session and returns them here afterwards.
    expect(screen.getByRole("link", { name: /edit figures/i })).toHaveAttribute(
      "href",
      "/admin/trading-days",
    );
  });
});

describe("AS-025: browsing backwards stops at the earliest recorded week", () => {
  it("disables the earlier-week control once there is nothing before it", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () =>
        trend({ available_range: { earliest: WEEK, latest: "2026-08-16" } }),
    });

    render(<Dashboard initialWeekStart={WEEK} />);
    await screen.findByRole("heading", { name: "This Week's Revenue Trend" });

    expect(screen.getByRole("button", { name: /earlier week/i })).toBeDisabled();
  });

  it("leaves it enabled while earlier trading exists", async () => {
    render(<Dashboard initialWeekStart={WEEK} />);
    await screen.findByRole("heading", { name: "This Week's Revenue Trend" });

    expect(screen.getByRole("button", { name: /earlier week/i })).toBeEnabled();
  });
});
