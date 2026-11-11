import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Says whether the Supabase settings are present (never their values) and whether the DB answers.
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let database = "not checked";
  if (url && key) {
    try {
      const res = await fetch(`${url}/rest/v1/listings?select=id&limit=1`, {
        headers: { apikey: key },
        cache: "no-store",
      });
      database = res.ok ? "ok" : `error ${res.status}`;
    } catch {
      database = "unreachable";
    }
  }
  return NextResponse.json({
    NEXT_PUBLIC_SUPABASE_URL: Boolean(url),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(key),
    database,
  });
}
