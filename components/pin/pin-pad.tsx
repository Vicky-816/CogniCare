"use client";

import { useRef, useState } from "react";
import { Delete } from "lucide-react";

import { PIN_LENGTH } from "@/lib/profiles/pin";
import { cn } from "@/lib/utils";

/**
 * A big number pad for entering the family PIN on a touch screen. A physical
 * keyboard works too. `onSubmit` is called once PIN_LENGTH digits are entered.
 */
export function PinPad({
  title,
  hint,
  error,
  onSubmit,
}: {
  title: string;
  hint?: string;
  error?: string | null;
  onSubmit: (pin: string) => Promise<void> | void;
}) {
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  function press(digit: string) {
    if (busy) return;
    const next = (pin + digit).slice(0, PIN_LENGTH);
    setPin(next);
    if (next.length === PIN_LENGTH) {
      setBusy(true);
      Promise.resolve(onSubmit(next)).finally(() => {
        setPin("");
        setBusy(false);
      });
    }
  }

  function erase() {
    if (!busy) setPin((value) => value.slice(0, -1));
  }

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"];

  return (
    <div
      ref={root}
      className="mx-auto w-full max-w-xs space-y-6 text-center"
      onKeyDown={(event) => {
        if (/^\d$/.test(event.key)) press(event.key);
        else if (event.key === "Backspace") erase();
      }}
    >
      <div className="space-y-2">
        <h2 className="text-3xl font-bold">{title}</h2>
        {hint && <p className="text-lg text-muted-foreground">{hint}</p>}
      </div>

      <div
        role="img"
        aria-label={`${pin.length} of ${PIN_LENGTH} digits entered`}
        className="flex justify-center gap-4"
      >
        {Array.from({ length: PIN_LENGTH }, (_, index) => (
          <span
            key={index}
            className={cn("size-5 rounded-full border-2 border-primary", index < pin.length && "bg-primary")}
          />
        ))}
      </div>

      <p role="alert" className="min-h-7 text-lg font-semibold text-destructive">
        {error}
      </p>

      <div className="grid grid-cols-3 gap-3">
        {keys.map((key, index) =>
          key === "" ? (
            <span key={index} />
          ) : (
            <button
              key={key}
              type="button"
              disabled={busy}
              aria-label={key === "back" ? "Delete last digit" : key}
              onClick={() => (key === "back" ? erase() : press(key))}
              className="flex min-h-16 tile items-center justify-center rounded-2xl border-2 border-primary bg-card font-display text-3xl font-bold [--lip:#9aa4bb] hover:bg-secondary focus-visible:ring-4 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              {key === "back" ? <Delete aria-hidden className="size-7" /> : key}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
