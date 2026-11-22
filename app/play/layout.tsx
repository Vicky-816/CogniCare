import type { ReactNode } from "react";
import { Suspense } from "react";

import { SignedInGate } from "@/components/auth/signed-in-gate";
import { PlayHeader } from "@/components/play/play-header";

// Patient mode: a quiet header, big targets, and nothing but the games.
export default function PlayLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PlayHeader />
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-4xl flex-1 px-4 pt-8 pb-16 sm:px-6 md:pt-12"
      >
        <Suspense
          fallback={
            <p role="status" className="text-xl">
              Getting ready…
            </p>
          }
        >
          <SignedInGate>{children}</SignedInGate>
        </Suspense>
      </main>
    </>
  );
}
