"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

import { PinPad } from "@/components/pin/pin-pad";
import { Button } from "@/components/ui/button";
import { checkPin } from "@/lib/profiles/pin";
import { getProfileStore } from "@/lib/profiles/store";

/** A pop-up that asks for the family PIN. Calls onUnlocked when it is right. */
export function PinDialog({
  open,
  onClose,
  onUnlocked,
}: {
  open: boolean;
  onClose: () => void;
  onUnlocked: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  async function submit(pin: string) {
    const record = await getProfileStore().getPin();
    if (!record) {
      onUnlocked();
      return;
    }
    if (await checkPin(pin, record)) {
      setError(null);
      onUnlocked();
    } else {
      setError("That PIN is not right. Try again.");
    }
  }

  return (
    <dialog
      ref={dialog}
      aria-label="Family PIN"
      onClose={() => {
        setError(null);
        onClose();
      }}
      className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-3xl border-2 bg-card p-6 text-foreground backdrop:bg-primary/60"
    >
      <div className="mb-2 flex justify-end">
        <Button type="button" variant="ghost" size="icon" aria-label="Close" onClick={() => dialog.current?.close()}>
          <X aria-hidden />
        </Button>
      </div>
      {open && (
        <PinPad title="Family PIN" hint="Enter the PIN to open the family area." error={error} onSubmit={submit} />
      )}
    </dialog>
  );
}
