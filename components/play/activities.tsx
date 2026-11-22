"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, ChevronLeft, ListOrdered, Puzzle, Shapes, UserRound, Utensils } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { usePlay } from "@/components/play/play-context";
import { RestSuggestion } from "@/components/play/rest-suggestion";
import type { GameSession } from "@/lib/games/memory-match";
import { loadAllGameHistory } from "@/lib/games/session-history";
import { GAME_THEME, type GameId } from "@/lib/games/theme";
import { isGameVisible } from "@/lib/games/visible-games";
import { useLifeStory } from "@/lib/life-story/use-life-story";
import { syncPendingSessions } from "@/lib/supabase/sync";
import { cn } from "@/lib/utils";

export const GAMES: { id: GameId; icon: LucideIcon; line: string }[] = [
  { id: "memory-match", icon: Puzzle, line: "Find the matching pairs." },
  { id: "sequence-recall", icon: ListOrdered, line: "Watch, then repeat the order." },
  { id: "pattern-practice", icon: Shapes, line: "Spot what comes next." },
  { id: "daily-routine", icon: Utensils, line: "Everyday objects and habits." },
  { id: "who-is-this", icon: UserRound, line: "Names to go with familiar faces." },
];

function daysAgo(from: Date, then: Date) {
  const start = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((start(from) - start(then)) / 86_400_000);
}

/** Games and activities, one tap away from the Today board. */
export function Activities() {
  const { profile, profileId } = usePlay();
  const life = useLifeStory(profileId);
  // null until the browser has read what is saved on this device.
  const [sessions, setSessions] = useState<GameSession[] | null>(null);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setNow(new Date());
      setSessions(loadAllGameHistory(profileId));
    });
    void syncPendingSessions(profileId).then((result) => {
      if (!cancelled && result.history.length) setSessions(result.history);
    });
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  const firstName = profile.displayName.trim().split(/\s+/)[0];
  // Photo games appear once there are enough photos; general games only when the family turns them on.
  const photosReady = life.status !== "loading";
  const visibility = { showGeneralGames: profile.showGeneralGames, photoCount: life.items.length };
  const games = photosReady ? GAMES.filter((game) => isGameVisible(game.id, visibility)) : [];
  const nothingToPlay = photosReady && games.length === 0;

  // Suggest the game that has waited longest (never-played games come first).
  const suggestion = (() => {
    if (!sessions || !photosReady || games.length === 0) return null;
    const lastPlayed = (id: GameId) => sessions.find((s) => s.game === id)?.completedAt ?? "";
    return [...games].sort((a, b) => lastPlayed(a.id).localeCompare(lastPlayed(b.id)))[0];
  })();

  return (
    <div className="space-y-10">
      <div className="space-y-4">
        <Link
          href={`/play/${profileId}`}
          className="inline-flex min-h-12 items-center gap-1 rounded-lg text-xl font-semibold text-primary underline-offset-4 hover:underline"
        >
          <ChevronLeft aria-hidden className="size-6" />
          Back to today
        </Link>
        <h1 className="text-4xl font-bold sm:text-5xl">Activities</h1>
      </div>

      <RestSuggestion />

      <div>
        {suggestion && sessions ? (
          (() => {
            const theme = GAME_THEME[suggestion.id];
            const Icon = suggestion.icon;
            const last = sessions.find((s) => s.game === suggestion.id);
            const when = last && now ? daysAgo(now, new Date(last.completedAt)) : null;
            return (
              <Link
                href={`/play/${profileId}/games/${suggestion.id}`}
                className={cn(
                  "flex min-h-64 tile flex-col justify-between gap-8 rounded-3xl p-6 focus-visible:ring-4 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none sm:p-8",
                  theme.solid,
                  theme.lip,
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <p className="text-xl font-semibold">Today&rsquo;s game</p>
                  <Icon aria-hidden className="size-14" strokeWidth={1.5} />
                </div>
                <div className="space-y-2">
                  <p className="font-display text-4xl leading-tight font-bold sm:text-5xl">{theme.label}</p>
                  <p className="text-xl">
                    {last && when !== null
                      ? `You played this ${when === 0 ? "today" : when === 1 ? "yesterday" : `${when} days ago`}.`
                      : "A good one to start with."}
                  </p>
                </div>
                <span className="flex w-fit items-center gap-2 rounded-2xl bg-white px-6 py-3 text-xl font-bold text-primary">
                  Play now
                  <ArrowRight aria-hidden className="size-6" />
                </span>
              </Link>
            );
          })()
        ) : nothingToPlay ? (
          <section
            aria-label="Time to relax"
            className="flex min-h-64 flex-col justify-center gap-3 rounded-3xl bg-accent-soft p-6 sm:p-8"
          >
            <p className="font-display text-4xl leading-tight font-bold">Time to relax, {firstName}.</p>
            <p className="text-xl">Your family will add photos and activities here.</p>
          </section>
        ) : (
          <div aria-hidden className="min-h-64 rounded-3xl bg-muted" />
        )}
      </div>

      {games.length > 0 && (
        <section aria-labelledby="all-games-heading" className="space-y-5">
          <h2 id="all-games-heading" className="text-3xl font-bold">
            All games
          </h2>
          <ul role="list" className="grid gap-5 sm:grid-cols-2">
            {games.map(({ id, icon: Icon, line }) => {
              const theme = GAME_THEME[id];
              return (
                <li key={id}>
                  <Link
                    href={`/play/${profileId}/games/${id}`}
                    className={cn(
                      "flex h-full min-h-40 tile items-center gap-5 rounded-3xl p-6 focus-visible:ring-4 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
                      theme.solid,
                      theme.lip,
                    )}
                  >
                    <Icon aria-hidden className="size-14 shrink-0" strokeWidth={1.5} />
                    <span className="space-y-1">
                      <span className="block font-display text-3xl leading-tight font-bold">{theme.label}</span>
                      <span className="block text-lg">{line}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
