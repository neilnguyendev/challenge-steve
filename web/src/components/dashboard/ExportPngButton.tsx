"use client";

import { useState, type RefObject } from "react";

import {
  downloadChartPng,
  exportFileName,
  findChartSvg,
  type ExportTarget,
} from "./chart-export";

interface ExportPngButtonProps {
  chartRef: RefObject<HTMLElement | null>;
  weekStart: string;
  compareMode: boolean;
  /** Swapped out in tests, which have no canvas to paint on. */
  onExport?: (target: ExportTarget, fileName: string) => Promise<void>;
}

export function ExportPngButton({
  chartRef,
  weekStart,
  compareMode,
  onExport = downloadChartPng,
}: ExportPngButtonProps) {
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);

    // Whatever is on screen right now is what gets exported — hidden series
    // stay hidden, comparison bars come along if they are drawn.
    const target = findChartSvg(chartRef.current);
    if (!target) {
      setError("There is no chart to export yet");
      return;
    }

    try {
      await onExport(target, exportFileName(weekStart, compareMode));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The export failed");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="rounded-full border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
      >
        Export PNG
      </button>
      {error ? (
        <span role="alert" className="text-sm text-red-700">
          {error}
        </span>
      ) : null}
    </>
  );
}
