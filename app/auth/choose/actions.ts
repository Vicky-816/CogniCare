"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ChoiceState = { error?: string } | undefined;

export async function chooseExperience(_state: ChoiceState, formData: FormData): Promise<ChoiceState> {
  const kind = formData.get("kind");
  if (kind !== "player" && kind !== "caregiver") return { error: "Please choose how you will use CogniCare." };
  const supabase = await createClient();
  if (!supabase) return { error: "Unable to connect. Please try again." };
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) redirect("/auth/login");
  if (user.user_metadata?.cognicare_setup) redirect("/auth/continue");

  let profileId: string | undefined;
  if (kind === "player") {
    const nameValue = formData.get("name");
    const name = typeof nameValue === "string" ? nameValue.trim().replace(/\s+/g, " ") : "";
    if (!name || name.length > 60) return { error: "Enter your name using 1 to 60 characters." };
    const { data, error } = await supabase
      .from("care_profiles")
      .insert({ owner_id: user.id, display_name: name })
      .select("id")
      .single();
    if (error || !data) return { error: "We could not set up your player profile. Please try again." };
    profileId = data.id;
  }
  const setup = kind === "player" ? { kind, profileId } : { kind };
  const { error } = await supabase.auth.updateUser({ data: { cognicare_setup: setup } });
  if (error) return { error: "We could not save your choice. Please try again." };
  redirect(kind === "player" ? `/play/${profileId}` : "/family");
}
