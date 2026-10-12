-- Adhyan — accounts, course purchases and test attempts (tests mode).
-- Self-contained: safe to run on a fresh project or after 0001/0002.
-- Run in Supabase → SQL Editor.

-- ───────────────────────────── Profiles ─────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists mobile text;
alter table public.profiles add column if not exists country text;
alter table public.profiles add column if not exists user_type text;
alter table public.profiles add column if not exists field text;

alter table public.profiles enable row level security;
drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own" on public.profiles
  for select using (auth.uid() = id);
drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update using (auth.uid() = id);

-- ───────────────────────────── Purchases ─────────────────────────────
-- One row per (user, course): unlocks all tests of that course.
create table if not exists public.course_purchases (
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id text not null,
  amount_inr integer not null,
  reference text not null,          -- payment id (simulated: SIM-…, later Razorpay)
  created_at timestamptz not null default now(),
  primary key (user_id, course_id)
);
alter table public.course_purchases enable row level security;
drop policy if exists "purchases: read own" on public.course_purchases;
create policy "purchases: read own" on public.course_purchases
  for select using (auth.uid() = user_id);
-- No insert/update policy: purchases are written only by the server (service role).

-- ───────────────────────────── Test attempts ─────────────────────────────
-- `variants` holds per-student questions WITH answer keys, so this table has
-- RLS enabled and NO client policies — only the server (service role) reads it.
create table if not exists public.test_attempts (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id text not null,
  test_index integer not null,
  title text not null,
  trial boolean not null default false,
  started_at timestamptz not null,
  deadline timestamptz not null,
  duration_sec integer not null,
  variants jsonb not null,
  status text not null check (status in ('in_progress', 'submitted')),
  submitted_at timestamptz,
  answers jsonb,
  outcomes jsonb,
  correct integer,
  attempted integer,
  total integer not null,
  time_taken_sec integer
);
create index if not exists test_attempts_user_idx on public.test_attempts (user_id, course_id);
create index if not exists test_attempts_peer_idx
  on public.test_attempts (course_id, test_index) where status = 'submitted' and not trial;
alter table public.test_attempts enable row level security;
