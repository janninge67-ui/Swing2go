// Swing2go – Cloudflare Worker
// Gör fyra saker:
//   1. Serverar sidan (index.html) på "/" och "/admin"
//   2. GET  /api/config  -> ger webbläsaren Supabase-URL + publik nyckel
//   3. POST /api/order   -> lägger en order i Supabase (priser och lager kontrolleras här)
//   4. POST /api/review  -> sparar en kundrecension (ej godkänd tills du godkänner den i admin)

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

    if (pathname === '/api/review') {
      if (request.method !== 'POST') return json({ error: 'Metoden stöds inte.' }, 405);
      return submitReview(request, env);
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

// ---- Delat: kontrollera att inställningarna i Cloudflare är ifyllda ----
// och bygg rätt headers för Supabase, oavsett vilken sorts nyckel som används.
function supaAuth(env) {
  const key = env.SUPABASE_SERVICE_KEY;
  if (!key) {
    return { error: 'Inställningsfel: SUPABASE_SERVICE_KEY saknas i Cloudflare (Settings → Variables and Secrets).' };
  }
  if (!env.SUPABASE_URL || env.SUPABASE_URL.includes('DITT-PROJEKT')) {
    return { error: 'Inställningsfel: SUPABASE_URL i wrangler.jsonc är inte ifylld.' };
  }
  // Gamla service_role-nycklar är JWT och går i båda headers.
  // Nya sb_secret_-nycklar är INTE JWT och ska bara skickas i apikey.
  const headers = { 'content-type': 'application/json', apikey: key };
  if (key.startsWith('eyJ')) headers.authorization = `Bearer ${key}`;
  return { headers };
}

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

  const auth = supaAuth(env);
  if (auth.error) return json({ error: auth.error }, 500);

  let res;
  try {
    res = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/place_order`, {
      method: 'POST',
      headers: auth.headers,
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
  } catch (err) {
    console.error('Kunde inte nå Supabase', String(err));
    return json({ error: 'Inställningsfel: Workern når inte Supabase. Kontrollera SUPABASE_URL i wrangler.jsonc.' }, 500);
  }

  const out = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error('place_order misslyckades', res.status, JSON.stringify(out));

    // P0001 = felmeddelanden vi själva skrivit i place_order (t.ex. slut i lager)
    if (out.code === 'P0001') return json({ error: out.message }, 409);

    if (res.status === 401 || res.status === 403 || out.code === '42501') {
      return json({ error: 'Inställningsfel: fel nyckel i SUPABASE_SERVICE_KEY. Använd service_role-nyckeln (eller secret-nyckeln), inte anon/publishable.' }, 500);
    }
    if (res.status === 404 || out.code === 'PGRST202') {
      return json({ error: 'Inställningsfel: funktionen place_order saknas i Supabase. Kör schema-ny.sql igen.' }, 500);
    }
    return json({ error: 'Det gick inte att lägga beställningen just nu. Försök igen om en stund.' }, 500);
  }

  return json({ order_no: out.order_no, total_sek: out.total_sek });
}

async function submitReview(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Ogiltig förfrågan.' }, 400);
  }

  // Dolt fält som riktiga besökare aldrig fyller i – bots gör det.
  if (body.website) return json({ ok: true });

  const name = clean(body.name, 60);
  const comment = clean(body.comment, 500);
  const rating = Number.parseInt(body.rating, 10);

  if (!name) return json({ error: 'Skriv ditt namn.' }, 400);
  if (!(rating >= 1 && rating <= 5)) return json({ error: 'Välj ett betyg mellan 1 och 5 stjärnor.' }, 400);

  const auth = supaAuth(env);
  if (auth.error) return json({ error: auth.error }, 500);

  let res;
  try {
    res = await fetch(`${env.SUPABASE_URL}/rest/v1/reviews`, {
      method: 'POST',
      headers: { ...auth.headers, prefer: 'return=minimal' },
      body: JSON.stringify({ name, rating, comment: comment || null, approved: false }),
    });
  } catch (err) {
    console.error('Kunde inte nå Supabase', String(err));
    return json({ error: 'Inställningsfel: Workern når inte Supabase. Kontrollera SUPABASE_URL i wrangler.jsonc.' }, 500);
  }

  if (!res.ok) {
    const out = await res.json().catch(() => ({}));
    console.error('recension misslyckades', res.status, JSON.stringify(out));
    if (res.status === 401 || res.status === 403 || out.code === '42501') {
      return json({ error: 'Inställningsfel: fel nyckel i SUPABASE_SERVICE_KEY.' }, 500);
    }
    if (res.status === 404 || out.code === '42P01') {
      return json({ error: 'Inställningsfel: tabellen reviews saknas i Supabase. Kör schema-recensioner.sql.' }, 500);
    }
    return json({ error: 'Det gick inte att skicka recensionen just nu. Försök igen om en stund.' }, 500);
  }

  return json({ ok: true });
}
