-- Aurix: seller features. Order statuses, likes over time, seller profiles, draft listings and reviews.

-- 1. Order status: the seller of an item can mark it delivered. Only the status columns are updatable.
alter table public.order_items add column if not exists status text not null default 'new' check (status in ('new', 'delivered'));
alter table public.order_items add column if not exists delivered_at timestamptz;
revoke update on public.order_items from anon, authenticated;
grant update (status, delivered_at) on public.order_items to authenticated;
create policy "order items: seller updates status" on public.order_items for update using (auth.uid() = seller_id) with check (auth.uid() = seller_id);

create or replace function public.order_items_stamp_delivered() returns trigger language plpgsql as $$
begin
  new.delivered_at := case when new.status = 'delivered' then coalesce(old.delivered_at, now()) else null end;
  return new;
end $$;
create trigger order_items_stamp_delivered before update of status on public.order_items
  for each row execute function public.order_items_stamp_delivered();

-- 2. Likes over time.
alter table public.listing_likes add column if not exists created_at timestamptz not null default now();

-- 3. Seller profiles: public to read, each user edits their own.
create table if not exists public.profiles (
  user_id      uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  bio          text not null default '' check (char_length(bio) <= 300),
  updated_at   timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles: public read" on public.profiles for select using (true);
create policy "profiles: insert own"  on public.profiles for insert with check (auth.uid() = user_id);
create policy "profiles: update own"  on public.profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 4. Draft listings: only their owner can see them.
alter table public.listings add column if not exists status text not null default 'published' check (status in ('draft', 'published'));
drop policy if exists "listings: public read" on public.listings;
create policy "listings: read published or own" on public.listings for select using (status = 'published' or auth.uid() = user_id);

-- 5. Reviews: public to read; only someone who ordered a design can review it, once.
create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  listing_ref text not null,                       -- listings.id, or 'f1'.. for featured designs
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  author      text not null check (char_length(author) between 1 and 40),
  rating      int  not null check (rating between 1 and 5),
  comment     text not null default '' check (char_length(comment) <= 500),
  created_at  timestamptz not null default now(),
  unique (user_id, listing_ref)
);
create index if not exists reviews_listing_idx on public.reviews (listing_ref, created_at desc);
alter table public.reviews enable row level security;
create policy "reviews: public read" on public.reviews for select using (true);
create policy "reviews: insert if ordered" on public.reviews for insert with check (
  auth.uid() = user_id and exists (select 1 from public.order_items oi where oi.user_id = auth.uid() and oi.listing_ref = reviews.listing_ref)
);
create policy "reviews: update own" on public.reviews for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "reviews: delete own" on public.reviews for delete using (auth.uid() = user_id);

-- place_order: drafts can't be ordered, and featured designs have no seller to deliver them, so they are delivered at once.
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
      if not found or l.status <> 'published' then raise exception 'A design in your cart is no longer available'; end if;
      if l.user_id = auth.uid() then raise exception 'You can''t order your own design'; end if;
      insert into public.order_items (order_id, listing_ref, seller_id, title, seller_name, price, config, thumbnail)
        values (oid, ref, l.user_id, l.title, l.seller_name, l.price, l.config, l.thumbnail);
    elsif ref ~ '^f[0-9]{1,3}$' then
      insert into public.order_items (order_id, listing_ref, title, seller_name, price, config, thumbnail, status, delivered_at)
        values (oid, ref, it->>'title', it->>'seller_name', (it->>'price')::numeric, it->'config', it->>'thumbnail', 'delivered', now());
    else
      raise exception 'Unknown design in your cart';
    end if;
  end loop;
  return oid;
end $$;
