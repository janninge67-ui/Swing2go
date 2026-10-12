-- =====================================================================
-- Swing2go – komplett databas
--
-- Den här EN filen skapar allt Swing2go behöver: produkter, ordrar,
-- inställningar (tema, texter, bilder) och besöksstatistik.
--
-- VARNING: om du kör den här filen på ett projekt som redan har
-- Swing2go-tabeller med riktiga ordrar, RADERAR den dem. Kör den bara
-- en gång, i början, på ett tomt Supabase-projekt.
--
-- Klistra in HELA filen i Supabase -> SQL Editor -> Run.
-- =====================================================================

-- ---------- Städa bort ev. gamla försök ----------

drop function if exists place_order(text, text, text, text, text, text, text, jsonb);
drop table if exists order_items, orders, products, settings, visits cascade;

-- ---------- Produkter ----------

create table products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text not null default '',
  price_sek   integer not null check (price_sek >= 0),
  stock       integer not null default 0 check (stock >= 0),
  category    text not null default 'Golfbollar',
  image_url   text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ---------- Ordrar ----------

create table orders (
  id         uuid primary key default gen_random_uuid(),
  order_no   bigint generated always as identity (start with 1001),
  name       text not null,
  email      text not null,
  phone      text,
  address    text not null,
  zip        text not null,
  city       text not null,
  note       text,
  total_sek  integer not null default 0,
  status     text not null default 'ny' check (status in ('ny', 'betald', 'skickad', 'avbruten')),
  created_at timestamptz not null default now()
);

create table order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references orders(id) on delete cascade,
  product_id   uuid references products(id) on delete set null,
  product_name text not null,
  price_sek    integer not null,
  qty          integer not null check (qty > 0)
);

-- ---------- Inställningar (tema, texter, logga, bilder) ----------

create table settings (
  key   text primary key,
  value text
);

-- ---------- Besöksstatistik ----------
-- Inget personligt sparas: ingen IP-adress, inget namn, ingen cookie.
-- Bara sida, hänvisande sajt, land (från Cloudflare) och mobil/dator.

create table visits (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  path       text not null,
  referrer   text,
  country    text,
  device     text
);

-- ---------- Säkerhet (Row Level Security) ----------
-- Besökare: får bara LÄSA aktiva produkter och inställningar.
-- Du (inloggad i admin): får göra allt.
-- Ordrar skapas bara av Workern (med service-nyckeln), aldrig direkt
-- från webbläsaren. Detsamma gäller besöksloggen.

alter table products    enable row level security;
alter table orders      enable row level security;
alter table order_items enable row level security;
alter table settings    enable row level security;
alter table visits      enable row level security;

create policy "public read products" on products for select using (active);
create policy "admin all products"   on products for all to authenticated using (true) with check (true);

create policy "public read settings" on settings for select using (true);
create policy "admin all settings"   on settings for all to authenticated using (true) with check (true);

create policy "admin all orders"      on orders      for all to authenticated using (true) with check (true);
create policy "admin all order_items" on order_items for all to authenticated using (true) with check (true);

-- Bara du kan läsa besöksloggen. Workern skriver med service-nyckeln,
-- som alltid går förbi RLS, så ingen "insert"-policy behövs här.
create policy "admin all visits" on visits for all to authenticated using (true) with check (true);

-- ---------- Bildlagring (logga, produktbilder, galleri) ----------

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists "public read media"  on storage.objects;
drop policy if exists "admin insert media" on storage.objects;
drop policy if exists "admin update media" on storage.objects;
drop policy if exists "admin delete media" on storage.objects;

create policy "public read media"  on storage.objects for select using (bucket_id = 'media');
create policy "admin insert media" on storage.objects for insert to authenticated with check (bucket_id = 'media');
create policy "admin update media" on storage.objects for update to authenticated using (bucket_id = 'media');
create policy "admin delete media" on storage.objects for delete to authenticated using (bucket_id = 'media');

-- ---------- Lägg en order (körs av Workern) ----------
-- Priser och lagersaldo hämtas härifrån, aldrig från webbläsaren, så
-- ingen kan ändra priset i sin kundvagn. Allt sker i en transaktion.

create function place_order(
  p_name    text,
  p_email   text,
  p_phone   text,
  p_address text,
  p_zip     text,
  p_city    text,
  p_note    text,
  p_items   jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_total    integer := 0;
  v_item     jsonb;
  v_prod     products%rowtype;
  v_qty      integer;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Din bag är tom.';
  end if;

  insert into orders (name, email, phone, address, zip, city, note)
  values (p_name, p_email, nullif(p_phone, ''), p_address, p_zip, p_city, nullif(p_note, ''))
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'qty')::integer;
    if v_qty is null or v_qty < 1 or v_qty > 50 then
      raise exception 'Ogiltigt antal.';
    end if;

    select * into v_prod
    from products
    where id = (v_item->>'id')::uuid and active
    for update;

    if not found then
      raise exception 'En av produkterna finns inte längre. Ladda om sidan.';
    end if;
    if v_prod.stock < v_qty then
      raise exception 'Tyvärr, bara % kvar av "%".', v_prod.stock, v_prod.name;
    end if;

    update products set stock = stock - v_qty where id = v_prod.id;

    insert into order_items (order_id, product_id, product_name, price_sek, qty)
    values (v_order_id, v_prod.id, v_prod.name, v_prod.price_sek, v_qty);

    v_total := v_total + v_prod.price_sek * v_qty;
  end loop;

  update orders set total_sek = v_total where id = v_order_id;

  return (
    select jsonb_build_object('order_no', order_no, 'total_sek', total_sek)
    from orders where id = v_order_id
  );
end;
$$;

revoke all on function place_order(text, text, text, text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function place_order(text, text, text, text, text, text, text, jsonb) to service_role;

-- ---------- Exempelprodukter (tas bort i admin när du vill) ----------

insert into products (name, description, price_sek, stock, category) values
  ('Premium, 12 bollar',  'Utvalda bollar i mycket bra skick.',                             249, 20, 'Golfbollar'),
  ('Standard, 24 bollar', 'Bra allroundbollar i gott skick för rundor och träning.',        349, 15, 'Golfbollar'),
  ('Rangemix, 50 bollar', 'Blandade bollar med några märken. Perfekta för driving range.',  399,  8, 'Träningsbollar');
