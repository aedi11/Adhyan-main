"use client";

import { useState, useTransition } from "react";
import { Eye, RefreshCw, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { previewQuestionVariants } from "@/app/actions";
import type { PreviewVariant } from "@/lib/data/store";

export function VariantPreview({
  questionId,
  prompt,
  answer,
  media,
}: {
  questionId: string;
  prompt: string;
  answer?: string;
  media?: string;
}) {
  const [variants, setVariants] = useState<PreviewVariant[] | null>(null);
  const [pending, startTransition] = useTransition();

  const generate = () => {
    startTransition(async () => {
      const result = await previewQuestionVariants(questionId);
      setVariants(result);
    });
  };

  return (
    <div className="rounded-lg border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold text-muted-foreground">Question</p>
          <p className="mt-0.5 font-semibold">{prompt}</p>
          {media && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={media}
              alt="Question figure"
              className="mt-2 w-full max-w-xs rounded-md border bg-white p-1.5"
            />
          )}
          {answer && (
            <p className="mt-2 text-xs">
              <span className="text-muted-foreground">Correct answer: </span>
              <span className="font-bold text-success">{answer}</span>
            </p>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={generate} disabled={pending}>
          {variants ? <RefreshCw className="h-4 w-4" /> : <Wand2 className="h-4 w-4" />}
          {pending ? "Generating…" : variants ? "Regenerate" : "Preview variants"}
        </Button>
      </div>

      {variants && (
        <div className="mt-4 space-y-2">
          <p className="flex items-center gap-1.5 text-xs font-bold text-primary">
            <Eye className="h-3.5 w-3.5" /> What 3 different students would see:
          </p>
          {variants.map((v, i) => (
            <div key={i} className="rounded-md bg-surface-muted p-3">
              <div className="flex items-center gap-2">
                <Badge variant="primary">Student {i + 1}</Badge>
                <Badge variant="muted">{v.renderedType}</Badge>
              </div>
              <p className="mt-2 text-sm font-semibold">{v.prompt}</p>
              {v.options && (
                <ul className="mt-1.5 flex flex-wrap gap-1.5">
                  {v.options.map((o) => (
                    <li
                      key={o.id}
                      className="rounded bg-surface px-2 py-0.5 text-xs text-muted-foreground"
                    >
                      {o.text}
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-xs">
                <span className="text-muted-foreground">Correct answer: </span>
                <span className="font-bold text-success">{v.correctAnswer}</span>
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
