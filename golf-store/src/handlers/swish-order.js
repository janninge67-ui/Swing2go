// Swing2Go Golf UF — /api/swish-order (POST skapar order, PATCH flaggar "jag har betalat")
import { json, supabaseHeaders } from '../lib/helpers.js';

export async function swishOrderCreate(request, env) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) return json({ error: 'Ogiltig förfrågan.' }, 400);

    const { items, customer } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return json({ error: 'Din varukorg är tom.' }, 400);
    }
    if (!customer || !customer.name || !customer.email || !customer.address) {
      return json({ error: 'Namn, e-post och adress krävs.' }, 400);
    }
    if (!env.SWISH_NUMBER) {
      return json({ error: 'Swish är inte konfigurerat än. Kontakta butiken.' }, 500);
    }

    const ids = items.map((i) => i.id);

    const productsRes = await fetch(
      `${env.SUPABASE_URL}/rest/v1/products?id=in.(${ids.join(',')})&select=id,name,price_cents,stock`,
      { headers: supabaseHeaders(env) }
    );
    if (!productsRes.ok) {
      return json({ error: 'Kunde inte verifiera din varukorg. Försök igen.' }, 502);
    }
    const products = await productsRes.json();

    let amountTotalCents = 0;
    const orderItems = [];

    for (const item of items) {
      const product = products.find((p) => p.id === item.id);
      const quantity = Math.max(1, Math.min(99, parseInt(item.quantity, 10) || 1));

      if (!product) return json({ error: 'En av varorna i din varukorg finns inte längre.' }, 400);
      if (product.stock < quantity) {
        return json({ error: `Endast ${product.stock} kvar av "${product.name}".` }, 400);
      }

      amountTotalCents += product.price_cents * quantity;
      orderItems.push({
        product_id: product.id,
        product_name: product.name,
        quantity,
        unit_price_cents: product.price_cents,
      });
    }

    const orderNumber = generateOrderNumber();
    const shippingAddress = `${customer.address}, ${customer.postalCode || ''} ${customer.city || ''}`.trim();

    const orderRes = await fetch(`${env.SUPABASE_URL}/rest/v1/orders`, {
      method: 'POST',
      headers: supabaseHeaders(env, { prefer: 'return=representation' }),
      body: JSON.stringify([{
        order_number: orderNumber,
        payment_method: 'swish',
        customer_email: customer.email,
        customer_name: customer.name,
        shipping_address: shippingAddress,
        amount_total_cents: amountTotalCents,
        status: 'pending',
      }]),
    });

    if (!orderRes.ok) {
      const errData = await orderRes.json().catch(() => ({}));
      console.error('Supabase order error', errData);
      return json({ error: 'Kunde inte skapa ordern. Försök igen.' }, 502);
    }

    const [order] = await orderRes.json();

    await fetch(`${env.SUPABASE_URL}/rest/v1/order_items`, {
      method: 'POST',
      headers: supabaseHeaders(env),
      body: JSON.stringify(orderItems.map((i) => ({ ...i, order_id: order.id }))),
    });

    const amountKr = Math.round(amountTotalCents / 100);
    const swishLink =
      `https://app.swish.nu/1/p/sw/?sw=${encodeURIComponent(env.SWISH_NUMBER)}` +
      `&amt=${amountKr}&cur=SEK&msg=${encodeURIComponent(orderNumber)}&src=qr`;

    return json({ orderId: order.id, orderNumber, amountKr, swishLink });
  } catch (err) {
    console.error(err);
    return json({ error: 'Ett oväntat fel uppstod.' }, 500);
  }
}

export async function swishOrderConfirm(request, env) {
  try {
    const { orderId } = await request.json().catch(() => ({}));
    if (!orderId) return json({ error: 'Order-id saknas.' }, 400);

    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}`, {
      method: 'PATCH',
      headers: supabaseHeaders(env),
      body: JSON.stringify({ customer_marked_paid: true }),
    });
    if (!res.ok) return json({ error: 'Kunde inte uppdatera ordern.' }, 502);
    return json({ ok: true });
  } catch (err) {
    console.error(err);
    return json({ error: 'Ett oväntat fel uppstod.' }, 500);
  }
}

function generateOrderNumber() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return `SW-${code}`;
}
