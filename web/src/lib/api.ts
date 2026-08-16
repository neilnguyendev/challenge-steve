/**
 * Single place where the frontend talks to the Rails API.
 *
 * Every feature module goes through `apiFetch` rather than calling `fetch`
 * directly, so base URL, error shape and cache policy stay in one file.
 */

/**
 * The API sits at two different addresses depending on who is calling.
 *
 * Server components run inside the `web` container, where the API is another
 * container on the Docker network — `http://api:3000`. The browser is outside
 * that network entirely and must use a published host port —
 * `http://localhost:3001`. Using either one for both cases fails silently in
 * the other, so the choice is made here rather than at each call site.
 */
function resolveBaseUrl(): string {
  const isServer = typeof window === "undefined";

  if (isServer) {
    return (
      process.env.API_INTERNAL_URL ??
      process.env.NEXT_PUBLIC_API_BASE_URL ??
      "http://localhost:3001"
    );
  }

  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
}

/** The API renders failures as `{ "error": "..." }`. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${resolveBaseUrl()}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    // Dashboard figures must reflect whatever the admin saved a moment ago.
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await extractErrorMessage(response);
    throw new ApiError(message, response.status);
  }

  return (await response.json()) as T;
}

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    if (body.error) return body.error;
  } catch {
    // Non-JSON error body — fall through to the generic message.
  }
  return `Request failed with status ${response.status}`;
}

export interface Venue {
  id: number;
  name: string;
  timezone: string;
  trading_days_recorded: number;
}

export function fetchVenues(): Promise<{ venues: Venue[] }> {
  return apiFetch<{ venues: Venue[] }>("/api/v1/venues");
}

/** The two revenue streams plus costs and headcount, for one day. */
export interface DayFigures {
  pos_revenue: number;
  eatclub_revenue: number;
  labour_cost: number;
  covers: number;
}

export interface SeriesEntry {
  date: string;
  weekday: string;
  current: DayFigures;
  /** null unless comparison is on. Same field names as `current`. */
  previous: DayFigures | null;
}

export interface SummaryFigure {
  current: number;
  previous: number | null;
  /** null when there is no baseline to compare against — never Infinity. */
  delta_pct: number | null;
}

export interface RevenueTrend {
  period: { start: string; end: string };
  previous_period: { start: string; end: string } | null;
  /** Bounds week navigation: nothing was traded outside this range. */
  available_range: { earliest: string | null; latest: string | null };
  summary: {
    total_revenue: SummaryFigure;
    average_per_day: SummaryFigure;
    total_covers: SummaryFigure;
  };
  series: SeriesEntry[];
}

export function fetchRevenueTrend(options: {
  weekStart: string;
  compare: boolean;
  venueId?: number;
}): Promise<RevenueTrend> {
  const query = new URLSearchParams({
    week_start: options.weekStart,
    compare: String(options.compare),
  });
  if (options.venueId) query.set("venue_id", String(options.venueId));

  return apiFetch<RevenueTrend>(`/api/v1/revenue_trend?${query}`);
}
