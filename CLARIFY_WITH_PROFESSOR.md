# Items to Clarify with Professor — Adhyan

**Purpose:** These are decisions we've made using sensible **defaults** so development can move forward. None are locked permanently — review each with the professor and tell me what to change. Companion to `PROJECT_PLAN.md`.

**How to use:** For each item, the **Default** is what we're building now. Tick ✅ to confirm, or write the desired change in the **Professor's decision** column.

---

## A. Progression & Assessment Rules

| # | Question | Our default (currently building) | Why | Professor's decision |
|---|---|---|---|---|
| A1 | **Level pass threshold (y%)** — what % of a level must be correct to advance? | Teacher sets per level; suggested **70%** | Teacher controls difficulty | |
| A2 | **Min questions per level** before pass can trigger | Teacher sets; suggested **min 5** | Stops passing on one lucky answer | |
| A3 | **Topic unlock level (m)** — which level in a topic unlocks the next topic? | Teacher sets per topic | Flexible per subject | |
| A4 | **Retry policy** on a failed level | **Unlimited retries + short cooldown** | Motivating, not punishing | |
| A5 | **Scoring basis** | **Best attempt per question** | Rewards practice | |
| A6 | **Sequential vs skip-ahead** | **Sequential**, optional challenge test to skip | Matches pacing + IP model | |
| A7 | **Quiz time limit** per level | Teacher sets per level | Subject-dependent | |
| A8 | **What happens at timeout** | Auto-submit answered questions | Standard exam behavior | |

---

## B. Question Transformation (the IP / variant engine)

| # | Question | Our default | Why | Professor's decision |
|---|---|---|---|---|
| B1 | **How much variation is acceptable** academically? (Is it OK that students see different-but-equivalent questions?) | Yes — equivalent difficulty enforced | Core anti-theft feature | |
| B2 | **AI rewording of theory questions** — must a teacher approve each AI variant before publish? | **Teacher approval required** (or auto-approve under a confidence threshold) | Protects correctness/quality | |
| B3 | **AI must never compute answers** — confirm acceptable | AI = wording + distractors only; math answers are computed deterministically | Prevents wrong answer keys | |
| B4 | **Parameterized math templates** — will professors author questions with variables + a formula? (slightly more effort) | Yes, supported for quantitative topics | Enables near-infinite variants | |
| B5 | **Sending question content to OpenAI API** — acceptable for IP? (API doesn't train on data by default) | Acceptable; documented in ToS | Needed for AI variation | |

---

## C. Payments & Pricing

| # | Question | Our default | Why | Professor's decision |
|---|---|---|---|---|
| C1 | **Billing model** | **Per-course subscription** (recurring) | Per your instruction | |
| C2 | **Billing interval** | **Monthly**; semester/annual later | Most flexible for students | |
| C3 | **Free trial** | **7-day trial** per course | Boosts conversion | |
| C4 | **Free preview content** | First topic (or first level) free | Lets students sample | |
| C5 | **Price per course** | Set by teacher/admin | Business decision | |
| C6 | **Student discounts / coupons / referrals** | Supported, off by default | Growth levers | |
| C7 | **What happens when subscription lapses** | Content re-locks; progress retained | Fair + recoverable | |
| C8 | **Refund policy** | TBD — needs a stated policy | Legal/clarity | |

---

## D. Roles, Content & Ownership

| # | Question | Our default | Why | Professor's decision |
|---|---|---|---|---|
| D1 | **Who can create courses** — any teacher, or admin-approved? | Admin-approved teachers | Quality control | |
| D2 | **Multiple teachers per course / co-authoring** | Single owner for v1 | Simplicity | |
| D3 | **Who owns the question IP** legally | Define in ToS (platform vs teacher) | Important for IP claims | |
| D4 | **Content moderation/review** before a course goes live | Admin review before publish | Quality + IP | |

---

## E. Anti-Theft Scope

| # | Question | Our default | Why | Professor's decision |
|---|---|---|---|---|
| E1 | **Acceptable level of restriction** (disable copy/right-click, watermarks, flag tab-switching) | All enabled on quiz screens | Deters theft | |
| E2 | **Watermarking student ID on questions** — acceptable? | Yes, low-visibility | Traces leaks | |
| E3 | **Action on detected scraping/cheating** | Flag + throttle; manual review | Avoid false bans | |

---

## F. Platform & Logistics

| # | Question | Our default | Why | Professor's decision |
|---|---|---|---|---|
| F1 | **Primary device** — mobile-first or desktop? | Mobile-first PWA | College students | |
| F2 | **Languages** | English v1; multi-language later | Reach | |
| F3 | **Proctoring** for ranked quizzes (camera/lockdown)? | Not in v1 | Heavy; revisit | |
| F4 | **Data/privacy compliance** (student data) | Follow Indian data norms; minimal data | Legal | |
| F5 | **Branding / app name** ("Adhyan" placeholder) | Placeholder | Confirm | |

---

## Quick Summary — the 3 most recent defaults applied

1. **Retry policy:** unlimited retries + short cooldown, best-attempt scoring.
2. **Billing interval:** monthly per course (semester/annual reserved for later).
3. **Free trial:** 7-day trial per course, plus free first-topic preview.

> Bring this file to the professor meeting. Anything they change, tell me and I'll update both this file and `PROJECT_PLAN.md`.
