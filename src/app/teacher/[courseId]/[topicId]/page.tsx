import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { getCourseTopic } from "@/lib/data/store";
import { getCourseOffer } from "@/lib/server/tests";
import { VariantPreview } from "@/components/teacher/variant-preview";

export default async function TeacherTopicPage({
  params,
}: {
  params: Promise<{ courseId: string; topicId: string }>;
}) {
  const { courseId, topicId } = await params;
  const course = getCourseOffer(courseId);
  const topic = getCourseTopic(courseId, topicId);
  if (!course || !topic) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: `/teacher/${courseId}`, label: "All topics" }}
        eyebrow={`${topic.questions.length} questions`}
        title={topic.title}
        description={topic.blurb}
      />
      <div className="space-y-3">
        {topic.questions.map((q, i) => (
          <VariantPreview
            key={q.id}
            number={i + 1}
            questionId={q.id}
            prompt={q.prompt}
            answer={q.correctAnswer}
            media={q.media}
          />
        ))}
      </div>
    </div>
  );
}
