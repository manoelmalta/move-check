/**
 * Supabase server-side client — uses SERVICE ROLE KEY.
 *
 * RULES:
 * - Import ONLY in server components, server actions, and API routes.
 * - Never import in "use client" files.
 * - Never expose SUPABASE_SERVICE_ROLE_KEY to the browser.
 * - Never create NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY.
 */
import { createClient } from "@supabase/supabase-js";

export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase server environment variables. " +
        "Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set."
    );
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
