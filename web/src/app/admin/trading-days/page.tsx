"use client";

import { useRouter } from "next/navigation";

import { AdminGuard } from "@/components/admin/AdminGuard";
import { WeekEditor } from "@/components/admin/WeekEditor";
import { clearToken } from "@/lib/auth";

export default function AdminTradingDaysPage() {
  const router = useRouter();

  return (
    <AdminGuard
      currentPath="/admin/trading-days"
      onRedirect={(target) => router.replace(target)}
    >
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-6 py-12">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Trading figures</h1>
            <p className="mt-1 text-sm text-neutral-500">
              All seven days are saved together.
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <a href="/" className="text-neutral-600 underline underline-offset-4">
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

        <WeekEditor />
      </main>
    </AdminGuard>
  );
}
