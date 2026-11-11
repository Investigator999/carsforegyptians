import Link from "next/link";
import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import { countryLabel } from "@/lib/countries";
import { KIND_SHORT, expiryLabel, formatUsd, type Listing } from "@/lib/listings";
import { compactUsd, summarize } from "@/lib/market";
import { DemoBadge, KindBadge } from "@/components/ListingCard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "لوحة السوق | Car Exit" };

// Series colors (validated for color-blind separation): holders green, funders amber.
const HOLDER = "#047857";
const FUNDER = "#d97706";

type Row = Pick<
  Listing,
  "id" | "kind" | "country" | "city" | "amount_usd" | "approval_expires_on" | "is_demo" | "title"
>;

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind } = await searchParams;
  const filter = kind === "holder" || kind === "funder" ? kind : "";
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("listings")
    .select("id, kind, country, city, amount_usd, approval_expires_on, is_demo, title")
    .eq("status", "active")
    .eq("hidden", false)
    .limit(2000);
  const rows = (data ?? []) as Row[];
  const s = summarize(rows);
  const maxCountry = Math.max(1, ...s.countries.map((c) => c.total));
  const maxBucket = Math.max(1, ...s.buckets.flatMap((b) => [b.holders, b.funders]));
  const list = rows
    .filter((r) => !filter || r.kind === filter)
    .sort((a, b) => (a.amount_usd ?? Infinity) - (b.amount_usd ?? Infinity));

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-extrabold">لوحة السوق</h1>
        <p className="text-stone-600">كل العروض المتاحة الآن من أصحاب الموافقات والمشترين، حسب الدولة والمبلغ.</p>
      </header>

      {s.demo > 0 && (
        <p className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm leading-7 text-amber-900" data-testid="demo-note">
          <b>تنبيه:</b> {s.demo} من العروض المعروضة <b>تجريبية</b> للتوضيح فقط، وليست للتواصل. عليها علامة «تجريبي».
        </p>
      )}

      {/* KPI row */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="إجمالي العروض" value={String(s.total)} />
        <Tile label="أصحاب موافقات" value={String(s.holders)} swatch={HOLDER} />
        <Tile label="مشترين" value={String(s.funders)} swatch={FUNDER} />
        <Tile
          label="متوسط الوديعة المطلوبة"
          value={compactUsd(s.avgAsk)}
          note={
            s.minAsk != null ? (
              <>
                من <bdi dir="ltr">{compactUsd(s.minAsk)}</bdi> إلى <bdi dir="ltr">{compactUsd(s.maxAsk)}</bdi>
              </>
            ) : undefined
          }
        />
      </section>

      {/* By country: stacked horizontal bars */}
      <section className="card space-y-4">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
          <h2 className="text-lg font-extrabold">العروض حسب الدولة</h2>
          <Legend />
        </div>
        {s.countries.length === 0 ? (
          <p className="text-sm text-stone-500">لا توجد عروض بعد.</p>
        ) : (
          <ul className="space-y-2.5">
            {s.countries.map((c) => (
              <li key={c.country} className="grid grid-cols-[7.5rem_1fr] items-center gap-3 text-sm">
                <Link href={`/?country=${c.country}`} className="truncate font-semibold hover:underline">
                  {countryLabel(c.country)}
                </Link>
                <div className="flex items-center gap-2">
                  <div
                    className="flex h-[18px] gap-[2px] overflow-hidden rounded-e-[4px]"
                    style={{ width: `${(c.total / maxCountry) * 85}%` }}
                  >
                    <Segment n={c.holders} total={c.total} color={HOLDER} tip={`${countryLabel(c.country)}: ${c.holders} صاحب موافقة`} />
                    <Segment n={c.funders} total={c.total} color={FUNDER} tip={`${countryLabel(c.country)}: ${c.funders} مشتري`} />
                  </div>
                  <span className="shrink-0 font-bold tabular-nums">{c.total}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
        <details className="text-sm">
          <summary className="cursor-pointer text-stone-500">عرض كجدول</summary>
          <table className="mt-2 w-full">
            <thead className="text-stone-500">
              <tr>
                <th className="p-2 text-start">الدولة</th>
                <th className="p-2 text-start">أصحاب موافقات</th>
                <th className="p-2 text-start">مشترين</th>
                <th className="p-2 text-start">متوسط الوديعة المطلوبة</th>
              </tr>
            </thead>
            <tbody>
              {s.countries.map((c) => (
                <tr key={c.country} className="border-t border-stone-100">
                  <td className="p-2">{countryLabel(c.country)}</td>
                  <td className="p-2">{c.holders}</td>
                  <td className="p-2">{c.funders}</td>
                  <td className="p-2">{formatUsd(c.avgAsk)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </section>

      {/* Amounts: grouped columns per price range */}
      <section className="card space-y-4">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
          <h2 className="text-lg font-extrabold">العروض حسب المبلغ</h2>
          <Legend holder="الوديعة المطلوبة" funder="المبلغ المعروض من المشتري" />
        </div>
        <div className="flex h-48 items-end gap-3 border-b border-stone-200 pb-0 sm:gap-6" dir="ltr">
          {s.buckets.map((b) => (
            <div key={b.label} className="flex h-full flex-1 items-end justify-center gap-[2px]">
              <Column n={b.holders} max={maxBucket} color={HOLDER} tip={`${b.label}: ${b.holders} صاحب موافقة`} />
              <Column n={b.funders} max={maxBucket} color={FUNDER} tip={`${b.label}: ${b.funders} مشتري`} />
            </div>
          ))}
        </div>
        <div className="flex gap-3 text-center text-xs text-stone-500 sm:gap-6" dir="ltr">
          {s.buckets.map((b) => (
            <div key={b.label} className="flex-1" dir="auto">
              {b.label}
            </div>
          ))}
        </div>
      </section>

      {/* Every offer, cheapest first */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="me-auto text-lg font-extrabold">كل العروض من الأقل للأعلى</h2>
          {[
            ["", "الكل"],
            ["holder", "أصحاب موافقات"],
            ["funder", "مشترين"],
          ].map(([k, label]) => (
            <Link
              key={k}
              href={k ? `/dashboard?kind=${k}` : "/dashboard"}
              className={`rounded-full px-3 py-1 text-sm ${filter === k ? "bg-stone-800 text-white" : "bg-white text-stone-700 ring-1 ring-stone-300"}`}
            >
              {label}
            </Link>
          ))}
        </div>
        <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-stone-50 text-stone-600">
              <tr>
                <th className="p-3 text-start">المبلغ</th>
                <th className="p-3 text-start">النوع</th>
                <th className="p-3 text-start">الدولة</th>
                <th className="p-3 text-start">الموافقة</th>
                <th className="p-3 text-start"></th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} className="border-t border-stone-100" data-testid="offer-row">
                  <td className="p-3 font-bold tabular-nums">{formatUsd(r.amount_usd)}</td>
                  <td className="p-3">
                    <KindBadge kind={r.kind} />
                    <span className="sr-only">{KIND_SHORT[r.kind]}</span>
                  </td>
                  <td className="p-3">
                    {countryLabel(r.country)}
                    {r.city ? ` · ${r.city}` : ""}
                  </td>
                  <td className="p-3 text-stone-600">
                    {r.approval_expires_on ? expiryLabel(r.approval_expires_on) : "—"}
                  </td>
                  <td className="p-3">
                    {r.is_demo ? (
                      <DemoBadge />
                    ) : (
                      <Link href={`/listings/${r.id}`} className="font-semibold text-brand-700 hover:underline">
                        التفاصيل
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Tile({ label, value, note, swatch }: { label: string; value: string; note?: React.ReactNode; swatch?: string }) {
  return (
    <div className="card">
      <div className="flex items-center gap-1.5 text-sm text-stone-600">
        {swatch && <span className="inline-block size-2.5 rounded-full" style={{ background: swatch }} />}
        {label}
      </div>
      <div className="mt-1 text-3xl font-extrabold tabular-nums" dir="ltr" style={{ textAlign: "right" }}>
        {value}
      </div>
      {note && <div className="mt-1 text-xs text-stone-500">{note}</div>}
    </div>
  );
}

function Legend({ holder = "أصحاب موافقات", funder = "مشترين" }: { holder?: string; funder?: string }) {
  return (
    <div className="flex gap-4 text-sm text-stone-600">
      {[
        [HOLDER, holder],
        [FUNDER, funder],
      ].map(([color, label]) => (
        <span key={label} className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-sm" style={{ background: color }} />
          {label}
        </span>
      ))}
    </div>
  );
}

function Tip({ text }: { text: string }) {
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-stone-900 px-2 py-1 text-xs text-white group-hover:block group-focus:block"
      dir="rtl"
    >
      {text}
    </span>
  );
}

function Segment({ n, total, color, tip }: { n: number; total: number; color: string; tip: string }) {
  if (!n) return null;
  return (
    <span tabIndex={0} aria-label={tip} className="group relative h-full outline-none" style={{ width: `${(n / total) * 100}%`, background: color }}>
      <Tip text={tip} />
    </span>
  );
}

function Column({ n, max, color, tip }: { n: number; max: number; color: string; tip: string }) {
  return (
    <div tabIndex={0} aria-label={tip} className="group relative flex h-full w-full max-w-6 flex-col items-center justify-end outline-none">
      <Tip text={tip} />
      {n > 0 && <span className="mb-1 text-xs font-bold text-stone-700">{n}</span>}
      <span className="block w-full rounded-t-[4px]" style={{ height: `${(n / max) * 80}%`, background: color, minHeight: n ? 4 : 0 }} />
    </div>
  );
}
