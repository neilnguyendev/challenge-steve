/**
 * Weeks run Monday to Sunday everywhere in this system — the API refuses any
 * other start, so the browser must never offer one.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** ISO date (YYYY-MM-DD) of the Monday on or before the given day. */
export function mondayOf(date: Date): string {
  const utc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  // getUTCDay: 0 = Sunday. Shift so Monday is 0, then step back that far.
  const offset = (new Date(utc).getUTCDay() + 6) % 7;
  return toIsoDate(new Date(utc - offset * DAY_MS));
}

export function currentMonday(): string {
  return mondayOf(new Date());
}

export function shiftWeeks(isoMonday: string, weeks: number): string {
  return toIsoDate(new Date(Date.parse(`${isoMonday}T00:00:00Z`) + weeks * 7 * DAY_MS));
}

/**
 * True when stepping back from `isoMonday` would land in a week where the venue
 * never traded. `earliest` is whatever the API reported as the first recorded
 * day; a venue with nothing recorded has no earlier week to reach.
 */
export function hasEarlierWeek(isoMonday: string, earliest: string | null): boolean {
  if (!earliest) return false;
  return shiftWeeks(isoMonday, -1) >= mondayOfIso(earliest);
}

export function hasLaterWeek(isoMonday: string, latest: string | null): boolean {
  if (!latest) return false;
  return shiftWeeks(isoMonday, 1) <= mondayOfIso(latest);
}

/** "Mon 10 Aug – Sun 16 Aug 2026", for the week navigator. */
export function formatWeekRange(isoMonday: string): string {
  const start = new Date(`${isoMonday}T00:00:00Z`);
  const end = new Date(start.getTime() + 6 * DAY_MS);

  const day = (d: Date) =>
    d.toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "UTC" });

  return `${day(start)} – ${day(end)} ${end.getUTCFullYear()}`;
}

function mondayOfIso(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  const offset = (d.getUTCDay() + 6) % 7;
  return toIsoDate(new Date(d.getTime() - offset * DAY_MS));
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
