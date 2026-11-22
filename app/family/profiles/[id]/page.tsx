import type { Metadata } from "next";

import { ProfileDetail } from "@/components/family/profile-detail";

export const metadata: Metadata = { title: "Progress and settings" };

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProfileDetail profileId={id} />;
}
