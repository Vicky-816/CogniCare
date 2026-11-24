import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function ContinuePage() {
  const supabase = await createClient();
  if (!supabase) redirect("/auth/login");
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) redirect("/auth/login");
  const setup = user.user_metadata?.cognicare_setup;
  if (setup?.kind === "caregiver") redirect("/family");
  if (setup?.kind === "player" && typeof setup.profileId === "string") {
    const { data: profile } = await supabase
      .from("care_profiles")
      .select("id")
      .eq("id", setup.profileId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (profile) redirect(`/play/${profile.id}`);
    redirect("/play");
  }
  redirect("/family");
}

