"use client";

import { useEffect, useState, type FormEvent } from "react";

import {
  fetchAdminWeek,
  saveAdminWeek,
  type EditableDay,
} from "@/lib/api";
import { authHeaders } from "@/lib/auth";
import { formatWeekRange } from "@/lib/week";

const FIGURES = [
  { field: "pos_revenue", label: "POS Revenue" },
  { field: "eatclub_revenue", label: "Eatclub Revenue" },
  { field: "labour_cost", label: "Labour Costs" },
  { field: "covers", label: "Covers" },
] as const;

type FigureField = (typeof FIGURES)[number]["field"];

type Status =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "failed"; message: string };

interface WeekEditorProps {
  weekStart: string;
  onChangeWeek: (weeks: number) => void;
}

export function WeekEditor({ weekStart, onChangeWeek }: WeekEditorProps) {
  const [days, setDays] = useState<EditableDay[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  useEffect(() => {
    let current = true;
    setDays(null);
    setStatus({ kind: "idle" });

    fetchAdminWeek(weekStart, authHeaders())
      .then((week) => current && setDays(week.days))
      .catch((cause: unknown) => {
        if (!current) return;
        setLoadError(cause instanceof Error ? cause.message : "Unknown error");
      });

    return () => {
      current = false;
    };
  }, [weekStart]);

  function updateFigure(date: string, field: FigureField, raw: string) {
    // An emptied box means zero, not "leave whatever was there" — the manager
    // is stating the venue took nothing, and the API needs a number.
    const value = raw === "" ? 0 : Number(raw);

    setDays((current) =>
      current?.map((day) => (day.date === date ? { ...day, [field]: value } : day)) ?? null,
    );
    setStatus({ kind: "idle" });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!days) return;

    setStatus({ kind: "saving" });

    try {
      const saved = await saveAdminWeek({ week_start: weekStart, days }, authHeaders());
      setDays(saved.days);
      setStatus({ kind: "saved" });
    } catch (cause) {
      setStatus({
        kind: "failed",
        message: cause instanceof Error ? cause.message : "Could not save",
      });
    }
  }

  if (loadError) {
    return (
      <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        The week could not be loaded: {loadError}
      </p>
    );
  }

  if (!days) {
    return (
      <p role="status" className="text-sm text-neutral-500">
        Loading the week…
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex items-center gap-3 text-sm text-neutral-600">
        <button
          type="button"
          aria-label="Earlier week"
          onClick={() => onChangeWeek(-1)}
          className="rounded-md border border-neutral-200 px-2 py-1"
        >
          ←
        </button>
        <span className="tabular-nums">{formatWeekRange(weekStart)}</span>
        <button
          type="button"
          aria-label="Later week"
          onClick={() => onChangeWeek(1)}
          className="rounded-md border border-neutral-200 px-2 py-1"
        >
          →
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[46rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-neutral-500">
              <th scope="col" className="py-2 pr-4 font-medium">Day</th>
              {FIGURES.map((figure) => (
                <th key={figure.field} scope="col" className="py-2 pr-4 font-medium">
                  {figure.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <tr key={day.date} className="border-b border-neutral-100">
                <th scope="row" className="py-2 pr-4 text-left font-normal text-neutral-700">
                  {day.weekday}{" "}
                  <span className="text-neutral-400 tabular-nums">{day.date}</span>
                </th>
                {FIGURES.map((figure) => (
                  <td key={figure.field} className="py-2 pr-4">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      // An untraded day shows 0, never a blank box: blank reads
                      // as "not asked", zero reads as "we did not trade".
                      value={day[figure.field]}
                      aria-label={`${figure.label} ${day.date}`}
                      onChange={(e) => updateFigure(day.date, figure.field, e.target.value)}
                      className="w-28 rounded-md border border-neutral-300 px-2 py-1 tabular-nums focus:border-neutral-900 focus:outline-none"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={status.kind === "saving"}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {status.kind === "saving" ? "Saving…" : "Save week"}
        </button>

        {status.kind === "saved" ? (
          <p role="status" className="text-sm text-emerald-700">
            Week saved. The dashboard shows it on the next load.
          </p>
        ) : null}

        {status.kind === "failed" ? (
          <p role="alert" className="text-sm text-red-700">
            {status.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
