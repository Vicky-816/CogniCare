"use client";

import { useActionState, useState } from "react";
import { Gamepad2, HeartHandshake } from "lucide-react";
import { chooseExperience, type ChoiceState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ChoiceForm({ defaultName }: { defaultName: string }) {
  const [state, action, pending] = useActionState<ChoiceState, FormData>(chooseExperience, undefined);
  const [kind, setKind] = useState<"player" | "caregiver" | null>(null);
  return (
    <div className="w-full max-w-xl space-y-6 rounded-3xl border-2 bg-card p-6 sm:p-10">
      <div className="space-y-3">
        <h1 className="text-4xl font-bold">How will you use CogniCare?</h1>
        <p className="text-lg text-muted-foreground">Choose the option that fits you. You only need to do this once.</p>
      </div>
      <form action={action} className="space-y-6">
        <fieldset className="space-y-3">
          <legend className="sr-only">Choose how you will use CogniCare</legend>
          {(
            [
              {
                value: "player",
                title: "I want to play myself",
                detail: "Set up my own space to play.",
                Icon: Gamepad2,
              },
              {
                value: "caregiver",
                title: "I am a caretaker",
                detail: "Set up games for someone I care for.",
                Icon: HeartHandshake,
              },
            ] as const
          ).map(({ value, title, detail, Icon }) => (
            <label key={value} className="relative block cursor-pointer">
              <input
                type="radio"
                name="kind"
                value={value}
                required
                checked={kind === value}
                onChange={() => setKind(value)}
                className="peer sr-only"
              />
              <span className="flex min-h-24 items-center gap-4 rounded-2xl border-2 border-input p-4 peer-checked:border-primary peer-checked:bg-accent-soft peer-focus-visible:ring-4 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2">
                <Icon aria-hidden className="size-8 shrink-0 text-primary" />
                <span>
                  <span className="block text-xl font-bold">{title}</span>
                  <span className="block text-base text-muted-foreground">{detail}</span>
                </span>
              </span>
            </label>
          ))}
        </fieldset>
        {kind === "player" && (
          <label className="block space-y-2 text-lg font-semibold">
            Your name
            <Input name="name" defaultValue={defaultName} maxLength={60} required autoComplete="name" />
          </label>
        )}
        {state?.error && (
          <p
            role="alert"
            className="rounded-xl border-2 border-destructive bg-destructive/10 p-4 text-lg text-destructive"
          >
            {state.error}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={pending || !kind}>
          {pending ? "Setting things up…" : "Continue"}
        </Button>
      </form>
    </div>
  );
}
