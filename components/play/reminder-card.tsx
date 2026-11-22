"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Clock, Volume2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Language } from "@/lib/profiles/types";
import type { LifeItemWithPhoto } from "@/lib/life-story/types";
import type { Occurrence } from "@/lib/schedule/occurrences";
import { playChime } from "@/lib/schedule/chime";
import { speak, stopSpeaking } from "@/lib/schedule/speech";
import { timeInWords } from "@/lib/schedule/time";

/** If nobody has tapped anything, the card reads itself once more after a minute. Only once. */
const REPEAT_AFTER_MS = 60_000;

/**
 * The full-screen reminder: photo, big words, a soft chime and the words read aloud,
 * with two large buttons. No countdown, nothing negative. It cannot be closed by accident
 * (Escape does nothing); "Later" brings it back in ten minutes.
 */
export function ReminderCard({
  occurrence,
  photo,
  firstName,
  language,
  onDone,
  onLater,
}: {
  occurrence: Occurrence;
  photo?: LifeItemWithPhoto;
  firstName: string;
  language: Language;
  onDone: () => void;
  onLater: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const doneButton = useRef<HTMLButtonElement>(null);
  const [blocked, setBlocked] = useState(false);
  const words = occurrence.reminder.speakText || occurrence.reminder.title;
  const spoken = `${firstName}. ${words}`;

  // Open as a modal: everything behind it is inert, and focus stays inside.
  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
    doneButton.current?.focus();
    return () => {
      stopSpeaking();
      if (element?.open) element.close();
    };
  }, []);

  // Chime, then read it aloud; once more after a minute if untouched.
  useEffect(() => {
    let cancelled = false;
    const announce = async () => {
      const chimed = await playChime();
      if (cancelled) return;
      const heard = await speak(spoken, language);
      if (!cancelled) setBlocked(!chimed && !heard);
    };
    void announce();
    const again = window.setTimeout(() => void announce(), REPEAT_AFTER_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(again);
    };
  }, [spoken, language]);

  async function hear() {
    // This is a tap, so the browser now allows sound.
    const chimed = await playChime();
    const heard = await speak(spoken, language);
    setBlocked(!chimed && !heard);
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby="reminder-title"
      aria-describedby="reminder-words"
      data-testid="reminder-card"
      onCancel={(event) => event.preventDefault()}
      className="fixed inset-0 m-0 size-full max-h-none max-w-none overflow-y-auto bg-background p-0 text-foreground backdrop:bg-primary/70"
    >
      <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col items-center justify-center gap-8 p-6 text-center sm:p-10 motion-safe:animate-in motion-safe:duration-500 motion-safe:fade-in">
        <p className="flex items-center gap-2 text-2xl font-semibold text-muted-foreground">
          <Clock aria-hidden className="size-7" />
          {timeInWords(occurrence.time)}
        </p>
        {photo && (
          // A plain <img>: the photo is a local blob, so next/image has nothing to optimise.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo.photoUrl}
            alt={photo.label}
            className="aspect-square w-full max-w-72 rounded-3xl border-4 border-card object-cover shadow-md"
          />
        )}
        <h2
          id="reminder-title"
          className="font-display text-5xl leading-tight font-bold [overflow-wrap:anywhere] sm:text-6xl"
        >
          {occurrence.reminder.title}
        </h2>
        <p id="reminder-words" className="max-w-2xl text-2xl [overflow-wrap:anywhere] sm:text-3xl">
          {words}
        </p>

        <div className="grid w-full max-w-xl gap-4 sm:grid-cols-2">
          <Button ref={doneButton} size="lg" className="min-h-20 text-3xl" onClick={onDone}>
            <Check aria-hidden className="size-9" />
            Done
          </Button>
          <Button size="lg" variant="outline" className="min-h-20 text-3xl" onClick={onLater}>
            <Clock aria-hidden className="size-9" />
            Later
          </Button>
        </div>

        <Button
          size={blocked ? "lg" : "default"}
          variant={blocked ? "accent" : "ghost"}
          className={blocked ? "min-h-16 text-2xl" : "text-xl"}
          onClick={() => void hear()}
        >
          <Volume2 aria-hidden className={blocked ? "size-8" : "size-6"} />
          {blocked ? "Tap to hear" : "Hear it again"}
        </Button>
      </div>
    </dialog>
  );
}
