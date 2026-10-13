-- =====================================================================
-- Swing2Go – Supabase SQL
-- Klistra in hela filen i Supabase → SQL Editor → Run.
-- Går att köra flera gånger utan att något går sönder.
-- =====================================================================

create extension if not exists pgcrypto;

-- Dagens datum i svensk tid (används av statistiken)
create or replace function se_today() returns date
language sql stable as $$ select (now() at time zone 'Europe/Stockholm')::date $$;

-- ---------- Tabeller ----------
create table if not exists products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text not null default '',
  price_sek   integer not null check (price_sek >= 0),
  stock       integer not null default 0 check (stock >= 0),
  image_url   text not null default '',
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create sequence if not exists order_seq start 1001;

create table if not exists orders (
  id           uuid primary key default gen_random_uuid(),
  order_no     integer not null unique default nextval('order_seq'),
  name         text not null,
  email        text not null,
  phone        text not null default '',
  address      text not null,
  zip          text not null,
  city         text not null,
  items        jsonb not null,
  shipping_sek integer not null default 0,
  total_sek    integer not null,
  status       text not null default 'new'
               check (status in ('new','paid','shipped','cancelled')),
  created_at   timestamptz not null default now()
);

create table if not exists settings (
  key   text primary key,
  value jsonb not null
);

-- Cookiefri besöksstatistik: ingen IP och inga cookies sparas.
-- vhash = nyckel-hash (byts varje dygn) som inte går att koppla till en person.
create table if not exists visitors (
  day        date not null default se_today(),
  vhash      text not null,
  path       text,
  country    text,
  device     text,
  referrer   text,
  first_seen timestamptz not null default now(),
  last_seen  timestamptz not null default now(),
  primary key (day, vhash)
);

create table if not exists pageviews (
  id         bigint generated always as identity primary key,
  day        date not null default se_today(),
  vhash      text not null,
  path       text,
  created_at timestamptz not null default now()
);
create index if not exists pageviews_day_idx on pageviews(day);

-- ---------- Funktioner ----------

-- Lägger en order atomiskt: kontrollerar lager, hämtar priser från databasen
-- (klienten kan aldrig påverka priset) och drar av lagret.
create or replace function place_order(
  p_name text, p_email text, p_phone text,
  p_address text, p_zip text, p_city text, p_items jsonb
) returns orders
language plpgsql as $$
declare
  it jsonb; prod products; qty int;
  lines jsonb := '[]'::jsonb; sub int := 0; ship int; o orders;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Varukorgen är tom';
  end if;

  for it in select * from jsonb_array_elements(p_items) loop
    qty := (it->>'qty')::int;
    if qty is null or qty < 1 or qty > 50 then raise exception 'Ogiltigt antal'; end if;

    select * into prod from products
      where id = (it->>'id')::uuid and active for update;
    if not found then raise exception 'En produkt i varukorgen finns inte längre'; end if;
    if prod.stock < qty then raise exception 'Tyvärr, "%" finns inte i så stort antal', prod.name; end if;

    update products set stock = stock - qty where id = prod.id;
    lines := lines || jsonb_build_object('id', prod.id, 'name', prod.name,
                                         'price', prod.price_sek, 'qty', qty);
    sub := sub + prod.price_sek * qty;
  end loop;

  select coalesce((value->>'shipping_sek')::int, 59) into ship from settings where key = 'site';
  ship := coalesce(ship, 59);

  insert into orders(name, email, phone, address, zip, city, items, shipping_sek, total_sek)
  values (p_name, p_email, p_phone, p_address, p_zip, p_city, lines, ship, sub + ship)
  returning * into o;
  return o;
end $$;

-- Avbruten order lägger tillbaka varorna i lagret
create or replace function restore_stock() returns trigger
language plpgsql as $$
declare it jsonb;
begin
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    for it in select * from jsonb_array_elements(new.items) loop
      update products set stock = stock + (it->>'qty')::int where id = (it->>'id')::uuid;
    end loop;
  end if;
  return new;
end $$;

drop trigger if exists orders_restore_stock on orders;
create trigger orders_restore_stock before update on orders
  for each row execute function restore_stock();

-- Registrerar ett besök (anropas av workern)
create or replace function track(
  p_vhash text, p_path text, p_country text, p_device text, p_ref text, p_view boolean
) returns void language plpgsql as $$
begin
  insert into visitors(day, vhash, path, country, device, referrer)
  values (se_today(), p_vhash, p_path, p_country, p_device, p_ref)
  on conflict (day, vhash) do update set last_seen = now(), path = excluded.path;
  if p_view then
    insert into pageviews(day, vhash, path) values (se_today(), p_vhash, p_path);
  end if;
end $$;

-- All statistik till adminsidan i ett anrop
create or replace function admin_stats() returns jsonb
language sql stable as $$
  select jsonb_build_object(
    'online_now',    (select count(*) from visitors where last_seen > now() - interval '5 minutes'),
    'today_visitors',(select count(*) from visitors where day = se_today()),
    'today_views',   (select count(*) from pageviews where day = se_today()),
    'days', (select coalesce(jsonb_agg(x order by x->>'day'), '[]'::jsonb) from (
               select jsonb_build_object('day', day, 'views', count(*), 'visitors', count(distinct vhash)) x
               from pageviews where day > se_today() - 7 group by day) d),
    'top_pages', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
               select jsonb_build_object('name', path, 'n', count(*)) x
               from pageviews where day > se_today() - 7 group by path order by count(*) desc limit 8) d),
    'devices', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
               select jsonb_build_object('name', device, 'n', count(*)) x
               from visitors where day > se_today() - 7 group by device order by count(*) desc) d),
    'countries', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
               select jsonb_build_object('name', country, 'n', count(*)) x
               from visitors where day > se_today() - 7 and country <> '' group by country order by count(*) desc limit 8) d),
    'referrers', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
               select jsonb_build_object('name', referrer, 'n', count(*)) x
               from visitors where day > se_today() - 7 and referrer <> '' group by referrer order by count(*) desc limit 8) d)
  );
$$;

-- ---------- Säkerhet ----------
-- All åtkomst går via workern med service_role-nyckeln. Utan policies
-- kan ingen nå tabellerna direkt med den publika (anon) nyckeln.
alter table products  enable row level security;
alter table orders    enable row level security;
alter table settings  enable row level security;
alter table visitors  enable row level security;
alter table pageviews enable row level security;

revoke all on function place_order(text,text,text,text,text,text,jsonb) from public, anon, authenticated;
revoke all on function track(text,text,text,text,text,boolean)          from public, anon, authenticated;
revoke all on function admin_stats()                                    from public, anon, authenticated;
grant execute on function place_order(text,text,text,text,text,text,jsonb) to service_role;
grant execute on function track(text,text,text,text,text,boolean)          to service_role;
grant execute on function admin_stats()                                    to service_role;

-- ---------- Bildlagring (produktbilder, hero-bild, loggor) ----------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- ---------- Startdata ----------
insert into settings (key, value) values ('site', '{
  "title": "Swing2Go",
  "tagline": "Begagnade golfbollar till fair pris",
  "hero_title": "Slå längre. Betala mindre.",
  "hero_text": "Sorterade begagnade golfbollar som gör sitt jobb på banan. Köp som gäst och betala med Swish.",
  "shipping_sek": 59,
  "season": "none",
  "hero_image": "",
  "colors": {"primary":"#14532d","accent":"#22c55e","bg":"#f6faf4","ink":"#10231a","gold":"#d4a72c"}
}'::jsonb) on conflict (key) do nothing;

insert into products (name, description, price_sek, stock)
select * from (values
  ('Golfbollar A-klass, 12-pack',  'Mycket fint skick, knappt synliga märken.', 249, 20),
  ('Golfbollar B-klass, 24-pack',  'Bra skick till vardagsrundan.',             299, 15),
  ('Mixade träningsbollar, 50-pack','Perfekt till rangen eller för nybörjare.',  349, 10)
) as v(name, description, price_sek, stock)
where not exists (select 1 from products);

-- Tips: rensa gammal statistik då och då (valfritt):
-- delete from pageviews where day < se_today() - 90;
-- delete from visitors  where day < se_today() - 90;
