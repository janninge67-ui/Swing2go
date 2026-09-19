// Swing2Go Golf UF — POST /api/admin/upload-image
//
// Tar emot en bild (som base64) från admin-sidan, laddar upp den till
// Supabase Storage-bucketen "product-images" med service role-nyckeln, och
// returnerar den publika URL:en. Kräver giltig admin-token, precis som
// products.js och orders.js.

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function onRequestPost({ request, env }) {
  const authError = await requireAuth(request, env);
  if (authError) return authError;

  const body = await request.json().catch(() => null);
  if (!body || !body.dataBase64 || !body.contentType) {
    return json({ error: 'Ingen bild skickades med.' }, 400);
  }

  if (!ALLOWED_TYPES.includes(body.contentType)) {
    return json({ error: 'Bilden måste vara JPEG, PNG, WEBP eller GIF.' }, 400);
  }

  let bytes;
  try {
    const binary = atob(body.dataBase64);
    bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  } catch {
    return json({ error: 'Kunde inte läsa bilden.' }, 400);
  }

  if (bytes.length > MAX_BYTES) {
    return json({ error: 'Bilden är för stor (max 5 MB).' }, 400);
  }

  const ext = body.contentType.split('/')[1] || 'jpg';
  const path = `products/${crypto.randomUUID()}.${ext}`;

  const uploadRes = await fetch(
    `${env.SUPABASE_URL}/storage/v1/object/product-images/${path}`,
    {
      method: 'POST',
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': body.contentType,
      },
      body: bytes,
    }
  );

  if (!uploadRes.ok) {
    const errText = await uploadRes.text().catch(() => '');
    console.error('Supabase Storage-fel', errText);
    return json({ error: 'Kunde inte ladda upp bilden. Kontrollera att bucketen "product-images" finns (kör schema.sql).' }, 502);
  }

  const publicUrl = `${env.SUPABASE_URL}/storage/v1/object/public/product-images/${path}`;
  return json({ url: publicUrl });
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
