# Swing2Go Golf UF

A small golf-gear storefront: plain HTML/CSS/JS, product catalog in Supabase,
checkout via Stripe or Swish, and a password-protected admin page — all
deployed as a single **Cloudflare Worker** straight from GitHub.

## How it fits together

- **GitHub** — holds the code. Every push to `main` triggers a new deploy.
- **Cloudflare Worker** — serves the static site from `public/` (as free,
  cached static assets), and runs `/api/*` requests through `src/router.js`,
  which hands each one off to a small handler in `src/handlers/`.
- **Supabase** — a Postgres database holding your `products`, `orders`, and
  `order_items` tables, plus a Storage bucket for product photos.
- **Stripe** — card payments via Stripe Checkout (a hosted payment page).
- **Swish** — a manual payment flow using just your regular Swish number,
  no merchant agreement needed (see the Swish section below).

**Important:** this project uses Cloudflare's newer unified **Workers**
platform (not the older, separate "Pages" product). If your Cloudflare
project was originally created as a classic Pages project, this same repo
still works — Cloudflare reads `wrangler.jsonc` either way — but if you're
setting this up fresh, just connect the repo under **Workers & Pages** as
described below and Cloudflare will use the Worker setup automatically.

No customer accounts — checkout is guest-only. All customer-facing text is
in Swedish, and prices are in SEK. This README stays in English since it's
for you, the developer.

---

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor > New query**, paste the contents of
   [`supabase/schema.sql`](./supabase/schema.sql), and run it. This creates
   the `products`, `orders`, and `order_items` tables, a `product-images`
   Storage bucket, sets up Row Level Security, and inserts 8 starter
   products. Safe to run more than once.
3. Go to **Project Settings > API** (or **Data API** / **API Keys** on
   newer dashboards) and copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon / publishable** key → `SUPABASE_ANON_KEY` (safe to expose in frontend code)
   - **service_role / secret** key → `SUPABASE_SERVICE_ROLE_KEY` (**secret** — server-side only)

Edit products any time from **Table Editor > products** in Supabase, or
from your site's own `/admin` page — no code changes needed for either.

## 2. Set up Stripe

1. Create an account at [stripe.com](https://stripe.com) (test mode is fine to start).
2. Go to **Developers > API keys** and copy the **Secret key** →
   `STRIPE_SECRET_KEY`.
3. You'll add the webhook (step 4) *after* your site is deployed, since
   Stripe needs a real URL to send events to.

## 3. Fill in the public config

Open `public/js/app.js`, and near the top set your real Supabase URL and
anon key:

```js
const SWING2GOUF_CONFIG = {
  SUPABASE_URL: 'https://YOUR-PROJECT-REF.supabase.co',
  SUPABASE_ANON_KEY: 'YOUR-SUPABASE-ANON-PUBLIC-KEY',
};
```

These two values are safe to commit — they're public by design, protected
by the Row Level Security policies in `schema.sql`.

## 4. Push the code to GitHub

```bash
cd golf-store
git init
git add .
git commit -m "Initial Swing2Go Golf UF storefront"
gh repo create swing2go --public --source=. --push
# or: create a repo on github.com, then
#   git remote add origin https://github.com/YOUR-USERNAME/swing2go.git
#   git push -u origin main
```

**If you already have a repo connected to Cloudflare from before**, it's
worth deleting everything in it first and re-uploading this whole folder
in one go, so the structure (`public/`, `src/`, `wrangler.jsonc` etc. all
at the repo's top level) ends up exactly right in a single step.

## 5. Connect Cloudflare

1. In the [Cloudflare dashboard](https://dash.cloudflare.com), go to
   **Workers & Pages > Create application**, connect to Git, and pick your repo.
2. Cloudflare should detect `wrangler.jsonc` and use it automatically —
   **Root directory** should be `/` (the repo root, where `wrangler.jsonc`
   lives), and the **Deploy command** should be `npx wrangler deploy`
   (this is usually the default once a `wrangler.jsonc` is detected).
3. Add these under **Settings > Variables and Secrets** (as **Secret**, not plain text):
   - `STRIPE_SECRET_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SITE_URL` — your Worker's URL, e.g. `https://swing2go.YOUR-SUBDOMAIN.workers.dev`
   - `STRIPE_WEBHOOK_SECRET` — placeholder for now, updated in step 6
   - `ADMIN_PASSWORD` — the `/admin` password (defaults to `AAT09` if unset —
     **please set a longer one**, 12+ random characters)
   - `SWISH_NUMBER` — your Swish number, digits only (see the Swish section)
4. Deploy. Cloudflare redeploys automatically on every future `git push`.

## 6. Connect the Stripe webhook

1. In Stripe, go to **Developers > Webhooks > Add endpoint**.
2. Endpoint URL: `https://YOUR-SITE/api/stripe-webhook`
3. Subscribe to the `checkout.session.completed` event.
4. Copy the **Signing secret** and set it as `STRIPE_WEBHOOK_SECRET` in
   Cloudflare, then redeploy so it picks up the change.

## 7. Test it

1. Visit your Worker's URL. You should see the 8 starter products.
2. Add something to your bag and try both **Betala med kort** (test card
   `4242 4242 4242 4242`, any future expiry, any CVC) and **Betala med
   Swish** (shows a QR code — no real payment needed to test the flow).
3. After a card payment you should land on `success.html`, and a new row
   should appear in your `orders` table in Supabase.

## 8. Go live

1. In Stripe, switch to live mode and generate live API keys.
2. Update `STRIPE_SECRET_KEY` in Cloudflare to the live key.
3. Add a live-mode webhook endpoint (same URL) and update
   `STRIPE_WEBHOOK_SECRET`.
4. Optional: add a custom domain under your Worker's **Settings > Domains**.

---

## 9. The admin page

Visit `https://YOUR-SITE/admin` to manage products (including photos) and
review orders. It's not linked from anywhere on the public site and is
blocked from search engines via `robots.txt`, but the URL itself isn't a
secret — anyone who finds it hits a password prompt.

**Security notes, honestly:**
- The password is checked on the server (`src/handlers/admin-login.js`),
  not just hidden in the page.
- The default password (`AAT09`) is short and guessable — set a longer
  `ADMIN_PASSWORD` in Cloudflare as soon as you can.
- There's a small delay on failed logins, but no real rate limiting. For
  stronger protection, consider adding a
  [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/policies/access/)
  policy in front of `/admin` as a second layer.
- Sessions last 12 hours, stored in `sessionStorage` (cleared when the tab closes).

---

## 10. Swish payments (no merchant agreement needed)

Customers can pay with **Swish** using just your regular Swish number — no
Swish Handel agreement, bank certificate, or per-transaction fee.

1. At checkout, the customer picks "Betala med Swish".
2. They fill in name, email, and shipping address.
3. The site creates a "pending" order with a short order number (e.g.
   `SW-7K3P9Q`) and shows a QR code / link with your Swish number, the
   total, and that order number pre-filled — nothing to type by hand.
4. The customer pays in the Swish app, then clicks "Jag har betalat" (this
   just flags the order for you — it does **not** confirm payment arrived).
5. **You check your own Swish app**, then go to `/admin` → **Ordrar** and
   mark the order "Betald", then "Skickad" once shipped.

This is the same approach many small Swedish shops and UF-companies use
without a full payment gateway. Confirmation is manual — always check your
Swish app before shipping.

---

## 11. Product images

In `/admin`, click the image area (new product) or "Byt"/"Lägg till" (existing
product) to upload a photo. Images go to the `product-images` Supabase
Storage bucket via `/api/admin/upload-image`, protected by the admin
password. Products without a photo fall back to the built-in icon system
(Ikon / Accentfärg fields).

---

## Project structure

```
golf-store/
├── wrangler.jsonc            tells Cloudflare how to run this Worker
├── package.json              pins the wrangler version
├── public/                   everything served as the static site
│   ├── index.html, success.html, cancel.html, robots.txt
│   ├── admin/index.html        password-protected management page
│   ├── css/style.css
│   ├── js/app.js                config, product icons, cart/checkout logic, autumn leaves
│   └── img/logo.jpg
├── src/                      the Worker's server-side code
│   ├── router.js               entry point — routes /api/* to a handler
│   ├── lib/helpers.js           shared json/auth/Supabase helpers
│   └── handlers/
│       ├── create-checkout-session.js
│       ├── stripe-webhook.js
│       ├── swish-order.js
│       └── admin-login.js, admin-products.js, admin-orders.js, admin-upload-image.js
└── supabase/schema.sql       run once in the Supabase SQL editor
```

## Extending it

- **Shipping rates**: Stripe currently just collects a Nordic shipping
  address. Add real shipping rates via `shipping_options` in
  `src/handlers/create-checkout-session.js`, or in the Stripe Dashboard.
- **Inventory**: stock isn't auto-decremented on sale — update it manually
  in Supabase or `/admin` after each order, or add a Postgres function
  called from the webhook/Swish handlers for automatic decrementing.
