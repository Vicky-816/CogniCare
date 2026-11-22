"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnv } from "@/lib/supabase/env";

export function createClient() {
  const env = supabaseEnv();
  return env ? createBrowserClient(env.url, env.key) : null;
}
