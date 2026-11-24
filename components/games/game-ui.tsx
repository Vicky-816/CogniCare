"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { RotateCcw, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { usePlay } from "@/components/play/play-context";
import { GUEST_PROFILE_ID } from "@/lib/games/guest";
import { extendSession, isSessionOver, touchSession } from "@/lib/play/session-timer";
import { GAME_THEME, type GameId } from "@/lib/games/theme";
import { cn } from "@/lib/utils";

// Wrapped in a function so the lint rule about "impure" calls is happy: it is
// only called from effects and event handlers, never while drawing.
const timestamp = () => Date.now();

/** A small, quiet "Start again" button above a game. */
export function RestartButton({ onRestart }: { onRestart: () => void }) {
  return (
    <div className="flex justify-end">
      <Button variant="ghost" size="sm" onClick={onRestart}>
        <RotateCcw aria-hidden className="size-5" />
        Start again
      </Button>
    </div>
  );
}

/** Dots showing how far through a short game you are. */
export function RoundDots({ game, total, current }: { game: GameId; total: number; current: number }) {
  const theme = GAME_THEME[game];
  return (
    <div role="img" aria-label={`Question ${Math.min(current, total)} of ${total}`} className="flex items-center gap-2">
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={cn(
            "size-4 rounded-full border-2",
            index + 1 < current && cn(theme.pip, theme.border),
            index + 1 === current && cn("bg-card", theme.border, "scale-125"),
            index + 1 > current && "border-border bg-card",
          )}
        />
      ))}
    </div>
  );
}

const PRAISE = ["That was lovely.", "You did that so nicely.", "That was a good one.", "Nicely done."];

/**
 * The "you finished" screen. It is deliberately gentle: no score, no
 * accuracy, no levels. The family sees those in their own area. When the
 * session length chosen by the family is up, it suggests a rest.
 */
export function ResultCard({ game, onPlayAgain }: { game: GameId; onPlayAgain: () => void }) {
  const theme = GAME_THEME[game];
  const { profile, profileId } = usePlay();
  const heading = useRef<HTMLHeadingElement>(null);
  const [over, setOver] = useState(false);
  const [praise] = useState(() => PRAISE[Math.floor(Math.random() * PRAISE.length)]);
  const firstName = profile.displayName.trim().split(/\s+/)[0];

  // Move focus to the heading so keyboard and screen reader users land on the result.
  useEffect(() => {
    heading.current?.focus();
    touchSession(profileId, timestamp());
    queueMicrotask(() => setOver(isSessionOver(profileId, profile.sessionMinutes, timestamp())));
  }, [profileId, profile.sessionMinutes]);

  return (
    <section
      aria-labelledby="game-result"
      className={cn("space-y-6 rounded-3xl border-2 p-6 text-center sm:p-10", theme.soft, theme.border)}
    >
      <span aria-hidden className="mx-auto flex size-24 items-center justify-center rounded-full bg-accent">
        <Sun className="size-14" strokeWidth={1.75} />
      </span>
      <div className="space-y-2">
        <h2 id="game-result" ref={heading} tabIndex={-1} className="text-4xl font-bold outline-none sm:text-5xl">
          {over ? "That is a good amount for today" : `Well done, ${firstName}!`}
        </h2>
        <p className="text-xl">{over ? "Time for a rest, and maybe a cup of tea. You did lovely." : praise}</p>
      </div>

      <div className="flex flex-wrap justify-center gap-4">
        {over ? (
          <>
            <Button asChild size="lg">
              <Link href="/play">Take a rest</Link>
            </Button>
            <Button
              variant="ghost"
              size="lg"
              onClick={() => {
                extendSession(profileId, timestamp());
                onPlayAgain();
              }}
            >
              Play one more
            </Button>
          </>
        ) : (
          <>
            <Button size="lg" onClick={onPlayAgain} className={cn(theme.solid, theme.lip, "hover:opacity-90")}>
              Play again
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href={profileId === GUEST_PROFILE_ID ? "/#games-heading" : `/play/${profileId}/activities`}>
                Choose another activity
              </Link>
            </Button>
          </>
        )}
      </div>
    </section>
  );
}

