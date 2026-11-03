-- Aurix: demo checkout. Orders keep a snapshot of each design (title, price, config, thumbnail) so they survive listing deletion.
-- No payment is taken; place_order() only records the order.
create table if not exists public.orders (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists orders_user_idx on public.orders (user_id, created_at desc);

create table if not exists public.order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  listing_ref text not null,                      -- listings.id for marketplace listings, 'f1'.. for featured designs
  seller_id   uuid references auth.users(id) on delete set null,
  title       text not null check (char_length(title) between 1 and 80),
  seller_name text not null check (char_length(seller_name) between 1 and 40),
  price       numeric(10,2) not null check (price >= 0 and price <= 100000),
  config      jsonb not null,
  thumbnail   text check (thumbnail is null or char_length(thumbnail) < 200000),
  created_at  timestamptz not null default now(),
  unique (user_id, listing_ref)                   -- one copy of each design per buyer
);
create index if not exists order_items_order_idx  on public.order_items (order_id);
create index if not exists order_items_seller_idx on public.order_items (seller_id, created_at desc);

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "orders: read own"   on public.orders for select using (auth.uid() = user_id);
create policy "orders: insert own" on public.orders for insert with check (auth.uid() = user_id);

-- Buyers see their own items; sellers see the items sold from their listings.
create policy "order items: read own or sold" on public.order_items for select using (auth.uid() = user_id or auth.uid() = seller_id);
create policy "order items: insert own" on public.order_items for insert with check (
  auth.uid() = user_id and exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
);

-- p_items: [{ref, title, seller_name, price, config, thumbnail}]. For marketplace listings the title, price and
-- design come from the listings table, not from the client; featured designs ('f1'..) use the client snapshot.
create or replace function public.place_order(p_items jsonb) returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  oid uuid;
  it jsonb;
  ref text;
  l public.listings;
begin
  if auth.uid() is null then raise exception 'Sign in to place an order'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 20 then
    raise exception 'An order needs between 1 and 20 designs';
  end if;
  insert into public.orders default values returning id into oid;
  for it in select * from jsonb_array_elements(p_items) loop
    ref := it->>'ref';
    if ref ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      select * into l from public.listings where id = ref::uuid;
      if not found then raise exception 'A design in your cart is no longer available'; end if;
      if l.user_id = auth.uid() then raise exception 'You can''t order your own design'; end if;
      insert into public.order_items (order_id, listing_ref, seller_id, title, seller_name, price, config, thumbnail)
        values (oid, ref, l.user_id, l.title, l.seller_name, l.price, l.config, l.thumbnail);
    elsif ref ~ '^f[0-9]{1,3}$' then
      insert into public.order_items (order_id, listing_ref, title, seller_name, price, config, thumbnail)
        values (oid, ref, it->>'title', it->>'seller_name', (it->>'price')::numeric, it->'config', it->>'thumbnail');
    else
      raise exception 'Unknown design in your cart';
    end if;
  end loop;
  return oid;
end $$;
