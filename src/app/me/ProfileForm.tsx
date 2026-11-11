"use client";

import { useActionState } from "react";
import { saveProfile, type FormState } from "@/app/actions";
import { FieldError, FormMessage, SubmitButton } from "@/components/forms";

export function ProfileForm({ initial, next }: { initial: { display_name: string; whatsapp: string } | null; next?: string }) {
  const [state, action] = useActionState<FormState, FormData>(saveProfile, {});
  return (
    <form action={action} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      <div>
        <label className="label" htmlFor="display_name">الاسم اللي هيظهر للناس</label>
        <input id="display_name" name="display_name" defaultValue={initial?.display_name} required className="input" />
        <FieldError state={state} name="display_name" />
      </div>
      <div>
        <label className="label" htmlFor="whatsapp">رقم الواتساب بكود الدولة</label>
        <input id="whatsapp" name="whatsapp" defaultValue={initial?.whatsapp} required dir="ltr" inputMode="tel" placeholder="+966501234567" className="input" />
        <p className="mt-1 text-xs text-stone-500">
          الرقم مش بيظهر لأي حد. بيظهر فقط للشخص اللي إنت توافق على طلب تواصله، أو لصاحب الإعلان لو وافق على طلبك.
        </p>
        <FieldError state={state} name="whatsapp" />
      </div>
      <FormMessage state={state} />
      <SubmitButton>حفظ</SubmitButton>
    </form>
  );
}
