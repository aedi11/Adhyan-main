-- Row Level Security. The Supabase service role (used by our server code)
-- bypasses RLS; these policies constrain the anon/authenticated client keys.
--
-- Design (PROJECT_PLAN.md §3):
--   * Students read only their OWN progress/attempts/enrollments/gamification.
--   * Course/topic/level metadata is readable for PUBLISHED courses.
--   * `questions` and `question_secrets` have NO client read policy — they are
--     served exclusively through server code (service role). This is the core
--     anti-theft guarantee: answer keys can never be queried from the browser.

alter table profiles          enable row level security;
alter table courses           enable row level security;
alter table topics            enable row level security;
alter table levels            enable row level security;
alter table questions         enable row level security;
alter table question_secrets  enable row level security;
alter table enrollments       enable row level security;
alter table attempts          enable row level security;
alter table answer_records    enable row level security;
alter table progress          enable row level security;
alter table gamification      enable row level security;
alter table xp_history        enable row level security;

-- ── Profiles ──
create policy "read own profile" on profiles
  for select using (auth.uid() = id);
create policy "update own profile" on profiles
  for update using (auth.uid() = id);

-- ── Courses (catalog is public when published; teacher manages own) ──
create policy "read published courses" on courses
  for select using (published = true or teacher_id = auth.uid());
create policy "teacher manages own courses" on courses
  for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

-- ── Topics & Levels (readable for published courses) ──
create policy "read topics of published courses" on topics
  for select using (
    exists (select 1 from courses c where c.id = topics.course_id
            and (c.published = true or c.teacher_id = auth.uid()))
  );
create policy "read levels of published courses" on levels
  for select using (
    exists (
      select 1 from topics t join courses c on c.id = t.course_id
      where t.id = levels.topic_id and (c.published = true or c.teacher_id = auth.uid())
    )
  );

-- ── Questions / Secrets ──
-- Intentionally NO select policy for the client. All question serving and
-- grading happens server-side via the service role. (question_secrets never
-- gets any policy at all.)

-- ── Enrollments (student owns their rows) ──
create policy "student reads own enrollments" on enrollments
  for select using (student_id = auth.uid());
create policy "student creates own enrollment" on enrollments
  for insert with check (student_id = auth.uid());

-- ── Attempts & answer records (read own; writes go through service role) ──
create policy "student reads own attempts" on attempts
  for select using (student_id = auth.uid());
create policy "student reads own answers" on answer_records
  for select using (
    exists (select 1 from attempts a where a.id = answer_records.attempt_id
            and a.student_id = auth.uid())
  );

-- ── Progress / Gamification / History (read own) ──
create policy "student reads own progress" on progress
  for select using (student_id = auth.uid());
create policy "student reads own gamification" on gamification
  for select using (student_id = auth.uid());
create policy "student reads own xp history" on xp_history
  for select using (student_id = auth.uid());

-- ── New-user bootstrap: create profile + gamification row on signup ──
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into profiles (id, full_name) values (new.id, new.raw_user_meta_data ->> 'full_name');
  insert into gamification (student_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
