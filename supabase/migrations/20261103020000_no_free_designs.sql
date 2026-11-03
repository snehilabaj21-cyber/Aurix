-- Aurix: every design has a price (demo checkout still takes no payment).
alter table public.listings    add constraint listings_price_positive    check (price > 0);
alter table public.order_items add constraint order_items_price_positive check (price > 0);
