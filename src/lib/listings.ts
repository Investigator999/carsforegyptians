import { z } from "zod";
import { isCountryCode } from "./countries";

export type ListingKind = "holder" | "funder";
export type CarKind = "fuel" | "electric" | "any";

export type Listing = {
  id: string;
  owner_id: string;
  kind: ListingKind;
  country: string;
  city: string | null;
  approval_expires_on: string | null;
  deposit_usd: number | null;
  car_kind: CarKind;
  amount_usd: number | null;
  title: string;
  details: string | null;
  status: "active" | "closed";
  hidden: boolean;
  created_at: string;
};

export const KIND_LABEL: Record<ListingKind, string> = {
  holder: "صاحب موافقة يبحث عن ممول",
  funder: "ممول يبحث عن صاحب موافقة",
};

export const KIND_SHORT: Record<ListingKind, string> = {
  holder: "صاحب موافقة",
  funder: "ممول",
};

export const CAR_KIND_LABEL: Record<CarKind, string> = {
  fuel: "بنزين",
  electric: "كهرباء",
  any: "أي نوع",
};

const blankToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);
const optionalInt = (max: number) =>
  z.preprocess(
    (v) => {
      const b = blankToNull(v);
      return typeof b === "string" ? Number(b.replace(/[,\s]/g, "")) : b;
    },
    z.number().int("رقم صحيح فقط").min(0, "لا يمكن أن يكون سالبًا").max(max, "الرقم كبير جدًا").nullable(),
  );
const optionalText = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" ? blankToNull(v.trim()) : v),
    z.string().max(max, `الحد الأقصى ${max} حرف`).nullable(),
  );

export const listingSchema = z
  .object({
    kind: z.enum(["holder", "funder"], { error: "اختر نوع الإعلان" }),
    country: z.string().refine(isCountryCode, "اختر الدولة"),
    city: optionalText(60),
    approval_expires_on: z.preprocess(
      blankToNull,
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "تاريخ غير صحيح").nullable(),
    ),
    deposit_usd: optionalInt(1_000_000),
    car_kind: z.enum(["fuel", "electric", "any"]).default("any"),
    amount_usd: optionalInt(10_000_000),
    title: z.string().trim().min(5, "العنوان قصير جدًا").max(100, "العنوان طويل جدًا"),
    details: optionalText(2000),
  })
  .superRefine((v, ctx) => {
    if (v.kind === "holder" && !v.approval_expires_on) {
      ctx.addIssue({ code: "custom", path: ["approval_expires_on"], message: "اكتب تاريخ انتهاء الموافقة" });
    }
  })
  .transform((v) =>
    // Approval fields only make sense on a holder's listing.
    v.kind === "funder" ? { ...v, approval_expires_on: null, deposit_usd: null } : v,
  );

export type ListingInput = z.infer<typeof listingSchema>;

export type FieldErrors = Partial<Record<string, string>>;

export function parseListingForm(form: FormData):
  | { ok: true; data: ListingInput }
  | { ok: false; errors: FieldErrors } {
  const raw = Object.fromEntries(
    ["kind", "country", "city", "approval_expires_on", "deposit_usd", "car_kind", "amount_usd",
      "title", "details"].map((k) => [k, form.get(k) ?? undefined]),
  );
  const result = listingSchema.safeParse(raw);
  if (result.success) return { ok: true, data: result.data };
  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "form");
    errors[key] ??= issue.message;
  }
  return { ok: false, errors };
}

/** Accepts "+966 50 123 4567", "00966501234567", "٠٠٩٦٦…" and returns "+966501234567". */
export function normalizePhone(input: string): string | null {
  const western = input.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  let digits = western.replace(/[^\d+]/g, "");
  if (digits.startsWith("00")) digits = "+" + digits.slice(2);
  if (!digits.startsWith("+")) return null;
  digits = "+" + digits.slice(1).replace(/\+/g, "");
  return /^\+[0-9]{8,15}$/.test(digits) ? digits : null;
}

export function whatsappLink(phone: string, text?: string) {
  const base = `https://wa.me/${phone.replace(/^\+/, "")}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

export function formatUsd(n: number | null | undefined) {
  if (n == null) return "—";
  return `$${n.toLocaleString("en-US")}`;
}

/** Whole months from `today` until `date` (both YYYY-MM-DD), never below 0. */
export function monthsLeft(date: string, today: Date = new Date()) {
  const [y, m, d] = date.split("-").map(Number);
  let months = (y - today.getUTCFullYear()) * 12 + (m - 1 - today.getUTCMonth());
  if (d < today.getUTCDate()) months -= 1;
  return Math.max(0, months);
}

export function expiryLabel(date: string, today: Date = new Date()) {
  const months = monthsLeft(date, today);
  const [y, m] = date.split("-");
  const when = `${m}/${y}`;
  if (months === 0) return `تنتهي ${when} (أقل من شهر)`;
  if (months < 12) return `تنتهي ${when} (باقي ${months} شهر)`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return `تنتهي ${when} (باقي ${years} سنة${rest ? ` و${rest} شهر` : ""})`;
}

export const SORTS = {
  new: "الأحدث",
  expiry: "الأقرب انتهاءً",
  deposit: "الأقل وديعة",
} as const;
export type SortKey = keyof typeof SORTS;
