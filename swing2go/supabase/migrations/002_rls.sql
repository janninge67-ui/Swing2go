-- Row Level Security. Ingen tabell är öppen som standard.

create function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

alter table brands enable row level security;
alter table products enable row level security;
alter table product_variants enable row level security;
alter table product_images enable row level security;
alter table profiles enable row level security;
alter table addresses enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;

-- Katalog: alla får läsa aktiva produkter, admin får allt.
create policy "Alla läser märken" on brands for select using (true);
create policy "Admin hanterar märken" on brands for all using (is_admin()) with check (is_admin());

create policy "Alla läser aktiva produkter" on products for select using (active or is_admin());
create policy "Admin hanterar produkter" on products for all using (is_admin()) with check (is_admin());

create policy "Alla läser varianter" on product_variants for select using (
  exists (select 1 from products p where p.id = product_id and (p.active or is_admin()))
);
create policy "Admin hanterar varianter" on product_variants for all using (is_admin()) with check (is_admin());

create policy "Alla läser bilder" on product_images for select using (true);
create policy "Admin hanterar bilder" on product_images for all using (is_admin()) with check (is_admin());

-- Profiler: bara egen rad. Roll får aldrig ändras av kunden.
create policy "Läs egen profil" on profiles for select using (id = auth.uid() or is_admin());
create policy "Uppdatera egen profil" on profiles for update using (id = auth.uid()) with check (id = auth.uid());
revoke update on profiles from authenticated, anon;
grant update (full_name, phone) on profiles to authenticated;

create policy "Egna adresser" on addresses for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Ordrar: kunder läser sina egna. Skapas bara via create_order() från Workern.
create policy "Läs egna ordrar" on orders for select using (user_id = auth.uid() or is_admin());
create policy "Admin uppdaterar ordrar" on orders for update using (is_admin()) with check (is_admin());

create policy "Läs egna orderrader" on order_items for select using (
  exists (select 1 from orders o where o.id = order_id and (o.user_id = auth.uid() or is_admin()))
);
