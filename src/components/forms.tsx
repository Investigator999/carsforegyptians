"use client";

import { createContext, startTransition, useContext } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/app/actions";

const Pending = createContext<boolean | null>(null);

/**
 * A form that runs a useActionState action WITHOUT clearing what the user typed.
 * (A plain <form action> resets every field after submit, so one mistake wipes the form.)
 */
export function KeepForm({
  action,
  pending,
  className,
  children,
}: {
  action: (form: FormData) => void;
  pending: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <form
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
    >
      <Pending.Provider value={pending}>{children}</Pending.Provider>
    </form>
  );
}

export function SubmitButton({ children, className = "btn-primary" }: { children: React.ReactNode; className?: string }) {
  const kept = useContext(Pending);
  const status = useFormStatus();
  const pending = kept ?? status.pending;
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? "لحظة…" : children}
    </button>
  );
}

export function FieldError({ state, name }: { state: FormState; name: string }) {
  const msg = state.errors?.[name];
  return msg ? <p className="mt-1 text-sm text-red-600">{msg}</p> : null;
}

export function FormMessage({ state }: { state: FormState }) {
  if (!state.message) return null;
  return (
    <p
      role="status"
      className={`rounded-xl px-3 py-2 text-sm ${state.ok ? "bg-brand-50 text-brand-700" : "bg-red-50 text-red-700"}`}
    >
      {state.message}
    </p>
  );
}
