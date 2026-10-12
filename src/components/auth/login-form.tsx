"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CircleAlert, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loginAction, type FormState } from "@/app/account-actions";
import { Field, inputClass } from "./fields";

export function LoginForm({ next, notice }: { next: string; notice?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(loginAction, {});

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={next} />
      {notice && !state.error && (
        <p className="rounded-lg border border-success/30 bg-success-soft px-3.5 py-3 text-sm text-success">
          {notice}
        </p>
      )}
      {state.error && (
        <p className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-3 text-sm text-danger">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {state.error}
        </p>
      )}
      <Field label="Email address" htmlFor="email">
        <input id="email" name="email" type="email" autoComplete="email" required
          defaultValue={state.values?.email} placeholder="you@example.com" className={inputClass} />
      </Field>
      <Field label="Password" htmlFor="password">
        <input id="password" name="password" type="password" autoComplete="current-password" required
          className={inputClass} />
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</> : "Log in"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        New to Adhyan?{" "}
        <Link href={`/register?next=${encodeURIComponent(next)}`} className="font-medium text-primary hover:underline">
          Create a free account
        </Link>
      </p>
    </form>
  );
}
