import { createClient } from "@supabase/supabase-js";

/**
 * Client-safe Supabase client — uses the anon key only.
 * For read-only public data if needed in the future.
 */
export function getAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
