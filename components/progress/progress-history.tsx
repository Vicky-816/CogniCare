"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, CircleCheck, Gamepad2, Target } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { GameSession } from "@/lib/games/memory-match";
import { GAME_IDS, loadAllGameHistory } from "@/lib/games/session-history";
import { GAME_THEME } from "@/lib/games/theme";
import { supabaseEnv } from "@/lib/supabase/env";
import { syncPendingSessions } from "@/lib/supabase/sync";
import { cn } from "@/lib/utils";
import { Select } from "@/components/ui/input";
import { WeeklyActivity } from "@/components/progress/weekly-activity";

const CHART_GAMES = 12;

export function ProgressHistory({
  profileId,
  title = "My progress",
  intro = "Your completed games and how accurate you have been recently.",
  playHref,
  timeZone = "Asia/Kolkata",
}: {
  profileId: string;
  title?: string;
  intro?: string;
  /** Where the "Play a game" button goes. Leave out to hide the button. */
  playHref?: string;
  timeZone?: string;
}) {
  // null means "still reading what is saved on this device".
  const [sessions, setSessions] = useState<GameSession[] | null>(null);
  const [selectedGame, setSelectedGame] = useState("all");
  const [syncState, setSyncState] = useState(
    supabaseEnv() ? "Checking your accountâ€¦" : "Your games are saved on this device.",
  );

  useEffect(() => {
    let cancelled = false;
    // Show what is on this device straight away, then update from the account.
    queueMicrotask(() => {
      if (!cancelled) setSessions(loadAllGameHistory(profileId));
    });
    void syncPendingSessions(profileId)
      .then((result) => {
        if (cancelled) return;
        if (result.history.length) setSessions(result.history);
        if (result.error) setSyncState("Your account could not be reached. Your games on this device are still shown.");
        else if (result.synced > 0) setSyncState("Your games were saved to your account.");
        else if (result.signedIn) setSyncState("Your account is up to date.");
        else if (result.configured)
          setSyncState("Your games are saved on this device. Sign in to keep a backup in your account.");
        else setSyncState("Your games are saved on this device.");
      })
      .catch(() => {
        if (!cancelled) setSyncState("Your account could not be reached. Your games on this device are still shown.");
      });
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  if (sessions === null) {
    return (
      <p role="status" className="text-lg">
        Loading your activity historyâ€¦
      </p>
    );
  }

  const filtered = sessions.filter((session) => selectedGame === "all" || session.game === selectedGame);
  const averageAccuracy = filtered.length
    ? Math.round(filtered.reduce((total, session) => total + session.accuracy, 0) / filtered.length)
    : null;
  // Oldest on the left, newest on the right.
  const chartSessions = filtered.slice(0, CHART_GAMES).reverse();
  const gamesTried = new Set(filtered.map((session) => session.game)).size;

  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <h2 className="text-4xl font-bold sm:text-5xl">{title}</h2>
        <p className="text-xl text-muted-foreground">{intro}</p>
      </div>

      <WeeklyActivity sessions={sessions} timeZone={timeZone} />
      <label className="block max-w-sm space-y-2 text-lg font-semibold">
        Filter activity history
        <Select value={selectedGame} onChange={(event) => setSelectedGame(event.target.value)}>
          <option value="all">All games</option>
          {GAME_IDS.map((game) => (
            <option key={game} value={game}>
              {GAME_THEME[game].label}
            </option>
          ))}
        </Select>
      </label>
      <div className="grid gap-4 sm:grid-cols-3">
        <Summary icon={Gamepad2} label="Games completed" value={String(filtered.length)} />
        <Summary
          icon={Target}
          label="Average accuracy"
          value={averageAccuracy === null ? "â€”" : `${averageAccuracy}%`}
        />
        <Summary icon={CircleCheck} label="Different games tried" value={`${gamesTried} of ${GAME_IDS.length}`} />
      </div>

      <section aria-labelledby="accuracy-heading" className="space-y-5 rounded-3xl border-2 bg-card p-5 sm:p-8">
        <div className="space-y-1">
          <h2 id="accuracy-heading" className="text-3xl font-bold">
            Recent accuracy
          </h2>
          {chartSessions.length > 0 && (
            <p className="text-lg text-muted-foreground">
              Each bar is one game. A taller bar means more answers or moves were right. The newest game is on the
              right.
            </p>
          )}
        </div>
        {chartSessions.length ? (
          <>
            <div tabIndex={0} role="region" aria-label="Recent accuracy chart" className="overflow-x-auto pb-2">
              <ol role="list" className="flex min-w-max items-end gap-3 border-b-2 border-foreground/50">
                {chartSessions.map((session) => (
                  <li key={`${session.game}-${session.id}`} className="flex w-20 flex-col items-center">
                    <div className="flex h-48 w-full flex-col items-center justify-end gap-1">
                      <span className="text-lg font-bold">{session.accuracy}%</span>
                      <div
                        aria-hidden
                        className={cn("w-12 rounded-t-xl", GAME_THEME[session.game].pip)}
                        style={{ height: `${Math.max(session.accuracy, 3) * 1.4}px` }}
                      />
                    </div>
                    <span className="mt-2 text-center text-base leading-tight font-semibold">
                      {GAME_THEME[session.game].label}
                    </span>
                    <span className="text-center text-sm text-muted-foreground">
                      {new Date(session.completedAt).toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                        timeZone,
                      })}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
            <ul role="list" aria-label="Colour key" className="flex flex-wrap gap-x-6 gap-y-2 text-base">
              {GAME_IDS.map((game) => (
                <li key={game} className="flex items-center gap-2">
                  <span aria-hidden className={cn("size-4 rounded-sm", GAME_THEME[game].pip)} />
                  {GAME_THEME[game].label}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-lg text-muted-foreground">Complete a game to start your progress chart.</p>
        )}
      </section>

      <section aria-labelledby="history-heading" className="space-y-4">
        <h2 id="history-heading" className="text-3xl font-bold">
          Activity history
        </h2>
        {filtered.length ? (
          <ul role="list" className="divide-y-2 rounded-2xl border-2 bg-card px-5">
            {filtered.map((session) => (
              <li
                key={`${session.game}-${session.id}`}
                className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-4"
              >
                <div className="flex items-center gap-4">
                  <span aria-hidden className={cn("size-4 shrink-0 rounded-full", GAME_THEME[session.game].pip)} />
                  <div>
                    <p className="text-xl font-bold">{GAME_THEME[session.game].label}</p>
                    <p className="text-base text-muted-foreground">
                      {new Date(session.completedAt).toLocaleString(undefined, { timeZone })}
                    </p>
                  </div>
                </div>
                <dl className="flex flex-wrap gap-x-6 gap-y-1 text-lg">
                  <Fact label="Accuracy" value={`${session.accuracy}%`} />
                  <Fact label="Time" value={`${Math.round(session.durationSeconds / 60)} min`} />
                  <Fact label="Level" value={String(session.level)} />
                </dl>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl border-2 border-dashed p-6 text-lg text-muted-foreground">
            No completed games in this view yet.
          </p>
        )}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-accent-soft p-5">
        <p role="status" className="text-lg">
          {syncState}
        </p>
        {playHref && (
          <Button asChild>
            <Link href={playHref}>
              Play a game
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

function Summary({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border-2 bg-card p-5">
      <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-accent-soft">
        <Icon aria-hidden className="size-7" />
      </span>
      <div>
        <p className="text-base font-semibold text-muted-foreground">{label}</p>
        <p className="font-display text-4xl leading-tight font-bold">{value}</p>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-bold">{value}</dd>
    </div>
  );
}

