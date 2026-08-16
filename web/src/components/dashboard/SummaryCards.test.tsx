import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import type { RevenueTrend } from "@/lib/api";

import { SummaryCards } from "./SummaryCards";

function summary(
  overrides: Partial<RevenueTrend["summary"]> = {},
): RevenueTrend["summary"] {
  return {
    total_revenue: { current: 16977, previous: null, delta_pct: null },
    average_per_day: { current: 2425, previous: null, delta_pct: null },
    total_covers: { current: 950, previous: null, delta_pct: null },
    ...overrides,
  };
}

describe("AS-006 / C-004: three figures with no comparison", () => {
  it("shows each figure once, with no comparison text", () => {
    render(<SummaryCards summary={summary()} compareMode={false} />);

    expect(screen.getByText("Total Revenue")).toBeInTheDocument();
    expect(screen.getByText("$16,977")).toBeInTheDocument();
    expect(screen.getByText("$2,425")).toBeInTheDocument();
    expect(screen.getByText("950")).toBeInTheDocument();

    expect(screen.queryByText(/^vs/)).not.toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it("shows the average the API computed, not one derived in the browser", () => {
    // 16977 / 7 = 2425.28..., and the card must not round it differently.
    render(<SummaryCards summary={summary()} compareMode={false} />);

    expect(screen.getByText("$2,425")).toBeInTheDocument();
  });
});

describe("AS-007: an increase", () => {
  const comparing = summary({
    total_revenue: { current: 15974, previous: 14982, delta_pct: 6.6 },
    average_per_day: { current: 2282, previous: 2140, delta_pct: 6.6 },
    total_covers: { current: 871, previous: 820, delta_pct: 6.2 },
  });

  it("reads current, previous and the signed change", () => {
    render(<SummaryCards summary={comparing} compareMode />);

    expect(screen.getByText("$15,974")).toBeInTheDocument();
    expect(screen.getByText("$14,982")).toBeInTheDocument();

    // Revenue and average per day move by the same percentage — the average is
    // the total over a fixed seven days, so any other pair would be a bug.
    expect(screen.getAllByText("(+6.6%)")).toHaveLength(2);
    expect(screen.getByText("(+6.2%)")).toBeInTheDocument();
  });

  it("marks the change as an increase", () => {
    render(<SummaryCards summary={comparing} compareMode />);

    expect(screen.getByTestId("delta-Total Revenue")).toHaveAttribute(
      "data-direction",
      "up",
    );
  });

  it("hides the comparison entirely when comparison is off", () => {
    render(<SummaryCards summary={comparing} compareMode={false} />);

    expect(screen.queryByText("$14,982")).not.toBeInTheDocument();
    expect(screen.queryByText("(+6.6%)")).not.toBeInTheDocument();
  });
});

describe("AS-008: a decrease", () => {
  it("reads as a decrease and is distinguishable from an increase", () => {
    render(
      <SummaryCards
        summary={summary({
          total_revenue: { current: 13000, previous: 14982, delta_pct: -13.2 },
        })}
        compareMode
      />,
    );

    expect(screen.getByText("(-13.2%)")).toBeInTheDocument();
    expect(screen.getByTestId("delta-Total Revenue")).toHaveAttribute(
      "data-direction",
      "down",
    );
  });
});

describe("AS-009: no baseline to compare against", () => {
  it("shows the previous figure as zero and no percentage at all", () => {
    render(
      <SummaryCards
        summary={summary({
          total_revenue: { current: 15974, previous: 0, delta_pct: null },
        })}
        compareMode
      />,
    );

    expect(screen.getByText("$0")).toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
    expect(screen.queryByTestId("delta-Total Revenue")).not.toBeInTheDocument();
  });

  it("does not claim the week was flat", () => {
    render(
      <SummaryCards
        summary={summary({
          total_revenue: { current: 15974, previous: 0, delta_pct: null },
        })}
        compareMode
      />,
    );

    expect(screen.queryByText("(+0.0%)")).not.toBeInTheDocument();
  });
});
