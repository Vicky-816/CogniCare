import { redirect } from "next/navigation";
export default function ChoosePage() {
  redirect("/auth/continue");
}

