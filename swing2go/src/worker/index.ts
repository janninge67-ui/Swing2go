import { Hono } from "hono";
import type { AppEnv } from "./env";
import { orders } from "./routes/orders";

export type { Env } from "./env";

const app = new Hono<AppEnv>();

app.get("/api/health", (c) => c.json({ ok: true, tjanst: "swing2go" }));
app.route("/api/orders", orders);

// Adminrutter kopplas på i steg 8.

app.notFound((c) => c.json({ fel: "Sidan hittades inte." }, 404));

app.onError((err, c) => {
  console.error(err);
  return c.json({ fel: "Något gick fel hos oss. Försök igen om en stund." }, 500);
});

export default app;
