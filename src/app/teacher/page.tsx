import Link from "next/link";
import { ArrowRight, BookOpen, FileText, Layers, ListChecks, Shield, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCatalog, getCourseTopics, getUploadedCount } from "@/lib/data/store";
import { QuestionUpload } from "@/components/teacher/question-upload";
import { StudioHeader } from "@/components/teacher/studio-header";
import { BRAND_TAGLINE } from "@/lib/config";

export default function TeacherPage() {
  const courses = getCatalog();
  const uploadedCount = getUploadedCount();

  return (
    <div className="min-h-full">
      <StudioHeader back="/" />

      <main className="mx-auto max-w-5xl px-4 py-6">
        <Badge variant="primary" className="mb-2">
          <Sparkles className="h-3.5 w-3.5" /> {BRAND_TAGLINE}
        </Badge>
        <h1 className="text-3xl font-black tracking-tight">Teacher Studio</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Open a course to review its questions topic-by-topic and preview the per-student variants.
          Grading stays on the server — answer keys never reach the browser.
        </p>

        <Card className="mt-6">
          <div className="flex items-center gap-3 p-5">
            <Shield className="h-6 w-6 text-success" />
            <div>
              <p className="font-bold">IP protection on</p>
              <p className="text-sm text-muted-foreground">
                Server-side grading · per-student question variants · answer keys never sent to
                browsers.
              </p>
            </div>
          </div>
        </Card>

        {/* Courses */}
        <h2 className="mt-8 text-xl font-extrabold">Courses</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {courses.map((course) => {
            const topics = getCourseTopics(course.id);
            return (
              <Link key={course.id} href={`/teacher/${course.id}`} className="block">
                <Card className="h-full transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                  <div className="p-5">
                    <Badge variant="muted">
                      <BookOpen className="h-3.5 w-3.5" /> {course.subject}
                    </Badge>
                    <h3 className="mt-2 text-lg font-extrabold">{course.title}</h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="muted">
                        <Layers className="h-3.5 w-3.5" /> {topics.length} topics
                      </Badge>
                      <Badge variant="muted">
                        <FileText className="h-3.5 w-3.5" /> {course.questionCount} questions
                      </Badge>
                      <Badge variant="muted">
                        <ListChecks className="h-3.5 w-3.5" /> {course.testCount} tests
                      </Badge>
                    </div>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-primary">
                      View questions by topic <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Upload */}
        <h2 className="mt-10 text-xl font-extrabold">Add questions</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a Word (.docx) bank — new questions are added to the ELL 1000 course.
        </p>
        <div className="mt-4">
          <QuestionUpload uploadedCount={uploadedCount} />
        </div>
      </main>
    </div>
  );
}
