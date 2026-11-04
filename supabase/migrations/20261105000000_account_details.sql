-- Aurix: private contact details (phone and mailing address). Unlike public.profiles, only the owner can read or change a row.
create table if not exists public.account_details (
  user_id       uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  full_name     text not null default '' check (char_length(full_name) <= 80),
  phone         text not null default '' check (char_length(phone) <= 25 and phone ~ '^[0-9+()./ -]*$'),
  address_line1 text not null default '' check (char_length(address_line1) <= 100),
  address_line2 text not null default '' check (char_length(address_line2) <= 100),
  city          text not null default '' check (char_length(city) <= 60),
  region        text not null default '' check (char_length(region) <= 60),
  postal_code   text not null default '' check (char_length(postal_code) <= 12),
  country       text not null default '' check (char_length(country) <= 60),
  updated_at    timestamptz not null default now()
);
alter table public.account_details enable row level security;
create policy "account details: read own"   on public.account_details for select using (auth.uid() = user_id);
create policy "account details: insert own" on public.account_details for insert with check (auth.uid() = user_id);
create policy "account details: update own" on public.account_details for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "account details: delete own" on public.account_details for delete using (auth.uid() = user_id);
-- never readable by signed-out visitors
revoke all on public.account_details from anon;
