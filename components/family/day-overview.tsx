import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { CareProfile } from "@/lib/profiles/types";
import { needsCaregiverCheck } from "@/lib/schedule/occurrences";
import { timeInWords } from "@/lib/schedule/time";
import { useSchedule } from "@/lib/schedule/use-schedule";

export function DayOverview({ profile }: { profile: CareProfile }) {
  const { today, error, needsDatabaseUpdate } = useSchedule(profile.id, profile.timezone);
  const followUp = today?.items.filter((item) => item.status === "missed" || needsCaregiverCheck(item)) ?? [];
  const done = today?.items.filter((item) => item.status === "done").length ?? 0;
  return (
    <section aria-labelledby="day-heading" className="space-y-4 rounded-3xl border-2 bg-card p-6 sm:p-8">
      <h2 id="day-heading" className="text-3xl font-bold">
        Today’s care overview
      </h2>
      {error || needsDatabaseUpdate ? (
        <p role="status">The schedule is unavailable. Open the schedule for details.</p>
      ) : !today ? (
        <p role="status">Loading today’s reminders…</p>
      ) : today.items.length === 0 ? (
        <p className="text-lg">Nothing scheduled today. Add a meal, visit or other reminder.</p>
      ) : (
        <>
          <p className="text-xl">
            {done} of {today.items.length} reminders marked done.
          </p>
          {followUp.length > 0 && (
            <div className="space-y-2 rounded-2xl bg-accent-soft p-4">
              <h3 className="text-xl font-bold">Needs a check</h3>
              <ul className="list-disc space-y-2 pl-6 text-lg">
                {followUp.map((item) => (
                  <li key={item.key} className="[overflow-wrap:anywhere]">
                    <strong>{item.reminder.title}</strong> · {timeInWords(item.time)} ·{" "}
                    {item.status === "missed"
                      ? "No completion recorded"
                      : "Marked done on the tablet, awaiting your confirmation"}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {today.next && (
            <p className="text-lg [overflow-wrap:anywhere]">
              Next on the schedule · {today.next.reminder.title} · {timeInWords(today.next.time)}
            </p>
          )}
        </>
      )}
      <Button asChild size="lg">
        <Link href={`/family/profiles/${profile.id}/schedule`}>
          Open the schedule <ArrowRight aria-hidden />
        </Link>
      </Button>
    </section>
  );
}
