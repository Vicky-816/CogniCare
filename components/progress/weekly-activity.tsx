"use client";

import { useEffect, useState } from "react";
import type { GameSession } from "@/lib/games/memory-match";
import { addDays, dayKey } from "@/lib/schedule/time";

export function WeeklyActivity({ sessions, timeZone }: { sessions: GameSession[]; timeZone: string }) {
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => {
    const update = () => setToday(dayKey(new Date(), timeZone));
    queueMicrotask(update);
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, [timeZone]);
  if (!today) return null;

  const days = Array.from({ length: 7 }, (_, index) => addDays(today, index - 6));
  const dated = sessions
    .filter((session) => Number.isFinite(Date.parse(session.completedAt)))
    .map((session) => ({
      session,
      date: dayKey(new Date(session.completedAt), timeZone),
    }));
  const recent = dated.filter(({ date }) => date >= days[0] && date <= today);
  const previous = dated.filter(({ date }) => date >= addDays(today, -13) && date < days[0]);
  const counts = days.map((date) => recent.filter((item) => item.date === date).length);
  const minutes = Math.round(
    recent.reduce((sum, { session }) => sum + Math.max(0, session.durationSeconds || 0), 0) / 60,
  );
  const difference = recent.length - previous.length;
  const maximum = Math.max(1, ...counts);

  return (
    <section aria-labelledby="weekly-heading" className="space-y-5 rounded-3xl border-2 bg-card p-5 sm:p-8">
      <h3 id="weekly-heading" className="text-3xl font-bold">
        Activity over the last 7 days
      </h3>
      <dl className="grid gap-4 sm:grid-cols-3">
        <div>
          <dt className="text-lg">Games completed</dt>
          <dd className="text-3xl font-bold">{recent.length}</dd>
        </div>
        <div>
          <dt className="text-lg">Days with activity</dt>
          <dd className="text-3xl font-bold">{counts.filter(Boolean).length} of 7</dd>
        </div>
        <div>
          <dt className="text-lg">Time in completed games</dt>
          <dd className="text-3xl font-bold">{minutes} min</dd>
        </div>
      </dl>
      <ol aria-label="Daily completed games" className="grid grid-cols-7 gap-2">
        {days.map((date, index) => {
          const label = new Date(date + "T12:00:00Z").toLocaleDateString("en", {
            timeZone: "UTC",
            day: "numeric",
            month: "short",
          });
          return (
            <li key={date} className="min-w-0 text-center">
              <div className="flex h-28 flex-col items-center justify-end gap-1">
                <span className="text-lg font-bold">{counts[index]}</span>
                <div
                  aria-hidden
                  className="w-full max-w-10 rounded-t-lg bg-primary"
                  style={{ height: counts[index] ? `${(counts[index] / maximum) * 80}px` : "2px" }}
                />
              </div>
              <span className="block pt-2 text-sm">{label}</span>
            </li>
          );
        })}
      </ol>
      <p className="text-lg">
        {previous.length && difference === 0
          ? "The same number of completed games as the previous 7 days."
          : previous.length
            ? `${Math.abs(difference)} ${difference < 0 ? "fewer" : "more"} completed games than the previous 7 days.`
            : "No completed games were recorded in the previous 7 days."}
      </p>
      <p className="text-base text-muted-foreground">
        Across all games, based on available saved sessions in {timeZone}. Time spent in unfinished games is excluded.
      </p>
    </section>
  );
}
