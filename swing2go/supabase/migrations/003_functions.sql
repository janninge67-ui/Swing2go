-- create_order(): allt sker i en transaktion. Priset hämtas från databasen,
-- aldrig från klienten, och lagret dras med radlås så att två kunder inte
-- kan köpa sista förpackningen samtidigt.
-- Anropas bara av Workern med service role-nyckeln.

create function create_order(
  p_user_id uuid,
  p_customer jsonb,
  p_items jsonb,
  p_shipping_ore integer
) returns table (order_id uuid, order_number integer, total_ore integer)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_item jsonb;
  v_variant record;
  v_qty integer;
  v_subtotal integer := 0;
  v_order_id uuid;
  v_order_number integer;
begin
  if jsonb_array_length(p_items) = 0 then
    raise exception 'Din varukorg är tom.';
  end if;

  insert into orders (
    user_id, subtotal_ore, shipping_ore, total_ore,
    customer_name, customer_email, customer_phone,
    ship_street, ship_postal_code, ship_city
  ) values (
    p_user_id, 0, p_shipping_ore, 0,
    p_customer->>'name', p_customer->>'email', p_customer->>'phone',
    p_customer->>'street', p_customer->>'postalCode', p_customer->>'city'
  ) returning id, orders.order_number into v_order_id, v_order_number;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::integer;

    select v.id, v.price_ore, v.stock, v.pack_size, p.active, p.grade,
           b.name || ' ' || p.model as name
      into v_variant
      from product_variants v
      join products p on p.id = v.product_id
      join brands b on b.id = p.brand_id
     where v.id = (v_item->>'variantId')::uuid
       for update of v;

    if not found or not v_variant.active then
      raise exception 'En av produkterna i varukorgen finns inte längre.';
    end if;

    if v_variant.stock < v_qty then
      raise exception '% (%-pack) räcker inte i lager. Det finns % kvar.',
        v_variant.name, v_variant.pack_size, v_variant.stock;
    end if;

    update product_variants set stock = stock - v_qty where id = v_variant.id;

    insert into order_items (order_id, variant_id, product_name, grade, pack_size, quantity, unit_price_ore)
    values (v_order_id, v_variant.id, v_variant.name, v_variant.grade, v_variant.pack_size, v_qty, v_variant.price_ore);

    v_subtotal := v_subtotal + v_variant.price_ore * v_qty;
  end loop;

  update orders
     set subtotal_ore = v_subtotal, total_ore = v_subtotal + p_shipping_ore
   where id = v_order_id;

  return query select v_order_id, v_order_number, v_subtotal + p_shipping_ore;
end $$;

revoke all on function create_order(uuid, jsonb, jsonb, integer) from public, anon, authenticated;
grant execute on function create_order(uuid, jsonb, jsonb, integer) to service_role;

-- Om en order avbryts läggs lagret tillbaka.
create function restock_on_cancel() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'avbruten' and old.status <> 'avbruten' then
    update product_variants v
       set stock = v.stock + i.quantity
      from order_items i
     where i.order_id = new.id and i.variant_id = v.id;
  end if;
  return new;
end $$;

create trigger orders_restock_on_cancel
  after update of status on orders
  for each row execute function restock_on_cancel();
