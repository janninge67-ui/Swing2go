// Swing2Go Golf UF — POST /api/admin/upload-image
import { json, requireAdminAuth } from '../lib/helpers.js';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function adminUploadImage(request, env) {
  const authError = await requireAdminAuth(request, env);
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
