import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/server/auth";
import { listCourses, listTests } from "@/lib/server/tests";

export default async function CoursesPage() {
  const user = await requireUser();
  const courses = await Promise.all(
    listCourses().map(async (c) => ({ c, listing: (await listTests(user, c.id))! })),
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Test series"
        title="Your courses"
        description="Pick a course to see its tests, your scores and what's left to attempt."
      />
      <div className="grid gap-5 lg:grid-cols-2">
        {courses.map(({ c, listing }) => {
          const done = listing.tests.filter((t) => t.status === "completed").length;
          return (
            <Card key={c.id} className="flex flex-col p-6">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {c.subject}
                </p>
                <span
                  className={
                    listing.paid
                      ? "rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-medium text-success"
                      : "rounded-full bg-warning-soft px-2.5 py-0.5 text-xs font-medium text-warning"
                  }
                >
                  {listing.paid ? "Full access" : "Free trial"}
                </span>
              </div>
              <h2 className="mt-2 text-xl font-semibold">{c.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>
              <dl className="mt-5 grid grid-cols-3 gap-3 text-sm">
                {[
                  ["Tests", `${c.testCount}`],
                  ["Per test", `${c.questionsPerTest} Q · 2 h`],
                  ["Completed", `${done} / ${c.testCount}`],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-surface-muted px-3 py-2">
                    <dt className="text-xs text-muted-foreground">{k}</dt>
                    <dd className="mt-0.5 font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild>
                  <Link href={`/learn/${c.id}`}>
                    View tests <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                {!listing.paid && (
                  <Button asChild variant="outline">
                    <Link href={`/checkout/${c.id}`}>See plans · from ₹{c.prices.partTopic}</Link>
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
