"use client";

import { useEffect, useState } from "react";
import { Lock, LockOpen } from "lucide-react";

import { PinPad } from "@/components/pin/pin-pad";
import { Button } from "@/components/ui/button";
import { PIN_LENGTH, makePinRecord, setPatientMode } from "@/lib/profiles/pin";
import { getProfileStore } from "@/lib/profiles/store";

/** Lets the family member set, change or remove the PIN that guards the family area. */
export function PinPanel() {
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [step, setStep] = useState<"idle" | "choose" | "confirm">("idle");
  const [first, setFirst] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const record = await getProfileStore().getPin();
      if (!cancelled) setHasPin(Boolean(record));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function save(pin: string) {
    if (step === "choose") {
      setFirst(pin);
      setError(null);
      setStep("confirm");
      return;
    }
    if (pin !== first) {
      setError("The two PINs did not match. Let's start again.");
      setFirst("");
      setStep("choose");
      return;
    }
    try {
      await getProfileStore().setPin(await makePinRecord(pin));
      setHasPin(true);
      setStep("idle");
      setError(null);
      setNotice("Your PIN is saved.");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The PIN could not be saved.");
      setStep("choose");
    }
  }

  async function remove() {
    try {
      await getProfileStore().setPin(null);
      setPatientMode(false);
      setHasPin(false);
      setNotice("The PIN was removed. Anyone can now leave patient mode.");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The PIN could not be removed.");
    }
  }

  return (
    <section aria-labelledby="pin-heading" className="space-y-5 rounded-3xl border-2 bg-card p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-accent-soft">
          {hasPin ? <Lock aria-hidden className="size-7" /> : <LockOpen aria-hidden className="size-7" />}
        </span>
        <div className="space-y-1">
          <h2 id="pin-heading" className="text-2xl font-bold">
            Family PIN
          </h2>
          <p className="text-lg text-muted-foreground">
            While someone is playing, this {PIN_LENGTH}-digit PIN keeps them from opening this family area by accident.
            It is a gentle lock, not strong security.
          </p>
        </div>
      </div>

      {step === "idle" ? (
        <div className="space-y-4">
          {hasPin !== null && (
            <p className="text-lg font-semibold">{hasPin ? "A PIN is set." : "No PIN is set yet."}</p>
          )}
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setNotice(null);
                setError(null);
                setStep("choose");
              }}
            >
              {hasPin ? "Change PIN" : "Set a PIN"}
            </Button>
            {hasPin && (
              <Button variant="ghost" onClick={remove}>
                Remove PIN
              </Button>
            )}
          </div>
          <div aria-live="polite">
            {notice && <p className="rounded-xl bg-routine-soft p-4 text-lg text-success">{notice}</p>}
            {error && (
              <p role="alert" className="text-lg font-semibold text-destructive">
                {error}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <PinPad
            key={step}
            title={step === "choose" ? "Choose a PIN" : "Type it again"}
            hint={step === "choose" ? `Pick ${PIN_LENGTH} digits you will remember.` : "Enter the same PIN to confirm."}
            error={error}
            onSubmit={save}
          />
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => {
                setStep("idle");
                setError(null);
                setFirst("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
