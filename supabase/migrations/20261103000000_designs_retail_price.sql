-- Aurix: the app saves and lists each design's retail price (js/cloud.js), but the table never had the column.
alter table public.designs
  add column if not exists retail_price numeric(12,2) not null default 0 check (retail_price >= 0);
