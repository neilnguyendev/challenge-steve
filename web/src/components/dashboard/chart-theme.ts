/**
 * Every colour and label the dashboard uses, in one place.
 *
 * Labels compose from three metric names and a period suffix rather than being
 * six hard-coded strings, so the two periods cannot drift apart. This is a
 * deliberate departure from the prototype, which named the previous-period
 * stack "Direct Revenue" and "Total Revenue" — see docs/adr/0006.
 */

export const SERIES_KEYS = ["pos", "eatclub", "labour"] as const;
export type SeriesKey = (typeof SERIES_KEYS)[number];

export const METRIC_LABEL: Record<SeriesKey, string> = {
  pos: "POS Revenue",
  eatclub: "Eatclub Revenue",
  labour: "Labour Costs",
};

/** Which figure on a day each series reads. */
export const METRIC_FIELD = {
  pos: "pos_revenue",
  eatclub: "eatclub_revenue",
  labour: "labour_cost",
} as const;

export type Period = "current" | "previous";

export function seriesLabel(key: SeriesKey, period?: Period): string {
  if (!period) return METRIC_LABEL[key];
  return `${METRIC_LABEL[key]} (${period === "current" ? "Current" : "Previous"})`;
}

/**
 * Current period reads solid; the previous period is the same hue desaturated,
 * so the eye reads it as "the same thing, earlier" rather than a new metric.
 */
export const SERIES_COLOR: Record<Period, Record<SeriesKey, string>> = {
  current: {
    pos: "#262626",
    eatclub: "#5b5bef",
    labour: "#f2711c",
  },
  previous: {
    pos: "#b8b8b8",
    eatclub: "#c3c3f7",
    labour: "#f8cbb0",
  },
};

/** Fixed so two different weeks are comparable by eye, not just by number. */
export const Y_AXIS_TICKS = [0, 750, 1500, 2250, 3000];

export const GRID_COLOR = "#e5e5e5";
