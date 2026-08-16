/**
 * Every colour and label the chart uses, in one place.
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

export type ChartPalette = {
  series: Record<Period, Record<SeriesKey, string>>;
  grid: string;
  axisText: string;
};

/**
 * Concrete hex rather than CSS variables.
 *
 * Recharts writes these straight onto the SVG, and Export PNG serialises that
 * SVG on its own — a `var(--…)` would have nothing to resolve against in the
 * exported file and every bar would come out unpainted.
 *
 * The previous period is the same hue desaturated, so the eye reads it as "the
 * same thing, earlier" rather than as a new metric.
 */
export const CHART_PALETTE: Record<"light" | "dark", ChartPalette> = {
  // Light matches the client's prototype swatch for swatch: near-black POS,
  // periwinkle Eatclub, orange labour, each echoed pale for the previous week.
  light: {
    series: {
      current: { pos: "#262626", eatclub: "#5b5bef", labour: "#f2711c" },
      previous: { pos: "#b8b8b8", eatclub: "#c3c3f7", labour: "#f8cbb0" },
    },
    grid: "#e5e5e5",
    axisText: "#737373",
  },
  dark: {
    // Near-black bars vanish on a dark surface, so the current period lifts to
    // a light slate and the previous period drops behind it instead.
    series: {
      current: { pos: "#e2e8f0", eatclub: "#818cf8", labour: "#fb923c" },
      previous: { pos: "#475569", eatclub: "#3730a3", labour: "#7c2d12" },
    },
    grid: "#26304a",
    axisText: "#94a3b8",
  },
};

/** Fixed so two different weeks are comparable by eye, not just by number. */
export const Y_AXIS_TICKS = [0, 750, 1500, 2250, 3000];
