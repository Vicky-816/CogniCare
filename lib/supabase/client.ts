"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnv } from "@/lib/supabase/env";
import { isDemoMode } from "@/lib/demo-mode";

export function createClient() {
  if (isDemoMode()) return null;
  const env = supabaseEnv();
  return env ? createBrowserClient(env.url, env.key) : null;
}
