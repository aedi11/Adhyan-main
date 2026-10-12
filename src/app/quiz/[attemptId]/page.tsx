import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/server/auth";
import { getPlayerView } from "@/lib/server/tests";
import { ExamPlayer } from "@/components/quiz/exam-player";

export const metadata = { title: "Test in progress · Adhyan" };

export default async function QuizPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const user = await requireUser();
  const view = await getPlayerView(user, attemptId);
  if (!view) notFound();
  if (view === "submitted") redirect(`/results/${attemptId}`);

  return (
    <ExamPlayer
      attemptId={view.attemptId}
      title={view.title}
      remainingSec={view.remainingSec}
      variants={view.variants}
      initialAnswers={view.answers}
    />
  );
}
