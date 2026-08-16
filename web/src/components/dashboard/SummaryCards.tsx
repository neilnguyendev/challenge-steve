"use client";

import type { RevenueTrend, SummaryFigure } from "@/lib/api";
import { formatCount, formatDelta, formatMoney } from "@/lib/format";

interface SummaryCardsProps {
  summary: RevenueTrend["summary"];
  compareMode: boolean;
}

type Format = (value: number) => string;

const CARDS: Array<{
  key: keyof RevenueTrend["summary"];
  label: string;
  format: Format;
}> = [
  { key: "total_revenue", label: "Total Revenue", format: formatMoney },
  { key: "average_per_day", label: "Average per Day", format: formatMoney },
  { key: "total_covers", label: "Total Covers", format: formatCount },
];

export function SummaryCards({ summary, compareMode }: SummaryCardsProps) {
  return (
    <section className="grid gap-4 sm:grid-cols-3">
      {CARDS.map((card) => (
        <SummaryCard
          key={card.key}
          label={card.label}
          figure={summary[card.key]}
          format={card.format}
          compareMode={compareMode}
        />
      ))}
    </section>
  );
}

function SummaryCard({
  label,
  figure,
  format,
  compareMode,
}: {
  label: string;
  figure: SummaryFigure;
  format: Format;
  compareMode: boolean;
}) {
  const delta = formatDelta(figure.delta_pct);

  return (
    <article className="rounded-xl bg-neutral-100 px-5 py-4">
      <h2 className="text-sm text-neutral-500">{label}</h2>

      <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
        <span className="text-2xl font-semibold tabular-nums text-neutral-900">
          {format(figure.current)}
        </span>

        {compareMode && figure.previous !== null ? (
          <span className="text-sm text-neutral-500">
            vs <span className="tabular-nums">{format(figure.previous)}</span>
          </span>
        ) : null}

        {/* Absent, not zero: with no baseline there is no change to report, and
            "0%" would claim the week was flat. */}
        {compareMode && delta ? (
          <span
            data-testid={`delta-${label}`}
            data-direction={figure.delta_pct! >= 0 ? "up" : "down"}
            className={
              figure.delta_pct! >= 0
                ? "text-sm font-medium tabular-nums text-emerald-600"
                : "text-sm font-medium tabular-nums text-red-600"
            }
          >
            ({delta})
          </span>
        ) : null}
      </p>
    </article>
  );
}
