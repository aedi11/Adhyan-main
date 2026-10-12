import "server-only";
import { ELL_OFFER } from "@/lib/server/tests";

/**
 * Where to send someone after login/registration. `plan=trial` (the "Try for
 * free" button) lands on the course's tests; `plan=full` goes to checkout.
 */
export function resolveNext(sp: { next?: string; plan?: string }): string {
  if (sp.next && sp.next.startsWith("/") && !sp.next.startsWith("//")) return sp.next;
  if (sp.plan === "trial") return `/learn/${ELL_OFFER.id}`;
  if (sp.plan === "full") return `/checkout/${ELL_OFFER.id}`;
  return "/dashboard";
}
