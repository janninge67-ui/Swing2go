// Swing2Go Golf UF — /api/admin/orders
// Låter admin-sidan se alla ordrar (Swish och Stripe) och markera dem som
// betalda/skickade. Kräver en giltig token, precis som admin/products.js.

export async function onRequestGet({ request, env }) {
  const authError = await requireAuth(request, env);
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

export async function onRequestPut({ request, env }) {
  const authError = await requireAuth(request, env);
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

function supabaseHeaders(env, extra = {}) {
  return {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    ...(extra.prefer ? { Prefer: extra.prefer } : {}),
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function requireAuth(request, env) {
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return json({ error: 'Inte inloggad.' }, 401);

  const [expiryStr, signature] = token.split('.');
  const expiry = Number(expiryStr);
  if (!expiry || !signature || Date.now() > expiry) {
    return json({ error: 'Sessionen har gått ut. Logga in igen.' }, 401);
  }

  const expectedSecret = env.ADMIN_PASSWORD || 'AAT09';
  const expectedSignature = await sign(expiryStr, expectedSecret);
  if (expectedSignature !== signature) {
    return json({ error: 'Ogiltig session.' }, 401);
  }

  return null;
}

async function sign(message, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return [...new Uint8Array(sigBuf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
