import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Sant när Supabase är konfigurerat. Annars visas demo-data lokalt. */
export const harSupabase = Boolean(url && anonKey && !url.includes("DITT-PROJEKT"));

// Bara den publika anon-nyckeln används här. Service-nyckeln finns endast i Workern.
export const supabase = harSupabase ? createClient(url!, anonKey!) : null;

export function bildUrl(storagePath: string): string {
  if (!supabase) return storagePath;
  return supabase.storage.from("product-images").getPublicUrl(storagePath).data.publicUrl;
}
