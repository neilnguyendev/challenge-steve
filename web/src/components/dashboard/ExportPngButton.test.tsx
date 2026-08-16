import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";

import { ExportPngButton } from "./ExportPngButton";
import { buildSvgDataUrl, exportFileName } from "./chart-export";

function chartContainer(): HTMLDivElement {
  const container = document.createElement("div");
  container.innerHTML =
    '<svg viewBox="0 0 800 360"><rect width="10" height="10" /><text>Mon</text></svg>';
  return container;
}

describe("AS-024: exporting reflects what is on screen", () => {
  it("exports the chart currently drawn, with a name naming the week", async () => {
    const user = userEvent.setup();
    const onExport = vi.fn().mockResolvedValue(undefined);
    const ref = createRef<HTMLElement>();
    Object.assign(ref, { current: chartContainer() });

    render(
      <ExportPngButton
        chartRef={ref}
        weekStart="2026-08-10"
        compareMode={false}
        onExport={onExport}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Export PNG" }));

    await waitFor(() => expect(onExport).toHaveBeenCalledTimes(1));
    const [target, fileName] = onExport.mock.calls[0];
    expect(target.svg.tagName.toLowerCase()).toBe("svg");
    expect(fileName).toBe("revenue-trend-2026-08-10.png");
  });

  it("names the file differently when comparison is on", () => {
    expect(exportFileName("2026-08-10", true)).toBe(
      "revenue-trend-2026-08-10-vs-previous.png",
    );
  });

  it("leaves the page as it was", async () => {
    const user = userEvent.setup();
    const ref = createRef<HTMLElement>();
    Object.assign(ref, { current: chartContainer() });

    render(
      <ExportPngButton
        chartRef={ref}
        weekStart="2026-08-10"
        compareMode
        onExport={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    const before = document.body.innerHTML;
    await user.click(screen.getByRole("button", { name: "Export PNG" }));

    expect(document.body.innerHTML).toBe(before);
  });

  it("says so rather than failing silently when nothing is drawn", async () => {
    const user = userEvent.setup();
    const onExport = vi.fn();
    const ref = createRef<HTMLElement>();

    render(
      <ExportPngButton
        chartRef={ref}
        weekStart="2026-08-10"
        compareMode={false}
        onExport={onExport}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Export PNG" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/no chart to export/i);
    expect(onExport).not.toHaveBeenCalled();
  });
});

describe("buildSvgDataUrl", () => {
  it("carries the drawing and gives it an intrinsic size", () => {
    const svg = chartContainer().querySelector("svg")!;
    const url = buildSvgDataUrl(svg as SVGSVGElement, 800, 360);
    const markup = decodeURIComponent(url.replace("data:image/svg+xml;charset=utf-8,", ""));

    expect(markup).toContain('width="800"');
    expect(markup).toContain('height="360"');
    expect(markup).toContain("xmlns");
    expect(markup).toContain("Mon");
  });

  it("does not mutate the chart it copied from", () => {
    const svg = chartContainer().querySelector("svg")! as SVGSVGElement;
    buildSvgDataUrl(svg, 800, 360);

    expect(svg.getAttribute("width")).toBeNull();
  });
});
