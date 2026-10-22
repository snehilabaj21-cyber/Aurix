-- Aurix: saved designs. Run once in Supabase → SQL Editor.
create table if not exists public.designs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 80),
  config       jsonb not null,
  thumbnail    text check (thumbnail is null or char_length(thumbnail) < 100000),
  is_autosave  boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists designs_user_idx on public.designs (user_id, updated_at desc);
-- at most one autosave row per user
create unique index if not exists designs_one_autosave on public.designs (user_id) where is_autosave;

-- Row Level Security: every user can only see and change their own designs.
alter table public.designs enable row level security;

create policy "own designs: read"   on public.designs for select using (auth.uid() = user_id);
create policy "own designs: insert" on public.designs for insert with check (auth.uid() = user_id);
create policy "own designs: update" on public.designs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own designs: delete" on public.designs for delete using (auth.uid() = user_id);
