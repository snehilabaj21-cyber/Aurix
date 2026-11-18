-- Aurix: real payments through PayPal (card, PayPal and Venmo all go through PayPal Checkout).
-- Flow: the browser asks the paypal-checkout edge function to start a checkout -> prepare_checkout() re-prices the cart from the
-- database (the browser's prices are never trusted) and the snapshot is stored in `checkouts` -> the buyer pays in the PayPal
-- window -> the function captures the payment and calls fulfill_checkout(), which creates the order. Only the service role
-- (the edge function) can run these, so an order can only exist after money was captured.

alter table public.orders add column if not exists payment_provider text;
alter table public.orders add column if not exists payment_id text;       -- PayPal capture id
alter table public.orders add column if not exists payment_method text;   -- card | paypal | venmo
alter table public.orders add column if not exists amount numeric(10,2);
create unique index if not exists orders_payment_id_key on public.orders (payment_id) where payment_id is not null;

-- One row per PayPal order we started. Nobody but the edge function (service role) can read or write it.
create table if not exists public.checkouts (
  paypal_order_id text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  items      jsonb not null,           -- the priced, validated cart snapshot from prepare_checkout()
  share      boolean not null default false,
  total      numeric(10,2) not null check (total > 0),
  status     text not null default 'pending' check (status in ('pending', 'capturing', 'done', 'failed', 'needs_review')),
  payment_id text,
  order_id   uuid references public.orders(id) on delete set null,
  note       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists checkouts_user_idx on public.checkouts (user_id, created_at desc);
alter table public.checkouts enable row level security;
revoke all on public.checkouts from anon, authenticated;

-- Validates a cart and prices it from the database. p_items: [{ref, config, thumbnail}] (only ref matters for marketplace
-- listings). Featured designs ('f1'..) have no table, so their catalogue is listed here; keep it in step with FEATURED in
-- js/marketplace.js. Returns {items: [...], total}.
create or replace function public.prepare_checkout(p_user uuid, p_items jsonb, p_share boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  it jsonb; ref text; l public.listings; a public.account_details;
  out_items jsonb := '[]'::jsonb; total numeric := 0;
  seen text[] := '{}';
  f_title text; f_seller text; f_price numeric; thumb text;
begin
  if p_user is null then raise exception 'Sign in to check out'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 20 then
    raise exception 'An order needs between 1 and 20 designs';
  end if;
  if p_share then
    select * into a from public.account_details where user_id = p_user;
    if not found or (btrim(a.phone) = '' and btrim(a.address_line1) = '') then
      raise exception 'Add a phone number or mailing address on My profile before sharing it';
    end if;
  end if;
  for it in select * from jsonb_array_elements(p_items) loop
    ref := it->>'ref';
    if ref is null or ref = any(seen) then raise exception 'Your cart has a duplicate or invalid design'; end if;
    seen := seen || ref;
    if exists (select 1 from public.order_items where user_id = p_user and listing_ref = ref) then
      raise exception 'You already own one of these designs. Remove it from your cart and try again.';
    end if;
    if ref ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      select * into l from public.listings where id = ref::uuid;
      if not found or l.status <> 'published' then raise exception 'A design in your cart is no longer available'; end if;
      if l.user_id = p_user then raise exception 'You can''t order your own design'; end if;
      if l.price is null or l.price <= 0 then raise exception 'A design in your cart has no price'; end if;
      out_items := out_items || jsonb_build_object('ref', ref, 'seller_id', l.user_id, 'title', l.title, 'seller_name', l.seller_name,
                                                   'price', l.price, 'config', l.config, 'thumbnail', l.thumbnail);
      total := total + l.price;
    elsif ref ~ '^f[0-9]{1,3}$' then
      f_title := null;
      select t, s, p into f_title, f_seller, f_price from (values
        ('f1', 'Emerald Halo Solitaire', 'Aurix Studio', 38), ('f2', 'Rose Gold Pavé Oval', 'Marlowe & Co', 24),
        ('f3', 'Heart Locket Pendant', 'Aurix Studio', 18), ('f4', '“Maya” Pill Name Plate', 'Noor Atelier', 12),
        ('f6', 'Marquise Ruby Drop', 'Marlowe & Co', 20), ('f7', 'Block Initials Bracelet Plate', 'Noor Atelier', 8),
        ('f8', 'Pear Double-Claw', 'Halden Jewels', 30)
      ) as f(r, t, s, p) where f.r = ref;
      if f_title is null then raise exception 'Unknown design in your cart'; end if;
      thumb := it->>'thumbnail';
      if thumb is not null and (char_length(thumb) >= 190000 or thumb !~ '^data:image/jpeg;base64,[A-Za-z0-9+/=]+$') then thumb := null; end if;
      if jsonb_typeof(it->'config') is distinct from 'object' then raise exception 'Unknown design in your cart'; end if;
      out_items := out_items || jsonb_build_object('ref', ref, 'seller_id', null, 'title', f_title, 'seller_name', f_seller,
                                                   'price', f_price, 'config', it->'config', 'thumbnail', thumb);
      total := total + f_price;
    else
      raise exception 'Unknown design in your cart';
    end if;
  end loop;
  return jsonb_build_object('items', out_items, 'total', total);
end $$;

-- Turns a captured payment into an order. Locks the checkout row, so a repeated call can't create a second order.
create or replace function public.fulfill_checkout(p_paypal_order_id text, p_payment_id text, p_method text, p_amount numeric) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  c public.checkouts; oid uuid; it jsonb; a public.account_details; contact jsonb := null; featured boolean;
begin
  select * into c from public.checkouts where paypal_order_id = p_paypal_order_id for update;
  if not found then raise exception 'Unknown checkout'; end if;
  if c.status = 'done' then return c.order_id; end if;
  if c.status <> 'capturing' then raise exception 'Checkout is not awaiting fulfilment'; end if;
  if c.total <> p_amount then raise exception 'Paid amount % does not match the order total %', p_amount, c.total; end if;
  if c.share then
    select * into a from public.account_details where user_id = c.user_id;
    if found then
      contact := jsonb_build_object('full_name', a.full_name, 'phone', a.phone, 'address_line1', a.address_line1, 'address_line2', a.address_line2,
                                    'city', a.city, 'region', a.region, 'postal_code', a.postal_code, 'country', a.country);
    end if;
  end if;
  insert into public.orders (user_id, payment_provider, payment_id, payment_method, amount)
    values (c.user_id, 'paypal', p_payment_id, p_method, c.total) returning id into oid;
  for it in select * from jsonb_array_elements(c.items) loop
    featured := (it->>'seller_id') is null;
    insert into public.order_items (order_id, user_id, listing_ref, seller_id, title, seller_name, price, config, thumbnail, shared_contact, status, delivered_at)
      values (oid, c.user_id, it->>'ref', nullif(it->>'seller_id', '')::uuid, it->>'title', it->>'seller_name', (it->>'price')::numeric,
              it->'config', it->>'thumbnail', case when featured then null else contact end,
              case when featured then 'delivered' else 'new' end, case when featured then now() else null end);
  end loop;
  update public.checkouts set status = 'done', payment_id = p_payment_id, order_id = oid, updated_at = now() where paypal_order_id = p_paypal_order_id;
  return oid;
end $$;

revoke all on function public.prepare_checkout(uuid, jsonb, boolean) from public, anon, authenticated;
revoke all on function public.fulfill_checkout(text, text, text, numeric) from public, anon, authenticated;
grant execute on function public.prepare_checkout(uuid, jsonb, boolean) to service_role;
grant execute on function public.fulfill_checkout(text, text, text, numeric) to service_role;
