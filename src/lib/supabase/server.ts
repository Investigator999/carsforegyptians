import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseEnv } from "./config";

/** Supabase client that acts as the signed-in visitor (RLS applies). */
export async function supabaseServer() {
  const { url, anonKey } = supabaseEnv();
  const store = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Called from a Server Component: the middleware refreshes cookies instead.
        }
      },
    },
  });
}

export async function currentUser() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user };
}

export async function myProfile() {
  const { supabase, user } = await currentUser();
  if (!user) return { supabase, user, profile: null };
  const { data } = await supabase.rpc("get_my_profile");
  const profile = (data as { display_name: string; whatsapp: string }[] | null)?.[0] ?? null;
  return { supabase, user, profile };
}
