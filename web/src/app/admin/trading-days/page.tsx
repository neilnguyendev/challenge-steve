import type { Metadata } from "next";
import { Suspense } from "react";

import { WeekEditorScreen } from "@/components/admin/WeekEditorScreen";

export const metadata: Metadata = { title: "Trading figures" };

export default function AdminTradingDaysPage() {
  return (
    // useSearchParams needs a boundary; the editor keeps the week in the URL.
    <Suspense fallback={null}>
      <WeekEditorScreen />
    </Suspense>
  );
}
