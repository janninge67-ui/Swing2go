// Swing2Go Golf UF — delade hjälpfunktioner för alla /api-handlers.

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function supabaseHeaders(env, extra = {}) {
  return {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    ...(extra.prefer ? { Prefer: extra.prefer } : {}),
  };
}

export async function sign(message, secret) {
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

// Returnerar ett Response-objekt om requesten INTE är inloggad (som handlern
// då ska returnera direkt), eller null om allt är okej och handlern kan
// fortsätta.
export async function requireAdminAuth(request, env) {
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
