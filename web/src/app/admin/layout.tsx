import type { Metadata } from "next";

// Every page under /admin inherits the prefix, so a tab parked on the editor
// is distinguishable from one parked on the public dashboard.
export const metadata: Metadata = {
  title: {
    default: "Admin · Revenue Trend Dashboard",
    template: "Admin · %s · Revenue Trend Dashboard",
  },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return children;
}
