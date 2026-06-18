-- ============================================================
-- Grand Dima Hotel QR Menu System — Supabase Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- EXTENSIONS
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

create table categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  icon text,
  sort_order integer default 0,
  created_at timestamptz default now()
);

create table menu_items (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  price numeric(10,2) not null,
  category_id uuid references categories(id) on delete set null,
  image_url text,
  prep_time_minutes integer default 15,
  available boolean default true,
  popular boolean default false,
  addons jsonb default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table tables (
  id uuid primary key default uuid_generate_v4(),
  identifier text unique not null,
  type text check (type in ('table','room')) default 'table',
  label text not null,
  active boolean default true,
  created_at timestamptz default now()
);

create table orders (
  id uuid primary key default uuid_generate_v4(),
  table_id uuid references tables(id),
  location_label text,
  status text check (status in ('Pending','Accepted','Preparing','Ready','Delivered','Rejected')) default 'Pending',
  total numeric(10,2) not null,
  service_fee numeric(10,2) default 0,
  grand_total numeric(10,2) not null,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid references orders(id) on delete cascade,
  menu_item_id uuid references menu_items(id),
  item_name text not null,
  quantity integer not null default 1,
  unit_price numeric(10,2) not null,
  subtotal numeric(10,2) not null,
  special_instructions text,
  selected_addons jsonb default '[]',
  created_at timestamptz default now()
);

-- ============================================================
-- INDEXES
-- ============================================================

create index idx_orders_status on orders(status);
create index idx_orders_table_id on orders(table_id);
create index idx_orders_created_at on orders(created_at desc);
create index idx_order_items_order_id on order_items(order_id);
create index idx_menu_items_category_id on menu_items(category_id);
create index idx_menu_items_available on menu_items(available);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_orders_updated_at
  before update on orders
  for each row execute function update_updated_at();

create trigger trg_menu_items_updated_at
  before update on menu_items
  for each row execute function update_updated_at();

-- ============================================================
-- ENABLE REALTIME
-- ============================================================

alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table order_items;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table categories enable row level security;
alter table menu_items enable row level security;
alter table tables enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;

-- Public read: categories, menu items, tables
create policy "Public read categories" on categories for select using (true);
create policy "Public read menu_items" on menu_items for select using (available = true);
create policy "Public read tables" on tables for select using (active = true);

-- Guest: can create orders and order_items (no auth required)
create policy "Guest create orders" on orders for insert with check (true);
create policy "Guest read own orders" on orders for select using (true);
create policy "Guest create order_items" on order_items for insert with check (true);
create policy "Guest read order_items" on order_items for select using (true);

-- Staff/Admin: full access (use service role key or auth.role())
-- In production, restrict using auth.jwt() ->> 'role' = 'staff' etc.
create policy "Staff manage orders" on orders for update using (true);
create policy "Admin manage menu_items" on menu_items for all using (true);
create policy "Admin manage categories" on categories for all using (true);
create policy "Admin manage tables" on tables for all using (true);

-- ============================================================
-- SEED DATA — Categories
-- ============================================================

insert into categories (name, icon, sort_order) values
  ('Breakfast', 'ti-egg', 1),
  ('Starters', 'ti-salad', 2),
  ('Main Course', 'ti-meat', 3),
  ('Grills', 'ti-flame', 4),
  ('Pasta & Rice', 'ti-bowl', 5),
  ('Soups', 'ti-cup', 6),
  ('Salads', 'ti-leaf', 7),
  ('Desserts', 'ti-ice-cream', 8),
  ('Hot Drinks', 'ti-coffee', 9),
  ('Cold Drinks', 'ti-glass', 10),
  ('Juices', 'ti-lemon', 11);

-- ============================================================
-- SEED DATA — Tables
-- ============================================================

insert into tables (identifier, type, label) values
  ('table-1', 'table', 'Table 1'),
  ('table-2', 'table', 'Table 2'),
  ('table-3', 'table', 'Table 3'),
  ('table-4', 'table', 'Table 4'),
  ('table-5', 'table', 'Table 5'),
  ('table-6', 'table', 'Table 6'),
  ('table-7', 'table', 'Table 7'),
  ('table-8', 'table', 'Table 8'),
  ('table-9', 'table', 'Table 9'),
  ('table-10', 'table', 'Table 10'),
  ('table-11', 'table', 'Table 11'),
  ('table-12', 'table', 'Table 12'),
  ('room-101', 'room', 'Room 101'),
  ('room-102', 'room', 'Room 102'),
  ('room-201', 'room', 'Room 201'),
  ('room-202', 'room', 'Room 202'),
  ('room-301', 'room', 'Room 301'),
  ('room-302', 'room', 'Room 302');

-- ============================================================
-- SEED DATA — Menu Items (sample)
-- ============================================================

do $$
declare
  cat_breakfast uuid;
  cat_starters uuid;
  cat_mains uuid;
  cat_grills uuid;
  cat_pasta uuid;
  cat_desserts uuid;
  cat_hot uuid;
  cat_cold uuid;
begin
  select id into cat_breakfast from categories where name='Breakfast';
  select id into cat_starters from categories where name='Starters';
  select id into cat_mains from categories where name='Main Course';
  select id into cat_grills from categories where name='Grills';
  select id into cat_pasta from categories where name='Pasta & Rice';
  select id into cat_desserts from categories where name='Desserts';
  select id into cat_hot from categories where name='Hot Drinks';
  select id into cat_cold from categories where name='Cold Drinks';

  insert into menu_items (name, description, price, category_id, image_url, prep_time_minutes, available, popular, addons) values
  -- Breakfast
  ('Grand Dima Full Breakfast', 'Eggs, toast, grilled tomato, sausage, mushrooms, bacon & orange juice', 280, cat_breakfast, 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=600', 20, true, true, '[{"name":"Extra eggs","price":30},{"name":"Smoked salmon","price":60},{"name":"Avocado","price":45}]'),
  ('Continental Breakfast', 'Croissant, jam, butter, fresh fruit, yogurt & coffee', 180, cat_breakfast, 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=600', 10, true, false, '[{"name":"Add egg","price":25}]'),
  ('Eggs Benedict', 'Poached eggs on English muffin with Canadian bacon & hollandaise', 220, cat_breakfast, 'https://images.unsplash.com/photo-1608039755401-742074f0548d?w=600', 15, true, true, '[{"name":"Extra hollandaise","price":20},{"name":"Smoked salmon instead","price":40}]'),
  ('Avocado Toast', 'Sourdough, smashed avocado, cherry tomatoes, microgreens & poached egg', 195, cat_breakfast, 'https://images.unsplash.com/photo-1541519227354-08fa5d50c820?w=600', 12, true, false, '[{"name":"Extra egg","price":25},{"name":"Add bacon","price":35}]'),
  -- Starters
  ('Bruschetta al Pomodoro', 'Toasted ciabatta, fresh tomato, basil, garlic & extra virgin olive oil', 120, cat_starters, 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=600', 8, true, false, '[]'),
  ('Soup of the Day', 'Ask your waiter for today''s selection. Served with artisan bread', 140, cat_starters, 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600', 10, true, false, '[{"name":"Extra bread","price":20}]'),
  ('Prawn Cocktail', 'Atlantic prawns, Marie Rose sauce, iceberg lettuce, lemon', 185, cat_starters, 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600', 10, true, true, '[]'),
  -- Mains
  ('Grilled Nile Perch', 'Pan-seared Nile perch fillet, lemon butter sauce, seasonal vegetables & choice of starch', 380, cat_mains, 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600', 25, true, true, '[{"name":"Chips instead of rice","price":0},{"name":"Extra sauce","price":30}]'),
  ('Chicken Tikka Masala', 'Tender chicken in rich spiced tomato cream sauce, basmati rice & naan', 320, cat_mains, 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600', 20, true, true, '[{"name":"Extra naan","price":35},{"name":"Extra spicy","price":0},{"name":"Mild","price":0}]'),
  ('Vegetable Biryani', 'Aromatic basmati rice with seasonal vegetables, fried onions & raita', 260, cat_mains, 'https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?w=600', 20, true, false, '[{"name":"Add paneer","price":50},{"name":"Extra raita","price":20}]'),
  -- Grills
  ('Ribeye Steak 300g', 'Prime-cut ribeye, hand-cut chips, grilled tomato, mushrooms & peppercorn sauce', 680, cat_grills, 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=600', 30, true, true, '[{"name":"Medium rare","price":0},{"name":"Medium","price":0},{"name":"Well done","price":0},{"name":"Extra sauce","price":30}]'),
  ('Lamb Chops', 'Herb-marinated lamb chops, mint jelly, roasted potatoes & green beans', 550, cat_grills, 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=600', 28, true, true, '[]'),
  ('BBQ Chicken Half', 'Slow-grilled half chicken, BBQ glaze, coleslaw & chips', 320, cat_grills, 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=600', 25, true, false, '[{"name":"Extra BBQ sauce","price":20}]'),
  -- Pasta
  ('Spaghetti Carbonara', 'Spaghetti, guanciale, egg yolk, pecorino romano, black pepper', 280, cat_pasta, 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=600', 18, true, true, '[{"name":"Add chicken","price":60},{"name":"Gluten-free pasta","price":30}]'),
  ('Penne Arrabbiata', 'Penne in spicy tomato & garlic sauce, fresh basil, parmesan', 240, cat_pasta, 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=600', 15, true, false, '[{"name":"Extra spicy","price":0},{"name":"Add prawns","price":80}]'),
  -- Desserts
  ('Chocolate Lava Cake', 'Warm dark chocolate fondant, vanilla ice cream & berry coulis', 180, cat_desserts, 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=600', 15, true, true, '[{"name":"Extra ice cream","price":30}]'),
  ('Crème Brûlée', 'Classic French vanilla custard with caramelized sugar crust', 160, cat_desserts, 'https://images.unsplash.com/photo-1470124182917-cc6e71b22ecc?w=600', 10, true, false, '[]'),
  ('Tiramisu', 'House-made tiramisu with ladyfingers, mascarpone & espresso', 170, cat_desserts, 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600', 5, true, true, '[]'),
  -- Hot Drinks
  ('Ethiopian Coffee', 'Single-origin Ethiopian arabica, prepared your way', 80, cat_hot, 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600', 5, true, true, '[{"name":"Espresso","price":0},{"name":"Americano","price":0},{"name":"Cappuccino","price":0},{"name":"Latte","price":0},{"name":"Macchiato","price":0}]'),
  ('Masala Chai', 'Spiced Indian tea with ginger, cardamom, cinnamon & steamed milk', 90, cat_hot, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600', 5, true, false, '[]'),
  ('Herbal Tea', 'Selection of camomile, peppermint, ginger lemon or green tea', 75, cat_hot, 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=600', 3, true, false, '[]'),
  -- Cold Drinks
  ('Fresh Lemonade', 'House-squeezed lemonade, mint & ice', 95, cat_cold, 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=600', 5, true, true, '[{"name":"Extra mint","price":0},{"name":"Sparkling water base","price":0}]'),
  ('Still Mineral Water 500ml', 'Chilled still mineral water', 55, cat_cold, 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=600', 2, true, false, '[]'),
  ('Sparkling Mineral Water 500ml', 'Chilled sparkling mineral water', 65, cat_cold, 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=600', 2, true, false, '[]'),
  ('Coca-Cola / Diet Coke', 'Ice cold Coca-Cola or Diet Coke 330ml can', 70, cat_cold, 'https://images.unsplash.com/photo-1624517452488-04bba793476f?w=600', 2, true, true, '[]');
end;
$$;