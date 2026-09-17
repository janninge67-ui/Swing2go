// Swing2GoUF — public config
//
// These two values are SAFE to be public: the anon key only ever grants what
// your Supabase Row Level Security policies allow (in schema.sql, that's
// read-only access to the products table). Never put your service role key
// or Stripe secret key here — those stay in Cloudflare Pages environment
// variables, used only inside /functions.

window.SWING2GOUF_CONFIG = {
  SUPABASE_URL: 'https://YOUR-PROJECT-REF.supabase.co',
  SUPABASE_ANON_KEY: 'YOUR-SUPABASE-ANON-PUBLIC-KEY',
};
