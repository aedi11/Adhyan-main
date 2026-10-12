import { NextResponse, type NextRequest } from "next/server";
import { exchangeCode } from "@/lib/server/auth";

/** Supabase email-confirmation landing: exchange the code for a session. */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (code && (await exchangeCode(code))) {
    return NextResponse.redirect(new URL("/dashboard", url.origin));
  }
  return NextResponse.redirect(new URL("/login?error=confirm", url.origin));
}
