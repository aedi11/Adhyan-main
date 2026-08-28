import Link from "next/link";
import { ArrowRight, BookOpen, Clock, FileText, ListChecks, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCatalog } from "@/lib/data/store";
import { BRAND_TAGLINE } from "@/lib/config";

export default function CatalogPage() {
  const courses = getCatalog();

  return (
    <div className="space-y-6">
      <div>
        <Badge variant="primary" className="mb-2">
          <Sparkles className="h-3.5 w-3.5" /> {BRAND_TAGLINE}
        </Badge>
        <h1 className="text-3xl font-black tracking-tight">Courses</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick a course, then take a timed test — 100 questions each, graded on our servers.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {courses.map((course) => (
          <Card key={course.id} className="flex flex-col overflow-hidden">
            {/* Banner */}
            <div className="relative h-24 bg-primary p-5">
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
              <Badge className="bg-white/20 text-white">
                <BookOpen className="h-3.5 w-3.5" /> {course.subject}
              </Badge>
            </div>

            <div className="flex flex-1 flex-col p-5">
              <h2 className="text-xl font-extrabold">{course.title}</h2>
              <p className="mt-1 flex-1 text-sm text-muted-foreground">{course.description}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="muted">
                  <FileText className="h-3.5 w-3.5" /> {course.questionCount} questions
                </Badge>
                <Badge variant="muted">
                  <ListChecks className="h-3.5 w-3.5" /> {course.testCount} test
                  {course.testCount === 1 ? "" : "s"}
                </Badge>
                <Badge variant="muted">
                  <Clock className="h-3.5 w-3.5" /> 2h each
                </Badge>
              </div>

              <Button asChild className="mt-5 w-full">
                <Link href={`/learn/${course.id}`}>
                  View tests <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
