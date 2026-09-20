import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../env";
import { adminKlient } from "../lib/supabase";

/**
 * Valfri inloggning: gäster får handla, inloggade kunder får ordern kopplad till sitt konto.
 * Token verifieras mot Supabase Auth. Vi litar aldrig på ett user-id från klienten.
 */
export const valfriInloggning = createMiddleware<AppEnv>(async (c, next) => {
  const header = c.req.header("Authorization");
  if (!header) {
    c.set("userId", null);
    return next();
  }

  const token = header.replace(/^Bearer\s+/i, "");
  const { data, error } = await adminKlient(c.env).auth.getUser(token);
  if (error || !data.user) {
    return c.json({ fel: "Din inloggning har gått ut. Logga in igen och försök på nytt." }, 401);
  }
  c.set("userId", data.user.id);
  return next();
});
