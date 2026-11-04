-- Aurix: transactional emails. Database events call the send-email edge function (supabase/functions/send-email) with only an
-- event name and a record id; the function looks up the recipients and content itself and sends through SendGrid.
-- Every call is wrapped so a problem with email can never block an order, a review or a sign-up.
-- The function accepts only { event, id }: it looks up the recipients and content itself, and sends each email once.
create extension if not exists pg_net;

-- One row per email already sent (so a repeated call never sends twice). Nobody but the function (service role) can touch it.
create table if not exists public.email_log (
  key     text primary key,
  sent_at timestamptz not null default now()
);
alter table public.email_log enable row level security;
revoke all on public.email_log from anon, authenticated;

create or replace function public.notify_email(p_event text, p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform net.http_post(
    url := 'https://pmabhsalknzgnxcklfva.supabase.co/functions/v1/send-email',
    -- Supabase's gateway requires a valid token; this is the project's public anon key, already shipped to every browser.
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtYWJoc2Fsa256Z254Y2tsZnZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2MjQ5NDEsImV4cCI6MjEwODIwMDk0MX0.qNSY4Etiz7f9EPmWpTGjLNeEdv7b4IIO8Lh2V3Z_6wg'),
    body := jsonb_build_object('event', p_event, 'id', p_id),
    timeout_milliseconds := 5000);
exception when others then
  raise warning 'email notification failed (%): %', p_event, sqlerrm;
end $$;
revoke all on function public.notify_email(text, uuid) from public, anon, authenticated;

-- order placed -> confirmation to the buyer, "new sale" to each seller. Deferred, so it runs after the order's items exist.
create or replace function public.trg_email_order() returns trigger language plpgsql security definer set search_path = public as $$
begin perform public.notify_email('order_placed', new.id); return null; end $$;
drop trigger if exists email_order_placed on public.orders;
create constraint trigger email_order_placed after insert on public.orders
  deferrable initially deferred for each row execute function public.trg_email_order();

-- seller marks an item delivered -> email to the buyer
create or replace function public.trg_email_delivered() returns trigger language plpgsql security definer set search_path = public as $$
begin perform public.notify_email('item_delivered', new.id); return null; end $$;
drop trigger if exists email_item_delivered on public.order_items;
create trigger email_item_delivered after update of status on public.order_items
  for each row when (new.status = 'delivered' and old.status is distinct from 'delivered' and new.seller_id is not null)
  execute function public.trg_email_delivered();

-- new review -> email to the seller
create or replace function public.trg_email_review() returns trigger language plpgsql security definer set search_path = public as $$
begin perform public.notify_email('review_created', new.id); return null; end $$;
drop trigger if exists email_review_created on public.reviews;
create trigger email_review_created after insert on public.reviews
  for each row execute function public.trg_email_review();

-- new account -> welcome email
create or replace function public.trg_email_welcome() returns trigger language plpgsql security definer set search_path = public as $$
begin perform public.notify_email('welcome', new.id); return null; end $$;
drop trigger if exists email_welcome on auth.users;
create trigger email_welcome after insert on auth.users
  for each row execute function public.trg_email_welcome();
