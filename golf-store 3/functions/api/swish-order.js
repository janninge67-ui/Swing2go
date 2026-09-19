// Swing2Go Golf UF — POST /api/swish-order
//
// Skapar en "väntande" order för manuell Swish-betalning. Det här kräver
// INGET Swish Handel-avtal eller certifikat — det är bara ditt vanliga
// Swish-nummer. Kunden får en förifylld Swish-länk/QR-kod, swishar som
// vanligt, och du bekräftar betalningen manuellt i /admin.
//
// Nödvändiga miljövariabler (Cloudflare Pages > Settings > Environment variables):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (samma som övriga funktioner)
//   SWISH_NUMBER                               ditt Swish-nummer, t.ex. 123 456 78 90
//                                               (skriv utan mellanslag, t.ex. 1234567890
//                                               eller med landskod 46701234567)

export async function onRequestPost({ request, env }) {
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

    // Hämta korrekta priser/namn/lagersaldo från Supabase — lita aldrig på
    // priser som skickas från webbläsaren.
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

    // Skapa ordern med status "pending" (väntar på att du bekräftar betalningen).
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

    return json({
      orderId: order.id,
      orderNumber,
      amountKr,
      swishLink,
    });
  } catch (err) {
    console.error(err);
    return json({ error: 'Ett oväntat fel uppstod.' }, 500);
  }
}

export async function onRequestPatch({ request, env }) {
  // Kunden klickade "Jag har betalat" — sätter bara en flagga så du vet att
  // du kan kolla Swish-appen snart. Det är INTE en bekräftelse på att
  // pengarna faktiskt kommit in — det kollar du själv i Swish-appen och
  // bekräftar sedan ordern i /admin.
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
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // undviker lätt förväxlade tecken (0/O, 1/I)
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return `SW-${code}`;
}

function supabaseHeaders(env, extra = {}) {
  return {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    ...(extra.prefer ? { Prefer: extra.prefer } : {}),
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
