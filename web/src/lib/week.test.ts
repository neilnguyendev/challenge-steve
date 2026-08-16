import { describe, expect, it } from "vitest";

import {
  formatWeekRange,
  hasEarlierWeek,
  hasLaterWeek,
  mondayOf,
  shiftWeeks,
} from "./week";

describe("mondayOf", () => {
  it("returns the same day when given a Monday", () => {
    expect(mondayOf(new Date(2026, 7, 10))).toBe("2026-08-10");
  });

  it("steps back to Monday from mid-week", () => {
    expect(mondayOf(new Date(2026, 7, 12))).toBe("2026-08-10"); // Wednesday
  });

  it("treats Sunday as the end of its week, not the start of the next", () => {
    expect(mondayOf(new Date(2026, 7, 16))).toBe("2026-08-10"); // Sunday
  });

  it("crosses a month boundary", () => {
    expect(mondayOf(new Date(2026, 8, 2))).toBe("2026-08-31"); // Wed 2 Sep
  });
});

describe("shiftWeeks", () => {
  it("moves back a week", () => {
    expect(shiftWeeks("2026-08-10", -1)).toBe("2026-08-03");
  });

  it("moves forward across a month boundary", () => {
    expect(shiftWeeks("2026-08-31", 1)).toBe("2026-09-07");
  });
});

describe("C-007: hasEarlierWeek bounds backward navigation", () => {
  it("is true while recorded trading reaches into an earlier week", () => {
    expect(hasEarlierWeek("2026-08-10", "2026-08-03")).toBe(true);
  });

  it("is false at the earliest recorded week", () => {
    expect(hasEarlierWeek("2026-08-03", "2026-08-03")).toBe(false);
  });

  it("is false when the earliest recorded day is mid-week of the current week", () => {
    expect(hasEarlierWeek("2026-08-10", "2026-08-12")).toBe(false);
  });

  it("is false when nothing has ever been recorded", () => {
    expect(hasEarlierWeek("2026-08-10", null)).toBe(false);
  });
});

describe("hasLaterWeek", () => {
  it("is false at the most recent recorded week", () => {
    expect(hasLaterWeek("2026-08-10", "2026-08-16")).toBe(false);
  });

  it("is true when trading was recorded in a later week", () => {
    expect(hasLaterWeek("2026-08-03", "2026-08-16")).toBe(true);
  });
});

describe("formatWeekRange", () => {
  it("spans Monday to Sunday", () => {
    expect(formatWeekRange("2026-08-10")).toBe("10 Aug – 16 Aug 2026");
  });
});
