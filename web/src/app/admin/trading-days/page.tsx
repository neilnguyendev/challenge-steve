import type { Metadata } from "next";

import { WeekEditorScreen } from "@/components/admin/WeekEditorScreen";

export const metadata: Metadata = { title: "Trading figures" };

export default function AdminTradingDaysPage() {
  return <WeekEditorScreen />;
}
