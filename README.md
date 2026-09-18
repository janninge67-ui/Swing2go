# Swing2GoUF

A small golf-gear storefront: plain HTML/CSS/JS, product catalog in Supabase,
checkout via Stripe, hosted on Cloudflare Pages and deployed straight from
GitHub.

## How it fits together

- **GitHub** — holds the code. Every push to `main` triggers a new Cloudflare
  Pages deploy.
- **Cloudflare Pages** — hosts the static site (`index.html`, `css/`, `js/`)
  and runs two small serverless endpoints in `functions/api/` for anything
  that needs a secret key.
- **Supabase** — a Postgres database holding your `products`, `orders`, and
  `order_items` tables.
- **Stripe** — handles the actual payment via Stripe Checkout (a hosted
  payment page you redirect customers to).

No customer accounts — checkout is guest-only, as requested.

**Note:** all customer-facing text (the storefront, product names, buttons,
confirmation pages) is in Swedish, and prices/checkout are set up in SEK
(Swedish kronor). Shipping is currently limited to Sweden, Norway, Denmark,
and Finland in `create-checkout-session.js` — change the `allowed_countries`
list there if you need other countries. This README stays in English since
it's for you, the developer.

---

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor > New query**, paste the contents of
   [`supabase/schema.sql`](./supabase/schema.sql), and run it. This creates
   the `products`, `orders`, and `order_items` tables, sets up Row Level
   Security so the public can only *read* products, and inserts 8 starter
   products so you have something to see right away.
3. Go to **Project Settings > API** and copy:
   - **Project URL** → you'll use this as `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY` (safe to expose in frontend code)
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (**secret** — server-side only)

Edit products any time from **Table Editor > products** in Supabase — no
code changes needed.

## 2. Set up Stripe

1. Create an account at [stripe.com](https://stripe.com) (test mode is fine to start).
2. Go to **Developers > API keys** and copy the **Secret key** →
   `STRIPE_SECRET_KEY`.
3. You'll add the webhook (step 4 below) *after* your site is deployed, since
   Stripe needs a real URL to send events to.

## 3. Push the code to GitHub

```bash
cd golf-store
git init
git add .
git commit -m "Initial Swing2GoUF storefront"
gh repo create swing2gouf --public --source=. --push
# or: create a repo on github.com, then
#   git remote add origin https://github.com/YOUR-USERNAME/swing2gouf.git
#   git push -u origin main
```

Before you push, fill in the config section at the top of `js/app.js` with
your real Supabase URL and anon key (see step 1) — these are public values and are safe to commit.

## 4. Connect Cloudflare Pages

1. In the [Cloudflare dashboard](https://dash.cloudflare.com), go to
   **Workers & Pages > Create > Pages > Connect to Git**, and pick your new
   repo.
2. Build settings: leave the **build command** empty and set the
   **build output directory** to `/` (this is a static site — nothing to
   build).
3. Before the first deploy (or right after, then redeploy), add these under
   **Settings > Environment variables** (mark them as **Secret**, not plain text):
   - `STRIPE_SECRET_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SITE_URL` — your Pages URL, e.g. `https://swing2gouf.pages.dev`
   - `STRIPE_WEBHOOK_SECRET` — you'll get this in the next step; add a
     placeholder for now and update it after
4. Deploy. Cloudflare will redeploy automatically on every future `git push`.

## 5. Connect the Stripe webhook

The webhook is what tells your database an order was actually paid for.

1. In Stripe, go to **Developers > Webhooks > Add endpoint**.
2. Endpoint URL: `https://YOUR-SITE.pages.dev/api/stripe-webhook`
3. Subscribe to the `checkout.session.completed` event.
4. Copy the **Signing secret** it gives you and set it as
   `STRIPE_WEBHOOK_SECRET` in Cloudflare Pages (Settings > Environment
   variables), then redeploy so the function picks it up.

## 6. Test it

1. Visit your `.pages.dev` URL. You should see the 8 starter products.
2. Add something to your bag and hit **Go to checkout**.
3. Use Stripe's test card: `4242 4242 4242 4242`, any future expiry, any CVC.
4. After paying you should land on `success.html`, and a new row should
   appear in your `orders` table in Supabase within a few seconds.

## 7. Go live

1. In Stripe, switch from test mode to live mode and generate live API keys.
2. Update `STRIPE_SECRET_KEY` in Cloudflare Pages to the live secret key.
3. Add a live-mode webhook endpoint (same URL) and update
   `STRIPE_WEBHOOK_SECRET` to its signing secret.
4. Optional: add a custom domain under **Pages > Custom domains**.

---

## Project structure

```
golf-store/
├── index.html                 storefront page
├── success.html                shown after a paid checkout
├── cancel.html                 shown if checkout is abandoned
├── css/style.css                all styling
├── js/app.js                     config, product icons, cart/checkout logic, and the leaf effect — all in one file
├── img/logo.jpg                  brand logo (header, footer, favicon)
├── functions/api/
│   ├── create-checkout-session.js   creates a Stripe Checkout Session
│   └── stripe-webhook.js             records paid orders in Supabase
└── supabase/schema.sql          run once in the Supabase SQL editor
```

## Extending it

- **Shipping rates**: currently Stripe just collects a US/CA shipping
  address. Add real shipping rates via `shipping_options` in
  `create-checkout-session.js`, or configure them in the Stripe Dashboard.
- **Inventory**: the webhook records orders but doesn't decrement `stock`
  yet — for a low-volume store, updating stock manually in the Supabase
  Table Editor after each sale is often good enough. For automatic
  decrementing, add a Postgres function and call it from the webhook.
- **Product images**: swap the SVG icons in the productIcon() function in
  `js/app.js` for real photos by adding an `image_url` column to `products`
  and updating the product card markup in the same file.
