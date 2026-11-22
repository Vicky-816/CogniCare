"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { eventFor, missedYesterday, todayPlan, type Occurrence } from "@/lib/schedule/occurrences";
import { getScheduleStore, scheduleNeedsDatabaseUpdate } from "@/lib/schedule/store";
import { addDays, dayKey, zonedToUtc } from "@/lib/schedule/time";
import { SNOOZE_MINUTES, type NewReminder, type Reminder, type ReminderEvent } from "@/lib/schedule/types";

/** How often the clock is re-checked. Short enough that a card appears within seconds of its time. */
const TICK_MS = 15_000;
/** How often the reminders themselves are re-read (the carer may edit them from another device). */
const RELOAD_MS = 5 * 60_000;

type Data = { reminders: Reminder[]; events: ReminderEvent[] };

/** Midnight at the start of yesterday on the person's calendar: we load outcomes from then. */
function startOfYesterday(now: Date, timeZone: string) {
  return zonedToUtc(addDays(dayKey(now, timeZone), -1), "00:00", timeZone);
}

async function loadData(profileId: string, timeZone: string): Promise<Data> {
  const store = getScheduleStore();
  const [reminders, events] = await Promise.all([
    store.listReminders(profileId),
    store.listEvents(profileId, startOfYesterday(new Date(), timeZone)),
  ]);
  return { reminders, events };
}

/** The current time, refreshed on a steady tick and whenever the screen wakes up. */
function useNow(): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const update = () => setNow(new Date());
    queueMicrotask(update);
    const timer = window.setInterval(update, TICK_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") update();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", update);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", update);
    };
  }, []);
  return now;
}

/** Loads reminders and outcomes, and reloads them when the screen wakes or another tab changes them. */
function useScheduleData(profileId: string, timeZone: string) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const next = await loadData(profileId, timeZone);
      setData(next);
      setError(null);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The schedule could not be loaded.");
    }
  }, [profileId, timeZone]);

  useEffect(() => {
    let cancelled = false;
    void loadData(profileId, timeZone)
      .then((next) => {
        if (!cancelled) setData(next);
      })
      .catch((failure: unknown) => {
        if (!cancelled) setError(failure instanceof Error ? failure.message : "The schedule could not be loaded.");
      });
    void getScheduleStore().syncPending(profileId);
    const timer = window.setInterval(() => void reload(), RELOAD_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void getScheduleStore().syncPending(profileId);
        void reload();
      }
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key?.includes(profileId)) void reload();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);
    window.addEventListener("storage", onStorage);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onVisible);
      window.removeEventListener("storage", onStorage);
    };
  }, [profileId, timeZone, reload]);

  /** Save an outcome and show it straight away. */
  const record = useCallback(async (event: ReminderEvent) => {
    setData((current) =>
      current
        ? {
            ...current,
            events: [
              ...current.events.filter(
                (existing) => !(existing.reminderId === event.reminderId && existing.dueAt === event.dueAt),
              ),
              event,
            ],
          }
        : current,
    );
    await getScheduleStore().recordEvent(event);
  }, []);

  return { data, error, reload, record };
}

/** The tablet's view of today: what is due, what is next, and the Done / Later actions. */
export function useTodayPlan(profileId: string, timeZone: string) {
  const now = useNow();
  const { data, record } = useScheduleData(profileId, timeZone);

  const plan = useMemo(
    () => (data && now ? todayPlan(data.reminders, data.events, now, timeZone) : null),
    [data, now, timeZone],
  );

  // Quietly record anything that was missed (today, or yesterday if the tablet was off), once.
  const recorded = useRef(new Set<string>());
  useEffect(() => {
    if (!plan || !data || !now) return;
    const missed = [...plan.newlyMissed, ...missedYesterday(data.reminders, data.events, now, timeZone)];
    for (const occurrence of missed) {
      if (recorded.current.has(occurrence.key)) continue;
      recorded.current.add(occurrence.key);
      void record(eventFor(occurrence, "missed", null, now));
    }
  }, [plan, data, now, timeZone, record]);

  const done = useCallback(
    (occurrence: Occurrence) => record(eventFor(occurrence, "done", "patient", new Date())),
    [record],
  );
  const later = useCallback(
    (occurrence: Occurrence) =>
      record(eventFor(occurrence, "later", "patient", new Date(), { snoozeMinutes: SNOOZE_MINUTES })),
    [record],
  );

  return { now, plan, reminders: data?.reminders ?? null, done, later };
}

/** The family area's view: every reminder, today's outcomes, and the carer's actions. */
export function useSchedule(profileId: string, timeZone: string) {
  const now = useNow();
  const { data, error, reload, record } = useScheduleData(profileId, timeZone);

  const today = useMemo(
    () => (data && now ? todayPlan(data.reminders, data.events, now, timeZone) : null),
    [data, now, timeZone],
  );

  const save = useCallback(
    async (input: NewReminder, existing?: Reminder) => {
      const saved = await getScheduleStore().saveReminder(profileId, input, existing);
      await reload();
      return saved;
    },
    [profileId, reload],
  );

  const stop = useCallback(
    async (reminder: Reminder) => {
      await getScheduleStore().stopReminder(reminder);
      await reload();
    },
    [reload],
  );

  /** The carer marks it done (or confirms the tablet's "done" for medicine that needs a check). */
  const markDone = useCallback(
    (occurrence: Occurrence) => record(eventFor(occurrence, "done", "carer", new Date())),
    [record],
  );

  return {
    now,
    reminders: data?.reminders ?? null,
    today,
    error,
    needsDatabaseUpdate: scheduleNeedsDatabaseUpdate(),
    save,
    stop,
    markDone,
    reload,
  };
}
