-- Aurix: a buyer can choose to share their contact details with the seller when ordering.
-- The details are copied onto the order item (a snapshot), so only that item's buyer and seller can ever see them.
alter table public.order_items add column if not exists shared_contact jsonb
  check (shared_contact is null or pg_column_size(shared_contact) < 2000);

-- Orders can now only be created through place_order(). Direct inserts would let anyone write fake sales, with
-- fake contact details, onto another seller's dashboard.
revoke insert on public.order_items from anon, authenticated;
revoke insert on public.orders from anon, authenticated;

drop function if exists public.place_order(jsonb);

-- p_items: [{ref, title, seller_name, price, config, thumbnail}]. For marketplace listings the title, price and design
-- come from the listings table. p_share: copy the buyer's saved phone and address onto each marketplace item.
-- security definer so it can insert; it only ever acts as auth.uid().
create or replace function public.place_order(p_items jsonb, p_share boolean default false) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  oid uuid;
  it jsonb;
  ref text;
  l public.listings;
  a public.account_details;
  contact jsonb := null;
begin
  if uid is null then raise exception 'Sign in to place an order'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 20 then
    raise exception 'An order needs between 1 and 20 designs';
  end if;
  if p_share then
    select * into a from public.account_details where user_id = uid;
    if not found or (btrim(a.phone) = '' and btrim(a.address_line1) = '') then
      raise exception 'Add a phone number or mailing address on My profile before sharing it';
    end if;
    contact := jsonb_build_object('full_name', a.full_name, 'phone', a.phone, 'address_line1', a.address_line1, 'address_line2', a.address_line2,
                                  'city', a.city, 'region', a.region, 'postal_code', a.postal_code, 'country', a.country);
  end if;
  insert into public.orders (user_id) values (uid) returning id into oid;
  for it in select * from jsonb_array_elements(p_items) loop
    ref := it->>'ref';
    if ref ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      select * into l from public.listings where id = ref::uuid;
      if not found or l.status <> 'published' then raise exception 'A design in your cart is no longer available'; end if;
      if l.user_id = uid then raise exception 'You can''t order your own design'; end if;
      insert into public.order_items (order_id, user_id, listing_ref, seller_id, title, seller_name, price, config, thumbnail, shared_contact)
        values (oid, uid, ref, l.user_id, l.title, l.seller_name, l.price, l.config, l.thumbnail, contact);
    elsif ref ~ '^f[0-9]{1,3}$' then
      -- featured designs have no seller: delivered at once, and no contact details are shared
      insert into public.order_items (order_id, user_id, listing_ref, title, seller_name, price, config, thumbnail, status, delivered_at)
        values (oid, uid, ref, it->>'title', it->>'seller_name', (it->>'price')::numeric, it->'config', it->>'thumbnail', 'delivered', now());
    else
      raise exception 'Unknown design in your cart';
    end if;
  end loop;
  return oid;
end $$;

revoke all on function public.place_order(jsonb, boolean) from public, anon;
grant execute on function public.place_order(jsonb, boolean) to authenticated;
