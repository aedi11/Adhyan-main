"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CircleAlert, Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { registerAction, type FormState } from "@/app/account-actions";
import { COUNTRIES, FIELDS, USER_TYPES } from "@/lib/profile-options";
import { Field, inputClass } from "./fields";
import { cn } from "@/lib/utils";

export function RegisterForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(registerAction, {});
  const v = state.values ?? {};
  const e = state.fieldErrors ?? {};
  const invalid = (k: string) => (e[k] ? { "aria-invalid": true, "aria-describedby": `${k}-error` } : {});

  if (state.notice) {
    return (
      <div className="rounded-xl border bg-surface p-6 text-center">
        <MailCheck className="mx-auto h-10 w-10 text-success" />
        <h2 className="mt-3 text-lg font-semibold">Confirm your email</h2>
        <p className="mt-2 text-sm text-muted-foreground">{state.notice}</p>
        <Button asChild className="mt-6 w-full">
          <Link href={`/login?next=${encodeURIComponent(next)}`}>Go to log in</Link>
        </Button>
      </div>
    );
  }

  return (
    <form action={action} noValidate className="space-y-5">
      <input type="hidden" name="next" value={next} />

      {state.error && (
        <p className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-3 text-sm text-danger">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {state.error}
        </p>
      )}

      <Field label="Full name" htmlFor="fullName" error={e.fullName}>
        <input id="fullName" name="fullName" autoComplete="name" defaultValue={v.fullName}
          placeholder="e.g. Aarav Sharma" className={inputClass} {...invalid("fullName")} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Email address" htmlFor="email" error={e.email}>
          <input id="email" name="email" type="email" autoComplete="email" defaultValue={v.email}
            placeholder="you@example.com" className={inputClass} {...invalid("email")} />
        </Field>
        <Field label="Mobile number" htmlFor="mobile" error={e.mobile}>
          <input id="mobile" name="mobile" type="tel" autoComplete="tel" inputMode="tel"
            defaultValue={v.mobile} placeholder="+91 98765 43210" className={inputClass} {...invalid("mobile")} />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Country" htmlFor="country" error={e.country}>
          <select id="country" name="country" defaultValue={v.country || "India"}
            className={inputClass} {...invalid("country")}>
            {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="I am a" htmlFor="userType" error={e.userType}>
          <select id="userType" name="userType" defaultValue={v.userType || "Student"}
            className={inputClass} {...invalid("userType")}>
            {USER_TYPES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
      </div>

      <fieldset>
        <legend className="text-sm font-medium">Field of study</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {FIELDS.map((f) => (
            <label key={f} className="cursor-pointer">
              <input type="radio" name="field" value={f} defaultChecked={(v.field || "Engineering") === f}
                className="peer sr-only" />
              <span className={cn(
                "inline-block rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                "hover:border-primary/50 peer-checked:border-primary peer-checked:bg-primary-soft peer-checked:text-primary",
                "peer-focus-visible:ring-2 peer-focus-visible:ring-primary/30",
              )}>
                {f}
              </span>
            </label>
          ))}
        </div>
        {e.field && <p className="mt-1.5 text-xs text-danger">{e.field}</p>}
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Password" htmlFor="password" error={e.password} hint="At least 8 characters.">
          <input id="password" name="password" type="password" autoComplete="new-password"
            className={inputClass} {...invalid("password")} />
        </Field>
        <Field label="Confirm password" htmlFor="confirm" error={e.confirm}>
          <input id="confirm" name="confirm" type="password" autoComplete="new-password"
            className={inputClass} {...invalid("confirm")} />
        </Field>
      </div>

      <div>
        <label className="flex items-start gap-2.5 text-sm text-muted-foreground">
          <input type="checkbox" name="terms" defaultChecked={v.terms === "on"}
            className="mt-0.5 h-4 w-4 rounded border accent-[var(--primary)]" />
          I agree to the Terms of Use and Privacy Policy.
        </label>
        {e.terms && <p className="mt-1 text-xs text-danger">{e.terms}</p>}
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating your account…</> : "Create account"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
