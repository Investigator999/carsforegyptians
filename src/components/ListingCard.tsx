import Link from "next/link";
import { countryLabel } from "@/lib/countries";
import { CAR_KIND_LABEL, KIND_SHORT, expiryLabel, formatUsd, type Listing } from "@/lib/listings";

export function KindBadge({ kind }: { kind: Listing["kind"] }) {
  const cls = kind === "holder" ? "bg-brand-100 text-brand-700" : "bg-amber-100 text-amber-800";
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${cls}`}>{KIND_SHORT[kind]}</span>;
}

export function ListingCard({ listing }: { listing: Listing }) {
  const l = listing;
  return (
    <Link href={`/listings/${l.id}`} className="card block transition hover:border-brand-600" data-testid="listing-card">
      <div className="mb-2 flex items-center gap-2 text-sm">
        <KindBadge kind={l.kind} />
        <span className="text-stone-600">
          {countryLabel(l.country)}
          {l.city ? ` · ${l.city}` : ""}
        </span>
      </div>
      <h3 className="mb-3 line-clamp-2 font-bold">{l.title}</h3>
      <dl className="grid grid-cols-2 gap-2 text-sm">
        {l.kind === "holder" && l.approval_expires_on && (
          <div className="col-span-2 text-stone-700">{expiryLabel(l.approval_expires_on)}</div>
        )}
        {l.kind === "holder" && (
          <Stat label="الوديعة المدفوعة" value={formatUsd(l.deposit_usd)} />
        )}
        <Stat label={l.kind === "holder" ? "الوديعة المطلوبة" : "المبلغ المتاح"} value={formatUsd(l.amount_usd)} />
        <Stat label="نوع السيارة" value={CAR_KIND_LABEL[l.car_kind]} />
      </dl>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-stone-50 px-2 py-1.5">
      <dt className="text-xs text-stone-500">{label}</dt>
      <dd className="font-bold" dir="auto">{value}</dd>
    </div>
  );
}
