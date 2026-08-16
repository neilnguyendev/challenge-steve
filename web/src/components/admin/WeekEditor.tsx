"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { fetchAdminWeek, saveAdminWeek, type EditableDay } from "@/lib/api";
import { authHeaders } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import { formatWeekRange } from "@/lib/week";

import { parseSaveError, type FieldError } from "./save-error";

const FIGURES = [
  { field: "pos_revenue", label: "POS Revenue", money: true },
  { field: "eatclub_revenue", label: "Eatclub Revenue", money: true },
  { field: "labour_cost", label: "Labour Costs", money: true },
  { field: "covers", label: "Covers", money: false },
] as const;

type FigureField = (typeof FIGURES)[number]["field"];

type Status =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "failed"; message: string; field: FieldError | null };

interface WeekEditorProps {
  weekStart: string;
  onChangeWeek: (weeks: number) => void;
}

export function WeekEditor({ weekStart, onChangeWeek }: WeekEditorProps) {
  const [days, setDays] = useState<EditableDay[] | null>(null);
  const [saved, setSaved] = useState<EditableDay[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    let current = true;
    setDays(null);
    setStatus({ kind: "idle" });

    fetchAdminWeek(weekStart, authHeaders())
      .then((week) => {
        if (!current) return;
        setDays(week.days);
        setSaved(week.days);
      })
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

    setDays(
      (current) =>
        current?.map((day) => (day.date === date ? { ...day, [field]: value } : day)) ??
        null,
    );
    setStatus({ kind: "idle" });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!days) return;

    setStatus({ kind: "saving" });

    try {
      const week = await saveAdminWeek({ week_start: weekStart, days }, authHeaders());
      setDays(week.days);
      setSaved(week.days);
      setStatus({ kind: "saved" });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Could not save";
      const field = parseSaveError(message);
      setStatus({ kind: "failed", message, field });

      // Put the cursor in the box that has to change rather than leaving the
      // reader to find it among twenty-eight of them.
      if (field) {
        formRef.current
          ?.querySelector<HTMLInputElement>(`[data-cell="${field.date}:${field.field}"]`)
          ?.focus();
      }
    }
  }

  if (loadError) {
    return (
      <p
        role="alert"
        className="rounded-[--radius] border border-negative/30 bg-negative-surface px-4 py-3 text-sm text-negative"
      >
        The week could not be loaded: {loadError}
      </p>
    );
  }

  if (!days) {
    return (
      <div role="status" aria-label="Loading the week" className="flex flex-col gap-2">
        {Array.from({ length: 8 }, (_, i) => (
          <div
            key={i}
            className="h-11 animate-pulse rounded-[--radius-sm] bg-surface-sunken"
          />
        ))}
      </div>
    );
  }

  const failure = status.kind === "failed" ? status : null;
  const dirty = saved !== null && JSON.stringify(days) !== JSON.stringify(saved);

  const totals = FIGURES.map((figure) => ({
    ...figure,
    total: days.reduce((sum, day) => sum + day[figure.field], 0),
  }));

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2 text-sm text-text-muted">
        <StepButton
          label="Earlier week"
          direction="left"
          onClick={() => onChangeWeek(-1)}
        />
        <span className="tabular px-1 font-medium text-text">
          {formatWeekRange(weekStart)}
        </span>
        <StepButton
          label="Later week"
          direction="right"
          onClick={() => onChangeWeek(1)}
        />

        {dirty ? (
          <span className="ml-auto inline-flex items-center gap-1.5 text-text-subtle">
            <span aria-hidden className="size-1.5 rounded-full bg-text-subtle" />
            Unsaved changes
          </span>
        ) : null}
      </div>

      {/* Wide table, narrow phone: scroll it rather than let it break the page.
          The wrapper is focusable so the scroll region is reachable by keyboard. */}
      <div
        tabIndex={0}
        role="region"
        aria-label="Trading figures for the week"
        className="overflow-x-auto rounded-[--radius] border border-border"
      >
        <table className="w-full min-w-[44rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-sunken text-left">
              <th scope="col" className="px-4 py-2.5 font-medium text-text-muted">
                Day
              </th>
              {FIGURES.map((figure) => (
                <th
                  key={figure.field}
                  scope="col"
                  className="px-4 py-2.5 font-medium text-text-muted"
                >
                  {figure.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {days.map((day) => (
              <tr
                key={day.date}
                className="border-b border-border/60 transition-colors duration-150 last:border-b-0 hover:bg-surface-hover"
              >
                <th scope="row" className="px-4 py-2 text-left font-normal">
                  <span className="text-text">{day.weekday}</span>{" "}
                  <span className="tabular text-text-subtle">{day.date}</span>
                </th>

                {FIGURES.map((figure) => (
                  <Cell
                    key={figure.field}
                    day={day}
                    field={figure.field}
                    label={figure.label}
                    error={
                      failure?.field?.date === day.date &&
                      failure.field.field === figure.field
                        ? failure.field.message
                        : undefined
                    }
                    onChange={updateFigure}
                  />
                ))}
              </tr>
            ))}
          </tbody>

          {/* A week total per column: the cheapest way to notice a figure typed
              with one digit too many. */}
          <tfoot>
            <tr className="border-t border-border bg-surface-sunken">
              <th
                scope="row"
                className="px-4 py-2.5 text-left font-medium text-text-muted"
              >
                Week total
              </th>
              {totals.map((figure) => (
                <td
                  key={figure.field}
                  className="tabular px-4 py-2.5 font-medium text-text"
                >
                  {figure.money
                    ? formatMoney(figure.total)
                    : figure.total.toLocaleString("en-AU")}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          type="submit"
          disabled={status.kind === "saving"}
          className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-[--radius-sm] bg-accent px-5 text-sm font-medium text-on-accent transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status.kind === "saving" ? "Saving…" : "Save week"}
        </button>

        {status.kind === "saved" ? (
          <p
            role="status"
            className="inline-flex items-center gap-1.5 text-sm text-positive"
          >
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-4"
            >
              <path d="m4 12 5 5L20 6" />
            </svg>
            Week saved. The dashboard shows it on the next load.
          </p>
        ) : null}

        {failure ? (
          <p
            role="alert"
            className="inline-flex items-start gap-1.5 text-sm text-negative"
          >
            <AlertIcon />
            <span>
              {failure.field
                ? `${failure.field.message} — nothing was saved.`
                : failure.message}
            </span>
          </p>
        ) : null}
      </div>
    </form>
  );
}

function Cell({
  day,
  field,
  label,
  error,
  onChange,
}: {
  day: EditableDay;
  field: FigureField;
  label: string;
  error?: string;
  onChange: (date: string, field: FigureField, raw: string) => void;
}) {
  const errorId = `${day.date}-${field}-error`;

  return (
    <td className="px-4 py-2 align-top">
      <input
        type="number"
        min={0}
        step={1}
        data-cell={`${day.date}:${field}`}
        // An untraded day shows 0, never a blank box: blank reads as "not
        // asked", zero reads as "we did not trade".
        value={day[field]}
        aria-label={`${label} ${day.date}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(e) => onChange(day.date, field, e.target.value)}
        className={[
          "tabular h-11 w-28 rounded-[--radius-sm] border bg-surface px-2 text-text",
          "transition-colors duration-150 hover:border-text-subtle",
          error ? "border-negative" : "border-border-strong",
        ].join(" ")}
      />
      {error ? (
        <p id={errorId} className="mt-1 w-28 text-xs leading-snug text-negative">
          {error}
        </p>
      ) : null}
    </td>
  );
}

function StepButton({
  label,
  direction,
  onClick,
}: {
  label: string;
  direction: "left" | "right";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex size-11 cursor-pointer items-center justify-center rounded-[--radius-sm] border border-border text-text-muted transition-colors duration-150 hover:bg-surface-hover"
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
        <path d={direction === "left" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"} />
      </svg>
    </button>
  );
}

function AlertIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className="mt-px size-4 shrink-0"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16h.01" />
    </svg>
  );
}
