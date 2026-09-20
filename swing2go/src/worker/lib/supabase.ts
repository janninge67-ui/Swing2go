import { createClient } from "@supabase/supabase-js";
import type { Env } from "../env";

/** Klient med service-nyckeln. Används bara i Workern, aldrig i webbläsaren. */
export function adminKlient(env: Env) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
