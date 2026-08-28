"use client";

import { useActionState, useRef } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle, CheckCircle2, FileText, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  clearUploadedAction,
  uploadQuestionsDocx,
  type UploadState,
} from "@/app/actions";

const initial: UploadState = { ok: false, message: "" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
      {pending ? "Reading document…" : "Upload .docx"}
    </Button>
  );
}

export function QuestionUpload({ uploadedCount }: { uploadedCount: number }) {
  const [state, formAction] = useActionState(uploadQuestionsDocx, initial);
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-extrabold">Upload a question bank</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a Word <span className="font-bold">.docx</span> file. Questions are automatically
          split into tests of 100, each with a 2-hour timer.
        </p>

        <form action={formAction} className="mt-4 flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            name="file"
            accept=".docx"
            required
            className="block max-w-xs text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:font-bold file:text-primary-foreground hover:file:opacity-90"
          />
          <SubmitButton />
        </form>

        {/* Result feedback */}
        {state.message && (
          <div
            className={`mt-4 flex items-start gap-2 rounded-lg p-3 text-sm ${
              state.ok
                ? "bg-success-soft text-success"
                : "bg-danger/10 text-danger"
            }`}
          >
            {state.ok ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <div>
              <p className="font-bold">{state.message}</p>
              {state.ok && (
                <p className="text-muted-foreground">
                  {state.totalQuestions} questions in the bank · {state.totalTests} test
                  {state.totalTests === 1 ? "" : "s"} ready.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Parse warnings (questions that were skipped) */}
        {state.warnings && state.warnings.length > 0 && (
          <details className="mt-3 rounded-lg border border-accent/30 bg-accent/5 p-3 text-sm">
            <summary className="cursor-pointer font-bold text-accent">
              {state.warnings.length} question{state.warnings.length === 1 ? "" : "s"} skipped — click to review
            </summary>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
              {state.warnings.slice(0, 25).map((w, i) => (
                <li key={i}>{w}</li>
              ))}
              {state.warnings.length > 25 && <li>…and {state.warnings.length - 25} more.</li>}
            </ul>
          </details>
        )}

        {/* Expected format hint */}
        <div className="mt-4 rounded-lg bg-surface-muted p-3 text-xs text-muted-foreground">
          <p className="font-bold text-foreground">Expected format in the Word file:</p>
          <pre className="mt-1 whitespace-pre-wrap font-mono leading-relaxed">{`1. What is 2 + 2?
A) 3
B) 4
C) 5
D) 6
Answer: B`}</pre>
          <p className="mt-1">
            Tip: you can also mark the correct option with a <span className="font-bold">*</span> at
            its end instead of an &quot;Answer:&quot; line.
          </p>
        </div>

        {/* Bank management */}
        {uploadedCount > 0 && (
          <form action={clearUploadedAction} className="mt-4 border-t pt-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                <span className="font-bold text-foreground">{uploadedCount}</span> questions
                currently in the bank.
              </p>
              <Button type="submit" variant="ghost" size="sm" className="text-danger">
                <Trash2 className="h-4 w-4" /> Clear all
              </Button>
            </div>
          </form>
        )}
      </div>
    </Card>
  );
}
