-- Aurix: marketplace listings + likes. Run once in Supabase → SQL Editor.
create table if not exists public.listings (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  seller_name text not null check (char_length(seller_name) between 1 and 40),
  title       text not null check (char_length(title) between 1 and 80),
  description text not null default '' check (char_length(description) <= 600),
  product     text not null check (product in ('ring', 'pendant', 'nameplate')),
  price       numeric(10,2) not null check (price >= 0 and price <= 100000),
  config      jsonb not null,
  thumbnail   text not null check (char_length(thumbnail) < 200000),
  created_at  timestamptz not null default now()
);
create index if not exists listings_created_idx on public.listings (created_at desc);
create index if not exists listings_user_idx on public.listings (user_id);

create table if not exists public.listing_likes (
  listing_id uuid not null references public.listings(id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  primary key (listing_id, user_id)
);

alter table public.listings enable row level security;
alter table public.listing_likes enable row level security;

-- Anyone can browse the marketplace; only the seller can add, change or remove their listings.
create policy "listings: public read" on public.listings for select using (true);
create policy "listings: insert own"  on public.listings for insert with check (auth.uid() = user_id);
create policy "listings: update own"  on public.listings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "listings: delete own"  on public.listings for delete using (auth.uid() = user_id);

create policy "likes: public read" on public.listing_likes for select using (true);
create policy "likes: insert own"  on public.listing_likes for insert with check (auth.uid() = user_id);
create policy "likes: delete own"  on public.listing_likes for delete using (auth.uid() = user_id);
