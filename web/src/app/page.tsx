import { Suspense } from "react";

import { Dashboard } from "@/components/dashboard/Dashboard";
import { currentMonday } from "@/lib/week";

// The week is resolved per request, not at build time: "this week" has to mean
// the week the visitor is actually in.
export const dynamic = "force-dynamic";

export default function Home() {
  return (
    // useSearchParams needs a boundary; the dashboard reads its whole view
    // from the URL rather than holding it in state.
    <Suspense fallback={null}>
      <Dashboard fallbackWeekStart={currentMonday()} />
    </Suspense>
  );
}
