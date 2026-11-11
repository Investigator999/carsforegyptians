"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { currentUser, myProfile } from "@/lib/supabase/server";
import { normalizePhone, parseListingForm, type FieldErrors } from "@/lib/listings";

export type FormState = { ok?: boolean; message?: string; errors?: FieldErrors };

function dbMessage(error: { message: string; code?: string }) {
  if (error.message.includes("too_many_listings")) return "الحد الأقصى 5 إعلانات نشطة لكل حساب.";
  if (error.message.includes("too_many_requests")) return "وصلت للحد اليومي لطلبات التواصل. حاول بكرة.";
  if (error.code === "23505") return "أرسلت هذا الطلب من قبل.";
  return "حصل خطأ، حاول مرة أخرى.";
}

async function siteOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

function safeNext(value: FormDataEntryValue | null) {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/") && !v.startsWith("//") ? v : "/me";
}

// ───────────── auth ─────────────

/** One form for both: log in if the account exists, otherwise create it. No email is sent. */
export async function signInOrUp(_: FormState, form: FormData): Promise<FormState> {
  const email = z.email().safeParse(String(form.get("email") ?? "").trim().toLowerCase());
  const password = String(form.get("password") ?? "");
  const errors: FieldErrors = {};
  if (!email.success) errors.email = "اكتب بريد إلكتروني صحيح";
  if (password.length < 6) errors.password = "كلمة السر 6 حروف أو أرقام على الأقل";
  if (!email.success || Object.keys(errors).length) return { errors };
  const next = safeNext(form.get("next"));
  const { supabase } = await currentUser();

  const login = await supabase.auth.signInWithPassword({ email: email.data, password });
  if (login.error) {
    if (login.error.code === "email_not_confirmed") {
      return { message: "الحساب ده لسه مش متأكد. لو مفيش رسالة وصلتك، تواصل مع إدارة الموقع لتفعيله." };
    }
    if (login.error.code !== "invalid_credentials") return { message: "حصل خطأ، حاول مرة أخرى بعد دقيقة." };
    const signup = await supabase.auth.signUp({
      email: email.data,
      password,
      options: { emailRedirectTo: `${await siteOrigin()}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (signup.error) {
      if (signup.error.code === "user_already_exists") return { errors: { password: "كلمة السر غير صحيحة" } };
      if (signup.error.code === "weak_password") return { errors: { password: "كلمة السر ضعيفة، جرّب كلمة أطول" } };
      return { message: "تعذر إنشاء الحساب، حاول مرة أخرى بعد دقيقة." };
    }
    // Supabase still asks for email confirmation (should be turned off in the dashboard)
    if (!signup.data.session) return { ok: true, message: `أرسلنا رسالة تأكيد إلى ${email.data}. افتحها ثم سجّل الدخول.` };
  }

  const { data } = await supabase.rpc("get_my_profile");
  const hasProfile = Array.isArray(data) && data.length > 0;
  redirect(hasProfile ? next : `/me?next=${encodeURIComponent(next)}`);
}

export async function signOut() {
  const { supabase } = await currentUser();
  await supabase.auth.signOut();
  redirect("/");
}

// ───────────── profile ─────────────

export async function saveProfile(_: FormState, form: FormData): Promise<FormState> {
  const { supabase, user, profile } = await myProfile();
  if (!user) redirect("/login");
  const name = String(form.get("display_name") ?? "").trim();
  const phone = normalizePhone(String(form.get("whatsapp") ?? ""));
  const errors: FieldErrors = {};
  if (name.length < 2 || name.length > 40) errors.display_name = "الاسم من 2 إلى 40 حرف";
  if (!phone) errors.whatsapp = "اكتب الرقم بكود الدولة، مثال: ‎+966501234567";
  if (Object.keys(errors).length) return { errors };

  const row = { display_name: name, whatsapp: phone! };
  const { error } = profile
    ? await supabase.from("profiles").update(row).eq("id", user.id)
    : await supabase.from("profiles").insert({ id: user.id, ...row });
  if (error) return { message: dbMessage(error) };

  revalidatePath("/", "layout");
  const next = form.get("next");
  if (typeof next === "string" && next) redirect(safeNext(next));
  return { ok: true, message: "تم حفظ بياناتك." };
}

async function requireProfile(next: string) {
  const ctx = await myProfile();
  if (!ctx.user) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (!ctx.profile) redirect(`/me?next=${encodeURIComponent(next)}`);
  return ctx;
}

// ───────────── listings ─────────────

export async function createListing(_: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireProfile("/listings/new");
  const parsed = parseListingForm(form);
  if (!parsed.ok) return { errors: parsed.errors };
  const { data, error } = await supabase.from("listings").insert(parsed.data).select("id").single();
  if (error) return { message: dbMessage(error) };
  revalidatePath("/");
  redirect(`/listings/${data.id}`);
}

export async function updateListing(id: string, _: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireProfile(`/listings/${id}/edit`);
  const parsed = parseListingForm(form);
  if (!parsed.ok) return { errors: parsed.errors };
  // kind is fixed once posted
  const { kind: _kind, ...rest } = parsed.data;
  void _kind;
  const { error } = await supabase.from("listings").update(rest).eq("id", id);
  if (error) return { message: dbMessage(error) };
  revalidatePath("/");
  revalidatePath(`/listings/${id}`);
  redirect(`/listings/${id}`);
}

export async function setListingStatus(form: FormData) {
  const { supabase } = await requireProfile("/me");
  const id = String(form.get("id"));
  const status = form.get("status") === "active" ? "active" : "closed";
  await supabase.from("listings").update({ status }).eq("id", id);
  revalidatePath("/");
  revalidatePath("/me");
  revalidatePath(`/listings/${id}`);
}

export async function deleteListing(form: FormData) {
  const { supabase } = await requireProfile("/me");
  await supabase.from("listings").delete().eq("id", String(form.get("id")));
  revalidatePath("/");
  revalidatePath("/me");
  redirect("/me");
}

// ───────────── contact + reports ─────────────

export async function requestContact(listingId: string, _: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireProfile(`/listings/${listingId}`);
  const message = String(form.get("message") ?? "").trim();
  if (message.length < 5 || message.length > 500) {
    return { errors: { message: "اكتب رسالة قصيرة (من 5 إلى 500 حرف)" } };
  }
  const { error } = await supabase.from("contact_requests").insert({ listing_id: listingId, message });
  if (error) return { message: dbMessage(error) };
  revalidatePath(`/listings/${listingId}`);
  return { ok: true, message: "تم إرسال طلبك. لو وافق صاحب الإعلان هيظهر لك رقمه في صفحة «حسابي»." };
}

export async function answerRequest(form: FormData) {
  const { supabase } = await requireProfile("/me");
  const status = form.get("answer") === "accept" ? "accepted" : "declined";
  await supabase.from("contact_requests").update({ status }).eq("id", String(form.get("id")));
  revalidatePath("/me");
}

export async function reportListing(listingId: string, _: FormState, form: FormData): Promise<FormState> {
  const { supabase, user } = await myProfile();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/listings/${listingId}`)}`);
  const reason = String(form.get("reason") ?? "").trim();
  if (reason.length < 3) return { errors: { reason: "اكتب سبب البلاغ" } };
  const { error } = await supabase.from("reports").insert({ listing_id: listingId, reason: reason.slice(0, 500) });
  if (error) return { message: error.code === "23505" ? "أبلغت عن هذا الإعلان من قبل." : dbMessage(error) };
  return { ok: true, message: "شكرًا، وصلنا البلاغ." };
}
