import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/auth/auth-frame";
import { RegisterForm } from "@/components/auth/register-form";
import { getCurrentUser } from "@/lib/server/auth";
import { resolveNext } from "@/lib/next-path";

export const metadata = { title: "Create account · Adhyan" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; plan?: string }>;
}) {
  const sp = await searchParams;
  const next = resolveNext(sp);
  if (await getCurrentUser()) redirect(next);

  return (
    <AuthFrame>
      <h1 className="text-2xl font-semibold tracking-tight">
        {sp.plan === "trial" ? "Start your free trial" : "Create your account"}
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        {sp.plan === "trial"
          ? "Register to attempt the free trial papers. No payment needed."
          : "It takes a minute. You can start with the free trial tests."}
      </p>
      <div className="mt-8">
        <RegisterForm next={next} />
      </div>
    </AuthFrame>
  );
}
