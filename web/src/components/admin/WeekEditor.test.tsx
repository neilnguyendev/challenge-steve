import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { AdminWeek } from "@/lib/api";
import { storeToken } from "@/lib/auth";

import { WeekEditor } from "./WeekEditor";

const WEEK = "2026-08-10";
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function week(overrides: Record<number, Partial<AdminWeek["days"][number]>> = {}): AdminWeek {
  const days = WEEKDAYS.map((weekday, i) => ({
    date: `2026-08-${10 + i}`,
    weekday,
    pos_revenue: 0,
    eatclub_revenue: 0,
    labour_cost: 0,
    covers: 0,
    ...overrides[i],
  }));
  return { venue_id: 1, week_start: WEEK, days };
}

let fetchMock: ReturnType<typeof vi.fn>;

function respondOk(body: unknown) {
  return { ok: true, status: 200, json: async () => body };
}

beforeEach(() => {
  window.localStorage.clear();
  storeToken("test-token");
  fetchMock = vi.fn().mockResolvedValue(respondOk(week({ 2: { pos_revenue: 1830 } })));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AS-023: a week with untraded days", () => {
  it("lists all seven days with zeros where nothing was traded", async () => {
    render(<WeekEditor weekStart={WEEK} onChangeWeek={() => {}} />);

    await screen.findByLabelText("POS Revenue 2026-08-10");

    for (const weekday of WEEKDAYS) {
      expect(screen.getByText(weekday, { exact: false })).toBeInTheDocument();
    }
    expect(screen.getByLabelText("POS Revenue 2026-08-11")).toHaveValue(0);
    expect(screen.getByLabelText("POS Revenue 2026-08-12")).toHaveValue(1830);
  });

  it("lets an untraded day be filled in", async () => {
    const user = userEvent.setup();
    render(<WeekEditor weekStart={WEEK} onChangeWeek={() => {}} />);

    const thursday = await screen.findByLabelText("POS Revenue 2026-08-13");
    await user.clear(thursday);
    await user.type(thursday, "1780");

    expect(thursday).toHaveValue(1780);
  });

  it("sends the session token when loading the week", async () => {
    render(<WeekEditor weekStart={WEEK} onChangeWeek={() => {}} />);
    await screen.findByLabelText("POS Revenue 2026-08-10");

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers).toMatchObject({ Authorization: "Bearer test-token" });
  });
});

describe("AS-021: saving sends the whole week", () => {
  it("submits all seven days in one request, carrying the edit", async () => {
    const user = userEvent.setup();
    render(<WeekEditor weekStart={WEEK} onChangeWeek={() => {}} />);

    const wednesday = await screen.findByLabelText("POS Revenue 2026-08-12");
    await user.clear(wednesday);
    await user.type(wednesday, "2000");

    fetchMock.mockResolvedValueOnce(respondOk(week({ 2: { pos_revenue: 2000 } })));
    await user.click(screen.getByRole("button", { name: /save week/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    const [url, init] = fetchMock.mock.calls[1];
    expect(String(url)).toContain("/api/v1/admin/trading_days");
    expect(init.method).toBe("PUT");

    const sent = JSON.parse(init.body as string);
    expect(sent.week_start).toBe(WEEK);
    expect(sent.days).toHaveLength(7);
    expect(sent.days[2].pos_revenue).toBe(2000);
  });

  it("confirms the save so the manager knows it landed", async () => {
    const user = userEvent.setup();
    render(<WeekEditor weekStart={WEEK} onChangeWeek={() => {}} />);
    await screen.findByLabelText("POS Revenue 2026-08-10");

    fetchMock.mockResolvedValueOnce(respondOk(week()));
    await user.click(screen.getByRole("button", { name: /save week/i }));

    expect(await screen.findByRole("status")).toHaveTextContent(/week saved/i);
  });
});

describe("AS-022: an invalid entry", () => {
  it("reports the refusal and leaves the edited value on screen to correct", async () => {
    const user = userEvent.setup();
    render(<WeekEditor weekStart={WEEK} onChangeWeek={() => {}} />);

    const friday = await screen.findByLabelText("Labour Costs 2026-08-14");
    await user.clear(friday);
    await user.type(friday, "-1");

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({
        error: "2026-08-14: Labour cost must be greater than or equal to 0",
      }),
    });

    await user.click(screen.getByRole("button", { name: /save week/i }));

    await screen.findByRole("alert");

    // The refusal is attached to the box that caused it, not left as a banner
    // the reader has to translate into "which of twenty-eight inputs".
    const offending = screen.getByLabelText("Labour Costs 2026-08-14");
    expect(offending).toHaveAttribute("aria-invalid", "true");
    expect(offending).toHaveAccessibleDescription(/labour cost/i);
    expect(offending).toHaveFocus();

    // Untouched fields are not marked.
    expect(screen.getByLabelText("Labour Costs 2026-08-13")).not.toHaveAttribute(
      "aria-invalid",
    );

    // Nothing was confirmed as saved.
    expect(screen.queryByText(/week saved/i)).not.toBeInTheDocument();
  });

  it("keeps an unrecognised refusal as a banner rather than swallowing it", async () => {
    const user = userEvent.setup();
    render(<WeekEditor weekStart={WEEK} onChangeWeek={() => {}} />);
    await screen.findByLabelText("POS Revenue 2026-08-10");

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({
        error: "these dates fall outside the week beginning 2026-08-10",
      }),
    });
    await user.click(screen.getByRole("button", { name: /save week/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/fall outside the week/i);
  });

  it("does not overwrite the table with a partially applied week", async () => {
    const user = userEvent.setup();
    render(<WeekEditor weekStart={WEEK} onChangeWeek={() => {}} />);

    const wednesday = await screen.findByLabelText("POS Revenue 2026-08-12");
    await user.clear(wednesday);
    await user.type(wednesday, "2000");

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({ error: "2026-08-14: Labour cost must be greater than or equal to 0" }),
    });
    await user.click(screen.getByRole("button", { name: /save week/i }));
    await screen.findByRole("alert");

    // The manager's edit survives so they can fix the other field and retry.
    expect(screen.getByLabelText("POS Revenue 2026-08-12")).toHaveValue(2000);
  });
});
