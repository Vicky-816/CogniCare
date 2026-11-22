import type { Metadata } from "next";

import { WhoIsPlaying } from "@/components/play/who-is-playing";

export const metadata: Metadata = { title: "Who is playing?" };

export default function PlayPage() {
  return <WhoIsPlaying />;
}
