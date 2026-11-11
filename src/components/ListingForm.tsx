"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/app/actions";
import { COUNTRIES } from "@/lib/countries";
import { CAR_KIND_LABEL, DEAL_NOTE, KIND_LABEL, formatUsd, type Listing, type ListingKind } from "@/lib/listings";
import { FieldError, FormMessage, SubmitButton, KeepForm } from "./forms";

const toNumber = (v: string) => Number(v.replace(/[^\d]/g, "")) || 0;

type Props = {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  initial?: Partial<Listing>;
  defaultKind?: ListingKind;
  submitLabel: string;
};

export function ListingForm({ action, initial, defaultKind = "holder", submitLabel }: Props) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const [kind, setKind] = useState<ListingKind>(initial?.kind ?? defaultKind);
  const editing = Boolean(initial?.id);
  const holder = kind === "holder";
  const [amount, setAmount] = useState(initial?.amount_usd ?? 0);
  const [cash, setCash] = useState(initial?.cash_usd ?? 0);

  return (
    <KeepForm action={formAction} pending={pending} className="space-y-5">
      <fieldset disabled={editing}>
        <legend className="label">نوع الإعلان</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {(["holder", "funder"] as const).map((k) => (
            <label
              key={k}
              className={`card flex cursor-pointer items-center gap-2 ${kind === k ? "border-brand-600 ring-2 ring-brand-100" : ""}`}
            >
              <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} />
              <span className="font-semibold">{KIND_LABEL[k]}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {editing && <input type="hidden" name="kind" value={kind} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="country">بلد الإقامة</label>
          <select id="country" name="country" defaultValue={initial?.country ?? ""} required className="input">
            <option value="" disabled>اختر الدولة</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
            ))}
          </select>
          <FieldError state={state} name="country" />
        </div>
        <div>
          <label className="label" htmlFor="city">المدينة (اختياري)</label>
          <input id="city" name="city" defaultValue={initial?.city ?? ""} className="input" />
          <FieldError state={state} name="city" />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="title">عنوان الإعلان</label>
        <input
          id="title"
          name="title"
          defaultValue={initial?.title}
          required
          placeholder={holder ? "مثال: موافقة سارية حتى 2028" : "مثال: أبحث عن موافقة سارية في السعودية"}
          className="input"
        />
        <FieldError state={state} name="title" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {holder && (
          <div>
            <label className="label" htmlFor="approval_expires_on">تاريخ انتهاء الموافقة</label>
            <input id="approval_expires_on" name="approval_expires_on" type="date" defaultValue={initial?.approval_expires_on ?? ""} required className="input" />
            <FieldError state={state} name="approval_expires_on" />
          </div>
        )}
        <div>
          <label className="label" htmlFor="car_kind">نوع السيارة</label>
          <select id="car_kind" name="car_kind" defaultValue={initial?.car_kind ?? "any"} className="input">
            {Object.entries(CAR_KIND_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      <fieldset className="space-y-4 rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <legend className="px-1 text-sm font-bold text-stone-700">المبالغ بالدولار</legend>
        <div className={`grid gap-4 ${holder ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
          {holder && (
            <div>
              <label className="label" htmlFor="deposit_usd">المدفوع</label>
              <input id="deposit_usd" name="deposit_usd" inputMode="numeric" defaultValue={initial?.deposit_usd ?? ""} dir="ltr" className="input" />
              <p className="mt-1 text-xs text-stone-500">اللي دفعته عشان تاخد الموافقة</p>
              <FieldError state={state} name="deposit_usd" />
            </div>
          )}
          <div>
            <label className="label" htmlFor="amount_usd">الوديعة</label>
            <input
              id="amount_usd"
              name="amount_usd"
              inputMode="numeric"
              defaultValue={initial?.amount_usd ?? ""}
              onChange={(e) => setAmount(toNumber(e.target.value))}
              dir="ltr"
              className="input"
            />
            <p className="mt-1 text-xs text-stone-500">
              {holder ? "يدفعها المشتري للحكومة وترجع لك بعد 5 سنين" : "الوديعة اللي تقدر تدفعها"}
            </p>
            <FieldError state={state} name="amount_usd" />
          </div>
          <div>
            <label className="label" htmlFor="cash_usd">كاش</label>
            <input
              id="cash_usd"
              name="cash_usd"
              inputMode="numeric"
              defaultValue={initial?.cash_usd ?? ""}
              onChange={(e) => setCash(toNumber(e.target.value))}
              dir="ltr"
              className="input"
            />
            <p className="mt-1 text-xs text-stone-500">{holder ? "الكاش اللي بتطلبه من المشتري" : "الكاش اللي تدفعه لصاحب الموافقة"}</p>
            <FieldError state={state} name="cash_usd" />
          </div>
        </div>
        <p className="rounded-xl bg-white px-3 py-2 text-sm" data-testid="form-total">
          إجمالي على المشتري (الوديعة + الكاش): <b dir="ltr">{formatUsd(amount + cash)}</b>
        </p>
        <p className="text-xs leading-6 text-stone-500">{DEAL_NOTE}</p>
      </fieldset>

      <div>
        <label className="label" htmlFor="details">تفاصيل (اختياري)</label>
        <textarea
          id="details"
          name="details"
          rows={5}
          defaultValue={initial?.details ?? ""}
          className="input"
        />
        <p className="mt-1 text-xs text-stone-500">لا تكتب رقم تليفونك هنا. الرقم بيتشارك فقط لما توافق على طلب تواصل.</p>
        <FieldError state={state} name="details" />
      </div>

      <FormMessage state={state} />
      <SubmitButton className="btn-primary w-full sm:w-auto">{submitLabel}</SubmitButton>
    </KeepForm>
  );
}
