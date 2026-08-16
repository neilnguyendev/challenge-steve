"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { LoginForm } from "@/components/admin/LoginForm";

function SignIn() {
  const router = useRouter();
  const next = useSearchParams().get("next");

  return <LoginForm next={next} onSignedIn={(target) => router.replace(target)} />;
}

export default function AdminLoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Admin sign in</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Enter the venue&rsquo;s trading figures.
        </p>
      </div>
      {/* useSearchParams needs a Suspense boundary during prerender. */}
      <Suspense fallback={null}>
        <SignIn />
      </Suspense>
    </main>
  );
}
