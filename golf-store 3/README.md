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
   - `ADMIN_PASSWORD` — the password for the `/admin` page (defaults to
     `AAT09` if you don't set this — **please set a longer, stronger one
     here**, since the default is short and easy to guess)
   - `SWISH_NUMBER` — your Swish number (private or UF-company), digits only,
     e.g. `1234567890` or with country code `46701234567`. No Swish Handel
     agreement or certificate needed for this — see step 9 below.
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

## 8. The admin page

Visit `https://YOUR-SITE.pages.dev/admin` to manage products — add new ones,
edit names/prices/descriptions/stock, or delete them. It's not linked from
anywhere on the public site, and it's blocked from search engines via
`robots.txt`, but the URL itself isn't a secret — anyone who guesses or
finds it will hit a password prompt.

**Security notes, honestly:**
- The password is checked on the server (in `functions/api/admin/login.js`),
  not just hidden in the page — so it can't be bypassed by viewing page
  source.
- That said, the default password (`AAT09`) is short and guessable. Set a
  longer `ADMIN_PASSWORD` (12+ random characters) in Cloudflare Pages'
  environment variables as soon as you can.
- There's a small delay on failed login attempts, but no real rate
  limiting or lockout. For stronger protection later, consider adding a
  [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/policies/access/)
  policy in front of `/admin`, which adds a second layer of login before
  your page even loads.
- Sessions last 12 hours and are stored in the browser's `sessionStorage`
  (cleared when the tab closes) — not a permanent login.

---

## 9. Swish payments (no merchant agreement needed)

Customers can also pay with **Swish**, using nothing more than your regular
Swish number — no Swish Handel agreement, bank certificate, or per-
transaction fee required. Here's how it works:

1. At checkout, the customer picks "Betala med Swish" instead of card.
2. They fill in name, email, and shipping address.
3. The site creates a "pending" order in Supabase with a short order number
   (e.g. `SW-7K3P9Q`), and shows a QR code / link with your Swish number,
   the order total, and that order number pre-filled as the payment
   message — so they don't have to type anything in the Swish app.
4. The customer pays in the Swish app as normal, then clicks "Jag har
   betalat" on your site (this just flags the order for you — it does
   **not** confirm the payment actually arrived).
5. **You check your own Swish app** for a payment matching that order
   number and amount, then go to `/admin` → **Ordrar** and mark the order
   "Betald", and later "Skickad" once it's shipped.

This is the same approach small Swedish shops and UF-companies commonly
use without a payment gateway. The trade-off is that confirmation is
manual — there's no automatic verification that the money actually
arrived, so always double-check your Swish app before marking an order as
paid and shipping it.

If your business later gets a real Swish Handel agreement with a bank
(with API certificates), that would allow automatic payment confirmation
— but that's a separate, more involved integration than what's here.

---

## 10. Product images

In `/admin`, each product now has an image field — click the image drop area
(when adding a new product) or the "Byt"/"Lägg till" button (on an existing
row) to upload a photo. Images upload to a Supabase Storage bucket called
`product-images` (created automatically by `schema.sql`) via
`/api/admin/upload-image`, which is protected by the same admin password as
everything else in `/admin`.

If a product has no image, its card falls back to the hand-drawn icon system
from before (set via the Ikon/Accentfärg fields) — so you don't have to add
photos to every product right away.

---

## Project structure

```
golf-store/
├── index.html, success.html, cancel.html, .gitignore, README.md, robots.txt
├── admin/index.html              password-protected product management page
├── css/style.css                all styling
├── js/app.js                     config, product icons, cart/checkout logic, and the leaf effect — all in one file
├── img/logo.jpg                  brand logo (header, footer, favicon)
├── functions/api/
│   ├── create-checkout-session.js   creates a Stripe Checkout Session
│   ├── stripe-webhook.js             records paid orders in Supabase
│   ├── swish-order.js                creates/confirms a manual Swish order
│   └── admin/
│       ├── login.js                   checks the admin password, issues a session token
│       ├── products.js                create/update/delete products (token required)
│       ├── orders.js                  view/update order status (token required)
│       └── upload-image.js            uploads a product photo to Supabase Storage (token required)
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
