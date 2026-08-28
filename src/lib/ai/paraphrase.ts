import "server-only";
import type { AuthoredQuestion } from "@/lib/domain/types";

/**
 * AI surface variation for THEORY questions (OpenAI).
 *
 * Boundary rule (PROJECT_PLAN.md §4.3): the AI may only reword the prompt and
 * suggest distractors. It must NEVER compute or decide a correct answer — that
 * stays with the deterministic engine / authored key. Output here is intended
 * to be reviewed/approved by a teacher before publish.
 *
 * Generation runs at publish time and results are cached; we never call the API
 * on a quiz load. If no API key is configured this is a safe no-op.
 */
export interface ParaphraseResult {
  prompt: string;
  distractors: string[];
}

export async function paraphraseQuestion(
  q: AuthoredQuestion,
): Promise<ParaphraseResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !q.aiParaphrase) return null;

  const body = {
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You reword quiz questions while preserving their exact meaning and the correct answer. " +
          "You NEVER change which answer is correct and you NEVER state the answer. " +
          "Return strict JSON: {\"prompt\": string, \"distractors\": string[]}.",
      },
      {
        role: "user",
        content: `Reword this question and suggest 3 plausible but incorrect distractors.\nQuestion: ${q.prompt}`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
  };

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const content = json.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content) as ParaphraseResult;
    return {
      prompt: parsed.prompt ?? q.prompt,
      distractors: Array.isArray(parsed.distractors) ? parsed.distractors.slice(0, 3) : [],
    };
  } catch {
    // Network/parse failure — fall back to the authored question untouched.
    return null;
  }
}
