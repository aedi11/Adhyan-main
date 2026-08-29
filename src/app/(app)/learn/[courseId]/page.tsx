import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, ChevronLeft, Clock, ListChecks } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  ELL100_ID,
  getCatalogCourse,
  getCourseTopicSummaries,
  getTestResults,
  getTestsForCourse,
} from "@/lib/data/store";
import { startTestAction } from "@/app/actions";
import { StartTestDialog } from "@/components/quiz/start-test-dialog";
import { PER_TOPIC_PER_TEST } from "@/lib/data/ell100-topics";

export default async function CourseTestsPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const course = getCatalogCourse(courseId);
  if (!course) notFound();

  const tests = getTestsForCourse(courseId);
  const results = getTestResults();
  const isEll = courseId === ELL100_ID;
  const topicCount = getCourseTopicSummaries(courseId).length;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/learn"
          className="inline-flex items-center gap-1 text-sm font-bold text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> All courses
        </Link>
        <h1 className="mt-2 text-3xl font-black tracking-tight">{course.title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {course.subtitle} · {course.questionCount} questions · {course.testCount} timed test
          {course.testCount === 1 ? "" : "s"} (2 hours each)
          {isEll
            ? " — every test covers all topics, with a different set of questions per student."
            : "."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {tests.map((test) => {
          const r = results[test.id];
          const attempted = !!r;
          return (
            <Card key={test.id} className="flex flex-col">
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                      <ListChecks className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-extrabold">{test.title}</h2>
                      <p className="text-xs text-muted-foreground">{test.questionCount} questions</p>
                    </div>
                  </div>
                  {attempted && (
                    <Badge variant="success">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Best {r.bestPercent}%
                    </Badge>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="muted">
                    <Clock className="h-3.5 w-3.5" /> 2 hours
                  </Badge>
                  <Badge variant="muted">{test.questionCount} Q</Badge>
                  {attempted && (
                    <Badge variant="muted">
                      Last {r.lastPercent}% · {r.attempts} attempt{r.attempts === 1 ? "" : "s"}
                    </Badge>
                  )}
                </div>

                <div className="mt-5 flex-1" />

                <StartTestDialog
                  testTitle={test.title}
                  courseTitle={course.title}
                  questionCount={test.questionCount}
                  durationSec={test.durationSec}
                  topicCount={isEll ? topicCount : undefined}
                  perTopic={isEll ? PER_TOPIC_PER_TEST : undefined}
                  attempted={attempted}
                  action={startTestAction.bind(null, test.id)}
                />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
