import { AppHeader, type HeaderLink } from "@/components/app-header";
import { requireUser } from "@/lib/server/auth";

/** Signed-in page frame: navy header + centred content. Redirects to /login if signed out. */
export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const links: HeaderLink[] = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/learn", label: "Tests" },
    { href: "/analytics", label: "Analytics" },
  ];
  if (user.isTeacher) links.push({ href: "/teacher", label: "Teacher Studio" });
  if (user.isAdmin) links.push({ href: "/admin", label: "Admin" });

  return (
    <div className="min-h-dvh">
      <AppHeader
        links={links}
        user={{
          name: user.fullName,
          email: user.email,
          meta: user.isAdmin ? "Administrator" : [user.userType, user.field].filter(Boolean).join(" · "),
        }}
      />
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
