"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { LoginForm } from "./LoginForm";

function SignIn() {
  const router = useRouter();
  const next = useSearchParams().get("next");

  return <LoginForm next={next} onSignedIn={(target) => router.replace(target)} />;
}

export function AdminSignInScreen() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-6 px-6 py-12">
      <div className="flex flex-col gap-2">
        <span className="inline-flex size-10 items-center justify-center rounded-[--radius] bg-accent text-on-accent">
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="size-5"
          >
            <path d="M5 20V9" />
            <path d="M12 20V4" />
            <path d="M19 20v-7" />
          </svg>
        </span>

        <h1 className="mt-2 text-xl font-semibold tracking-tight text-text">
          Admin sign in
        </h1>
        <p className="text-sm text-text-muted">
          Enter the venue&rsquo;s trading figures.
        </p>
      </div>

      <Suspense fallback={null}>
        <SignIn />
      </Suspense>

      <a
        href="/"
        className="inline-flex items-center gap-1.5 self-start text-sm text-text-subtle underline decoration-border-strong underline-offset-4 transition-colors duration-150 hover:text-text hover:decoration-current"
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-3.5"
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Back to the dashboard
      </a>
    </main>
  );
}
