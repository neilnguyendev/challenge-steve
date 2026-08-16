/**
 * Money is whole AUD everywhere in this system — the API sends integers and the
 * venue records takings to the dollar, so no figure ever needs decimals.
 */
export function formatMoney(value: number): string {
  const sign = value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toLocaleString("en-AU")}`;
}

export function formatCount(value: number): string {
  return value.toLocaleString("en-AU");
}

/** "+6.6%" / "-13.2%". Null when there is no baseline to compare against. */
export function formatDelta(deltaPct: number | null): string | null {
  if (deltaPct === null) return null;
  const sign = deltaPct > 0 ? "+" : "";
  return `${sign}${deltaPct.toFixed(1)}%`;
}
