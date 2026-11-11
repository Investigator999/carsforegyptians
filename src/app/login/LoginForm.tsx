"use client";

import { useActionState } from "react";
import { sendLoginLink, type FormState } from "@/app/actions";
import { FieldError, FormMessage, SubmitButton } from "@/components/forms";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState<FormState, FormData>(sendLoginLink, {});
  if (state.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label className="label" htmlFor="email">البريد الإلكتروني</label>
        <input id="email" name="email" type="email" required dir="ltr" autoComplete="email" className="input" />
        <FieldError state={state} name="email" />
      </div>
      <FormMessage state={state} />
      <SubmitButton className="btn-primary w-full">أرسل لي رابط الدخول</SubmitButton>
    </form>
  );
}
