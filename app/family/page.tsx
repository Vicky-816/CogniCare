import type { Metadata } from "next";

import { FamilyHome } from "@/components/family/family-home";

export const metadata: Metadata = { title: "Family area" };

export default function FamilyPage() {
  return <FamilyHome />;
}
