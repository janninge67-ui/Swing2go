export interface Env {
  ASSETS: Fetcher;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  /** Secret. Sätts med `wrangler secret put SUPABASE_SERVICE_ROLE_KEY`. */
  SUPABASE_SERVICE_ROLE_KEY: string;
}

export type AppEnv = {
  Bindings: Env;
  Variables: { userId: string | null };
};
