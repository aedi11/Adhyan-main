import { redirect } from "next/navigation";

// Tests are now organised per course. Send the old standalone /tests route to
// the course catalog.
export default function TestsPage() {
  redirect("/learn");
}
