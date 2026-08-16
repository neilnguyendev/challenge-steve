"use client";

import { useEffect, useState } from "react";

import { CHART_PALETTE, type ChartPalette } from "./chart-theme";

const DARK = "(prefers-color-scheme: dark)";

/**
 * Which chart palette to paint with.
 *
 * The chart cannot inherit colour the way text does — Recharts writes fills
 * onto the SVG, and Export PNG serialises that SVG without a stylesheet, so
 * the value has to be a real colour by the time it is drawn.
 *
 * Starts light and corrects after mount: server and client must agree on the
 * first render, and the server has no way to know the reader's preference.
 */
export function useChartPalette(): ChartPalette {
  const [scheme, setScheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const query = window.matchMedia(DARK);
    const sync = () => setScheme(query.matches ? "dark" : "light");

    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return CHART_PALETTE[scheme];
}
