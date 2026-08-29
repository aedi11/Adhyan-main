import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BookOpen, FileText, Layers, ListChecks } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ELL100_ID, getCatalogCourse, getCourseTopicSummaries } from "@/lib/data/store";
import { StudioHeader } from "@/components/teacher/studio-header";
import { PER_TOPIC_PER_TEST } from "@/lib/data/ell100-topics";

export default async function TeacherCoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const course = getCatalogCourse(courseId);
  if (!course) notFound();

  const topics = getCourseTopicSummaries(courseId);
  const isEll = courseId === ELL100_ID;

  return (
    <div className="min-h-full">
      <StudioHeader back="/teacher" />

      <main className="mx-auto max-w-5xl px-4 py-6">
        <Badge variant="muted">
          <BookOpen className="h-3.5 w-3.5" /> {course.subject}
        </Badge>
        <h1 className="mt-2 text-3xl font-black tracking-tight">{course.title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{course.subtitle}</p>

        {/* Summary */}
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat icon={Layers} value={topics.length} label="Topics" />
          <Stat icon={FileText} value={course.questionCount} label="Questions" />
          <Stat icon={ListChecks} value={course.testCount} label="Tests" />
          <Stat
            icon={ListChecks}
            value={isEll ? topics.length * PER_TOPIC_PER_TEST : course.questionCount}
            label="Q per test"
          />
        </div>

        {isEll && (
          <Card className="mt-5 border-primary/30 bg-primary-soft/40">
            <div className="p-4 text-sm">
              <p className="font-bold text-primary">How the tests are built</p>
              <p className="mt-1 text-muted-foreground">
                Each of the {course.testCount} tests runs for 2 hours and draws{" "}
                <span className="font-bold">{PER_TOPIC_PER_TEST} questions from every one of the{" "}
                {topics.length} topics</span> ({topics.length * PER_TOPIC_PER_TEST} questions per
                test). The draw is seeded per student, so no two students get the same paper while
                every topic is still covered.
              </p>
            </div>
          </Card>
        )}

        {/* Topics */}
        <h2 className="mt-8 text-xl font-extrabold">Questions by topic</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Open a topic to review its questions, answers and per-student variants.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {topics.map((t, i) => (
            <Link key={t.id} href={`/teacher/${courseId}/${t.id}`} className="block">
              <Card className="h-full transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                <div className="flex items-start gap-3 p-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-black text-primary-foreground">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-extrabold">{t.title}</h3>
                      <Badge variant="muted">{t.count} Q</Badge>
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{t.blurb}</p>
                    <span className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-primary">
                      View questions <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}

function Stat({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: React.ReactNode;
  label: string;
}) {
  return (
    <Card>
      <div className="flex flex-col items-center gap-1 p-4 text-center">
        <Icon className="h-5 w-5 text-primary" />
        <div className="text-2xl font-black">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </Card>
  );
}
