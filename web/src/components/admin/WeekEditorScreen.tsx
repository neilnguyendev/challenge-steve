"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { AdminGuard } from "./AdminGuard";
import { WeekEditor } from "./WeekEditor";
import { clearToken } from "@/lib/auth";
import { currentMonday, shiftWeeks } from "@/lib/week";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function readWeek(raw: string | null): string {
  if (!raw || !ISO_DATE.test(raw)) return currentMonday();

  const date = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.getUTCDay() !== 1) return currentMonday();

  return raw;
}

export function WeekEditorScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Same reason as the dashboard: the week is in the URL so a reload after a
  // save comes back to the week that was being edited, not to today's.
  const weekStart = readWeek(searchParams.get("week"));

  const changeWeek = (weeks: number) =>
    router.replace(`${pathname}?week=${shiftWeeks(weekStart, weeks)}`, { scroll: false });

  return (
    <AdminGuard
      currentPath={`/admin/trading-days?week=${weekStart}`}
      onRedirect={(target) => router.replace(target)}
    >
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-6 py-12">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Trading figures</h1>
            <p className="mt-1 text-sm text-neutral-500">
              All seven days are saved together.
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            {/* Carries the week across, so switching views does not lose it. */}
            <a
              href={`/?week=${weekStart}`}
              className="text-neutral-600 underline underline-offset-4"
            >
              View dashboard
            </a>
            <button
              type="button"
              onClick={() => {
                clearToken();
                router.replace("/admin/login");
              }}
              className="text-neutral-600 underline underline-offset-4"
            >
              Sign out
            </button>
          </div>
        </header>

        <WeekEditor weekStart={weekStart} onChangeWeek={changeWeek} />
      </main>
    </AdminGuard>
  );
}
