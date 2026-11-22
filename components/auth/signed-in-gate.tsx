import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { getProfile, supabaseConfigured } from "@/lib/supabase/auth";

/** Sends people to the sign-in page if they are not signed in. Without Supabase settings (demo mode) it lets everyone through. */
export async function SignedInGate({ children }: { children: ReactNode }) {
  if (!supabaseConfigured()) return children;
  const profile = await getProfile();
  if (!profile) redirect("/auth/login");
  return children;
}
