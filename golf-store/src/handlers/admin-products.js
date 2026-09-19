// Swing2Go Golf UF — /api/admin/products
import { json, supabaseHeaders, requireAdminAuth } from '../lib/helpers.js';

export async function adminProductsGet(request, env) {
  const authError = await requireAdminAuth(request, env);
  if (authError) return authError;

  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/products?select=*&order=category,name`,
    { headers: supabaseHeaders(env) }
  );
  const data = await res.json();
  return json(data, res.status);
}

export async function adminProductsPost(request, env) {
  const authError = await requireAdminAuth(request, env);
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

export async function adminProductsPut(request, env) {
  const authError = await requireAdminAuth(request, env);
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

export async function adminProductsDelete(request, env) {
  const authError = await requireAdminAuth(request, env);
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
