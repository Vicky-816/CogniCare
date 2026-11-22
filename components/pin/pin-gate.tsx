"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Lock } from "lucide-react";

import { PinPad } from "@/components/pin/pin-pad";
import { Button } from "@/components/ui/button";
import { checkPin, isPatientModeOn, setPatientMode } from "@/lib/profiles/pin";
import { getProfileStore } from "@/lib/profiles/store";
import type { PinRecord } from "@/lib/profiles/types";

/**
 * Wraps the family area. While this device is in "patient mode" and a PIN
 * exists, the family area stays closed until the PIN is entered.
 */
export function PinGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<"checking" | "locked" | "open">("checking");
  const [record, setRecord] = useState<PinRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isPatientModeOn()) {
        if (!cancelled) setState("open");
        return;
      }
      const saved = await getProfileStore().getPin();
      if (cancelled) return;
      if (!saved) {
        // No PIN exists any more, so there is nothing to protect.
        setPatientMode(false);
        setState("open");
        return;
      }
      setRecord(saved);
      setState("locked");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "checking") {
    return (
      <p role="status" className="text-lg">
        Loading…
      </p>
    );
  }

  if (state === "locked" && record) {
    return (
      <div className="mx-auto max-w-md space-y-8 rounded-3xl border-2 bg-card p-8">
        <span className="flex size-16 items-center justify-center rounded-2xl bg-accent-soft">
          <Lock aria-hidden className="size-8" />
        </span>
        <PinPad
          title="Family area"
          hint="Enter the PIN to continue."
          error={error}
          onSubmit={async (pin) => {
            if (await checkPin(pin, record)) {
              setPatientMode(false);
              setState("open");
            } else {
              setError("That PIN is not right. Try again.");
            }
          }}
        />
        <Button asChild variant="outline" className="w-full">
          <Link href="/play">Back to the games</Link>
        </Button>
      </div>
    );
  }

  return children;
}
