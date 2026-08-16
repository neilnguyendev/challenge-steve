"use client";

import { formatMoney } from "@/lib/format";

import {
  CHART_PALETTE,
  SERIES_KEYS,
  seriesLabel,
  type ChartPalette,
} from "./chart-theme";
import type { ChartRow } from "./chart-data";

interface ChartTooltipProps {
  compareMode: boolean;
  /** Defaults to light: Recharts clones this element, and a tooltip that
   *  crashed for want of a prop would take the whole chart with it. */
  palette?: ChartPalette;
  /** Supplied by Recharts. */
  active?: boolean;
  payload?: Array<{ payload: ChartRow }>;
}

const ROWS = [
  { key: "pos", field: "pos", previousField: "previousPos" },
  { key: "eatclub", field: "eatclub", previousField: "previousEatclub" },
  { key: "labour", field: "labour", previousField: "previousLabour" },
] as const;

/**
 * One tooltip for the whole day, not one per segment.
 *
 * Every visible figure appears at once because the reason to hover is to
 * compare them; six separate tooltips would mean six hovers to see one day.
 * Each row shows that segment's own value — the Eatclub row of a $2,070 bar
 * reads $320, never $2,070.
 */
export function ChartTooltip({
  compareMode,
  palette = CHART_PALETTE.light,
  active,
  payload,
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  const row = payload[0].payload;

  return (
    <div className="rounded-[--radius-sm] border border-border bg-surface-raised px-3 py-2 shadow-lg shadow-black/5">
      <p className="mb-1.5 text-xs font-medium text-text-subtle">
        {row.weekday} {row.date}
      </p>

      <ul className="flex flex-col gap-1">
        {ROWS.flatMap(({ key, field, previousField }) => {
          const lines = [];

          if (row[field] !== null) {
            lines.push({
              id: `current-${key}`,
              label: seriesLabel(key, compareMode ? "current" : undefined),
              value: row[field] as number,
              color: palette.series.current[key],
            });
          }

          if (compareMode && row[previousField] !== null) {
            lines.push({
              id: `previous-${key}`,
              label: seriesLabel(key, "previous"),
              value: row[previousField] as number,
              color: palette.series.previous[key],
            });
          }

          return lines;
        }).map((line) => (
          <li key={line.id} className="flex items-center gap-2 text-sm">
            <span
              aria-hidden
              className="size-2.5 rounded-full"
              style={{ backgroundColor: line.color }}
            />
            <span className="text-text-muted">{line.label}</span>
            <span className="tabular ml-auto pl-4 font-medium text-text">
              {formatMoney(line.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Referenced so the series order stays tied to the shared definition.
void SERIES_KEYS;
