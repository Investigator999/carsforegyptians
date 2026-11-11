import Link from "next/link";
import { myProfile } from "@/lib/supabase/server";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next = "/me", error } = await searchParams;
  const safe = next.startsWith("/") && !next.startsWith("//") ? next : "/me";
  const { user, profile } = await myProfile();
  if (user) {
    // No server redirect here: it would clash with the one the login form does.
    return (
      <div className="card mx-auto max-w-md space-y-4 text-center">
        <p>أنت مسجل دخول بالفعل.</p>
        <Link href={profile ? safe : `/me?next=${encodeURIComponent(safe)}`} className="btn-primary">
          متابعة
        </Link>
      </div>
    );
  }
  return (
    <div className="card mx-auto max-w-md space-y-4">
      <h1 className="text-xl font-extrabold">الدخول</h1>
      <p className="text-sm leading-7 text-stone-600">
        أول مرة؟ اكتب بريدك واختار كلمة سر، والحساب هيتعمل على طول. عندك حساب؟ اكتب نفس البريد وكلمة السر.
      </p>
      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">الرابط انتهى أو استُخدم من قبل. اطلب رابط جديد.</p>}
      <LoginForm next={next} />
    </div>
  );
}
