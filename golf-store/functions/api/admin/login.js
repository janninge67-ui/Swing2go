// Swing2Go Golf UF — POST /api/admin/login
//
// Kollar lösenordet mot miljövariabeln ADMIN_PASSWORD (faller tillbaka på
// "AAT09" om variabeln inte är satt — byt gärna till något längre i
// Cloudflare Pages > Settings > Environment variables).
//
// Ger tillbaka en signerad token (giltig i 12 timmar) som admin-sidan
// sedan skickar med i Authorization-headern för att få göra ändringar.
// Lösenordet lämnar aldrig servern igen, och sparas inte i klartext
// någonstans i webbläsaren.

export async function onRequestPost({ request, env }) {
  const { password } = await request.json().catch(() => ({}));
  const expected = env.ADMIN_PASSWORD || 'AAT09';

  if (typeof password !== 'string' || password !== expected) {
    // Liten fördröjning så att ett enkelt gissnings-skript inte kan testa
    // lösenord i extremt hög takt. Ersätter inte riktig rate limiting,
    // men fördröjer enkla attacker.
    await new Promise((resolve) => setTimeout(resolve, 400));
    return json({ error: 'Fel lösenord.' }, 401);
  }

  const expiry = Date.now() + 12 * 60 * 60 * 1000; // 12 timmar
  const signature = await sign(String(expiry), expected);

  return json({ token: `${expiry}.${signature}` });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
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
