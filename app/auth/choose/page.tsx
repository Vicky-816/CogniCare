import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChoiceForm } from "./choice-form";

export default async function ChoosePage() {
  const supabase = await createClient();
  if (!supabase) redirect("/auth/login");
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) redirect("/auth/login");
  if (user.user_metadata?.cognicare_setup) redirect("/auth/continue");
  const name = user.user_metadata?.display_name ?? user.user_metadata?.full_name ?? "";
  return <ChoiceForm defaultName={typeof name === "string" ? name.slice(0, 60) : ""} />;
}
