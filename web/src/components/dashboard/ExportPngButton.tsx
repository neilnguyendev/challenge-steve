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
        className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-border bg-surface-sunken px-5 text-sm font-semibold text-text transition-colors duration-150 hover:bg-surface-hover"
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-4"
        >
          <path d="M12 3v12" />
          <path d="m7 12 5 5 5-5" />
          <path d="M5 21h14" />
        </svg>
        Export PNG
      </button>
      {error ? (
        <span role="alert" className="text-sm text-negative">
          {error}
        </span>
      ) : null}
    </>
  );
}
