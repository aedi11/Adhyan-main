import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ListChecks } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getCatalogCourse, getCourseTopic } from "@/lib/data/store";
import { VariantPreview } from "@/components/teacher/variant-preview";
import { StudioHeader } from "@/components/teacher/studio-header";

export default async function TeacherTopicPage({
  params,
}: {
  params: Promise<{ courseId: string; topicId: string }>;
}) {
  const { courseId, topicId } = await params;
  const course = getCatalogCourse(courseId);
  const topic = getCourseTopic(courseId, topicId);
  if (!course || !topic) notFound();

  return (
    <div className="min-h-full">
      <StudioHeader back={`/teacher/${courseId}`} />

      <main className="mx-auto max-w-5xl px-4 py-6">
        <Link
          href={`/teacher/${courseId}`}
          className="inline-flex items-center gap-1 text-sm font-bold text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> All topics
        </Link>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{topic.title}</h1>
          <Badge variant="muted">
            <ListChecks className="h-3 w-3" /> {topic.questions.length} questions
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{topic.blurb}</p>
        <p className="mt-1 text-xs text-muted-foreground">{course.title}</p>

        <div className="mt-6 space-y-2">
          {topic.questions.map((q, i) => (
            <div key={q.id} className="flex gap-3">
              <span className="mt-4 w-8 shrink-0 text-right text-xs font-bold text-muted-foreground">
                {i + 1}.
              </span>
              <div className="min-w-0 flex-1">
                <VariantPreview
                  questionId={q.id}
                  prompt={q.prompt}
                  answer={q.correctAnswer}
                  media={q.media}
                />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
