-- Aurix: paid subscription (Stripe Billing) that unlocks STL export.
-- One row per user. Only the stripe-checkout edge function (service role) writes it, from Stripe's own data; a user can only
-- read their own row, so the browser can show "subscribed" but can never grant it to itself.
create table if not exists public.subscriptions (
  user_id                uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id     text unique,
  stripe_subscription_id text,
  status                 text not null default 'none',   -- Stripe status: active, trialing, past_due, canceled, ... or 'none'
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  updated_at             timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
revoke all on public.subscriptions from anon, authenticated;
grant select on public.subscriptions to authenticated;
drop policy if exists "subscriptions: read own" on public.subscriptions;
create policy "subscriptions: read own" on public.subscriptions for select using (auth.uid() = user_id);
