// Swing2Go Golf UF — /api/admin/products
//
// Kräver en giltig token (från /api/admin/login) i Authorization-headern
// på alla anrop. Använder service_role-nyckeln för att läsa/skriva direkt
// mot Supabase, oavsett vad Row Level Security annars tillåter — så denna
// fil måste alltid kontrollera token FÖRST, innan den rör databasen.

export async function onRequestGet({ request, env }) {
  const authError = await requireAuth(request, env);
  if (authError) return authError;

  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/products?select=*&order=category,name`,
    { headers: supabaseHeaders(env) }
  );
  const data = await res.json();
  return json(data, res.status);
}

export async function onRequestPost({ request, env }) {
  const authError = await requireAuth(request, env);
  if (authError) return authError;

  const body = await request.json().catch(() => null);
  const product = sanitizeProduct(body);
  if (!product) return json({ error: 'Ogiltiga produktfält.' }, 400);

  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/products`, {
    method: 'POST',
    headers: supabaseHeaders(env, { prefer: 'return=representation' }),
    body: JSON.stringify([product]),
  });
  const data = await res.json();
  return json(data, res.status);
}

export async function onRequestPut({ request, env }) {
  const authError = await requireAuth(request, env);
  if (authError) return authError;

  const body = await request.json().catch(() => null);
  if (!body || !body.id) return json({ error: 'Produkt-id saknas.' }, 400);

  const { id, ...rest } = body;
  const product = sanitizeProduct(rest, { partial: true });
  if (!product) return json({ error: 'Ogiltiga produktfält.' }, 400);

  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/products?id=eq.${id}`, {
    method: 'PATCH',
    headers: supabaseHeaders(env, { prefer: 'return=representation' }),
    body: JSON.stringify(product),
  });
  const data = await res.json();
  return json(data, res.status);
}

export async function onRequestDelete({ request, env }) {
  const authError = await requireAuth(request, env);
  if (authError) return authError;

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return json({ error: 'Produkt-id saknas.' }, 400);

  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/products?id=eq.${id}`, {
    method: 'DELETE',
    headers: supabaseHeaders(env),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return json(data, res.status);
  }
  return json({ deleted: true });
}

// ---------- Hjälpfunktioner ----------

function sanitizeProduct(body, { partial = false } = {}) {
  if (!body || typeof body !== 'object') return null;
  const out = {};

  if (body.name !== undefined) out.name = String(body.name).slice(0, 200);
  if (body.description !== undefined) out.description = String(body.description).slice(0, 1000);
  if (body.category !== undefined) {
    if (!['balls', 'gear', 'apparel'].includes(body.category)) return null;
    out.category = body.category;
  }
  if (body.icon !== undefined) out.icon = String(body.icon).slice(0, 40);
  if (body.accent !== undefined) out.accent = String(body.accent).slice(0, 20);
  if (body.image_url !== undefined) out.image_url = body.image_url ? String(body.image_url).slice(0, 500) : null;
  if (body.price_cents !== undefined) {
    const price = parseInt(body.price_cents, 10);
    if (!Number.isFinite(price) || price < 0) return null;
    out.price_cents = price;
  }
  if (body.stock !== undefined) {
    const stock = parseInt(body.stock, 10);
    if (!Number.isFinite(stock) || stock < 0) return null;
    out.stock = stock;
  }

  if (!partial) {
    const required = ['name', 'category', 'price_cents'];
    for (const field of required) {
      if (out[field] === undefined) return null;
    }
    if (out.description === undefined) out.description = '';
    if (out.icon === undefined) out.icon = 'ball';
    if (out.accent === undefined) out.accent = '#1B4332';
    if (out.stock === undefined) out.stock = 0;
  }

  return out;
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

  return null; // null = ingen auth-fel, fortsätt
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
