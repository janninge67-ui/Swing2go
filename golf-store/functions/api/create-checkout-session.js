// Swing2GoUF — POST /api/create-checkout-session
//
// Körs som en Cloudflare Pages Function (Workers runtime). Läser hemligheter
// från miljövariabler du sätter i Cloudflare Pages-instrumentpanelen — aldrig
// från requesten eller från klientkod.
//
// Nödvändiga miljövariabler (Pages > ditt projekt > Settings > Environment variables):
//   STRIPE_SECRET_KEY          sk_test_... eller sk_live_...
//   SUPABASE_URL               https://YOUR-PROJECT-REF.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY  service_role-nyckel (kringgår RLS — håll hemlig)
//   SITE_URL                   t.ex. https://swing2gouf.pages.dev (utan avslutande /)

export async function onRequestPost({ request, env }) {
  try {
    const { items } = await request.json();

    if (!Array.isArray(items) || items.length === 0) {
      return json({ error: 'Din varukorg är tom.' }, 400);
    }

    const ids = items.map((i) => i.id);

    // Hämta korrekta priser/namn/lagersaldo från Supabase — lita aldrig på
    // priser som skickas från webbläsaren.
    const productsRes = await fetch(
      `${env.SUPABASE_URL}/rest/v1/products?id=in.(${ids.join(',')})&select=id,name,price_cents,stock`,
      {
        headers: {
          apikey: env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );

    if (!productsRes.ok) {
      return json({ error: 'Kunde inte verifiera din varukorg. Försök igen.' }, 502);
    }

    const products = await productsRes.json();
    const lineItems = [];

    for (const item of items) {
      const product = products.find((p) => p.id === item.id);
      const quantity = Math.max(1, Math.min(99, parseInt(item.quantity, 10) || 1));

      if (!product) {
        return json({ error: 'En av varorna i din varukorg finns inte längre.' }, 400);
      }
      if (product.stock < quantity) {
        return json({ error: `Endast ${product.stock} kvar av "${product.name}".` }, 400);
      }

      lineItems.push({
        price_data: {
          currency: 'sek',
          product_data: { name: product.name },
          unit_amount: product.price_cents,
        },
        quantity,
      });
    }

    const siteUrl = env.SITE_URL || new URL(request.url).origin;

    const stripeBody = toStripeForm({
      mode: 'payment',
      success_url: `${siteUrl}/success.html`,
      cancel_url: `${siteUrl}/cancel.html`,
      line_items: lineItems,
      shipping_address_collection: { allowed_countries: ['SE', 'NO', 'DK', 'FI'] },
    });

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: stripeBody,
    });

    const session = await stripeRes.json();

    if (!stripeRes.ok) {
      console.error('Stripe error', session);
      return json({ error: 'Kunde inte starta kassan. Försök igen.' }, 502);
    }

    return json({ url: session.url });
  } catch (err) {
    console.error(err);
    return json({ error: 'Ett oväntat fel uppstod när kassan skulle startas.' }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Stripes API förväntar sig klassisk form-encoding med hakparentesnotation
// för nästlade objekt/arrayer, t.ex. line_items[0][price_data][unit_amount]=44900
function toStripeForm(obj, params = new URLSearchParams(), prefix = '') {
  for (const [key, value] of Object.entries(obj)) {
    const paramKey = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(value)) {
      value.forEach((v, i) => toStripeForm(v, params, `${paramKey}[${i}]`));
    } else if (value && typeof value === 'object') {
      toStripeForm(value, params, paramKey);
    } else {
      params.append(paramKey, value);
    }
  }
  return params;
}
