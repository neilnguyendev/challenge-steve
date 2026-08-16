"use client";

import { formatMoney } from "@/lib/format";

import { SERIES_COLOR, SERIES_KEYS, seriesLabel } from "./chart-theme";
import type { ChartRow } from "./chart-data";

interface ChartTooltipProps {
  compareMode: boolean;
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
export function ChartTooltip({ compareMode, active, payload }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  const row = payload[0].payload;

  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2 shadow-sm">
      <p className="mb-1.5 text-xs font-medium text-neutral-500">
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
              color: SERIES_COLOR.current[key],
            });
          }

          if (compareMode && row[previousField] !== null) {
            lines.push({
              id: `previous-${key}`,
              label: seriesLabel(key, "previous"),
              value: row[previousField] as number,
              color: SERIES_COLOR.previous[key],
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
            <span className="text-neutral-600">{line.label}</span>
            <span className="ml-auto pl-4 font-medium tabular-nums text-neutral-900">
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
