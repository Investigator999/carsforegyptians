"use client";

import { useActionState, useState } from "react";
import { signInOrUp, type FormState } from "@/app/actions";
import { FieldError, FormMessage, SubmitButton, KeepForm } from "@/components/forms";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(signInOrUp, {});
  const [show, setShow] = useState(false);
  if (state.ok) return <FormMessage state={state} />;
  return (
    <KeepForm action={action} pending={pending} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label className="label" htmlFor="email">البريد الإلكتروني</label>
        <input id="email" name="email" type="email" required dir="ltr" autoComplete="email" className="input" />
        <FieldError state={state} name="email" />
      </div>
      <div>
        <label className="label" htmlFor="password">كلمة السر</label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            required
            minLength={6}
            dir="ltr"
            autoComplete="current-password"
            className="input pe-16"
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute inset-y-0 end-2 my-auto h-8 px-2 text-sm text-stone-500"
          >
            {show ? "إخفاء" : "إظهار"}
          </button>
        </div>
        <FieldError state={state} name="password" />
      </div>
      <FormMessage state={state} />
      <SubmitButton className="btn-primary w-full">دخول / إنشاء حساب</SubmitButton>
    </KeepForm>
  );
}
