import { describe, expect, it } from "vitest";

import type { RevenueTrend } from "@/lib/api";

import { isEmptyWeek, toChartRows } from "./chart-data";

const ALL_VISIBLE = { pos: true, eatclub: true, labour: true };

function trend(compare = true): RevenueTrend {
  return {
    period: { start: "2026-08-10", end: "2026-08-16" },
    previous_period: compare ? { start: "2026-08-03", end: "2026-08-09" } : null,
    available_range: { earliest: "2026-08-03", latest: "2026-08-16" },
    summary: {
      total_revenue: { current: 0, previous: null, delta_pct: null },
      average_per_day: { current: 0, previous: null, delta_pct: null },
      total_covers: { current: 0, previous: null, delta_pct: null },
    },
    series: [
      {
        date: "2026-08-10",
        weekday: "Mon",
        current: {
          pos_revenue: 1750,
          eatclub_revenue: 320,
          labour_cost: 590,
          covers: 118,
        },
        previous: compare
          ? {
              pos_revenue: 1520,
              eatclub_revenue: 320,
              labour_cost: 540,
              covers: 110,
            }
          : null,
      },
    ],
  };
}

describe("FE04-AS-3: the previous stack totals correctly", () => {
  it("emits each segment's own value, so the stack reaches 1840", () => {
    const [monday] = toChartRows(trend(), true, ALL_VISIBLE);

    expect(monday.previousPos).toBe(1520);
    expect(monday.previousEatclub).toBe(320);
    expect(monday.previousPos! + monday.previousEatclub!).toBe(1840);
  });

  it("never emits a cumulative total that would stack to 3360", () => {
    const [monday] = toChartRows(trend(), true, ALL_VISIBLE);

    // 1840 as a segment value is the bug: stacked on 1520 it draws 3360.
    expect(Object.values(monday)).not.toContain(1840);
    expect(monday.previousPos! + monday.previousEatclub!).not.toBe(3360);
  });
});

describe("FE04-AS-4: hiding a series keeps the remaining bars in place", () => {
  it("nulls the hidden series instead of dropping its field", () => {
    const [monday] = toChartRows(trend(), true, {
      pos: true,
      eatclub: true,
      labour: false,
    });

    expect(monday).toHaveProperty("labour", null);
    expect(monday).toHaveProperty("previousLabour", null);
    expect(monday.pos).toBe(1750);
  });

  it("hides a series in both periods at once", () => {
    const [monday] = toChartRows(trend(), true, {
      pos: false,
      eatclub: true,
      labour: true,
    });

    expect(monday.pos).toBeNull();
    expect(monday.previousPos).toBeNull();
    expect(monday.eatclub).toBe(320);
    expect(monday.previousEatclub).toBe(320);
  });

  it("keeps every row the same shape whatever is hidden", () => {
    const shown = Object.keys(toChartRows(trend(), true, ALL_VISIBLE)[0]);
    const hidden = Object.keys(
      toChartRows(trend(), true, { pos: false, eatclub: false, labour: false })[0],
    );

    expect(hidden).toEqual(shown);
  });
});

describe("FE04-AS-1: default mode", () => {
  it("leaves every previous-period field null when not comparing", () => {
    const [monday] = toChartRows(trend(false), false, ALL_VISIBLE);

    expect(monday.pos).toBe(1750);
    expect(monday.eatclub).toBe(320);
    expect(monday.labour).toBe(590);
    expect(monday.previousPos).toBeNull();
    expect(monday.previousEatclub).toBeNull();
    expect(monday.previousLabour).toBeNull();
  });

  it("ignores previous figures when comparison is off, even if sent", () => {
    const [monday] = toChartRows(trend(true), false, ALL_VISIBLE);

    expect(monday.previousPos).toBeNull();
  });
});

describe("FE04-AS-6: a week with no trading", () => {
  it("is recognised as empty", () => {
    const empty = trend(false);
    empty.series[0].current = {
      pos_revenue: 0,
      eatclub_revenue: 0,
      labour_cost: 0,
      covers: 0,
    };

    expect(isEmptyWeek(empty)).toBe(true);
  });

  it("is not empty when a single figure is non-zero", () => {
    const almost = trend(false);
    almost.series[0].current = {
      pos_revenue: 0,
      eatclub_revenue: 0,
      labour_cost: 0,
      covers: 3,
    };

    expect(isEmptyWeek(almost)).toBe(false);
  });

  it("does not treat a normal week as empty", () => {
    expect(isEmptyWeek(trend())).toBe(false);
  });
});
