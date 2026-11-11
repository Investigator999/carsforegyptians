"use client";

import { useActionState, useState } from "react";
import { reportListing, requestContact, type FormState } from "@/app/actions";
import { FieldError, FormMessage, SubmitButton, KeepForm } from "@/components/forms";

export function ContactForm({ listingId }: { listingId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(requestContact.bind(null, listingId), {});
  if (state.ok) return <FormMessage state={state} />;
  return (
    <KeepForm action={action} pending={pending} className="space-y-3">
      <label className="label" htmlFor="message">رسالة لصاحب الإعلان</label>
      <textarea
        id="message"
        name="message"
        rows={3}
        required
        className="input"
        placeholder="عرّف بنفسك واكتب اقتراحك باختصار. رقمك هيظهر له لو وافق."
      />
      <FieldError state={state} name="message" />
      <FormMessage state={state} />
      <SubmitButton>اطلب التواصل</SubmitButton>
    </KeepForm>
  );
}

export function ReportForm({ listingId }: { listingId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<FormState, FormData>(reportListing.bind(null, listingId), {});
  if (state.ok) return <FormMessage state={state} />;
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-sm text-stone-500 underline">
        إبلاغ عن الإعلان
      </button>
    );
  }
  return (
    <KeepForm action={action} pending={pending} className="space-y-2">
      <label className="label" htmlFor="reason">سبب البلاغ</label>
      <input id="reason" name="reason" required className="input" placeholder="مثال: طلب فلوس مقدمًا، بيانات غير حقيقية…" />
      <FieldError state={state} name="reason" />
      <FormMessage state={state} />
      <SubmitButton className="btn-ghost">إرسال البلاغ</SubmitButton>
    </KeepForm>
  );
}
