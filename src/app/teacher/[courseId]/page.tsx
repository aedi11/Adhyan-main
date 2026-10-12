import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { getCourseTopicSummaries, perTopicLabel } from "@/lib/data/store";
import { getCourseOffer } from "@/lib/server/tests";

export default async function TeacherCoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const course = getCourseOffer(courseId);
  if (!course) notFound();
  const topics = getCourseTopicSummaries(courseId);

  return (
    <div className="space-y-8">
      <PageHeader
        back={{ href: "/teacher", label: "Teacher Studio" }}
        eyebrow={course.subject}
        title={course.title}
        description={course.subtitle}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Topics" value={topics.length} />
        <Stat label="Questions in bank" value={course.questionBank.toLocaleString("en-IN")} />
        <Stat label="Tests" value={course.testCount} />
        <Stat label="Questions per test" value={course.questionsPerTest} />
      </div>

      <Card className="p-5 text-sm">
        <p className="font-semibold">How each test is assembled</p>
        <p className="mt-1 text-muted-foreground">
          Every test has {course.questionsPerTest} questions in 2 hours, with {perTopicLabel()} from each
          of the {topics.length} topics, in syllabus order. Questions are drawn per student, and each
          numerical question is served with one of several re-computed value sets, so two students
          never share a paper. Students on the free trial get a {course.trialQuestions}-question paper
          for Tests 1–{course.trialTests}.
        </p>
      </Card>

      <section>
        <h2 className="text-lg font-semibold">Topics</h2>
        <Card className="mt-4 divide-y overflow-hidden">
          {topics.map((t, i) => (
            <Link
              key={t.id}
              href={`/teacher/${courseId}/${t.id}`}
              className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-muted"
            >
              <span className="w-6 text-right text-sm tabular-nums text-muted-foreground">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{t.title}</p>
                <p className="truncate text-sm text-muted-foreground">{t.blurb}</p>
              </div>
              <span className="text-sm tabular-nums text-muted-foreground">{t.count} questions</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </Card>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card className="p-5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </Card>
  );
}
