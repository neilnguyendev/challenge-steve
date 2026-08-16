"use client";

import { useEffect, useState, type ReactNode } from "react";

import { readToken } from "@/lib/auth";

interface AdminGuardProps {
  /** Called with the sign-in URL when there is no session. */
  onRedirect: (target: string) => void;
  currentPath: string;
  children: ReactNode;
}

/**
 * Keeps a signed-out manager off a screen that cannot load.
 *
 * Not a security control — the API refuses unauthenticated requests regardless,
 * and that refusal is what protects the figures. This only avoids showing an
 * empty table and a wall of 401s.
 */
export function AdminGuard({ onRedirect, currentPath, children }: AdminGuardProps) {
  const [state, setState] = useState<"checking" | "allowed">("checking");

  useEffect(() => {
    if (readToken()) {
      setState("allowed");
      return;
    }
    // Carry where they were headed, so signing in finishes the journey rather
    // than dumping them on a default page.
    onRedirect(`/admin/login?next=${encodeURIComponent(currentPath)}`);
  }, [onRedirect, currentPath]);

  if (state === "checking") {
    return (
      <p className="p-8 text-sm text-text-muted" role="status">
        Checking your session…
      </p>
    );
  }

  return <>{children}</>;
}
