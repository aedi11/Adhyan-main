import { notFound } from "next/navigation";
import { getAttemptView } from "@/lib/data/store";
import { QuizPlayer } from "@/components/quiz/quiz-player";

export default async function QuizPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const view = getAttemptView(attemptId);
  if (!view) notFound();

  return (
    <QuizPlayer
      attemptId={view.attemptId}
      levelTitle={view.levelTitle}
      remainingSec={view.remainingSec}
      variants={view.variants}
    />
  );
}
