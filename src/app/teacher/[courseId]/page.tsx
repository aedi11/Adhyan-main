import { notFound } from "next/navigation";
import { BookOpen, ListChecks } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCatalogCourse, getCourseTopics } from "@/lib/data/store";
import { VariantPreview } from "@/components/teacher/variant-preview";
import { StudioHeader } from "@/components/teacher/studio-header";

export default async function TeacherCoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const course = getCatalogCourse(courseId);
  if (!course) notFound();

  const topics = getCourseTopics(courseId);

  return (
    <div className="min-h-full">
      <StudioHeader back="/teacher" />

      <main className="mx-auto max-w-5xl px-4 py-6">
        <Badge variant="muted">
          <BookOpen className="h-3.5 w-3.5" /> {course.subject}
        </Badge>
        <h1 className="mt-2 text-3xl font-black tracking-tight">{course.title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {course.questionCount} questions across {topics.length} topics ·{" "}
          {course.testCount} tests. Every test covers every topic, and each student gets a
          different topic-balanced draw.
        </p>

        <div className="mt-8 space-y-8">
          {topics.map((topic, ti) => (
            <section key={topic.id}>
              <div className="mb-1 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-sm font-black text-primary-foreground">
                  {ti + 1}
                </span>
                <h2 className="text-lg font-extrabold">{topic.title}</h2>
                <Badge variant="muted">
                  <ListChecks className="h-3 w-3" /> {topic.questions.length} Q
                </Badge>
              </div>
              <p className="mb-3 ml-9 text-sm text-muted-foreground">{topic.blurb}</p>

              <div className="space-y-2 border-l-2 border-dashed border-border pl-5">
                {topic.questions.map((q) => (
                  <VariantPreview
                    key={q.id}
                    questionId={q.id}
                    prompt={q.prompt}
                    answer={q.correctAnswer}
                    media={q.media}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
