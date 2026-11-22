import { createClient } from "@/lib/supabase/server";

type AppRole = "patient" | "caregiver";

export async function getProfile() {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (claimsError || typeof userId !== "string") return null;
  const { data } = await supabase.from("profiles").select("id, role, display_name").eq("id", userId).maybeSingle();
  if (!data || (data.role !== "patient" && data.role !== "caregiver")) return null;
  return { id: data.id as string, role: data.role as AppRole, displayName: data.display_name as string | null };
}

export function supabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}
