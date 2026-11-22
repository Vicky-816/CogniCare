import type { ReactNode } from "react";
import { Suspense } from "react";

import { PlayProvider } from "@/components/play/play-context";

async function PlayerBoundary({ params, children }: { params: Promise<{ id: string }>; children: ReactNode }) {
  const { id } = await params;
  return <PlayProvider profileId={id}>{children}</PlayProvider>;
}

// Everything under /play/[id] knows which person is playing.
export default function PlayerLayout({ children, params }: { children: ReactNode; params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <p role="status" className="text-xl">
          Getting ready…
        </p>
      }
    >
      <PlayerBoundary params={params}>{children}</PlayerBoundary>
    </Suspense>
  );
}
