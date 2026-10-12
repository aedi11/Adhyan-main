import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { getCourseTopicSummaries, getUploadedCount } from "@/lib/data/store";
import { listCourses } from "@/lib/server/tests";
import { QuestionUpload } from "@/components/teacher/question-upload";

export default function TeacherPage() {
  const courses = listCourses();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Teacher Studio"
        title="Courses & question banks"
        description="Review questions topic by topic and preview the variants each student receives."
      />

      <Card className="flex items-start gap-3 p-5">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" />
        <div className="text-sm">
          <p className="font-semibold">Question protection is on</p>
          <p className="mt-0.5 text-muted-foreground">
            Grading happens on the server and answer keys never reach the browser. Every student
            receives a different paper: different questions per topic, re-computed numerical values,
            varied formats and shuffled options.
          </p>
        </div>
      </Card>

      <section>
        <h2 className="text-lg font-semibold">Courses</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {courses.map((c) => (
            <Link key={c.id} href={`/teacher/${c.id}`} className="group block">
              <Card className="h-full p-6 transition-shadow group-hover:shadow-md">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {c.subject}
                </p>
                <h3 className="mt-1 text-lg font-semibold">{c.title}</h3>
                <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
                  <Fact label="Topics" value={getCourseTopicSummaries(c.id).length} />
                  <Fact label="Questions" value={c.questionBank.toLocaleString("en-IN")} />
                  <Fact label="Tests" value={`${c.testCount} × ${c.questionsPerTest}`} />
                </dl>
                <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-primary">
                  Open question bank <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Upload questions</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Add a Word (.docx) question bank to the Introduction to Electrical Engineering course.
        </p>
        <div className="mt-4">
          <QuestionUpload uploadedCount={getUploadedCount()} />
        </div>
      </section>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-surface-muted px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-semibold">{value}</dd>
    </div>
  );
}
