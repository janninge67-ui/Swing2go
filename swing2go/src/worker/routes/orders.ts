import { Hono } from "hono";
import { SHIPPING_ORE } from "../../shared/constants";
import { createOrderSchema } from "../../shared/validation";
import type { AppEnv } from "../env";
import { valfriInloggning } from "../middleware/auth";
import { adminKlient } from "../lib/supabase";

export const orders = new Hono<AppEnv>();

orders.post("/", valfriInloggning, async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ fel: "Beställningen kunde inte läsas. Försök igen." }, 400);
  }

  const tolkad = createOrderSchema.safeParse(body);
  if (!tolkad.success) {
    // Ett meddelande per fält, t.ex. { "customer.email": "Ange en giltig e-postadress." }
    const falt: Record<string, string> = {};
    for (const issue of tolkad.error.issues) {
      const nyckel = issue.path.join(".");
      if (!(nyckel in falt)) falt[nyckel] = issue.message;
    }
    return c.json({ fel: tolkad.error.issues[0]?.message ?? "Kontrollera uppgifterna.", falt }, 400);
  }

  const { customer, items } = tolkad.data;

  // Samma variant på flera rader slås ihop, så att lagerkontrollen ser hela antalet.
  const perVariant = new Map<string, number>();
  for (const i of items) perVariant.set(i.variantId, (perVariant.get(i.variantId) ?? 0) + i.quantity);
  const sammanslagna = [...perVariant].map(([variantId, quantity]) => ({ variantId, quantity }));

  // Priset skickas aldrig från klienten. Databasfunktionen hämtar det själv
  // och drar lagret i samma transaktion.
  const { data, error } = await adminKlient(c.env).rpc("create_order", {
    p_user_id: c.get("userId"),
    p_customer: customer,
    p_items: sammanslagna,
    p_shipping_ore: SHIPPING_ORE,
  });

  if (error) {
    // P0001 = fel som vår egen funktion kastar (t.ex. slut i lager). De är skrivna på svenska.
    if (error.code === "P0001") return c.json({ fel: error.message }, 409);
    console.error("create_order misslyckades", error);
    return c.json({ fel: "Vi kunde inte lägga din beställning. Försök igen om en stund." }, 500);
  }

  const rad = (data as { order_id: string; order_number: number; total_ore: number }[])?.[0];
  if (!rad) return c.json({ fel: "Vi kunde inte lägga din beställning. Försök igen om en stund." }, 500);

  return c.json({ orderNumber: rad.order_number, totalOre: rad.total_ore }, 201);
});
