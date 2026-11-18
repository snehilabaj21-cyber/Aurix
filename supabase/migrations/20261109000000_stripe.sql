-- Aurix: card payments move to Stripe (an on-page card form). The checkout bookkeeping from 20261108000000_payments.sql is
-- reused: the provider's payment reference is now generic, and fulfill_checkout() records which provider took the money.
alter table public.checkouts rename column paypal_order_id to provider_ref;
alter table public.checkouts add column if not exists provider text not null default 'paypal';

drop function if exists public.fulfill_checkout(text, text, text, numeric);

-- Turns a successful payment into an order. Locks the checkout row, so the browser and Stripe's webhook can both call it
-- and only one order is ever created.
create or replace function public.fulfill_checkout(p_ref text, p_provider text, p_payment_id text, p_method text, p_amount numeric) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  c public.checkouts; oid uuid; it jsonb; a public.account_details; contact jsonb := null; featured boolean;
begin
  select * into c from public.checkouts where provider_ref = p_ref for update;
  if not found then raise exception 'Unknown checkout'; end if;
  if c.status = 'done' then return c.order_id; end if;
  if c.status not in ('pending', 'capturing') then raise exception 'Checkout is not awaiting fulfilment'; end if;
  if c.total <> p_amount then raise exception 'Paid amount % does not match the order total %', p_amount, c.total; end if;
  if c.share then
    select * into a from public.account_details where user_id = c.user_id;
    if found then
      contact := jsonb_build_object('full_name', a.full_name, 'phone', a.phone, 'address_line1', a.address_line1, 'address_line2', a.address_line2,
                                    'city', a.city, 'region', a.region, 'postal_code', a.postal_code, 'country', a.country);
    end if;
  end if;
  insert into public.orders (user_id, payment_provider, payment_id, payment_method, amount)
    values (c.user_id, p_provider, p_payment_id, p_method, c.total) returning id into oid;
  for it in select * from jsonb_array_elements(c.items) loop
    featured := (it->>'seller_id') is null;
    insert into public.order_items (order_id, user_id, listing_ref, seller_id, title, seller_name, price, config, thumbnail, shared_contact, status, delivered_at)
      values (oid, c.user_id, it->>'ref', nullif(it->>'seller_id', '')::uuid, it->>'title', it->>'seller_name', (it->>'price')::numeric,
              it->'config', it->>'thumbnail', case when featured then null else contact end,
              case when featured then 'delivered' else 'new' end, case when featured then now() else null end);
  end loop;
  update public.checkouts set status = 'done', payment_id = p_payment_id, order_id = oid, updated_at = now() where provider_ref = p_ref;
  return oid;
end $$;

revoke all on function public.fulfill_checkout(text, text, text, text, numeric) from public, anon, authenticated;
grant execute on function public.fulfill_checkout(text, text, text, text, numeric) to service_role;
