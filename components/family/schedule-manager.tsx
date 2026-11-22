"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BellOff, Check, ChevronLeft, Clock, Pencil, Plus, Volume2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { useLifeStory } from "@/lib/life-story/use-life-story";
import { getProfileStore } from "@/lib/profiles/store";
import type { CareProfile } from "@/lib/profiles/types";
import type { Occurrence } from "@/lib/schedule/occurrences";
import { canSpeak, speak } from "@/lib/schedule/speech";
import { dayKey, localParts, timeInWords } from "@/lib/schedule/time";
import {
  DEFAULT_GRACE_MINUTES,
  describeRepeat,
  KIND_LABEL,
  MAX_REMINDERS,
  MAX_SPEAK_LENGTH,
  MAX_TIMES,
  MAX_TITLE_LENGTH,
  REMINDER_KINDS,
  WEEKDAY_NAMES,
  type NewReminder,
  type Reminder,
  type ReminderKind,
  type Weekday,
} from "@/lib/schedule/types";
import { useSchedule } from "@/lib/schedule/use-schedule";

const GRACE_OPTIONS = [15, 30, 60, 120];
/** Monday first, the way most calendars show a week. */
const WEEK_ORDER: Weekday[] = [1, 2, 3, 4, 5, 6, 0];

type Form = {
  title: string;
  kind: ReminderKind;
  times: string[];
  repeatType: "daily" | "weekdays" | "once";
  days: Weekday[];
  date: string;
  photoItemId: string;
  speakText: string;
  graceMinutes: number;
  needsConfirmation: boolean;
};

function emptyForm(today: string): Form {
  return {
    title: "",
    kind: "medicine",
    times: ["08:00"],
    repeatType: "daily",
    days: [1, 2, 3, 4, 5],
    date: today,
    photoItemId: "",
    speakText: "",
    graceMinutes: DEFAULT_GRACE_MINUTES,
    needsConfirmation: false,
  };
}

function formFrom(reminder: Reminder, today: string): Form {
  const repeat = reminder.repeat;
  return {
    title: reminder.title,
    kind: reminder.kind,
    times: [...reminder.times],
    repeatType: repeat.type,
    days: repeat.type === "weekdays" ? [...repeat.days] : [1, 2, 3, 4, 5],
    date: repeat.type === "once" ? repeat.date : today,
    photoItemId: reminder.photoItemId ?? "",
    speakText: reminder.speakText ?? "",
    graceMinutes: reminder.graceMinutes,
    needsConfirmation: reminder.needsConfirmation,
  };
}

function toInput(form: Form): NewReminder {
  return {
    title: form.title,
    kind: form.kind,
    times: form.times,
    repeat:
      form.repeatType === "weekdays"
        ? { type: "weekdays", days: form.days }
        : form.repeatType === "once"
          ? { type: "once", date: form.date }
          : { type: "daily" },
    photoItemId: form.photoItemId || null,
    speakText: form.speakText,
    graceMinutes: form.graceMinutes,
    needsConfirmation: form.needsConfirmation,
  };
}

/** What the carer sees for each of today's times. Missed is amber, never red. */
function StatusLabel({ item }: { item: Occurrence }) {
  const base = "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-base font-semibold";
  switch (item.status) {
    case "done": {
      const needsCheck =
        item.reminder.needsConfirmation && item.event?.actedBy === "patient" && !item.event.confirmedAt;
      if (needsCheck)
        return <span className={`${base} bg-accent-soft text-warning`}>Done on the tablet: please check</span>;
      return (
        <span className={`${base} bg-routine-soft text-success`}>
          <Check aria-hidden className="size-4" />
          Done{item.event?.actedBy === "carer" ? " (marked by you)" : ""}
        </span>
      );
    }
    case "missed":
      return <span className={`${base} bg-accent-soft text-warning`}>Missed</span>;
    case "due":
      return <span className={`${base} bg-memory-soft text-memory`}>Showing on the tablet now</span>;
    case "snoozed":
      return <span className={`${base} bg-memory-soft text-memory`}>Asked for a little more time</span>;
    default:
      return (
        <span className={`${base} bg-muted text-muted-foreground`}>
          <Clock aria-hidden className="size-4" />
          Waiting
        </span>
      );
  }
}

export function ScheduleManager({ profileId }: { profileId: string }) {
  const [profile, setProfile] = useState<CareProfile | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const found = await getProfileStore().get(profileId);
        if (!cancelled) setProfile(found);
      } catch {
        if (!cancelled) setProfile(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  if (profile === undefined)
    return (
      <p role="status" className="text-lg">
        Loading…
      </p>
    );
  if (profile === null)
    return (
      <div className="space-y-5 rounded-3xl border-2 bg-card p-8">
        <h1 className="text-4xl font-bold">We could not find that person</h1>
        <Button asChild size="lg">
          <Link href="/family">Back to the family area</Link>
        </Button>
      </div>
    );
  return <Schedule profile={profile} />;
}

function Schedule({ profile }: { profile: CareProfile }) {
  const name = profile.displayName;
  const { reminders, today, error, needsDatabaseUpdate, save, stop, markDone } = useSchedule(
    profile.id,
    profile.timezone,
  );
  const { items: photos } = useLifeStory(profile.id);

  const todayKey = dayKey(new Date(), profile.timezone);
  const [form, setForm] = useState<Form>(() => emptyForm(todayKey));
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [stoppingId, setStoppingId] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const formRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const active = (reminders ?? []).filter((reminder) => reminder.active);
  const full = !editing && active.length >= MAX_REMINDERS;
  const update = (patch: Partial<Form>) => setForm((current) => ({ ...current, ...patch }));

  function startEdit(reminder: Reminder) {
    setEditing(reminder);
    setForm(formFrom(reminder, todayKey));
    setFormError(null);
    setNotice(null);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    titleRef.current?.focus({ preventScroll: true });
  }

  function cancelEdit() {
    setEditing(null);
    setForm(emptyForm(todayKey));
    setFormError(null);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    setNotice(null);
    try {
      const saved = await save(toInput(form), editing ?? undefined);
      const clock = localParts(new Date(), profile.timezone);
      const nowTime = `${String(clock.hour).padStart(2, "0")}:${String(clock.minute).padStart(2, "0")}`;
      const passed = saved.times.some((time) => time <= nowTime)
        ? " Times that have already passed today start next time."
        : "";
      setNotice(
        (editing ? `${saved.title} was changed. The change applies from now on.` : `${saved.title} was added.`) +
          passed,
      );
      setEditing(null);
      setForm(emptyForm(todayKey));
    } catch (failure) {
      setFormError(failure instanceof Error ? failure.message : "The reminder could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function stopReminder(reminder: Reminder) {
    setListError(null);
    try {
      await stop(reminder);
      setStoppingId(null);
      if (editing?.id === reminder.id) cancelEdit();
      setNotice(`${reminder.title} was stopped. Its history is kept.`);
    } catch (failure) {
      setListError(failure instanceof Error ? failure.message : "The reminder could not be stopped.");
    }
  }

  async function confirmDone(item: Occurrence) {
    setListError(null);
    try {
      await markDone(item);
    } catch (failure) {
      setListError(failure instanceof Error ? failure.message : "That could not be saved.");
    }
  }

  const spoken = form.speakText.trim() || form.title.trim();

  return (
    <div className="space-y-10">
      <div className="space-y-4">
        <Link
          href={`/family/profiles/${profile.id}`}
          className="inline-flex min-h-12 items-center gap-1 rounded-lg text-lg font-semibold text-primary underline-offset-4 hover:underline"
        >
          <ChevronLeft aria-hidden className="size-5" />
          Back to {name}
        </Link>
        <h1 className="text-4xl font-bold [overflow-wrap:anywhere] sm:text-5xl">Daily schedule for {name}</h1>
        <p className="max-w-3xl text-xl text-muted-foreground">
          Reminders for medicine, meals, water and visits. At each time the tablet shows a calm card, reads it aloud and
          offers <strong>Done</strong> or <strong>Later</strong>. This supports daily life and carers; it does not
          replace medical advice.
        </p>
        <p className="max-w-3xl text-lg text-muted-foreground">
          Times are {name}&rsquo;s local time ({profile.timezone}). The tablet must be switched on with the app open for
          a reminder to appear.
        </p>
        {needsDatabaseUpdate && (
          <p role="status" className="max-w-3xl rounded-xl bg-accent-soft p-4 text-lg">
            Reminders need a database update before they can be saved to your account. Ask whoever set up the app to run
            the reminders update in Supabase (see the README, step 3).
          </p>
        )}
        {error && (
          <p role="alert" className="text-lg font-semibold text-destructive">
            {error}
          </p>
        )}
      </div>

      <section aria-labelledby="today-heading" className="space-y-5">
        <h2 id="today-heading" className="text-3xl font-bold">
          Today
        </h2>
        <div aria-live="polite">
          {listError && (
            <p role="alert" className="text-lg font-semibold text-destructive">
              {listError}
            </p>
          )}
        </div>
        {!today && (
          <p role="status" className="text-lg">
            Loading the schedule…
          </p>
        )}
        {today && today.items.length === 0 && (
          <p className="rounded-2xl border-2 border-dashed p-6 text-lg text-muted-foreground">
            Nothing is planned for today. Add a reminder below.
          </p>
        )}
        {today && today.items.length > 0 && (
          <ul role="list" className="space-y-3">
            {today.items.map((item) => {
              const needsCheck =
                item.status === "done" &&
                item.reminder.needsConfirmation &&
                item.event?.actedBy === "patient" &&
                !item.event.confirmedAt;
              const canMark = item.status !== "done" || needsCheck;
              return (
                <li
                  key={item.key}
                  data-testid="today-item"
                  className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border-2 bg-card p-4 sm:p-5 ${
                    item.status === "missed" || needsCheck ? "border-warning/60" : ""
                  }`}
                >
                  <div className="min-w-0 space-y-1">
                    <p className="text-lg text-muted-foreground">{timeInWords(item.time)}</p>
                    <p className="text-2xl font-bold [overflow-wrap:anywhere]">{item.reminder.title}</p>
                    <StatusLabel item={item} />
                  </div>
                  {canMark && (
                    <Button
                      variant="outline"
                      onClick={() => void confirmDone(item)}
                      aria-label={`${needsCheck ? "Confirm" : "Mark done"}: ${item.reminder.title} at ${timeInWords(item.time)}`}
                    >
                      <Check aria-hidden />
                      {needsCheck ? "Confirm" : "Mark done"}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section
        ref={formRef}
        aria-labelledby="form-heading"
        className="scroll-mt-6 space-y-5 rounded-3xl border-2 bg-card p-6 sm:p-8"
      >
        <h2 id="form-heading" className="text-2xl font-bold [overflow-wrap:anywhere]">
          {editing ? `Change “${editing.title}”` : "Add a reminder"}
        </h2>
        {full ? (
          <p className="text-lg text-muted-foreground">
            You have the most reminders allowed ({MAX_REMINDERS}). Stop one to add another.
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block space-y-2 text-lg font-semibold">
                What is it for?
                <Input
                  ref={titleRef}
                  value={form.title}
                  onChange={(event) => update({ title: event.target.value })}
                  maxLength={MAX_TITLE_LENGTH}
                  required
                  autoComplete="off"
                  placeholder="For example, Morning tablets"
                />
              </label>
              <label className="block space-y-2 text-lg font-semibold">
                Type
                <Select value={form.kind} onChange={(event) => update({ kind: event.target.value as ReminderKind })}>
                  {REMINDER_KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {KIND_LABEL[kind]}
                    </option>
                  ))}
                </Select>
              </label>
            </div>

            <fieldset className="space-y-3">
              <legend className="text-lg font-semibold">At what time?</legend>
              <ul role="list" className="flex flex-wrap gap-3">
                {form.times.map((time, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={time}
                      required
                      aria-label={`Time ${index + 1}`}
                      className="w-40"
                      onChange={(event) =>
                        update({ times: form.times.map((value, at) => (at === index ? event.target.value : value)) })
                      }
                    />
                    {form.times.length > 1 && (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={`Remove time ${index + 1}`}
                        onClick={() => update({ times: form.times.filter((_, at) => at !== index) })}
                      >
                        <X aria-hidden />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
              {form.times.length < MAX_TIMES && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => update({ times: [...form.times, "12:00"] })}
                >
                  <Plus aria-hidden className="size-5" />
                  Add another time
                </Button>
              )}
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="text-lg font-semibold">How often?</legend>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {(
                  [
                    ["daily", "Every day"],
                    ["weekdays", "On chosen days"],
                    ["once", "Only once"],
                  ] as const
                ).map(([value, label]) => (
                  <label key={value} className="flex min-h-12 items-center gap-3 text-lg">
                    <input
                      type="radio"
                      name="repeat"
                      value={value}
                      checked={form.repeatType === value}
                      onChange={() => update({ repeatType: value })}
                      className="size-6 accent-primary"
                    />
                    {label}
                  </label>
                ))}
              </div>
              {form.repeatType === "weekdays" && (
                <fieldset className="flex flex-wrap gap-2">
                  <legend className="sr-only">Days of the week</legend>
                  {WEEK_ORDER.map((day) => {
                    const checked = form.days.includes(day);
                    return (
                      <label
                        key={day}
                        className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border-2 px-3 text-base font-semibold has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-ring ${
                          checked ? "border-primary bg-secondary" : "border-input"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            update({
                              days: checked ? form.days.filter((value) => value !== day) : [...form.days, day],
                            })
                          }
                          className="size-5 accent-primary"
                        />
                        {WEEKDAY_NAMES[day]}
                      </label>
                    );
                  })}
                </fieldset>
              )}
              {form.repeatType === "once" && (
                <label className="block max-w-xs space-y-2 text-lg font-semibold">
                  Date
                  <Input
                    type="date"
                    value={form.date}
                    min={todayKey}
                    required
                    onChange={(event) => update({ date: event.target.value })}
                  />
                </label>
              )}
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="text-lg font-semibold">Photo on the card (optional)</legend>
              {photos.length === 0 ? (
                <p className="text-base text-muted-foreground">
                  No photos yet.{" "}
                  <Link href={`/family/profiles/${profile.id}/life-story`} className="font-semibold underline">
                    Add photos to the life story
                  </Link>{" "}
                  to show one here, such as the tablet box or a family member.
                </p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  <label
                    className={`flex size-24 cursor-pointer items-center justify-center rounded-2xl border-2 text-center text-base font-semibold has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-ring ${
                      form.photoItemId === "" ? "border-primary bg-secondary" : "border-input"
                    }`}
                  >
                    <input
                      type="radio"
                      name="photo"
                      className="sr-only"
                      checked={form.photoItemId === ""}
                      onChange={() => update({ photoItemId: "" })}
                    />
                    No photo
                  </label>
                  {photos.map((photo) => (
                    <label
                      key={photo.id}
                      className={`relative size-24 cursor-pointer overflow-hidden rounded-2xl border-4 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-ring ${
                        form.photoItemId === photo.id ? "border-primary" : "border-transparent"
                      }`}
                    >
                      <input
                        type="radio"
                        name="photo"
                        className="sr-only"
                        checked={form.photoItemId === photo.id}
                        onChange={() => update({ photoItemId: photo.id })}
                      />
                      {/* A plain <img>: the photo is a local blob, so next/image has nothing to optimise. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.photoUrl} alt={photo.label} className="size-full object-cover" />
                    </label>
                  ))}
                </div>
              )}
            </fieldset>

            <div className="space-y-2">
              <label className="block space-y-2 text-lg font-semibold">
                What should the tablet say?
                <Input
                  value={form.speakText}
                  onChange={(event) => update({ speakText: event.target.value })}
                  maxLength={MAX_SPEAK_LENGTH}
                  autoComplete="off"
                  placeholder={form.title.trim() || "For example, Time for your morning tablets, with water."}
                />
              </label>
              <p className="text-base text-muted-foreground">
                Short and friendly works best. If you leave this empty, the tablet reads the title.
              </p>
              {canSpeak() && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={!spoken}
                  onClick={() => void speak(spoken, profile.language)}
                >
                  <Volume2 aria-hidden className="size-5" />
                  Hear it
                </Button>
              )}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block space-y-2 text-lg font-semibold">
                Count as missed after
                <Select
                  value={String(form.graceMinutes)}
                  onChange={(event) => update({ graceMinutes: Number(event.target.value) })}
                >
                  {[...new Set([...GRACE_OPTIONS, form.graceMinutes])]
                    .sort((a, b) => a - b)
                    .map((minutes) => (
                      <option key={minutes} value={minutes}>
                        {minutes < 60 ? `${minutes} minutes` : minutes === 60 ? "1 hour" : `${minutes / 60} hours`}
                      </option>
                    ))}
                </Select>
              </label>
              <label className="flex min-h-12 items-center gap-3 self-end text-lg">
                <input
                  type="checkbox"
                  checked={form.needsConfirmation}
                  onChange={(event) => update({ needsConfirmation: event.target.checked })}
                  className="size-6 shrink-0 accent-primary"
                />
                A carer should check it was really done
              </label>
            </div>

            <div aria-live="polite">
              {formError && (
                <p role="alert" className="text-lg font-semibold text-destructive">
                  {formError}
                </p>
              )}
              {notice && (
                <p role="status" className="text-lg text-success">
                  {notice}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <Button type="submit" size="lg" disabled={saving || !form.title.trim()}>
                {saving ? "Saving…" : editing ? "Save changes" : "Add reminder"}
              </Button>
              {editing && (
                <Button type="button" size="lg" variant="ghost" onClick={cancelEdit}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        )}
      </section>

      <section aria-labelledby="all-heading" className="space-y-5">
        <h2 id="all-heading" className="text-3xl font-bold">
          All reminders ({active.length})
        </h2>
        {reminders && active.length === 0 && (
          <p className="rounded-2xl border-2 border-dashed p-6 text-lg text-muted-foreground">
            No reminders yet. Add the first one above.
          </p>
        )}
        {active.length > 0 && (
          <ul role="list" className="grid gap-4 lg:grid-cols-2">
            {active.map((reminder) => (
              <li key={reminder.id} className="flex flex-col gap-4 rounded-3xl border-2 bg-card p-5">
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold [overflow-wrap:anywhere]">{reminder.title}</h3>
                  <p className="text-base font-semibold text-routine">{KIND_LABEL[reminder.kind]}</p>
                  <p className="text-lg">
                    {describeRepeat(reminder.repeat)}, {reminder.times.map(timeInWords).join(", ")}
                  </p>
                  {reminder.speakText && (
                    <p className="text-lg [overflow-wrap:anywhere] text-muted-foreground">
                      Says: “{reminder.speakText}”
                    </p>
                  )}
                </div>
                <div className="mt-auto flex flex-wrap gap-2">
                  {stoppingId === reminder.id ? (
                    <>
                      <Button size="sm" variant="destructive" onClick={() => void stopReminder(reminder)}>
                        <BellOff aria-hidden className="size-5" />
                        Yes, stop it
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setStoppingId(null)}>
                        Keep
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="outline" onClick={() => startEdit(reminder)}>
                        <Pencil aria-hidden className="size-5" />
                        Change
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setStoppingId(reminder.id)}>
                        <BellOff aria-hidden className="size-5" />
                        Stop
                      </Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
