// Swing2Go Golf UF — POST /api/admin/login
import { json, sign } from '../lib/helpers.js';

export async function adminLogin(request, env) {
  const { password } = await request.json().catch(() => ({}));
  const expected = env.ADMIN_PASSWORD || 'AAT09';

  if (typeof password !== 'string' || password !== expected) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    return json({ error: 'Fel lösenord.' }, 401);
  }

  const expiry = Date.now() + 12 * 60 * 60 * 1000; // 12 timmar
  const signature = await sign(String(expiry), expected);

  return json({ token: `${expiry}.${signature}` });
}
