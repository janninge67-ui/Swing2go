// Swing2Go Golf UF — /api/admin/orders
import { json, supabaseHeaders, requireAdminAuth } from '../lib/helpers.js';

export async function adminOrdersGet(request, env) {
  const authError = await requireAdminAuth(request, env);
  if (authError) return authError;

  const ordersRes = await fetch(
    `${env.SUPABASE_URL}/rest/v1/orders?select=*&order=created_at.desc&limit=200`,
    { headers: supabaseHeaders(env) }
  );
  const orders = await ordersRes.json();

  const itemsRes = await fetch(
    `${env.SUPABASE_URL}/rest/v1/order_items?select=*`,
    { headers: supabaseHeaders(env) }
  );
  const items = await itemsRes.json();

  const withItems = orders.map((order) => ({
    ...order,
    items: items.filter((i) => i.order_id === order.id),
  }));

  return json(withItems);
}

export async function adminOrdersPut(request, env) {
  const authError = await requireAdminAuth(request, env);
  if (authError) return authError;

  const body = await request.json().catch(() => null);
  if (!body || !body.id || !body.status) {
    return json({ error: 'Order-id och status krävs.' }, 400);
  }

  const allowedStatuses = ['pending', 'paid', 'fulfilled', 'cancelled'];
  if (!allowedStatuses.includes(body.status)) {
    return json({ error: 'Ogiltig status.' }, 400);
  }

  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/orders?id=eq.${body.id}`, {
    method: 'PATCH',
    headers: supabaseHeaders(env, { prefer: 'return=representation' }),
    body: JSON.stringify({ status: body.status }),
  });
  const data = await res.json();
  return json(data, res.status);
}
