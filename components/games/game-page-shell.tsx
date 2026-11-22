import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronDown, ChevronLeft, Lightbulb, ListOrdered, Puzzle, Shapes, UserRound, Utensils } from "lucide-react";

import { GAME_THEME, type GameId } from "@/lib/games/theme";
import { cn } from "@/lib/utils";

const ICONS: Record<GameId, LucideIcon> = {
  "memory-match": Puzzle,
  "sequence-recall": ListOrdered,
  "pattern-practice": Shapes,
  "daily-routine": Utensils,
  "who-is-this": UserRound,
};

type Props = {
  game: GameId;
  /** Where the back link goes (the person's home screen). */
  backHref: string;
  intro: string;
  /** The "How to play" steps, in order. */
  steps: ReactNode[];
  tip: string;
  /** The game itself. */
  children: ReactNode;
};

function Fold({
  id,
  title,
  defaultOpen,
  children,
}: {
  id: string;
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details open={defaultOpen} className="group rounded-2xl border-2 bg-card">
      <summary
        id={id}
        className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-5 py-3 font-display text-2xl font-bold marker:hidden [&::-webkit-details-marker]:hidden"
      >
        {title}
        <ChevronDown aria-hidden className="size-7 shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-4 px-5 pt-1 pb-6">{children}</div>
    </details>
  );
}

// Every game page uses the same layout: a title, how to play (open the first
// time, can be folded away), the game itself, then how the difficulty changes.
export function GamePageShell({ game, backHref, intro, steps, tip, children }: Props) {
  const theme = GAME_THEME[game];
  const Icon = ICONS[game];

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-4">
        <Link
          href={backHref}
          className="inline-flex min-h-12 items-center gap-1 rounded-lg text-lg font-semibold text-primary underline-offset-4 hover:underline"
        >
          <ChevronLeft aria-hidden className="size-5" />
          Back
        </Link>
        <div className="flex items-center gap-4">
          <span
            aria-hidden
            className={cn("flex size-16 shrink-0 items-center justify-center rounded-2xl", theme.solid)}
          >
            <Icon className="size-9" strokeWidth={1.75} />
          </span>
          <h1 className="text-4xl font-bold sm:text-5xl">{theme.label}</h1>
        </div>
        <p className="text-xl text-muted-foreground">{intro}</p>
      </div>

      <Fold id="how-to-play" title="How to play">
        <ol role="list" className="space-y-3 text-lg">
          {steps.map((step, index) => (
            <li key={index} className="flex gap-3">
              <span
                aria-hidden
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full text-base font-bold",
                  theme.solid,
                )}
              >
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <p className="flex items-start gap-3 rounded-xl bg-accent-soft p-4 text-lg">
          <Lightbulb aria-hidden className="mt-0.5 size-6 shrink-0" />
          {tip}
        </p>
      </Fold>

      {children}
    </div>
  );
}
