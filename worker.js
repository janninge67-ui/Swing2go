// Swing2go – Cloudflare Worker
// Gör tre saker:
//   1. Serverar sidan (index.html) på "/" och "/admin"
//   2. GET  /api/config  -> ger webbläsaren Supabase-URL + publik nyckel
//   3. POST /api/order   -> lägger en order i Supabase (priser och lager kontrolleras här)

import page from './index.html';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

const clean = (value, max) => String(value ?? '').trim().slice(0, max);

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (pathname === '/api/config') {
      return json({ supabaseUrl: env.SUPABASE_URL, anonKey: env.SUPABASE_ANON_KEY });
    }

    if (pathname === '/api/order') {
      if (request.method !== 'POST') return json({ error: 'Metoden stöds inte.' }, 405);
      return placeOrder(request, env);
    }

    // Butik och admin är samma sida – sidan själv avgör vad som visas.
    if (pathname === '/' || pathname === '/admin' || pathname === '/admin/') {
      return new Response(page, {
        headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' },
      });
    }

    return new Response('Sidan finns inte.', { status: 404 });
  },
};

async function placeOrder(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Ogiltig förfrågan.' }, 400);
  }

  // Dolt fält som riktiga besökare aldrig fyller i – bots gör det.
  if (body.website) return json({ order_no: 0, total_sek: 0 });

  const customer = {
    name: clean(body.name, 100),
    email: clean(body.email, 150),
    phone: clean(body.phone, 30),
    address: clean(body.address, 150),
    zip: clean(body.zip, 12),
    city: clean(body.city, 80),
    note: clean(body.note, 500),
  };

  if (!customer.name || !customer.address || !customer.zip || !customer.city) {
    return json({ error: 'Fyll i namn och leveransadress.' }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
    return json({ error: 'Ange en giltig e-postadress.' }, 400);
  }

  const items = (Array.isArray(body.items) ? body.items : [])
    .slice(0, 50)
    .filter((i) => i && typeof i === 'object')
    .map((i) => ({ id: String(i.id), qty: Number.parseInt(i.qty, 10) }));

  if (!items.length || items.some((i) => !(i.qty >= 1 && i.qty <= 50))) {
    return json({ error: 'Din bag är tom eller har ogiltiga antal.' }, 400);
  }

  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/place_order`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apikey: env.SUPABASE_SERVICE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
    },
    body: JSON.stringify({
      p_name: customer.name,
      p_email: customer.email,
      p_phone: customer.phone,
      p_address: customer.address,
      p_zip: customer.zip,
      p_city: customer.city,
      p_note: customer.note,
      p_items: items,
    }),
  });

  const out = await res.json().catch(() => ({}));

  if (!res.ok) {
    // P0001 = felmeddelanden vi själva skrivit i place_order (t.ex. slut i lager)
    if (out.code === 'P0001') return json({ error: out.message }, 409);
    console.error('place_order misslyckades', res.status, JSON.stringify(out));
    return json({ error: 'Det gick inte att lägga beställningen just nu. Försök igen om en stund.' }, 500);
  }

  return json({ order_no: out.order_no, total_sek: out.total_sek });
}
