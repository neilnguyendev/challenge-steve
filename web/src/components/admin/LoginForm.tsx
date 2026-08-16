"use client";

import { useState, type FormEvent } from "react";

import { safeRedirectTarget, signIn, storeToken } from "@/lib/auth";

interface LoginFormProps {
  next: string | null;
  onSignedIn: (destination: string) => void;
}

type FieldErrors = { email?: string; password?: string };

function validate(field: keyof FieldErrors, value: string): string | undefined {
  if (!value.trim()) return field === "email" ? "Enter your email" : "Enter your password";
  if (field === "email" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
    return "That does not look like an email address";
  }
  return undefined;
}

export function LoginForm({ next, onSignedIn }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // On blur rather than on every keystroke: telling someone their email is
  // invalid while they are still halfway through typing it is just noise.
  const checkOnBlur = (field: keyof FieldErrors, value: string) =>
    setFieldErrors((current) => ({ ...current, [field]: validate(field, value) }));

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const errors: FieldErrors = {
      email: validate("email", email),
      password: validate("password", password),
    };
    if (errors.email || errors.password) {
      setFieldErrors(errors);
      // Send focus to the first thing that needs fixing rather than leaving
      // the reader to hunt for it.
      document.getElementById(errors.email ? "email" : "password")?.focus();
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const { token } = await signIn(email, password);
      storeToken(token);
      onSignedIn(safeRedirectTarget(next));
    } catch (cause) {
      // The email stays in the field: retyping it after a typo in the password
      // is pure friction.
      setFormError(cause instanceof Error ? cause.message : "Could not sign in");
      setPassword("");
      document.getElementById("password")?.focus();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex w-full flex-col gap-5">
      <Field
        id="email"
        label="Email"
        type="email"
        autoComplete="username"
        value={email}
        error={fieldErrors.email}
        onChange={setEmail}
        onBlur={() => checkOnBlur("email", email)}
      />

      <Field
        id="password"
        label="Password"
        type="password"
        autoComplete="current-password"
        value={password}
        error={fieldErrors.password}
        onChange={setPassword}
        onBlur={() => checkOnBlur("password", password)}
      />

      {/* The server cannot say which of the two fields was wrong — deliberately,
          so the endpoint cannot be used to discover which emails exist — so this
          one stays at form level rather than pretending to know. */}
      {formError ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-2xl border border-negative/30 bg-negative-surface px-3.5 py-2.5 text-sm text-negative"
        >
          <AlertIcon />
          <span>{formError}</span>
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="mt-1 inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full bg-accent px-4 text-sm font-medium text-on-accent transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

function Field({
  id,
  label,
  type,
  autoComplete,
  value,
  error,
  onChange,
  onBlur,
}: {
  id: string;
  label: string;
  type: string;
  autoComplete: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  const errorId = `${id}-error`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-text">
        {label}
      </label>

      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        // Announced to a screen reader, and the message is tied to this field
        // rather than floating at the top of the form.
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={[
          "min-h-11 rounded-xl border bg-surface px-3.5 text-sm text-text",
          "transition-colors duration-150 hover:border-text-subtle",
          error ? "border-negative" : "border-border-strong",
        ].join(" ")}
      />

      {error ? (
        <p id={errorId} className="flex items-center gap-1.5 text-sm text-negative">
          <AlertIcon />
          {error}
        </p>
      ) : null}
    </div>
  );
}

function AlertIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className="mt-px size-4 shrink-0"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16h.01" />
    </svg>
  );
}
