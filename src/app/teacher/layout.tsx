import { AppShell } from "@/components/app-shell";
import { requireTeacher } from "@/lib/server/auth";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  await requireTeacher();
  return <AppShell>{children}</AppShell>;
}
