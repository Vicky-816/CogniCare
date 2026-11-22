import type { Metadata } from "next";

import { ScheduleManager } from "@/components/family/schedule-manager";

export const metadata: Metadata = { title: "Daily schedule" };

export default async function SchedulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ScheduleManager profileId={id} />;
}
