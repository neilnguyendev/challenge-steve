import { describe, expect, it } from "vitest";

import {
  ALL_SERIES_VISIBLE,
  parseDashboardParams,
  toSearchParams,
} from "./dashboard-params";

const TODAY = "2026-08-17"; // a Monday, used as the fallback week

function parse(query: string) {
  return parseDashboardParams(new URLSearchParams(query), TODAY);
}

describe("reading the view out of a URL", () => {
  it("falls back to the current week with no parameters", () => {
    expect(parse("")).toEqual({
      weekStart: TODAY,
      compareMode: false,
      visibleSeries: ALL_SERIES_VISIBLE,
    });
  });

  it("takes the week, the comparison setting and the visible series", () => {
    expect(parse("week=2026-08-10&compare=1&series=pos,labour")).toEqual({
      weekStart: "2026-08-10",
      compareMode: true,
      visibleSeries: { pos: true, eatclub: false, labour: true },
    });
  });
});

describe("a URL someone typed by hand", () => {
  it("ignores a week that is not a Monday", () => {
    // The API only serves Monday-anchored weeks; passing this on would answer
    // with an error the visitor never asked for.
    expect(parse("week=2026-08-11").weekStart).toBe(TODAY);
  });

  it("ignores a malformed date", () => {
    expect(parse("week=last-tuesday").weekStart).toBe(TODAY);
    expect(parse("week=2026-13-45").weekStart).toBe(TODAY);
  });

  it("treats anything but compare=1 as off", () => {
    expect(parse("compare=true").compareMode).toBe(false);
    expect(parse("compare=0").compareMode).toBe(false);
  });

  it("shows everything when the series list names nothing recognisable", () => {
    // Otherwise the chart blanks with no way back except editing the URL.
    expect(parse("series=").visibleSeries).toEqual(ALL_SERIES_VISIBLE);
    expect(parse("series=nonsense").visibleSeries).toEqual(ALL_SERIES_VISIBLE);
  });

  it("ignores unknown series names but keeps the recognised ones", () => {
    expect(parse("series=pos,made-up").visibleSeries).toEqual({
      pos: true,
      eatclub: false,
      labour: false,
    });
  });
});

describe("writing the view back to a URL", () => {
  it("always names the week, so a shared link means one week forever", () => {
    expect(
      toSearchParams({
        weekStart: "2026-08-10",
        compareMode: false,
        visibleSeries: ALL_SERIES_VISIBLE,
      }),
    ).toBe("week=2026-08-10");
  });

  it("leaves out settings that are already the default", () => {
    const query = toSearchParams({
      weekStart: "2026-08-10",
      compareMode: false,
      visibleSeries: ALL_SERIES_VISIBLE,
    });

    expect(query).not.toContain("compare");
    expect(query).not.toContain("series");
  });

  it("records comparison and a partial series selection", () => {
    expect(
      toSearchParams({
        weekStart: "2026-08-10",
        compareMode: true,
        visibleSeries: { pos: true, eatclub: false, labour: true },
      }),
    ).toBe("week=2026-08-10&compare=1&series=pos%2Clabour");
  });
});

describe("round trip", () => {
  it("survives being written out and read back", () => {
    const view = {
      weekStart: "2026-08-03",
      compareMode: true,
      visibleSeries: { pos: false, eatclub: true, labour: true },
    };

    expect(parseDashboardParams(new URLSearchParams(toSearchParams(view)), TODAY)).toEqual(
      view,
    );
  });
});
