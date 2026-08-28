# Adhyan — Adaptive Quizzing Platform

**Living project plan.** Last updated: 2026-06-02

A web app where teachers publish paid courses of transformable, IP-protected questions, and college students progress through topics and levels via timed, gamified quizzes.

---

## 1. Product Summary

- **Two roles:** Teacher (authors courses) and Student (learns).
- **Content hierarchy:** Course → Topics → Levels → Questions.
- **Progression:** Clear *y%* of a level → unlock next level. Reach level *m* in a topic → unlock next topic.
- **Question transformation:** One authored question becomes many per-student variants so no two students see identical questions.
- **Pillars:** anti-theft (IP), timed quizzes, paid access, progress dashboard, motivating game-like UX.
- **Audience:** college students (mobile-first, low-data friendly, India-first payments).

---

## 2. Official Technology Stack

| Layer | Choice | Role |
|---|---|---|
| App framework | **Next.js (App Router)** on **Vercel** | UI + server-side logic (API routes / Server Actions) |
| UI kit | **shadcn/ui + Tailwind CSS** | Polished, game-like, customizable components |
| **Backend + Data + Auth** | **Supabase** | Postgres, Auth, Storage, Row Level Security, Realtime |
| Payments | **Razorpay** (India/UPI) — **per-course subscriptions** | Recurring course access |
| AI transformation | **OpenAI API** | Paraphrasing, theory-question rewording, distractor generation |
| Charts/animation | Recharts + Framer Motion | Progress visuals, micro-celebrations |
| Email/notifications | Supabase + Resend (or similar) | Streak nudges, receipts |

**Why Supabase:** one vendor for Postgres + Auth + Storage + RLS + Realtime. RLS acts as a database-level backstop that directly supports our anti-theft goal, while sensitive logic stays in server code.

**What we deliberately do NOT do:** no client-direct database access for questions, grading, or progression. Those always go through server code using the Supabase **service role**, so the answer key never reaches the browser.

---

## 3. Architecture & Data-Flow (RLS vs. Server-Side)

Two access paths into Supabase:

1. **Client → Supabase (anon key + RLS):** safe reads scoped to the logged-in user.
2. **Server (Next.js) → Supabase (service role):** anything touching answer keys or progression rules.

### Operation routing table

| Operation | Path | Why |
|---|---|---|
| Read my profile / enrollments | **Client + RLS** | User-owned, no secrets |
| Browse course catalog (titles, prices) | **Client + RLS** | Public marketing data |
| Read my progress / streak / XP | **Client + RLS** | User-owned, fast |
| Live leaderboard | **Client + Realtime + RLS** | Public, real-time |
| **Fetch a quiz question** | **Server (service role)** | Strip answer key; serve one variant at a time |
| **Submit an answer / grade it** | **Server (service role)** | Answer key stays server-side |
| **Recompute level/topic unlocks** | **Server (service role), in a transaction** | Rules must be tamper-proof |
| **Generate question variants** | **Server (service role)** | Transformation logic is IP |
| Start/track timed quiz | **Server (authoritative clock)** | Browser clock can't be trusted |
| Confirm payment & grant access | **Server webhook (service role)** | Never trust client redirect |
| Teacher authoring/edit | **Server, role-checked** | Only the owning teacher writes |

### RLS policy intent (high level)

- Students can **read only their own** enrollment, attempt, answer, and progress rows.
- Students can read **published** course/topic/level metadata **only for courses they're enrolled in** (plus free-preview content).
- The `questions` table's **answer columns are never selectable by the client role** — only the service role reads them. (Split sensitive columns into a separate `question_secrets` table that the anon role has zero access to.)
- Teachers can write only to courses they own.

---

## 4. The Four Hard Problems

### 4.1 Anti-Theft of Questions (IP protection)

Layered defense — slow, traceable, low-value-to-steal:

- **Server-side grading.** Answers live in `question_secrets` (service-role only). Client submits; server decides correct/incorrect.
- **Drip-feed.** API returns one question (or a tiny batch) per request, bound to the active attempt. No "download all questions" endpoint exists.
- **Per-student variants.** Transformation makes each student's quiz different, so a leaked screenshot rarely matches anyone else.
- **Forensic watermarking.** Question images/text carry a low-visibility watermark encoding `studentId + timestamp` hash → trace leaks to a person.
- **Behavioral guards.** Detect scraping speed, tab-switching, dev-tools open during timed quizzes; throttle/flag.
- **Deterrents.** Disable copy/right-click/text-selection on quiz screens; render math/diagrams as server-generated images.
- **Legal.** ToS licenses questions (not ownership); watermarks make it enforceable.

> Reality check: this is risk *reduction*, not prevention. Top three priorities: **server-side grading + per-student variants + watermarking**.

### 4.2 Progression Logic (Levels & Topics)

State machine per (student, topic, level). Rules stored as **data** so teachers tune them without code changes.

**Level-up:**
```
IF (best-attempt correct in level / total questions attempted) >= level.pass_threshold (y%)
AND attempted >= level.min_questions
THEN unlock level n+1
```

**Topic-up:**
```
IF student passed Level >= m in current topic
THEN unlock next topic in order
```

**Recommended defaults (teacher can override):**
- Unlimited **retries with a short cooldown** (motivating, not punishing).
- Score = **best attempt per question** (rewards practice).
- **Sequential** progression, with an optional "challenge test" to skip ahead.
- `min_questions` guards against passing on a single lucky answer.

**Implementation:** recompute status **server-side in a transaction** after each submission; emit an "unlock" event the UI celebrates (confetti, badge).

### 4.3 Question Transformation Engine — FULL (v1)

One authored question → many fair per-student variants. Built fully from v1, covering **both** quantitative and theory subjects.

- **(A) Parameterized templates** *(quantitative):* teacher writes variables + constraints + answer formula (e.g., distance = `v*t`); engine randomizes per student. The **answer is computed by a deterministic safe expression evaluator — NEVER by the AI.** Distractors built by rules (off-by-one, `v+t`, etc.), optionally enriched by AI.
- **(B) Format transformation** *(all subjects):* single-choice → numeric input / fill-in-the-blank / multiple-correct / true-false. Requires storing the **canonical answer as a value**, not "Option B."
- **(C) AI surface variation** *(theory subjects, uses OpenAI):* paraphrase wording, swap neutral entities (names/cities), generate plausible distractors. Output is **always teacher-approved before publish** (or auto-approved within a confidence threshold) so quality and correctness stay controlled.

#### Critical correctness rule (the AI boundary)

> **The AI never decides or computes a correct answer.** For quantitative questions the deterministic evaluator owns the answer key. AI is used only for *language* (paraphrasing, rewording) and *distractor suggestions* — both of which a human/engine validates. This prevents shipping wrong answer keys from model hallucination.

#### OpenAI usage notes

- **IP safety:** OpenAI **API** (not the consumer product) does not train on submitted data by default — acceptable for our question IP, but document it in the ToS/privacy policy.
- **Cost control:** variants are **generated once and cached** in `question_variant`. We do not call the API on every quiz load. Pre-generate a pool of variants per question at publish time; assign from the pool per student.
- **Determinism for grading:** the *stored* variant carries its own resolved answer reference, so grading never re-calls the model.

Data principle: each question stores its **canonical answer value** + a list of **allowed transform types** so the engine knows what's safe to generate.

### 4.4 Timed Quizzes

- **Server-authoritative timer:** server stores `started_at` + `duration`; deadline computed server-side; **late submissions rejected**.
- Client countdown is display-only.
- **Auto-submit** answered questions at expiry.
- **Refresh-safe:** server returns *remaining* time so the clock can't be reset.
- Per-question timing feeds analytics (which questions are too slow/hard).

---

## 5. Payments

- **Model: per-course subscription.** Each course has its own recurring fee (e.g., monthly). Access stays active while the subscription is active; lapses when it ends.
- **Gate at course level.** Active subscription → unlock content. **Free preview** = first topic/level (drives conversion).
- **Razorpay Subscriptions:** create a Razorpay **Plan** per course; subscribe the student to it. Use **Razorpay webhooks** as the source of truth for subscription state (`charged`, `halted`, `cancelled`, `completed`) → update enrollment status server-side. Never unlock on client redirect alone.
- **Enrollment lifecycle:** `active` → `past_due` (failed renewal, grace period) → `paused`/`cancelled` (content re-locks). A scheduled job reconciles status daily as a backstop to webhooks.
- **Extras:** student discounts, coupons, referral credits, free-trial period, college bulk licenses.
- **Compliance:** store only Razorpay subscription/customer IDs; gateway handles card/UPI mandate data (PCI).

---

## 6. Progress Page (Student Dashboard)

- **Skill-tree course map** — topics as a path, levels as nodes (locked / unlocked / in-progress / passed).
- Per-topic **mastery %** + overall completion ring.
- **Streaks**, **XP/points**, **badges**.
- Accuracy & speed **trends** over time.
- **Weak areas** with one-tap "practice this."
- **Next goal** CTA ("2 more correct to unlock Level 4").

---

## 7. Motivating UX (most important)

**Gamification:** XP, levels, daily streaks (+streak-freeze), answer-combo bonuses, badges, skill-tree progression, friends-only + global leaderboards.

**Feedback & flow:** instant feedback + short explanations, micro-celebrations (confetti/sound on unlock), distraction-free quiz screen, smooth transitions, dark mode.

**Habit formation:** daily goal + reminder notifications, daily challenge, spaced-repetition review of missed questions.

**Reduce anxiety:** "you only need y%" framing, encouraging retry copy, **practice mode** (untimed) vs **ranked mode** (timed).

---

## 8. Data Model (entities)

- **User** — role (teacher/student), profile, auth id (Supabase Auth).
- **Course** — title, description, teacher_id, published, **billing_interval** (e.g., monthly), **price_per_interval**, **razorpay_plan_id**.
- **Enrollment** — student_id, course_id, **razorpay_subscription_id**, status (active / past_due / paused / cancelled), current_period_end.
- **Topic** — course_id, order_index, unlock rule `m`.
- **Level** — topic_id, order_index, `pass_threshold` (y%), `min_questions`, time_limit.
- **Question** — level_id, base_type, allowed_transform_types, parameters/constraints, explanation, media. (Public-safe columns only.)
- **QuestionSecret** — question_id, canonical_answer, distractor_rules. **Service-role only.**
- **QuestionVariant** — generated render (text, options, format, resolved answer ref); cached.
- **Attempt** — student_id, level_id, started_at, deadline, status, score.
- **AnswerRecord** — attempt_id, question/variant ref, given answer, correct?, time_spent.
- **Progress** — student_id, topic_id, level_id, percent_correct, status (derived, stored for speed).
- **Gamification** — student_id, xp, streak, badges.
- **Payment** — gateway ref, amount, status.

---

## 9. Teacher Experience

- Course builder: drag-drop topics/levels; set `y`, `m`, timers via sliders.
- Question authoring with **live variant preview** ("what 3 students might see").
- Bulk import (CSV/Excel).
- Analytics: pass rates per level, hardest questions, drop-off points, time-per-question.

---

## 10. Extra Student-Friendly Ideas (backlog)

1. AI hint button (hints, not answers — protects IP).
2. Spaced repetition before exams.
3. College cohorts / study groups.
4. Offline / low-data mode.
5. Mobile-first **PWA** with push notifications.
6. Shareable completion **certificates** (LinkedIn = free marketing).
7. Full-length **mock exams** mixing all topics.
8. Personalized study plan tied to exam date.
9. Accessibility + multi-language.
10. Referral rewards (viral growth).
11. Teacher live doubt sessions.
12. Adaptive difficulty / bonus rounds.

---

## 11. Phased Roadmap

- **Phase 1 — Foundation:** Supabase project, Auth + roles, schema (course/topic/level/question + secrets split), RLS policies, teacher authoring, student enrollment (free).
- **Phase 2 — Core loop:** timed quiz-taking, server-side grading, progression logic, basic progress page.
- **Phase 3 — IP + transformation:** answer protection hardening, format transformation engine (B+C), watermarking, rate limiting.
- **Phase 4 — Payments:** Razorpay + webhook, paywall, free preview.
- **Phase 5 — Motivation:** gamification, streaks, badges, leaderboards (Realtime), polished UI, notifications.
- **Phase 6 — Advanced:** parameterized templates (A), AI hints, spaced repetition, analytics, PWA.

---

## 12. Locked Decisions

- ✅ **Stack:** Next.js (Vercel) + Supabase + Razorpay + OpenAI API.
- ✅ **Anti-theft core:** server-side grading + per-student variants + watermarking; `question_secrets` table is service-role only.
- ✅ **Auth:** Supabase Auth with role claims.
- ✅ **Transformation:** FULL from v1 (parameterized templates + format transformation + AI surface variation). AI = language/distractors only; **answer keys computed deterministically, never by AI.** Variants pre-generated and cached.
- ✅ **Subjects:** both quantitative and theory.
- ✅ **Payments:** **per-course subscription** via Razorpay Subscriptions; webhooks are source of truth.
- ✅ **Retry policy (default applied):** unlimited retries with a short cooldown + best-attempt-per-question scoring.
- ✅ **Billing interval (default applied):** monthly per course; semester/annual options reserved for later.
- ✅ **Free trial (default applied):** short free trial (7 days) per subscription, in addition to the free first-topic preview.

## 13. Items To Confirm With Professor

These are running on sensible defaults so development can proceed. Full list, rationale, and alternatives are in **`CLARIFY_WITH_PROFESSOR.md`** — confirm or adjust there.
