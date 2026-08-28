-- Adhyan — initial schema
-- Mirrors src/lib/domain/types.ts. The critical anti-theft decision is the
-- split between `questions` (public-safe) and `question_secrets` (answer keys,
-- service-role only). See PROJECT_PLAN.md §3.

-- ───────────────────────────── Extensions ─────────────────────────────
create extension if not exists "pgcrypto";

-- ───────────────────────────── Enums ──────────────────────────────────
create type user_role as enum ('student', 'teacher', 'admin');
create type question_type as enum ('single', 'multiple', 'integer', 'fill_blank', 'true_false');
create type level_status as enum ('locked', 'unlocked', 'in_progress', 'passed');
create type enrollment_status as enum ('trialing', 'active', 'past_due', 'paused', 'cancelled');

-- ───────────────────────────── Profiles ───────────────────────────────
-- 1:1 with auth.users (Supabase Auth).
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role user_role not null default 'student',
  full_name text,
  created_at timestamptz not null default now()
);

-- ───────────────────────────── Courses ────────────────────────────────
create table courses (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references profiles (id),
  title text not null,
  description text not null default '',
  subject text not null default '',
  price_per_month integer not null default 0,   -- INR
  trial_days integer not null default 7,
  razorpay_plan_id text,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table topics (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses (id) on delete cascade,
  idx integer not null,                          -- order within course
  title text not null,
  unlock_level_idx integer not null default 0,   -- m: pass this level to unlock next topic
  unique (course_id, idx)
);

create table levels (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references topics (id) on delete cascade,
  idx integer not null,                          -- order within topic
  title text not null,
  pass_threshold integer not null default 70,    -- y%
  min_questions integer not null default 4,
  time_limit_sec integer not null default 180,
  unique (topic_id, idx)
);

-- Public-safe question data. NO answer key here.
create table questions (
  id uuid primary key default gen_random_uuid(),
  level_id uuid not null references levels (id) on delete cascade,
  prompt text not null,                           -- supports {var} placeholders
  base_type question_type not null,
  difficulty smallint not null default 1,
  variables jsonb,                                -- [{name,min,max,step}]
  allowed_transforms question_type[] not null default '{}',
  ai_paraphrase boolean not null default false,
  explanation text,
  created_at timestamptz not null default now()
);

-- SECRET answer material. Service-role only — never exposed via the anon key.
create table question_secrets (
  question_id uuid primary key references questions (id) on delete cascade,
  options jsonb,            -- [{id,text,correct}]
  answer_value text,        -- canonical value for integer/fill
  answer_formula text       -- deterministic formula (evaluated server-side, never by AI)
);

-- ─────────────────────────── Enrollments ──────────────────────────────
create table enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles (id) on delete cascade,
  course_id uuid not null references courses (id) on delete cascade,
  status enrollment_status not null default 'trialing',
  razorpay_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  unique (student_id, course_id)
);

-- ──────────────────────────── Attempts ────────────────────────────────
create table attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles (id) on delete cascade,
  level_id uuid not null references levels (id) on delete cascade,
  started_at timestamptz not null default now(),
  deadline timestamptz not null,                 -- server-authoritative timer
  submitted_at timestamptz,
  score_percent integer,
  passed boolean
);

create table answer_records (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references attempts (id) on delete cascade,
  question_id uuid not null references questions (id),
  seed bigint not null,                           -- which variant the student saw
  correct boolean not null,
  time_spent_sec integer not null default 0
);

-- ──────────────────────────── Progress ────────────────────────────────
create table progress (
  student_id uuid not null references profiles (id) on delete cascade,
  level_id uuid not null references levels (id) on delete cascade,
  status level_status not null default 'locked',
  best_correct integer not null default 0,
  attempted integer not null default 0,
  percent integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (student_id, level_id)
);

-- ────────────────────────── Gamification ──────────────────────────────
create table gamification (
  student_id uuid primary key references profiles (id) on delete cascade,
  xp integer not null default 0,
  streak_days integer not null default 0,
  last_active date,
  badges text[] not null default '{}'
);

create table xp_history (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles (id) on delete cascade,
  day date not null,
  xp integer not null default 0,
  correct integer not null default 0,
  unique (student_id, day)
);

-- ─────────────────────────────── Indexes ──────────────────────────────
create index on topics (course_id);
create index on levels (topic_id);
create index on questions (level_id);
create index on enrollments (student_id);
create index on attempts (student_id, level_id);
create index on answer_records (attempt_id);
