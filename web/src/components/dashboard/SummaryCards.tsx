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
  const rising = (figure.delta_pct ?? 0) >= 0;

  return (
    <article className="flex flex-col gap-1 rounded-card bg-surface-sunken px-5 py-4">
      <h2 className="text-sm text-text-muted">{label}</h2>

      <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="tabular text-2xl font-semibold tracking-tight text-text">
          {format(figure.current)}
        </span>

        {compareMode && figure.previous !== null ? (
          <span className="text-sm text-text-subtle">
            vs <span className="tabular">{format(figure.previous)}</span>
          </span>
        ) : null}

        {/* Absent, not zero: with no baseline there is no change to report, and
            "0%" would claim the week was flat.

            Styled as the prototype has it — plain coloured text in brackets.
            Colour is not the only signal even so: the leading + or - states the
            direction in text, so the meaning survives greyscale and colour
            blindness without an extra icon. */}
        {compareMode && delta ? (
          <span
            data-testid={`delta-${label}`}
            data-direction={rising ? "up" : "down"}
            className={[
              "tabular text-sm font-medium",
              rising ? "text-positive" : "text-negative",
            ].join(" ")}
          >
            ({delta})
          </span>
        ) : null}
      </p>
    </article>
  );
}
