import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import type { ReactNode } from "react";

import { getProfile, supabaseConfigured } from "@/lib/supabase/auth";

/** Sends people to the sign-in page if they are not signed in. Without Supabase settings (demo mode) it lets everyone through. */
export async function SignedInGate({ children }: { children: ReactNode }) {
  // Demo renders the local-only UI. Cloud data remains protected by Supabase auth and RLS.
  if ((await cookies()).get("cognicare-demo")?.value === "1") return children;
  if (!supabaseConfigured()) return children;
  const profile = await getProfile();
  if (!profile) redirect("/auth/login");
  return children;
}
