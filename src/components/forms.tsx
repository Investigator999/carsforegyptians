"use client";

import { useFormStatus } from "react-dom";
import type { FormState } from "@/app/actions";

export function SubmitButton({ children, className = "btn-primary" }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
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
