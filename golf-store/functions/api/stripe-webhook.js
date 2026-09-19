// Swing2GoUF — POST /api/stripe-webhook
//
// Ställ in denna URL i Stripe Dashboard (Developers > Webhooks):
//   https://YOUR-SITE.pages.dev/api/stripe-webhook
// Prenumerera på händelsen "checkout.session.completed", kopiera sedan
// signeringshemligheten den ger dig till miljövariabeln
// STRIPE_WEBHOOK_SECRET i Cloudflare Pages.
//
// Nödvändiga miljövariabler (samma plats som create-checkout-session.js):
//   STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

export async function onRequestPost({ request, env }) {
  const signatureHeader = request.headers.get('stripe-signature');
  const rawBody = await request.text();

  const isValid = await verifyStripeSignature(rawBody, signatureHeader, env.STRIPE_WEBHOOK_SECRET);
  if (!isValid) {
    return new Response('Invalid signature', { status: 400 });
  }

  const event = JSON.parse(rawBody);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    // Hämta raderna Stripe debiterade för denna session.
    const lineItemsRes = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${session.id}/line_items?limit=100`,
      { headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } }
    );
    const lineItems = await lineItemsRes.json();

    // Spara ordern (upsert på stripe_session_id så att omförsök inte dubblerar).
    const orderRes = await fetch(`${env.SUPABASE_URL}/rest/v1/orders`, {
      method: 'POST',
      headers: supabaseHeaders(env, { prefer: 'resolution=merge-duplicates,return=representation' }),
      body: JSON.stringify([{
        stripe_session_id: session.id,
        payment_method: 'stripe',
        customer_email: session.customer_details?.email || null,
        amount_total_cents: session.amount_total,
        status: 'paid',
      }]),
    });

    const [order] = await orderRes.json();

    if (order) {
      const orderItems = (lineItems.data || []).map((li) => ({
        order_id: order.id,
        product_name: li.description,
        quantity: li.quantity,
        unit_price_cents: li.price?.unit_amount ?? 0,
      }));

      if (orderItems.length > 0) {
        await fetch(`${env.SUPABASE_URL}/rest/v1/order_items`, {
          method: 'POST',
          headers: supabaseHeaders(env),
          body: JSON.stringify(orderItems),
        });
      }
    }
  }

  return new Response('ok', { status: 200 });
}

function supabaseHeaders(env, extra = {}) {
  return {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    ...(extra.prefer ? { Prefer: extra.prefer } : {}),
  };
}

// Verifierar "Stripe-Signature"-headern enligt Stripes dokumenterade schema:
// HMAC-SHA256("{timestamp}.{raw body}", webhook-hemlighet), jämfört mot
// v1-signaturen/signaturerna i headern.
async function verifyStripeSignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader || !secret) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(',').map((pair) => pair.split('='))
  );
  const timestamp = parts.t;
  const signatures = signatureHeader
    .split(',')
    .filter((p) => p.startsWith('v1='))
    .map((p) => p.slice(3));

  if (!timestamp || signatures.length === 0) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(`${timestamp}.${rawBody}`)
  );
  const expected = [...new Uint8Array(signatureBuffer)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return signatures.includes(expected);
}
