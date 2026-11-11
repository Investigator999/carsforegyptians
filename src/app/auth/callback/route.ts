import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextParam = url.searchParams.get("next") ?? "/me";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/me";
  if (code) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // New accounts fill in their name + WhatsApp first, then continue.
      const { data } = await supabase.rpc("get_my_profile");
      const hasProfile = Array.isArray(data) && data.length > 0;
      const target = hasProfile ? next : `/me?next=${encodeURIComponent(next)}`;
      return NextResponse.redirect(new URL(target, url.origin));
    }
  }
  return NextResponse.redirect(new URL(`/login?error=1&next=${encodeURIComponent(next)}`, url.origin));
}
