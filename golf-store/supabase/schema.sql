-- Swing2GoUF — databasschema
-- Kör detta en gång i ditt Supabase-projekts SQL Editor (Project > SQL Editor > New query)

create extension if not exists "pgcrypto";

-- ---------- Produkter ----------
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  category text not null check (category in ('balls', 'gear', 'apparel')),
  icon text not null default 'ball',       -- vilken inbyggd ikon som ritas på kortet
  accent text not null default '#1B4332',  -- hexfärg som tonar korticonen
  price_cents integer not null check (price_cents >= 0), -- pris i ören (100 öre = 1 kr)
  stock integer not null default 0,
  created_at timestamptz not null default now()
);

alter table products enable row level security;

-- Alla (även anonyma besökare) kan läsa produkter — detta är en publik butik.
drop policy if exists "Public can read products" on products;
create policy "Public can read products"
  on products for select
  using (true);

-- Inga insert/update/delete-policies skapas, så den publika (anon) nyckeln
-- kan aldrig skriva till denna tabell. Hantera produkter via Supabase
-- Table Editor, eller med service role-nyckeln från en betrodd servermiljö.

-- ---------- Ordrar ----------
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  stripe_session_id text unique not null,
  customer_email text,
  amount_total_cents integer not null,
  status text not null default 'pending', -- pending -> paid -> fulfilled (du bestämmer flödet)
  created_at timestamptz not null default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id),
  product_name text not null,   -- ögonblicksbild, ifall produkten senare byter namn/tas bort
  quantity integer not null check (quantity > 0),
  unit_price_cents integer not null
);

alter table orders enable row level security;
alter table order_items enable row level security;

-- Inga publika policies alls på orders/order_items: endast Cloudflare Pages
-- Functions (med service role-nyckeln, som kringgår RLS) kan läsa eller
-- skriva till dem. Kunder frågar aldrig dessa tabeller direkt.

-- ---------- Startsortiment ----------
-- Ändra gärna priser/lager/namn i Table Editor efter att detta körts.
insert into products (name, description, category, icon, accent, price_cents, stock) values
  ('Tour Line golfbollar (dussin)', 'Lågkompressionsboll i tre delar, byggd för mjuk känsla runt green.', 'balls', 'ball', '#1B4332', 44900, 40),
  ('Rangebollar (dussin)', 'Slitstarka tvådelade bollar för rangen eller en tuff eftermiddagsrunda.', 'balls', 'ball', '#3A6B4A', 17900, 120),
  ('Mjuka golfbollar (dussin)', 'En boll med lägre spinn för dig som vill slå längre av tee.', 'balls', 'ball', '#B23A2E', 29900, 65),
  ('Allvädershandske', 'Cabretta-läder i handflatan och nät på ovansidan för grepp i alla väder.', 'gear', 'glove', '#1B4332', 24900, 80),
  ('Bambu-tees, 7 cm (100-pack)', 'Starkare än trä, skonsammare mot din driver än plast.', 'gear', 'tee', '#3A6B4A', 8900, 200),
  ('Handduk i våffelvävnad', 'Fästs i bagen; rengör klubbspåren utan att repa.', 'gear', 'towel', '#1B4332', 17900, 90),
  ('Uppfällbart lagningsverktyg', 'Lagar med en tumme, har plats för en magnetisk bollmarkör.', 'gear', 'tool', '#B23A2E', 12900, 150),
  ('Yllemix-tröja med kort dragkedja', 'Andningsbar mellanlagertröja för svala morgnar på första tee.', 'apparel', 'shirt', '#3A6B4A', 69900, 35)
on conflict do nothing;
