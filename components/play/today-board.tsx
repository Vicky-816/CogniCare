"use client";

import Link from "next/link";
import { Bell, Check, Sparkles } from "lucide-react";

import { usePlay } from "@/components/play/play-context";
import { RestSuggestion } from "@/components/play/rest-suggestion";
import { useToday } from "@/components/play/today-context";
import { Button } from "@/components/ui/button";
import { visibleGames } from "@/lib/games/visible-games";
import { useLifeStory } from "@/lib/life-story/use-life-story";
import type { Occurrence } from "@/lib/schedule/occurrences";
import { dayInWords, localParts, partOfDay, timeInWords, type PartOfDay } from "@/lib/schedule/time";
import { cn } from "@/lib/utils";

/** A calm background that follows the day. Soft tones from the design tokens only. */
const DAY_TONE: Record<PartOfDay, string> = {
  morning: "bg-accent-soft",
  afternoon: "bg-memory-soft",
  evening: "bg-sequence-soft",
  night: "bg-secondary",
};

const GREETING: Record<PartOfDay, string> = {
  morning: "Good morning",
  afternoon: "Good afternoon",
  evening: "Good evening",
  night: "Hello",
};

/** The tablet's home screen: what day it is, what is happening now, and what comes later. */
export function TodayBoard() {
  const { profile, profileId } = usePlay();
  const { now, plan, done } = useToday();
  const life = useLifeStory(profileId);

  const firstName = profile.displayName.trim().split(/\s+/)[0];
  const part = now ? partOfDay(localParts(now, profile.timezone).hour) : null;
  const photoFor = (item: Occurrence) =>
    item.reminder.photoItemId ? life.items.find((photo) => photo.id === item.reminder.photoItemId) : undefined;
  const hasActivities =
    life.status !== "loading" &&
    visibleGames({ showGeneralGames: profile.showGeneralGames, photoCount: life.items.length }).length > 0;

  const next = plan?.next ?? null;
  const isNow = next?.status === "due" || next?.status === "snoozed";
  const nextPhoto = next ? photoFor(next) : undefined;

  return (
    <div className="space-y-8">
      <section
        aria-labelledby="today-heading"
        className={cn("space-y-2 rounded-3xl p-6 transition-colors sm:p-8", part ? DAY_TONE[part] : "bg-muted")}
      >
        <h1 id="today-heading" className="text-4xl font-bold [overflow-wrap:anywhere] sm:text-5xl">
          {part ? GREETING[part] : "Hello"}, {firstName}.
        </h1>
        <p className="min-h-9 text-2xl font-semibold sm:text-3xl">{now ? dayInWords(now, profile.timezone) : ""}</p>
      </section>

      <RestSuggestion />

      {plan && plan.items.length === 0 && (
        <section aria-label="Today" className="rounded-3xl border-2 bg-card p-6 sm:p-8">
          <p className="font-display text-4xl leading-tight font-bold">A quiet day, {firstName}.</p>
        </section>
      )}

      {plan && plan.items.length > 0 && !next && (
        <section aria-label="Today" className="rounded-3xl border-2 bg-card p-6 sm:p-8">
          <p className="font-display text-3xl leading-tight font-bold">Nothing more is planned for today.</p>
        </section>
      )}

      {next && (
        <section
          aria-labelledby="next-heading"
          data-testid="today-next"
          className={cn(
            "flex flex-col gap-6 overflow-hidden rounded-3xl border-2 bg-card p-6 sm:flex-row sm:items-center sm:p-8",
            isNow && "border-primary",
          )}
        >
          {nextPhoto && (
            // A plain <img>: the photo is a local blob, so next/image has nothing to optimise.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={nextPhoto.photoUrl}
              alt={nextPhoto.label}
              className="aspect-square w-full max-w-60 shrink-0 rounded-2xl object-cover"
            />
          )}
          <div className="min-w-0 flex-1 space-y-3">
            <h2 id="next-heading" className="flex items-center gap-2 text-xl font-semibold text-muted-foreground">
              <Bell aria-hidden className="size-6" />
              {isNow ? "Now" : `Next, at ${timeInWords(next.time)}`}
            </h2>
            <p className="font-display text-4xl leading-tight font-bold [overflow-wrap:anywhere] sm:text-5xl">
              {next.reminder.title}
            </p>
            {next.reminder.speakText && <p className="text-xl [overflow-wrap:anywhere]">{next.reminder.speakText}</p>}
            {isNow && (
              <Button size="lg" className="min-h-16 text-2xl" onClick={() => void done(next)}>
                <Check aria-hidden className="size-7" />
                Done
              </Button>
            )}
          </div>
        </section>
      )}

      {plan && plan.later.length > 0 && (
        <section aria-labelledby="later-heading" className="space-y-4">
          <h2 id="later-heading" className="text-3xl font-bold">
            Later today
          </h2>
          <ul role="list" className="space-y-3">
            {plan.later.map((item) => (
              <li
                key={item.key}
                className="flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-2xl border-2 bg-card px-5 py-4"
              >
                <span className="text-xl font-semibold text-muted-foreground">{timeInWords(item.time)}</span>
                <span className="text-2xl font-bold [overflow-wrap:anywhere]">{item.reminder.title}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {hasActivities ? (
        <Link
          href={`/play/${profileId}/activities`}
          className="flex min-h-24 tile items-center justify-center gap-3 rounded-3xl bg-accent p-6 font-display text-3xl font-bold text-accent-foreground [--lip:#a37700] hover:bg-[#ffc61a] focus-visible:ring-4 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <Sparkles aria-hidden className="size-9" />
          Activities
        </Link>
      ) : (
        life.status !== "loading" && (
          <p className="rounded-3xl bg-muted p-6 text-xl">
            Time to relax, {firstName}. Your family will add photos and activities here.
          </p>
        )
      )}
    </div>
  );
}
