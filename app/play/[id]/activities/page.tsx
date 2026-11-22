import type { Metadata } from "next";

import { Activities } from "@/components/play/activities";

export const metadata: Metadata = { title: "Activities" };

export default function ActivitiesPage() {
  return <Activities />;
}
