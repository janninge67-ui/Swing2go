// Swing2Go Golf UF — POST /api/stripe-webhook
import { supabaseHeaders } from '../lib/helpers.js';

export async function stripeWebhook(request, env) {
  const signatureHeader = request.headers.get('stripe-signature');
  const rawBody = await request.text();

  const isValid = await verifyStripeSignature(rawBody, signatureHeader, env.STRIPE_WEBHOOK_SECRET);
  if (!isValid) {
    return new Response('Invalid signature', { status: 400 });
  }

  const event = JSON.parse(rawBody);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    const lineItemsRes = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${session.id}/line_items?limit=100`,
      { headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } }
    );
    const lineItems = await lineItemsRes.json();

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
