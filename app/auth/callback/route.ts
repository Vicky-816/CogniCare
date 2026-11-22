import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const supabase = await createClient();
  if (code && supabase) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL("/auth/continue", request.url));
    }
  }
  const error = request.nextUrl.searchParams.get("method") === "google" ? "google" : "confirmation";
  return NextResponse.redirect(new URL(`/auth/login?error=${error}`, request.url));
}
