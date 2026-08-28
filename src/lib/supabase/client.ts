import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client (anon key + RLS). Safe for user-owned reads:
 * profile, progress, enrollments, leaderboards. NEVER used to fetch questions
 * or grade — that goes through server code with the service role.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
