import type { RevenueTrend } from "@/lib/api";

import { METRIC_FIELD, SERIES_KEYS, type SeriesKey } from "./chart-theme";

/**
 * One row per weekday, flattened for the chart.
 *
 * Each field is that segment's OWN value, never a running total. A stacked bar
 * made of 1750 and 320 is described here as 1750 and 320 — describing it as
 * 1750 and 2070 would draw a bar of 3820, which still looks like a chart.
 */
export interface ChartRow {
  date: string;
  weekday: string;
  pos: number | null;
  eatclub: number | null;
  labour: number | null;
  previousPos: number | null;
  previousEatclub: number | null;
  previousLabour: number | null;
}

export type VisibleSeries = Record<SeriesKey, boolean>;

/** Only the previous-period number fields — not `keyof ChartRow`, which would
 *  also admit `date` and `weekday` and collapse the assignment type to never. */
type PreviousField = "previousPos" | "previousEatclub" | "previousLabour";

const PREVIOUS_FIELD: Record<SeriesKey, PreviousField> = {
  pos: "previousPos",
  eatclub: "previousEatclub",
  labour: "previousLabour",
};

/**
 * A hidden series becomes null rather than being dropped.
 *
 * The bar stays mounted and occupies its slot, so unticking one series leaves
 * every other bar exactly where it was. Removing the bar instead would make the
 * chart re-centre, and comparing bars that move as you toggle them is the one
 * thing this control exists to allow.
 */
export function toChartRows(
  trend: RevenueTrend,
  compareMode: boolean,
  visibleSeries: VisibleSeries,
): ChartRow[] {
  return trend.series.map((day) => {
    const row: ChartRow = {
      date: day.date,
      weekday: day.weekday,
      pos: null,
      eatclub: null,
      labour: null,
      previousPos: null,
      previousEatclub: null,
      previousLabour: null,
    };

    for (const key of SERIES_KEYS) {
      if (!visibleSeries[key]) continue;

      const field = METRIC_FIELD[key];
      row[key] = day.current[field];

      if (compareMode && day.previous) {
        row[PREVIOUS_FIELD[key]] = day.previous[field] as number;
      }
    }

    return row;
  });
}

/** True when the week has no trading at all — the empty state, not an error. */
export function isEmptyWeek(trend: RevenueTrend): boolean {
  return trend.series.every(
    (day) =>
      day.current.pos_revenue === 0 &&
      day.current.eatclub_revenue === 0 &&
      day.current.labour_cost === 0 &&
      day.current.covers === 0,
  );
}
