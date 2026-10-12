import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { verifyEmailToken } from "@/lib/server/auth";

/**
 * Email-confirmation landing (token-hash flow). Unlike the PKCE `?code=` link,
 * this works when the email is opened on a different device or browser from
 * the one used to register. Email template link:
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = (url.searchParams.get("type") ?? "email") as EmailOtpType;
  if (tokenHash && (await verifyEmailToken(tokenHash, type))) {
    return NextResponse.redirect(new URL("/dashboard", url.origin));
  }
  return NextResponse.redirect(new URL("/login?error=confirm", url.origin));
}
