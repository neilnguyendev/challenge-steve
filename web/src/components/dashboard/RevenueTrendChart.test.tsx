import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import type { RevenueTrend } from "@/lib/api";

import { RevenueTrendChart } from "./RevenueTrendChart";
import { ChartTooltip } from "./ChartTooltip";
import { toChartRows } from "./chart-data";
import { currentMonday } from "@/lib/week";

const ALL_VISIBLE = { pos: true, eatclub: true, labour: true };

function trend(compare = false, zeroed = false, weekStart = "2026-08-10"): RevenueTrend {
  const figures = zeroed
    ? { pos_revenue: 0, eatclub_revenue: 0, labour_cost: 0, covers: 0 }
    : { pos_revenue: 2150, eatclub_revenue: 400, labour_cost: 800, covers: 145 };

  return {
    period: { start: weekStart, end: "2026-08-16" },
    previous_period: compare ? { start: "2026-08-03", end: "2026-08-09" } : null,
    available_range: { earliest: "2026-08-03", latest: "2026-08-16" },
    summary: {
      total_revenue: { current: 0, previous: null, delta_pct: null },
      average_per_day: { current: 0, previous: null, delta_pct: null },
      total_covers: { current: 0, previous: null, delta_pct: null },
    },
    series: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((weekday, i) => ({
      date: `2026-08-${10 + i}`,
      weekday,
      current: { ...figures },
      previous: compare
        ? { pos_revenue: 1900, eatclub_revenue: 350, labour_cost: 700, covers: 130 }
        : null,
    })),
  };
}

function renderChart(props: Partial<Parameters<typeof RevenueTrendChart>[0]> = {}) {
  return render(
    <RevenueTrendChart
      data={trend()}
      compareMode={false}
      visibleSeries={ALL_VISIBLE}
      width={800}
      height={360}
      {...props}
    />,
  );
}

describe("FE04-AS-1: default mode", () => {
  it("names the three series once each, without period suffixes", () => {
    renderChart();

    expect(screen.getByText("POS Revenue")).toBeInTheDocument();
    expect(screen.getByText("Eatclub Revenue")).toBeInTheDocument();
    expect(screen.getByText("Labour Costs")).toBeInTheDocument();
    expect(screen.queryByText(/\(Current\)/)).not.toBeInTheDocument();
  });
});

describe("FE04-AS-2: compare mode", () => {
  it("shows six symmetrical legend entries", () => {
    renderChart({ data: trend(true), compareMode: true });

    for (const label of [
      "POS Revenue (Current)",
      "Eatclub Revenue (Current)",
      "Labour Costs (Current)",
      "POS Revenue (Previous)",
      "Eatclub Revenue (Previous)",
      "Labour Costs (Previous)",
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("uses no prototype label naming a running total", () => {
    renderChart({ data: trend(true), compareMode: true });

    expect(screen.queryByText(/Total Revenue/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Direct Revenue/)).not.toBeInTheDocument();
  });
});

describe("FE04-AS-4: hiding a series", () => {
  it("drops both of its legend entries and keeps the rest", () => {
    renderChart({
      data: trend(true),
      compareMode: true,
      visibleSeries: { pos: true, eatclub: true, labour: false },
    });

    expect(screen.queryByText("Labour Costs (Current)")).not.toBeInTheDocument();
    expect(screen.queryByText("Labour Costs (Previous)")).not.toBeInTheDocument();
    expect(screen.getByText("POS Revenue (Current)")).toBeInTheDocument();
    expect(screen.getByText("POS Revenue (Previous)")).toBeInTheDocument();
  });
});

describe("FE04-AS-5: the Y axis", () => {
  it("keeps its fixed marks whatever the data reaches", () => {
    renderChart();

    for (const tick of ["0k", "0.75k", "1.5k", "2.25k", "3k"]) {
      expect(screen.getByText(tick)).toBeInTheDocument();
    }
  });

  it("labels every weekday on the X axis", () => {
    renderChart();

    for (const day of ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]) {
      expect(screen.getByText(day)).toBeInTheDocument();
    }
  });
});

describe("FE04-AS-6: a week with no trading", () => {
  it("shows the empty state instead of a chart, without throwing", () => {
    expect(() => renderChart({ data: trend(false, true) })).not.toThrow();

    expect(screen.getByRole("status")).toHaveTextContent("No data for this period");
    expect(screen.queryByText("POS Revenue")).not.toBeInTheDocument();
  });

  it("offers a way back to the current week, with no query string on it", () => {
    // Landing on a bare URL resolves to the current week and the default
    // settings, which is what someone stranded in an empty past week wants.
    renderChart({ data: trend(false, true, "2020-01-06") });

    expect(screen.getByRole("link", { name: /back to this week/i })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("does not offer it when you are already on the current week", () => {
    // Clicking it there would change nothing, so it is not shown.
    const thisWeek = currentMonday();
    renderChart({ data: trend(false, true, thisWeek) });

    expect(screen.getByRole("status")).toHaveTextContent("No data for this period");
    expect(screen.queryByRole("link", { name: /back to this week/i })).not.toBeInTheDocument();
  });
});

describe("FE04-AS-8: the tooltip", () => {
  const rows = toChartRows(trend(true), true, ALL_VISIBLE);

  it("lists all six figures for the hovered day", () => {
    render(<ChartTooltip compareMode active payload={[{ payload: rows[5] }]} />);

    expect(screen.getByText("POS Revenue (Current)")).toBeInTheDocument();
    expect(screen.getByText("Labour Costs (Previous)")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(6);
  });

  it("shows each segment's own value, not the running total", () => {
    render(<ChartTooltip compareMode active payload={[{ payload: rows[5] }]} />);

    // Saturday: POS 2150 + Eatclub 400 = 2550. The Eatclub row reads 400.
    expect(screen.getByText("$400")).toBeInTheDocument();
    expect(screen.queryByText("$2,550")).not.toBeInTheDocument();
  });

  it("formats money with a thousands separator and no decimals", () => {
    render(<ChartTooltip compareMode active payload={[{ payload: rows[5] }]} />);

    expect(screen.getByText("$2,150")).toBeInTheDocument();
  });

  it("omits a hidden series", () => {
    const partial = toChartRows(trend(true), true, {
      pos: true,
      eatclub: true,
      labour: false,
    });
    render(<ChartTooltip compareMode active payload={[{ payload: partial[5] }]} />);

    expect(screen.queryByText(/Labour Costs/)).not.toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
  });

  it("renders nothing when not hovering", () => {
    const { container } = render(
      <ChartTooltip compareMode active={false} payload={[{ payload: rows[0] }]} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
