import { Dashboard } from "@/components/dashboard/Dashboard";
import { currentMonday } from "@/lib/week";

// The week is resolved per request, not at build time: "this week" has to mean
// the week the visitor is actually in.
export const dynamic = "force-dynamic";

export default function Home() {
  return <Dashboard initialWeekStart={currentMonday()} />;
}
