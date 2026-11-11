import { redirect } from "next/navigation";
import { currentUser } from "@/lib/supabase/server";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next = "/me", error } = await searchParams;
  const { user } = await currentUser();
  if (user) redirect(next.startsWith("/") ? next : "/me");
  return (
    <div className="card mx-auto max-w-md space-y-4">
      <h1 className="text-xl font-extrabold">الدخول</h1>
      <p className="text-sm leading-7 text-stone-600">
        بدون كلمة سر: اكتب بريدك وهنبعت لك رابط تدخل منه على طول. الحساب مطلوب عشان تضيف إعلان أو تطلب
        التواصل مع صاحب إعلان.
      </p>
      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">الرابط انتهى أو استُخدم من قبل. اطلب رابط جديد.</p>}
      <LoginForm next={next} />
    </div>
  );
}
