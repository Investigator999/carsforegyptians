import Link from "next/link";
import { COUNTRIES, countryLabel, isCountryCode } from "@/lib/countries";
import { CAR_KIND_LABEL, SORTS, formatUsd, type Listing, type SortKey } from "@/lib/listings";
import { supabaseServer } from "@/lib/supabase/server";
import { ListingCard } from "@/components/ListingCard";

export const dynamic = "force-dynamic";

type Search = { country?: string; kind?: string; car?: string; sort?: string };
type Stat = { country: string; holders: number; funders: number; avg_deposit_usd: number | null; soonest_expiry: string | null };

export default async function Home({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const country = sp.country && isCountryCode(sp.country) ? sp.country : "";
  const kind = sp.kind === "holder" || sp.kind === "funder" ? sp.kind : "";
  const car = sp.car === "fuel" || sp.car === "electric" ? sp.car : "";
  const sort: SortKey = sp.sort && sp.sort in SORTS ? (sp.sort as SortKey) : "new";

  const supabase = await supabaseServer();
  let q = supabase.from("listings").select("*").eq("status", "active").eq("hidden", false).limit(60);
  if (country) q = q.eq("country", country);
  if (kind) q = q.eq("kind", kind);
  if (car) q = q.in("car_kind", [car, "any"]);
  if (sort === "expiry") q = q.order("approval_expires_on", { ascending: true, nullsFirst: false });
  else if (sort === "deposit") q = q.order("amount_usd", { ascending: true, nullsFirst: false });
  else if (sort === "cash") q = q.order("cash_usd", { ascending: true, nullsFirst: false });
  q = q.order("created_at", { ascending: false });

  const [{ data: listings }, { data: stats }] = await Promise.all([q, supabase.rpc("market_stats")]);
  const rows = (listings ?? []) as Listing[];
  const market = (stats ?? []) as Stat[];
  const totals = market.reduce((t, s) => ({ h: t.h + s.holders, f: t.f + s.funders }), { h: 0, f: 0 });

  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-brand-700 p-6 text-white sm:p-8">
        <h1 className="mb-3 text-2xl font-extrabold leading-snug sm:text-3xl">
          موافقات مبادرة سيارات المصريين بالخارج في مكان واحد
        </h1>
        <p className="mb-5 max-w-2xl leading-8 text-brand-100">
          اعرض موافقتك وتواصل مباشرة مع الطرف الآخر بدون سمسار وبدون عمولة. المشتري يدفع ثمن السيارة والجمارك،
          وانت حلال عليك الوديعة.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/listings/new?kind=holder" className="btn bg-white text-brand-700 hover:bg-brand-50">
            عندي موافقة
          </Link>
          <Link href="/listings/new?kind=funder" className="btn border border-white/40 text-white hover:bg-white/10">
            عايز أشتري موافقة
          </Link>
        </div>
      </section>

      {market.length > 0 && (
        <section>
          <div className="mb-1 flex items-center">
            <h2 className="text-lg font-extrabold">السوق حسب الدولة</h2>
            <Link href="/dashboard" className="ms-auto text-sm font-semibold text-brand-700 hover:underline">
              لوحة السوق كاملة ←
            </Link>
          </div>
          <p className="mb-3 text-sm text-stone-600">
            {totals.h} صاحب موافقة و{totals.f} مشتري معروضين الآن
          </p>
          <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
            <table className="w-full min-w-[480px] text-sm">
              <thead className="bg-stone-50 text-stone-600">
                <tr>
                  <th className="p-3 text-start">الدولة</th>
                  <th className="p-3 text-start">أصحاب موافقات</th>
                  <th className="p-3 text-start">مشترين</th>
                  <th className="p-3 text-start">متوسط المدفوع</th>
                  <th className="p-3 text-start">أقرب انتهاء</th>
                </tr>
              </thead>
              <tbody>
                {market.map((s) => (
                  <tr key={s.country} className="border-t border-stone-100">
                    <td className="p-3">
                      <Link href={`/?country=${s.country}`} className="font-semibold hover:underline">
                        {countryLabel(s.country)}
                      </Link>
                    </td>
                    <td className="p-3">{s.holders}</td>
                    <td className="p-3">{s.funders}</td>
                    <td className="p-3">{formatUsd(s.avg_deposit_usd)}</td>
                    <td className="p-3" dir="ltr">{s.soonest_expiry ? s.soonest_expiry.slice(0, 7) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-extrabold">الإعلانات</h2>
        <form className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5" role="search">
          <select name="country" defaultValue={country} className="input" aria-label="الدولة">
            <option value="">كل الدول</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.name}
              </option>
            ))}
          </select>
          <select name="kind" defaultValue={kind} className="input" aria-label="نوع الإعلان">
            <option value="">الكل</option>
            <option value="holder">أصحاب موافقات</option>
            <option value="funder">مشترين</option>
          </select>
          <select name="car" defaultValue={car} className="input" aria-label="نوع السيارة">
            <option value="">أي سيارة</option>
            <option value="fuel">{CAR_KIND_LABEL.fuel}</option>
            <option value="electric">{CAR_KIND_LABEL.electric}</option>
          </select>
          <select name="sort" defaultValue={sort} className="input" aria-label="الترتيب">
            {Object.entries(SORTS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <button className="btn-primary col-span-2 sm:col-span-1">بحث</button>
        </form>

        {rows.length === 0 ? (
          <div className="card text-center text-stone-600">
            <p className="mb-3">لا توجد إعلانات بهذه الاختيارات بعد.</p>
            <Link href="/listings/new" className="btn-primary">
              كن أول من يضيف إعلان
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
