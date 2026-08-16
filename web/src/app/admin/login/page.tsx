import type { Metadata } from "next";

import { AdminSignInScreen } from "@/components/admin/AdminSignInScreen";

export const metadata: Metadata = { title: "Sign in" };

export default function AdminLoginPage() {
  return <AdminSignInScreen />;
}
