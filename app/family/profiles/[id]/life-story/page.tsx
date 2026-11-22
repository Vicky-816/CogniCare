import type { Metadata } from "next";

import { LifeStoryManager } from "@/components/family/life-story-manager";

export const metadata: Metadata = { title: "Life story" };

export default async function LifeStoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LifeStoryManager profileId={id} />;
}
