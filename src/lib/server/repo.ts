import "server-only";
import fs from "node:fs";
import path from "node:path";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import type { QuestionVariant } from "@/lib/domain/types";
import type { SubmittedAnswer } from "@/lib/domain/grading";
import { supabaseConfig } from "./env";

// ───────────────────────── Record shapes ─────────────────────────

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  mobile: string;
  country: string;
  userType: string; // student / working professional / educator
  field: string; // school, engineering, commerce & accounts, …
  createdAt: string;
}

/** Per-question outcome, stored with the attempt for analytics. */
export interface QuestionOutcome {
  questionId: string;
  topicId: string;
  status: "correct" | "incorrect" | "skipped";
  timeSec: number;
  yourAnswer: string;
  correctAnswer: string;
}

export type TestKind = "full" | "part";

export interface TestAttempt {
  id: string;
  userId: string;
  courseId: string;
  /** "full" = whole-syllabus test; "part" = one-topic test (testIndex = topic index). */
  kind: TestKind;
  testIndex: number; // 0-based
  title: string;
  trial: boolean; // free-trial (shortened) paper
  startedAt: number; // epoch ms
  deadline: number; // epoch ms (server-authoritative)
  durationSec: number;
  variants: QuestionVariant[]; // server-only — contains answer keys
  status: "in_progress" | "submitted";
  submittedAt?: number;
  answers?: Record<string, SubmittedAnswer>;
  outcomes?: QuestionOutcome[];
  correct?: number;
  attempted?: number;
  total: number;
  timeTakenSec?: number;
}

export type Plan = "full" | "part_pass" | "part_topic" | "bundle";

export interface Purchase {
  userId: string;
  courseId: string;
  plan: Plan;
  topicId: string; // only for part_topic; "" otherwise
  amountInr: number;
  reference: string;
  createdAt: string;
}

export interface Repo {
  saveProfile(p: UserProfile): Promise<void>;
  getProfile(id: string): Promise<UserProfile | null>;

  createAttempt(a: TestAttempt): Promise<void>;
  getAttempt(id: string): Promise<TestAttempt | null>;
  updateAttempt(a: TestAttempt): Promise<void>;
  listAttempts(userId: string, courseId?: string): Promise<TestAttempt[]>;
  /** Submitted non-trial attempts of one test across ALL users (for percentile). */
  peerScores(courseId: string, kind: TestKind, testIndex: number): Promise<{ userId: string; correct: number }[]>;

  /** Everything a user has bought for a course. */
  listUserPurchases(userId: string, courseId: string): Promise<Purchase[]>;
  /** Admin console: everything, newest first. */
  listProfiles(): Promise<UserProfile[]>;
  listAllAttempts(): Promise<Omit<TestAttempt, "variants" | "answers" | "outcomes">[]>;
  listPurchases(): Promise<Purchase[]>;
  addPurchase(p: Purchase): Promise<void>;
}

// ───────────────────────── Local JSON implementation ─────────────────────────

interface LocalData {
  profiles: Record<string, UserProfile>;
  attempts: Record<string, TestAttempt>;
  purchases: Purchase[];
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "adhyan.json");

const g = globalThis as unknown as { __adhyanLocal?: LocalData };

function load(): LocalData {
  if (g.__adhyanLocal) return g.__adhyanLocal;
  let data: LocalData = { profiles: {}, attempts: {}, purchases: [] };
  try {
    data = { ...data, ...JSON.parse(fs.readFileSync(DATA_FILE, "utf8")) };
  } catch {
    // first run — start empty
  }
  g.__adhyanLocal = data;
  return data;
}

function persist() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(load()));
}

const localRepo: Repo = {
  async saveProfile(p) {
    load().profiles[p.id] = p;
    persist();
  },
  async getProfile(id) {
    return load().profiles[id] ?? null;
  },
  async createAttempt(a) {
    load().attempts[a.id] = a;
    persist();
  },
  async getAttempt(id) {
    const a = load().attempts[id];
    return a ? { ...a, kind: a.kind ?? "full" } : null;
  },
  async updateAttempt(a) {
    load().attempts[a.id] = a;
    persist();
  },
  async listAttempts(userId, courseId) {
    return Object.values(load().attempts)
      .filter((a) => a.userId === userId && (!courseId || a.courseId === courseId))
      .map((a) => ({ ...a, kind: a.kind ?? "full" }))
      .sort((x, y) => x.startedAt - y.startedAt);
  },
  async peerScores(courseId, kind, testIndex) {
    return Object.values(load().attempts)
      .filter(
        (a) =>
          a.courseId === courseId &&
          (a.kind ?? "full") === kind &&
          a.testIndex === testIndex &&
          !a.trial &&
          a.status === "submitted",
      )
      .map((a) => ({ userId: a.userId, correct: a.correct ?? 0 }));
  },
  async listUserPurchases(userId, courseId) {
    return load()
      .purchases.filter((p) => p.userId === userId && p.courseId === courseId)
      .map((p) => ({ ...p, plan: p.plan ?? "full", topicId: p.topicId ?? "" }));
  },
  async addPurchase(p) {
    load().purchases.push(p);
    persist();
  },
  async listProfiles() {
    return Object.values(load().profiles).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async listAllAttempts() {
    return Object.values(load().attempts)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .map(({ variants: _v, answers: _a, outcomes: _o, ...rest }) => rest)
      .sort((a, b) => b.startedAt - a.startedAt);
  },
  async listPurchases() {
    return [...load().purchases]
      .map((p) => ({ ...p, plan: p.plan ?? "full", topicId: p.topicId ?? "" }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
};

// ───────────────────────── Supabase implementation ─────────────────────────
// All calls use the SERVICE ROLE from trusted server code: attempts contain
// answer keys, so these tables have RLS on with no client policies at all.

let service: SupabaseClient | null = null;
function sb(): SupabaseClient {
  const cfg = supabaseConfig()!;
  service ??= createSupabaseClient(cfg.url, cfg.service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return service;
}

type AttemptRow = {
  id: string;
  user_id: string;
  course_id: string;
  kind: TestKind | null;
  test_index: number;
  title: string;
  trial: boolean;
  started_at: string;
  deadline: string;
  duration_sec: number;
  variants: QuestionVariant[];
  status: TestAttempt["status"];
  submitted_at: string | null;
  answers: Record<string, SubmittedAnswer> | null;
  outcomes: QuestionOutcome[] | null;
  correct: number | null;
  attempted: number | null;
  total: number;
  time_taken_sec: number | null;
};

const toRow = (a: TestAttempt): AttemptRow => ({
  id: a.id,
  user_id: a.userId,
  course_id: a.courseId,
  kind: a.kind,
  test_index: a.testIndex,
  title: a.title,
  trial: a.trial,
  started_at: new Date(a.startedAt).toISOString(),
  deadline: new Date(a.deadline).toISOString(),
  duration_sec: a.durationSec,
  variants: a.variants,
  status: a.status,
  submitted_at: a.submittedAt ? new Date(a.submittedAt).toISOString() : null,
  answers: a.answers ?? null,
  outcomes: a.outcomes ?? null,
  correct: a.correct ?? null,
  attempted: a.attempted ?? null,
  total: a.total,
  time_taken_sec: a.timeTakenSec ?? null,
});

const fromRow = (r: AttemptRow): TestAttempt => ({
  id: r.id,
  userId: r.user_id,
  courseId: r.course_id,
  kind: r.kind ?? "full",
  testIndex: r.test_index,
  title: r.title,
  trial: r.trial,
  startedAt: Date.parse(r.started_at),
  deadline: Date.parse(r.deadline),
  durationSec: r.duration_sec,
  variants: r.variants,
  status: r.status,
  submittedAt: r.submitted_at ? Date.parse(r.submitted_at) : undefined,
  answers: r.answers ?? undefined,
  outcomes: r.outcomes ?? undefined,
  correct: r.correct ?? undefined,
  attempted: r.attempted ?? undefined,
  total: r.total,
  timeTakenSec: r.time_taken_sec ?? undefined,
});

type PurchaseRow = {
  user_id: string;
  course_id: string;
  plan: Plan | null;
  topic_id: string | null;
  amount_inr: number;
  reference: string;
  created_at: string;
};

const fromPurchaseRow = (r: PurchaseRow): Purchase => ({
  userId: r.user_id,
  courseId: r.course_id,
  plan: r.plan ?? "full",
  topicId: r.topic_id ?? "",
  amountInr: r.amount_inr,
  reference: r.reference,
  createdAt: r.created_at,
});

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(`Supabase: ${res.error.message}`);
  return res.data;
}

const supabaseRepo: Repo = {
  async saveProfile(p) {
    check(
      await sb().from("profiles").upsert({
        id: p.id,
        email: p.email,
        full_name: p.fullName,
        mobile: p.mobile,
        country: p.country,
        user_type: p.userType,
        field: p.field,
      }),
    );
  },
  async getProfile(id) {
    const r = check(await sb().from("profiles").select("*").eq("id", id).maybeSingle());
    if (!r) return null;
    return {
      id: r.id,
      email: r.email ?? "",
      fullName: r.full_name ?? "",
      mobile: r.mobile ?? "",
      country: r.country ?? "",
      userType: r.user_type ?? "",
      field: r.field ?? "",
      createdAt: r.created_at,
    };
  },
  async createAttempt(a) {
    check(await sb().from("test_attempts").insert(toRow(a)));
  },
  async getAttempt(id) {
    const r = check(await sb().from("test_attempts").select("*").eq("id", id).maybeSingle());
    return r ? fromRow(r as AttemptRow) : null;
  },
  async updateAttempt(a) {
    check(await sb().from("test_attempts").update(toRow(a)).eq("id", a.id));
  },
  async listAttempts(userId, courseId) {
    let q = sb().from("test_attempts").select("*").eq("user_id", userId);
    if (courseId) q = q.eq("course_id", courseId);
    const rows = check(await q.order("started_at", { ascending: true }));
    return (rows as AttemptRow[]).map(fromRow);
  },
  async peerScores(courseId, kind, testIndex) {
    const rows = check(
      await sb()
        .from("test_attempts")
        .select("user_id, correct")
        .eq("course_id", courseId)
        .eq("kind", kind)
        .eq("test_index", testIndex)
        .eq("trial", false)
        .eq("status", "submitted"),
    );
    return (rows as { user_id: string; correct: number | null }[]).map((r) => ({
      userId: r.user_id,
      correct: r.correct ?? 0,
    }));
  },
  async listUserPurchases(userId, courseId) {
    const rows = check(
      await sb().from("course_purchases").select("*").eq("user_id", userId).eq("course_id", courseId),
    );
    return (rows as PurchaseRow[]).map(fromPurchaseRow);
  },
  async addPurchase(p) {
    check(
      await sb().from("course_purchases").upsert({
        user_id: p.userId,
        course_id: p.courseId,
        plan: p.plan,
        topic_id: p.topicId,
        amount_inr: p.amountInr,
        reference: p.reference,
      }),
    );
  },
  async listProfiles() {
    const rows = check(await sb().from("profiles").select("*").order("created_at", { ascending: false }));
    return (rows as Record<string, string>[]).map((r) => ({
      id: r.id,
      email: r.email ?? "",
      fullName: r.full_name ?? "",
      mobile: r.mobile ?? "",
      country: r.country ?? "",
      userType: r.user_type ?? "",
      field: r.field ?? "",
      createdAt: r.created_at,
    }));
  },
  async listAllAttempts() {
    const rows = check(
      await sb()
        .from("test_attempts")
        .select("id,user_id,course_id,kind,test_index,title,trial,started_at,deadline,duration_sec,status,submitted_at,correct,attempted,total,time_taken_sec")
        .order("started_at", { ascending: false }),
    );
    return (rows as AttemptRow[]).map((r) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { variants: _v, answers: _a, outcomes: _o, ...rest } = fromRow({ ...r, variants: [], answers: null, outcomes: null });
      return rest;
    });
  },
  async listPurchases() {
    const rows = check(await sb().from("course_purchases").select("*").order("created_at", { ascending: false }));
    return (rows as PurchaseRow[]).map(fromPurchaseRow);
  },
};

export function repo(): Repo {
  return supabaseConfig() ? supabaseRepo : localRepo;
}
