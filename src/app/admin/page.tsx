import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { AppShell } from "@/components/app-shell";
import { requireAdmin } from "@/lib/server/auth";
import { repo } from "@/lib/server/repo";
import { isAdminEmail } from "@/lib/server/env";
import { topicTitle } from "@/lib/server/tests";

const PLAN_LABEL = {
  full: "Full Test Series",
  part_pass: "Part Test · All-Topics Pass",
  part_topic: "Part Test",
  bundle: "Complete Bundle",
} as const;

export const metadata = { title: "Admin · Adhyan" };

const fmtDate = (d: string | number) =>
  new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

export default async function AdminPage() {
  await requireAdmin();
  const [profiles, attempts, purchases] = await Promise.all([
    repo().listProfiles(),
    repo().listAllAttempts(),
    repo().listPurchases(),
  ]);
  const nameOf = new Map(profiles.map((p) => [p.id, p.fullName || p.email]));
  const paidUsers = new Set(purchases.map((p) => p.userId));
  const submitted = attempts.filter((a) => a.status === "submitted");
  const revenue = purchases.reduce((s, p) => s + p.amountInr, 0);

  return (
    <AppShell>
      <div className="space-y-8">
        <PageHeader
          eyebrow="Admin"
          title="Admin console"
          description="All registered users, test attempts and purchases."
        />

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            ["Registered users", profiles.length],
            ["Paid users", paidUsers.size],
            ["Tests submitted", submitted.length],
            ["Revenue (simulated)", `₹${revenue.toLocaleString("en-IN")}`],
          ].map(([k, v]) => (
            <Card key={k} className="p-5">
              <p className="text-xs text-muted-foreground">{k}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{v}</p>
            </Card>
          ))}
        </div>

        <Section title={`Users (${profiles.length})`}>
          <thead>
            <tr>
              <Th>Name</Th><Th>Email</Th><Th>Mobile</Th><Th>Country</Th><Th>Type · Field</Th><Th>Plan</Th><Th>Joined</Th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {profiles.map((p) => (
              <tr key={p.id}>
                <Td>{p.fullName}</Td>
                <Td>{p.email}</Td>
                <Td>{p.mobile}</Td>
                <Td>{p.country}</Td>
                <Td>{[p.userType, p.field].filter(Boolean).join(" · ")}</Td>
                <Td>
                  {isAdminEmail(p.email) ? (
                    <span className="text-primary">Admin</span>
                  ) : (
                    <span className={paidUsers.has(p.id) ? "text-success" : "text-muted-foreground"}>
                      {paidUsers.has(p.id) ? "Paid" : "Free trial"}
                    </span>
                  )}
                </Td>
                <Td muted>{fmtDate(p.createdAt)}</Td>
              </tr>
            ))}
          </tbody>
        </Section>

        <Section title={`Test attempts (${attempts.length})`}>
          <thead>
            <tr>
              <Th>Student</Th><Th>Test</Th><Th>Status</Th><Th right>Score</Th><Th right>Attempted</Th><Th>Started</Th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {attempts.map((a) => (
              <tr key={a.id}>
                <Td>{nameOf.get(a.userId) ?? a.userId.slice(0, 8)}</Td>
                <Td>{a.title}</Td>
                <Td muted>{a.status === "submitted" ? "Submitted" : "In progress"}</Td>
                <Td right>{a.status === "submitted" ? `${a.correct}/${a.total}` : "—"}</Td>
                <Td right>{a.attempted ?? "—"}</Td>
                <Td muted>{fmtDate(a.startedAt)}</Td>
              </tr>
            ))}
          </tbody>
        </Section>

        <Section title={`Purchases (${purchases.length})`}>
          <thead>
            <tr>
              <Th>Student</Th><Th>Plan</Th><Th right>Amount</Th><Th>Reference</Th><Th>Date</Th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {purchases.map((p) => (
              <tr key={`${p.userId}-${p.courseId}-${p.plan}-${p.topicId}`}>
                <Td>{nameOf.get(p.userId) ?? p.userId.slice(0, 8)}</Td>
                <Td>{PLAN_LABEL[p.plan]}{p.topicId ? ` · ${topicTitle(p.topicId)}` : ""}</Td>
                <Td right>₹{p.amountInr}</Td>
                <Td muted>{p.reference}</Td>
                <Td muted>{fmtDate(p.createdAt)}</Td>
              </tr>
            ))}
          </tbody>
        </Section>
      </div>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <h2 className="p-6 pb-4 font-semibold">{title}</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">{children}</table>
      </div>
    </Card>
  );
}

function Th({ children, right }: { children?: React.ReactNode; right?: boolean }) {
  return (
    <th className={`border-y bg-surface-muted/60 px-4 py-2.5 text-xs font-medium text-muted-foreground first:pl-6 ${right ? "text-right" : "text-left"}`}>
      {children}
    </th>
  );
}

function Td({ children, right, muted }: { children: React.ReactNode; right?: boolean; muted?: boolean }) {
  return (
    <td className={`px-4 py-3 first:pl-6 ${right ? "text-right tabular-nums" : ""} ${muted ? "text-muted-foreground" : ""}`}>
      {children}
    </td>
  );
}
