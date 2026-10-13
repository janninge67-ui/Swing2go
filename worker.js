// Swing2Go – Cloudflare Worker
// Secrets som måste finnas (Settings → Variables and Secrets → typ "Secret"):
//   SUPABASE_URL          t.ex. https://abcd1234.supabase.co
//   SUPABASE_SERVICE_KEY  service_role-nyckeln (Supabase → Project Settings → API)
//   ADMIN_PASSWORD        lösenord till /admin
//   SESSION_SECRET        lång slumpmässig text (används för admin-token och besökshash)

import INDEX from './index.html';

const SWISH_NUMBER = '0709355007';
const enc = new TextEncoder();

const SECURITY_HEADERS = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'content-security-policy':
    "default-src 'self'; img-src 'self' data: https://*.supabase.co; style-src 'self' 'unsafe-inline'; " +
    "script-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'",
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

// Fel som är säkra att visa för användaren
const bad = (msg, status = 400) => Object.assign(new Error(msg), { status, pub: true });

// ---------- Supabase (PostgREST + Storage) ----------
async function sb(env, path, { method = 'GET', body, raw, headers = {} } = {}) {
  const res = await fetch(env.SUPABASE_URL.replace(/\/$/, '') + path, {
    method,
    headers: {
      apikey: env.SUPABASE_SERVICE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...headers,
    },
    body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    throw Object.assign(new Error((data && (data.message || data.error)) || 'Databasfel'), {
      status: 400,
      code: data && data.code,
    });
  }
  return data;
}

// ---------- Krypto ----------
const b64u = (buf) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function hmac(secret, data) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64u(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
}

function safeEq(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function makeToken(env) {
  const exp = String(Date.now() + 12 * 3600 * 1000);
  return `${exp}.${await hmac(env.SESSION_SECRET, 'admin.' + exp)}`;
}

async function isAdmin(req, env) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer /, '');
  const [exp, sig] = token.split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return safeEq(sig, await hmac(env.SESSION_SECRET, 'admin.' + exp));
}

// ---------- Hjälpare ----------
const str = (v, max) => String(v ?? '').trim().slice(0, max);
const int = (v, min, max) => {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n) || n < min || n > max) throw bad('Ogiltigt tal');
  return n;
};
const HEX = /^#[0-9a-f]{6}$/i;
const SEASONS = ['none', 'golf', 'halloween', 'autumn', 'winter', 'jul', 'pask', 'midsommar'];
const STATUSES = ['new', 'paid', 'shipped', 'cancelled'];

function cleanProduct(b) {
  return {
    name: (() => { const n = str(b.name, 120); if (!n) throw bad('Produkten behöver ett namn'); return n; })(),
    description: str(b.description, 600),
    price_sek: int(b.price_sek, 0, 1000000),
    stock: int(b.stock, 0, 100000),
    image_url: str(b.image_url, 500),
    active: b.active !== false,
  };
}

function cleanSite(v) {
  const c = v.colors || {};
  const colors = {};
  for (const k of ['primary', 'accent', 'bg', 'ink', 'gold']) {
    if (!HEX.test(c[k] || '')) throw bad('Ogiltig färg');
    colors[k] = c[k];
  }
  return {
    title: str(v.title, 40) || 'Swing2Go',
    tagline: str(v.tagline, 120),
    hero_title: str(v.hero_title, 80),
    hero_text: str(v.hero_text, 300),
    shipping_sek: int(v.shipping_sek, 0, 5000),
    season: SEASONS.includes(v.season) ? v.season : 'none',
    hero_image: str(v.hero_image, 500),
    colors,
  };
}

// ---------- Besöksstatistik utan cookies ----------
async function handleHit(req, env) {
  const b = await req.json().catch(() => ({}));
  const ua = req.headers.get('user-agent') || '';
  if (/bot|crawl|spider|preview|monitor/i.test(ua)) return json({ ok: true });
  const ip = req.headers.get('cf-connecting-ip') || '';
  const day = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Stockholm' });
  // Hash av IP+UA med hemlig nyckel och dagens datum: byts varje dygn, IP:n sparas aldrig.
  const vhash = (await hmac(env.SESSION_SECRET, `v|${day}|${ip}|${ua}`)).slice(0, 22);
  const device = /ipad|tablet/i.test(ua) ? 'Surfplatta' : /mobile|android|iphone/i.test(ua) ? 'Mobil' : 'Dator';
  let ref = '';
  try {
    ref = b.ref ? new URL(b.ref).hostname : '';
    if (ref === new URL(req.url).hostname) ref = '';
  } catch { ref = ''; }
  await sb(env, '/rest/v1/rpc/track', {
    method: 'POST',
    body: {
      p_vhash: vhash,
      p_path: str(b.path, 100) || '/',
      p_country: (req.cf && req.cf.country) || '',
      p_device: device,
      p_ref: ref.slice(0, 100),
      p_view: !!b.fresh,
    },
  });
  return json({ ok: true });
}

// ---------- Beställning ----------
async function handleOrder(req, env) {
  const b = await req.json().catch(() => ({}));
  const c = b.customer || {};
  const cust = {
    p_name: str(c.name, 100), p_email: str(c.email, 150), p_phone: str(c.phone, 30),
    p_address: str(c.address, 150), p_zip: str(c.zip, 12), p_city: str(c.city, 80),
  };
  if (!cust.p_name || !cust.p_address || !cust.p_zip || !cust.p_city) throw bad('Fyll i alla obligatoriska fält');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cust.p_email)) throw bad('Ange en giltig e-postadress');
  const items = (Array.isArray(b.items) ? b.items : []).slice(0, 50).map((i) => ({ id: str(i.id, 40), qty: Number(i.qty) }));
  const o = await sb(env, '/rest/v1/rpc/place_order', { method: 'POST', body: { ...cust, p_items: items } });
  return json({
    order_no: o.order_no,
    total_sek: o.total_sek,
    swish: { number: SWISH_NUMBER, message: `Swing2Go ${o.order_no}` },
  });
}

// ---------- Swish-QR (proxy så att CSP:n kan vara sträng) ----------
async function handleQr(url) {
  const amount = Math.max(1, Math.round(Number(url.searchParams.get('amount')) || 0));
  const msg = str(url.searchParams.get('msg'), 50);
  const r = await fetch('https://mpc.getswish.net/qrg-swish/api/v1/prefilled', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      format: 'svg', size: 300,
      payee: { value: SWISH_NUMBER, editable: false },
      amount: { value: amount, editable: false },
      message: { value: msg, editable: false },
    }),
  });
  if (!r.ok) return new Response('QR ej tillgänglig', { status: 502 });
  return new Response(r.body, { headers: { 'content-type': 'image/svg+xml', 'cache-control': 'public, max-age=3600' } });
}

// ---------- API ----------
async function api(req, env, url, p) {
  const m = req.method;

  if (m === 'GET' && p === '/api/shop') {
    const [site, products] = await Promise.all([
      sb(env, '/rest/v1/settings?key=eq.site&select=value'),
      sb(env, '/rest/v1/products?active=eq.true&select=id,name,description,price_sek,stock,image_url&order=created_at.desc'),
    ]);
    return json({ site: (site[0] && site[0].value) || {}, products });
  }
  if (m === 'POST' && p === '/api/hit') return handleHit(req, env);
  if (m === 'POST' && p === '/api/order') return handleOrder(req, env);
  if (m === 'GET' && p === '/api/qr') return handleQr(url);

  if (m === 'POST' && p === '/api/admin/login') {
    const b = await req.json().catch(() => ({}));
    const a = await hmac(env.SESSION_SECRET, 'pw.' + str(b.password, 200));
    const z = await hmac(env.SESSION_SECRET, 'pw.' + env.ADMIN_PASSWORD);
    if (!safeEq(a, z)) {
      await new Promise((r) => setTimeout(r, 900)); // bromsar gissning
      throw bad('Fel lösenord', 401);
    }
    return json({ token: await makeToken(env) });
  }

  if (!p.startsWith('/api/admin/')) return json({ error: 'Hittades inte' }, 404);
  if (!(await isAdmin(req, env))) return json({ error: 'Inte inloggad' }, 401);

  if (m === 'GET' && p === '/api/admin/stats') return json(await sb(env, '/rest/v1/rpc/admin_stats', { method: 'POST', body: {} }));

  if (m === 'GET' && p === '/api/admin/orders') {
    return json(await sb(env, '/rest/v1/orders?select=*&order=created_at.desc&limit=200'));
  }
  let mm = p.match(/^\/api\/admin\/orders\/([0-9a-f-]{36})$/);
  if (mm && m === 'PATCH') {
    const b = await req.json().catch(() => ({}));
    if (!STATUSES.includes(b.status)) throw bad('Ogiltig status');
    const r = await sb(env, `/rest/v1/orders?id=eq.${mm[1]}`, {
      method: 'PATCH', body: { status: b.status }, headers: { prefer: 'return=representation' },
    });
    return json(r[0] || {});
  }

  if (m === 'GET' && p === '/api/admin/products') {
    return json(await sb(env, '/rest/v1/products?select=*&order=created_at.desc'));
  }
  if (m === 'POST' && p === '/api/admin/products') {
    const row = cleanProduct(await req.json().catch(() => ({})));
    const r = await sb(env, '/rest/v1/products', { method: 'POST', body: row, headers: { prefer: 'return=representation' } });
    return json(r[0]);
  }
  mm = p.match(/^\/api\/admin\/products\/([0-9a-f-]{36})$/);
  if (mm && m === 'PATCH') {
    const row = cleanProduct(await req.json().catch(() => ({})));
    const r = await sb(env, `/rest/v1/products?id=eq.${mm[1]}`, { method: 'PATCH', body: row, headers: { prefer: 'return=representation' } });
    return json(r[0] || {});
  }
  if (mm && m === 'DELETE') {
    await sb(env, `/rest/v1/products?id=eq.${mm[1]}`, { method: 'DELETE' });
    return json({ ok: true });
  }

  if (m === 'PUT' && p === '/api/admin/settings') {
    const b = await req.json().catch(() => ({}));
    const value = cleanSite(b.value || {});
    await sb(env, '/rest/v1/settings?on_conflict=key', {
      method: 'POST', body: { key: 'site', value }, headers: { prefer: 'resolution=merge-duplicates' },
    });
    return json({ ok: true });
  }

  if (m === 'POST' && p === '/api/admin/upload') {
    const type = (req.headers.get('content-type') || '').split(';')[0];
    const ext = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[type];
    if (!ext) throw bad('Endast PNG, JPG eller WebP');
    const buf = await req.arrayBuffer();
    if (buf.byteLength > 5 * 1024 * 1024) throw bad('Bilden är för stor (max 5 MB)');
    const name = `${crypto.randomUUID()}.${ext}`;
    await sb(env, `/storage/v1/object/product-images/${name}`, { method: 'POST', raw: buf, headers: { 'content-type': type } });
    return json({ url: `${env.SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/product-images/${name}` });
  }

  return json({ error: 'Hittades inte' }, 404);
}

// ---------- Ingång ----------
export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const p = url.pathname;
    try {
      if (req.method === 'GET' && (p === '/' || p === '/admin' || p === '/admin/')) {
        return new Response(INDEX, {
          headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache', ...SECURITY_HEADERS },
        });
      }
      if (p.startsWith('/api/')) {
        if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY || !env.SESSION_SECRET || !env.ADMIN_PASSWORD) {
          return json({ error: 'Servern saknar inställningar (secrets)' }, 500);
        }
        return await api(req, env, url, p);
      }
      return new Response('Sidan hittades inte', { status: 404 });
    } catch (e) {
      const show = e.pub || e.code === 'P0001';
      if (!show) console.error(e);
      return json({ error: show ? e.message : 'Något gick fel, försök igen' }, e.status || 500);
    }
  },
};
