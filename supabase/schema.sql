-- JATE — Supabase schema
-- Run this in the Supabase SQL editor (Dashboard → SQL → New query), then paste
-- the result. Re-runnable: uses `if not exists` / `drop policy if exists`.

-- ── Profiles (1:1 with auth.users) ──────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  email text,
  photo_url text,
  friend_code text unique not null,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

-- ── Jobs ────────────────────────────────────────────────────────────────────
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  company text not null,
  role text not null,
  location text,
  status text,
  deadline text,
  notes text,
  url text,
  posting_url text,
  portal_url text,
  applied_date text,
  interview_date text,
  salary text,
  salary_type text,
  is_paid boolean,
  trackr_id text,
  trackr_type text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now()
);

-- ── Friends (junction table; rows are stored in both directions) ────────────
create table if not exists public.friends (
  user_id uuid not null references public.profiles (id) on delete cascade,
  friend_id uuid not null references public.profiles (id) on delete cascade,
  primary key (user_id, friend_id),
  constraint friends_not_self check (user_id <> friend_id)
);

-- ── Indexes ─────────────────────────────────────────────────────────────────
create index if not exists jobs_user_id_idx on public.jobs (user_id);
create index if not exists profiles_friend_code_idx on public.profiles (friend_code);
create index if not exists friends_user_id_idx on public.friends (user_id);

-- ── Row Level Security ──────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.friends enable row level security;

-- Profiles: any signed-in user can read profiles (needed for friend-code lookup
-- and the friends list). Note: email is technically selectable by signed-in users.
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);

drop policy if exists "profiles_insert" on public.profiles;
create policy "profiles_insert" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles
  for update to authenticated using (auth.uid() = id);

-- Jobs: owners can read/write/delete; friends can read.
drop policy if exists "jobs_select" on public.jobs;
create policy "jobs_select" on public.jobs
  for select to authenticated
  using (
    user_id = auth.uid()
    or user_id in (select friend_id from public.friends where user_id = auth.uid())
  );

drop policy if exists "jobs_insert" on public.jobs;
create policy "jobs_insert" on public.jobs
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "jobs_update" on public.jobs;
create policy "jobs_update" on public.jobs
  for update to authenticated using (user_id = auth.uid());

drop policy if exists "jobs_delete" on public.jobs;
create policy "jobs_delete" on public.jobs
  for delete to authenticated using (user_id = auth.uid());

-- Friends: either participant can read/delete the link; insert allows both
-- directions so adding a friend is mutual.
drop policy if exists "friends_select" on public.friends;
create policy "friends_select" on public.friends
  for select to authenticated using (auth.uid() = user_id or auth.uid() = friend_id);

drop policy if exists "friends_insert" on public.friends;
create policy "friends_insert" on public.friends
  for insert to authenticated with check (auth.uid() = user_id or auth.uid() = friend_id);

drop policy if exists "friends_delete" on public.friends;
create policy "friends_delete" on public.friends
  for delete to authenticated using (auth.uid() = user_id or auth.uid() = friend_id);

-- ── Auto-create profile on signup ───────────────────────────────────────────
-- Creates a profiles row (with a unique friend code) whenever a new auth user
-- is inserted. Runs with the owner's privileges, bypassing RLS.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_code text;
begin
  loop
    new_code := upper(substr(md5(random()::text), 1, 6));
    exit when not exists (select 1 from public.profiles where friend_code = new_code);
  end loop;

  insert into public.profiles (id, display_name, email, photo_url, friend_code, is_public)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email,
    new.raw_user_meta_data->>'avatar_url',
    new_code,
    true
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Trackr shared opportunity cache ─────────────────────────────────────────
-- One row per (region, industry, type, season) combo. Everyone reads the same
-- pool; the first visitor with a stale entry refreshes it from the Trackr API.
create table if not exists public.trackr_cache (
  key text primary key,
  data jsonb not null,
  fetched_at timestamptz not null default now()
);

alter table public.trackr_cache enable row level security;

drop policy if exists "trackr_cache_select" on public.trackr_cache;
create policy "trackr_cache_select" on public.trackr_cache
  for select to authenticated using (true);

drop policy if exists "trackr_cache_insert" on public.trackr_cache;
create policy "trackr_cache_insert" on public.trackr_cache
  for insert to authenticated with check (true);

drop policy if exists "trackr_cache_update" on public.trackr_cache;
create policy "trackr_cache_update" on public.trackr_cache
  for update to authenticated using (true);
