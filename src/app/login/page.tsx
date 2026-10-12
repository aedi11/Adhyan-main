import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/auth/auth-frame";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentUser } from "@/lib/server/auth";
import { resolveNext } from "@/lib/next-path";

export const metadata = { title: "Log in · Adhyan" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; plan?: string; confirmed?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const next = resolveNext(sp);
  if (await getCurrentUser()) redirect(next);

  return (
    <AuthFrame>
      <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Log in to continue your test series.{" "}
        <Link href="/" className="text-primary hover:underline">Back to home</Link>
      </p>
      <div className="mt-8">
        <LoginForm
          next={next}
          notice={sp.confirmed ? "Your email is confirmed. Log in to get started." : undefined}
        />
        {sp.error && (
          <p className="mt-4 text-center text-sm text-danger">
            That confirmation link is invalid or has already been used. If your account is confirmed, just log in.
          </p>
        )}
      </div>
    </AuthFrame>
  );
}
