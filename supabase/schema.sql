-- JATE — Supabase schema
-- Run this in the Supabase SQL editor (Dashboard → SQL → New query).
-- Re-runnable: uses `if not exists` / `drop ... if exists`.

-- ── Cleanup: remove the retired "friends" feature on older installs ─────────
drop table if exists public.friends cascade;
alter table public.profiles drop column if exists friend_code;
alter table public.profiles drop column if exists is_public;

-- ── Profiles (1:1 with auth.users) ──────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  email text,
  photo_url text,
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

-- ── Indexes ─────────────────────────────────────────────────────────────────
create index if not exists jobs_user_id_idx on public.jobs (user_id);

-- ── Row Level Security ──────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.jobs enable row level security;

-- Profiles: a signed-in user can read, insert, and update only their own row.
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select to authenticated using (auth.uid() = id);

drop policy if exists "profiles_insert" on public.profiles;
create policy "profiles_insert" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles
  for update to authenticated using (auth.uid() = id);

-- Jobs: owners can read/write/delete their own applications.
drop policy if exists "jobs_select" on public.jobs;
create policy "jobs_select" on public.jobs
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "jobs_insert" on public.jobs;
create policy "jobs_insert" on public.jobs
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "jobs_update" on public.jobs;
create policy "jobs_update" on public.jobs
  for update to authenticated using (user_id = auth.uid());

drop policy if exists "jobs_delete" on public.jobs;
create policy "jobs_delete" on public.jobs
  for delete to authenticated using (user_id = auth.uid());

-- ── Auto-create profile on signup ───────────────────────────────────────────
-- Creates a profiles row whenever a new auth user is inserted.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, email, photo_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email,
    new.raw_user_meta_data->>'avatar_url'
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
