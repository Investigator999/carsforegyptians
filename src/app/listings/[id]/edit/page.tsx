import { notFound, redirect } from "next/navigation";
import { myProfile } from "@/lib/supabase/server";
import { updateListing } from "@/app/actions";
import { ListingForm } from "@/components/ListingForm";
import type { Listing } from "@/lib/listings";

export default async function EditListing({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await myProfile();
  if (!user) redirect(`/login?next=/listings/${id}/edit`);
  const { data } = await supabase.from("listings").select("*").eq("id", id).eq("owner_id", user.id).maybeSingle();
  if (!data) notFound();
  return (
    <div className="card mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-extrabold">تعديل الإعلان</h1>
      <ListingForm action={updateListing.bind(null, id)} initial={data as Listing} submitLabel="حفظ التعديلات" />
    </div>
  );
}
