import Link from "next/link";
import { redirect } from "next/navigation";
import { myProfile } from "@/lib/supabase/server";
import { countryLabel } from "@/lib/countries";
import { type Listing, whatsappLink } from "@/lib/listings";
import { KindBadge } from "@/components/ListingCard";
import { SubmitButton } from "@/components/forms";
import { answerRequest, deleteListing, setListingStatus } from "@/app/actions";
import { ProfileForm } from "./ProfileForm";

export const dynamic = "force-dynamic";

type Request = {
  id: string;
  message: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  requester_id: string;
  listing: { id: string; title: string; owner_id: string } | null;
  requester: { display_name: string } | null;
};
type Contact = { display_name: string; whatsapp: string };

const STATUS_LABEL = { pending: "في الانتظار", accepted: "تمت الموافقة", declined: "مرفوض" } as const;

export default async function MePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const { supabase, user, profile } = await myProfile();
  if (!user) redirect("/login?next=/me");

  if (!profile) {
    return (
      <div className="card mx-auto max-w-md space-y-4">
        <h1 className="text-xl font-extrabold">أهلًا بيك 👋</h1>
        <p className="text-sm text-stone-600">قبل ما تبدأ، اكتب اسمك ورقم الواتساب اللي هتتواصل منه.</p>
        <ProfileForm initial={null} next={next ?? "/me"} />
      </div>
    );
  }

  const [{ data: mine }, { data: reqs }] = await Promise.all([
    supabase.from("listings").select("*").eq("owner_id", user.id).order("created_at", { ascending: false }),
    supabase
      .from("contact_requests")
      .select("id, message, status, created_at, requester_id, listing:listings(id, title, owner_id), requester:profiles(display_name)")
      .order("created_at", { ascending: false }),
  ]);
  const listings = (mine ?? []) as Listing[];
  const requests = (reqs ?? []) as unknown as Request[];
  const incoming = requests.filter((r) => r.listing?.owner_id === user.id);
  const outgoing = requests.filter((r) => r.requester_id === user.id);

  const contacts = new Map<string, Contact>();
  await Promise.all(
    requests
      .filter((r) => r.status === "accepted")
      .map(async (r) => {
        const { data } = await supabase.rpc("get_contact", { request_id: r.id });
        const c = (data as Contact[] | null)?.[0];
        if (c) contacts.set(r.id, c);
      }),
  );

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-lg font-extrabold">طلبات التواصل على إعلاناتك</h2>
        {incoming.length === 0 ? (
          <p className="text-sm text-stone-600">لا توجد طلبات بعد.</p>
        ) : (
          <ul className="space-y-3">
            {incoming.map((r) => (
              <li key={r.id} className="card space-y-2" data-testid="incoming-request">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <b>{r.requester?.display_name}</b>
                  <span className="text-stone-500">على</span>
                  <Link href={`/listings/${r.listing?.id}`} className="underline">{r.listing?.title}</Link>
                  <span className="ms-auto rounded-full bg-stone-100 px-2 py-0.5 text-xs">{STATUS_LABEL[r.status]}</span>
                </div>
                <p className="whitespace-pre-line text-stone-800">{r.message}</p>
                {r.status === "pending" && (
                  <div className="flex gap-2">
                    <form action={answerRequest}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="answer" value="accept" />
                      <SubmitButton>وافق وشارك رقمي</SubmitButton>
                    </form>
                    <form action={answerRequest}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="answer" value="decline" />
                      <SubmitButton className="btn-ghost">رفض</SubmitButton>
                    </form>
                  </div>
                )}
                <ContactLine contact={contacts.get(r.id)} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-extrabold">طلباتك أنت</h2>
        {outgoing.length === 0 ? (
          <p className="text-sm text-stone-600">لم ترسل طلبات تواصل بعد.</p>
        ) : (
          <ul className="space-y-3">
            {outgoing.map((r) => (
              <li key={r.id} className="card space-y-2" data-testid="outgoing-request">
                <div className="flex items-center gap-2 text-sm">
                  <Link href={`/listings/${r.listing?.id}`} className="font-semibold underline">
                    {r.listing?.title ?? "إعلان محذوف"}
                  </Link>
                  <span className="ms-auto rounded-full bg-stone-100 px-2 py-0.5 text-xs">{STATUS_LABEL[r.status]}</span>
                </div>
                <ContactLine contact={contacts.get(r.id)} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center">
          <h2 className="text-lg font-extrabold">إعلاناتك</h2>
          <Link href="/listings/new" className="btn-primary ms-auto px-3 py-2 text-sm">+ إعلان جديد</Link>
        </div>
        {listings.length === 0 ? (
          <p className="text-sm text-stone-600">لم تضف إعلانات بعد.</p>
        ) : (
          <ul className="space-y-3">
            {listings.map((l) => (
              <li key={l.id} className="card flex flex-wrap items-center gap-3">
                <KindBadge kind={l.kind} />
                <Link href={`/listings/${l.id}`} className="font-semibold hover:underline">{l.title}</Link>
                <span className="text-sm text-stone-500">{countryLabel(l.country)}</span>
                {l.status === "closed" && <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs">مغلق</span>}
                {l.hidden && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">مخفي بسبب بلاغات</span>}
                <div className="ms-auto flex gap-2">
                  <Link href={`/listings/${l.id}/edit`} className="btn-ghost px-3 py-1.5 text-sm">تعديل</Link>
                  <form action={setListingStatus}>
                    <input type="hidden" name="id" value={l.id} />
                    <input type="hidden" name="status" value={l.status === "active" ? "closed" : "active"} />
                    <SubmitButton className="btn-ghost px-3 py-1.5 text-sm">
                      {l.status === "active" ? "إغلاق" : "إعادة فتح"}
                    </SubmitButton>
                  </form>
                  <form action={deleteListing}>
                    <input type="hidden" name="id" value={l.id} />
                    <SubmitButton className="btn-ghost px-3 py-1.5 text-sm text-red-700">حذف</SubmitButton>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card max-w-md space-y-3">
        <h2 className="text-lg font-extrabold">بياناتك</h2>
        <ProfileForm initial={profile} />
      </section>
    </div>
  );
}

function ContactLine({ contact }: { contact?: Contact }) {
  if (!contact) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-brand-50 p-3 text-sm" data-testid="contact">
      <span>
        <b>{contact.display_name}</b> · <span dir="ltr">{contact.whatsapp}</span>
      </span>
      <a
        href={whatsappLink(contact.whatsapp, "السلام عليكم، تواصلت معك من موقع Car Exit")}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-primary ms-auto px-3 py-1.5 text-sm"
      >
        واتساب
      </a>
    </div>
  );
}
