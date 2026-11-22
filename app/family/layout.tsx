import type { ReactNode } from "react";
import { Suspense } from "react";

import { AreaShell } from "@/components/area-shell";
import { SignedInGate } from "@/components/auth/signed-in-gate";
import { PinGate } from "@/components/pin/pin-gate";

export default function FamilyLayout({ children }: { children: ReactNode }) {
  return (
    <AreaShell area="Family" navLabel="Family sections" items={[]}>
      <Suspense
        fallback={
          <p role="status" className="text-lg">
            Loading…
          </p>
        }
      >
        <SignedInGate>
          <PinGate>{children}</PinGate>
        </SignedInGate>
      </Suspense>
    </AreaShell>
  );
}
