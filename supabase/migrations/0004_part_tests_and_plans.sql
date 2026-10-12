-- Adhyan — Part Test mode + multiple purchase plans.
-- Run in Supabase → SQL Editor after 0003.

-- Test attempts: "full" (whole-syllabus test) or "part" (one-topic test).
alter table public.test_attempts add column if not exists kind text not null default 'full'
  check (kind in ('full', 'part'));
drop index if exists test_attempts_peer_idx;
create index if not exists test_attempts_peer_idx
  on public.test_attempts (course_id, kind, test_index) where status = 'submitted' and not trial;

-- Purchases: one row per plan bought (and per topic for single-topic Part Tests).
alter table public.course_purchases add column if not exists plan text not null default 'full'
  check (plan in ('full', 'part_pass', 'part_topic', 'bundle'));
alter table public.course_purchases add column if not exists topic_id text not null default '';
alter table public.course_purchases drop constraint if exists course_purchases_pkey;
alter table public.course_purchases add primary key (user_id, course_id, plan, topic_id);
