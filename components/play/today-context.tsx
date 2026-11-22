"use client";

import { createContext, useContext, type ReactNode } from "react";

import { usePlay } from "@/components/play/play-context";
import { ReminderCard } from "@/components/play/reminder-card";
import { useLifeStory } from "@/lib/life-story/use-life-story";
import type { Occurrence } from "@/lib/schedule/occurrences";
import { useTodayPlan } from "@/lib/schedule/use-schedule";

type Today = ReturnType<typeof useTodayPlan>;

const TodayContext = createContext<Today | null>(null);

/**
 * Today's plan for the person on this tablet, loaded once for every /play/[id] screen,
 * so the Today board and the reminder card always agree and nothing is recorded twice.
 * When a reminder is due, its card appears on top of whatever is on screen (even a game).
 */
export function TodayProvider({
  profileId,
  timeZone,
  children,
}: {
  profileId: string;
  timeZone: string;
  children: ReactNode;
}) {
  const today = useTodayPlan(profileId, timeZone);
  const due = today.plan?.due ?? null;
  return (
    <TodayContext.Provider value={today}>
      {children}
      {due && <DueReminder key={due.key} occurrence={due} today={today} />}
    </TodayContext.Provider>
  );
}

function DueReminder({ occurrence, today }: { occurrence: Occurrence; today: Today }) {
  const { profile, profileId } = usePlay();
  const life = useLifeStory(profileId);
  const photo = occurrence.reminder.photoItemId
    ? life.items.find((item) => item.id === occurrence.reminder.photoItemId)
    : undefined;
  return (
    <ReminderCard
      occurrence={occurrence}
      photo={photo}
      firstName={profile.displayName.trim().split(/\s+/)[0]}
      language={profile.language}
      onDone={() => void today.done(occurrence)}
      onLater={() => void today.later(occurrence)}
    />
  );
}

export function useToday(): Today {
  const today = useContext(TodayContext);
  if (!today) throw new Error("useToday must be used inside TodayProvider");
  return today;
}
