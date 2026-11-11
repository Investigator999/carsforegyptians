import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { myProfile, supabaseServer } from "@/lib/supabase/server";
import { countryLabel } from "@/lib/countries";
import { DEAL_NOTE, buyerTotal, CAR_KIND_LABEL, KIND_LABEL, expiryLabel, formatUsd, type Listing } from "@/lib/listings";
import { DemoBadge, KindBadge } from "@/components/ListingCard";
import { ContactForm, ReportForm } from "./ListingActions";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const UUID = /^[0-9a-f-]{36}$/i;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  if (!UUID.test(id)) return {};
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("listings")
    .select("title, country, kind, amount_usd, cash_usd")
    .eq("id", id)
    .maybeSingle();
  if (!data) return {};
  const title = `${data.title} | ${countryLabel(data.country)} | Car Exit`;
  const description = `${KIND_LABEL[data.kind as Listing["kind"]]} · ${countryLabel(data.country)}${
    data.amount_usd ? ` · الوديعة ${formatUsd(data.amount_usd)}` : ""
  }${data.cash_usd ? ` · كاش ${formatUsd(data.cash_usd)}` : ""
  }`;
  return {
    title,
    description,
    openGraph: { title, description, url: `/listings/${id}`, images: ["/og.png"], siteName: "Car Exit", locale: "ar_EG" },
  };
}

export default async function ListingPage({ params }: Params) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase, user, profile } = await myProfile();
  const { data } = await supabase.from("listings").select("*, owner:profiles(display_name)").eq("id", id).maybeSingle();
  if (!data) notFound();
  const l = data as Listing & { owner: { display_name: string } | null };
  const isOwner = user?.id === l.owner_id;

  let existing: { status: string } | null = null;
  if (user && !isOwner) {
    const { data: r } = await supabase
      .from("contact_requests")
      .select("status")
      .eq("listing_id", id)
      .eq("requester_id", user.id)
      .maybeSingle();
    existing = r;
  }

  const rows: [string, string][] = [
    ["بلد الإقامة", `${countryLabel(l.country)}${l.city ? ` · ${l.city}` : ""}`],
    ...(l.kind === "holder"
      ? ([
          ["الموافقة", l.approval_expires_on ? expiryLabel(l.approval_expires_on) : "—"],
          ["المدفوع", formatUsd(l.deposit_usd)],
        ] as [string, string][])
      : []),
    ["الوديعة", formatUsd(l.amount_usd)],
    ["كاش", formatUsd(l.cash_usd)],
    ["الإجمالي على المشتري", formatUsd(buyerTotal(l))],
    ["نوع السيارة", CAR_KIND_LABEL[l.car_kind]],
    ["تاريخ النشر", new Date(l.created_at).toLocaleDateString("ar-EG")],
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/" className="text-sm text-stone-500 hover:underline">→ كل الإعلانات</Link>
      <article className="card space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <KindBadge kind={l.kind} />
          <span className="text-sm text-stone-600">{KIND_LABEL[l.kind]}</span>
          {l.is_demo && <DemoBadge />}
          {l.status === "closed" && <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs">مغلق</span>}
        </div>
        <h1 className="text-2xl font-extrabold">{l.title}</h1>
        <dl className="divide-y divide-stone-100 rounded-xl border border-stone-100">
          {rows.map(([k, v]) => (
            <div key={k} className="flex gap-4 px-3 py-2.5 text-sm">
              <dt className="w-36 shrink-0 text-stone-500">{k}</dt>
              <dd className="font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="rounded-xl bg-brand-50 px-3 py-2 text-sm leading-7 text-brand-700">{DEAL_NOTE}</p>
        {l.details && <p className="whitespace-pre-line leading-8 text-stone-800">{l.details}</p>}
        <p className="text-sm text-stone-500">صاحب الإعلان: {l.owner?.display_name}</p>
      </article>

      <section className="card space-y-3">
        {l.is_demo ? (
          <p className="text-sm text-stone-600" data-testid="demo-listing">
            هذا عرض تجريبي لتوضيح شكل الموقع فقط، وليس للتواصل.{" "}
            <Link href="/" className="underline">شوف العروض الحقيقية</Link>
          </p>
        ) : isOwner ? (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-stone-600">ده إعلانك. طلبات التواصل بتوصلك في صفحة حسابي.</p>
            <Link href={`/listings/${l.id}/edit`} className="btn-ghost ms-auto">تعديل</Link>
            <Link href="/me" className="btn-primary">حسابي</Link>
          </div>
        ) : !user ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-stone-600">سجل دخول عشان تطلب التواصل مع صاحب الإعلان.</p>
            <Link href={`/login?next=/listings/${l.id}`} className="btn-primary ms-auto">دخول</Link>
          </div>
        ) : !profile ? (
          <Link href={`/me?next=/listings/${l.id}`} className="btn-primary">أكمل بياناتك عشان تطلب التواصل</Link>
        ) : existing ? (
          <p className="text-sm">
            أرسلت طلب تواصل على هذا الإعلان ({existing.status === "accepted" ? "تمت الموافقة، الرقم في صفحة " : "الحالة في صفحة "}
            <Link href="/me" className="underline">حسابي</Link>).
          </p>
        ) : l.status === "active" ? (
          <ContactForm listingId={l.id} />
        ) : (
          <p className="text-sm text-stone-600">الإعلان مغلق.</p>
        )}
      </section>

      <aside className="rounded-2xl bg-amber-50 p-4 text-sm leading-7 text-amber-900">
        <b>قبل أي اتفاق:</b> لا تحوّل أي مبلغ قبل ما تتأكد من شخصية الطرف الآخر وبيانات موافقته، واكتب اتفاق واضح عند محامٍ. <Link href="/safety" className="underline">نصائح الأمان</Link>
      </aside>

      {user && !isOwner && !l.is_demo && <ReportForm listingId={l.id} />}
    </div>
  );
}
