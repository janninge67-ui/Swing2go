-- DEMO-DATA. Alla rader är markerade is_demo = true.
-- Priser och lagersaldon är påhittade platshållare, inte era riktiga.
-- Ta bort allt demo-innehåll innan lansering:
--   delete from products where is_demo;

insert into brands (name) values
  ('Titleist'), ('Callaway'), ('TaylorMade'), ('Srixon'), ('Bridgestone')
on conflict (name) do nothing;

with p as (
  insert into products (brand_id, model, slug, description, grade, is_demo)
  select b.id, v.model, v.slug, 'Demoprodukt. Byt ut texten i adminpanelen.', v.grade::grade, true
  from (values
    ('Titleist',    'Pro V1',        'titleist-pro-v1-a',        'A'),
    ('Titleist',    'Pro V1x',       'titleist-pro-v1x-b',       'B'),
    ('Callaway',    'Chrome Soft',   'callaway-chrome-soft-a',   'A'),
    ('Callaway',    'Supersoft',     'callaway-supersoft-c',     'C'),
    ('TaylorMade',  'TP5',           'taylormade-tp5-b',         'B'),
    ('TaylorMade',  'Tour Response', 'taylormade-tour-response-a','A'),
    ('Srixon',      'Z-Star',        'srixon-z-star-b',          'B'),
    ('Srixon',      'Soft Feel',     'srixon-soft-feel-c',       'C'),
    ('Bridgestone', 'Tour B X',      'bridgestone-tour-b-x-b',   'B')
  ) as v(brand, model, slug, grade)
  join brands b on b.name = v.brand
  on conflict (slug) do nothing
  returning id, grade
)
insert into product_variants (product_id, pack_size, price_ore, stock)
select p.id, s.size,
       case p.grade
         when 'A' then s.size * 1000   -- 10 kr per boll (demo)
         when 'B' then s.size * 750    -- 7,50 kr per boll (demo)
         else          s.size * 500    -- 5 kr per boll (demo)
       end,
       12
from p cross join (values (6), (12)) as s(size);
