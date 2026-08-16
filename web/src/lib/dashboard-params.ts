import { SERIES_KEYS, type SeriesKey } from "@/components/dashboard/chart-theme";

import { currentMonday } from "./week";

/**
 * The dashboard's view lives in the URL rather than in component state, so a
 * link is worth sending: whoever opens it sees the same week, the same
 * comparison setting and the same series as whoever sent it. Reloading keeps
 * the view too, which local state would have thrown away.
 */
export interface DashboardView {
  weekStart: string;
  compareMode: boolean;
  visibleSeries: Record<SeriesKey, boolean>;
}

export const ALL_SERIES_VISIBLE: Record<SeriesKey, boolean> = {
  pos: true,
  eatclub: true,
  labour: true,
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * URLs are typed and edited by hand, so every value is treated as a suggestion.
 * Anything unreadable falls back to the default rather than being passed to the
 * API, which would answer with an error the visitor did not ask for.
 */
export function parseDashboardParams(
  params: URLSearchParams,
  today: string = currentMonday(),
): DashboardView {
  return {
    weekStart: parseWeek(params.get("week"), today),
    compareMode: params.get("compare") === "1",
    visibleSeries: parseSeries(params.get("series")),
  };
}

function parseWeek(raw: string | null, fallback: string): string {
  if (!raw || !ISO_DATE.test(raw)) return fallback;

  const date = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return fallback;
  // The API only serves Monday-anchored weeks; anything else is a typo.
  if (date.getUTCDay() !== 1) return fallback;

  return raw;
}

function parseSeries(raw: string | null): Record<SeriesKey, boolean> {
  if (raw === null) return { ...ALL_SERIES_VISIBLE };

  const named = new Set(raw.split(",").map((key) => key.trim()));
  const visible = Object.fromEntries(
    SERIES_KEYS.map((key) => [key, named.has(key)]),
  ) as Record<SeriesKey, boolean>;

  // `series=` naming nothing recognisable would blank the chart with no way
  // back except editing the URL, so treat it as "show everything".
  return SERIES_KEYS.some((key) => visible[key]) ? visible : { ...ALL_SERIES_VISIBLE };
}

/**
 * Only what differs from the default is written, so the everyday URL stays
 * short and a shared one carries exactly the choices that were made. The week
 * is always written: "the week of 10 August" is what makes the link worth
 * sending, and leaving it out would make it mean something different tomorrow.
 */
export function toSearchParams(view: DashboardView): string {
  const params = new URLSearchParams({ week: view.weekStart });

  if (view.compareMode) params.set("compare", "1");

  const visible = SERIES_KEYS.filter((key) => view.visibleSeries[key]);
  if (visible.length !== SERIES_KEYS.length) params.set("series", visible.join(","));

  return params.toString();
}
