import { redirect } from "next/navigation";
import { myProfile } from "@/lib/supabase/server";
import { createListing } from "@/app/actions";
import { ListingForm } from "@/components/ListingForm";

export default async function NewListing({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind } = await searchParams;
  const here = `/listings/new${kind ? `?kind=${kind}` : ""}`;
  const { user, profile } = await myProfile();
  if (!user) redirect(`/login?next=${encodeURIComponent(here)}`);
  if (!profile) redirect(`/me?next=${encodeURIComponent(here)}`);
  return (
    <div className="card mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-extrabold">إعلان جديد</h1>
      <ListingForm action={createListing} defaultKind={kind === "funder" ? "funder" : "holder"} submitLabel="نشر الإعلان" />
    </div>
  );
}
