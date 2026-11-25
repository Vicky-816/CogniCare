"use client";

import { useEffect, useRef, useState } from "react";
import { DEMO_PROFILE_ID } from "@/lib/demo-mode";
import { putPhoto } from "@/lib/life-story/photo-cache";
import { dayKey, localParts } from "@/lib/schedule/time";
import { Button } from "@/components/ui/button";

async function prepareDemo() {
  const now = new Date();
  const profileId = DEMO_PROFILE_ID;
  const timezone = "Asia/Kolkata";
  const createdAt = new Date(now.getTime() - 86_400_000).toISOString();
  const samples = [
    { label: "Priya", note: "Your daughter", kind: "person", file: "daughter" },
    { label: "Arun", note: "Your son", kind: "person", file: "son" },
    { label: "Garden", note: "A peaceful place to sit", kind: "place", file: "garden" },
    { label: "Tea", note: "Your afternoon cup of tea", kind: "thing", file: "tea" },
  ];
  const items = await Promise.all(
    samples.map(async (sample) => {
      const id = `sample-${sample.file}`;
      const response = await fetch(`/demo/${sample.file}.jpg`);
      if (!response.ok || !(await putPhoto(id, await response.blob())))
        throw new Error("Could not prepare the sample photos. Please retry.");
      return { id, profileId, kind: sample.kind, label: sample.label, note: sample.note, createdAt };
    }),
  );
  const write = (key: string, value: unknown) => localStorage.setItem(key, JSON.stringify(value));
  write("demo:mindplay:profiles:v1", [
    {
      id: profileId,
      displayName: "Meera",
      supportLevel: 1,
      sessionMinutes: 15,
      language: "en",
      timezone,
      showGeneralGames: true,
      createdAt,
    },
  ]);
  write(`mindplay:life:v1:${profileId}`, items);
  const { hour, minute } = localParts(now, timezone);
  const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  write(`mindplay:reminders:v1:${profileId}`, [
    {
      id: "sample-water",
      profileId,
      title: "Have a glass of water",
      kind: "water",
      repeat: { type: "once", date: dayKey(now, timezone) },
      times: [time],
      photoItemId: null,
      speakText: "Meera, it is time to have a glass of water.",
      graceMinutes: 60,
      needsConfirmation: false,
      active: true,
      activeFrom: createdAt,
      createdAt,
    },
  ]);
  write(`mindplay:reminder-events:v1:${profileId}`, []);
  write(
    `mindplay:p:${profileId}:memory-match:sessions:v1`,
    Array.from({ length: 7 }, (_, index) => ({
      id: `sample-game-${index}`,
      game: "memory-match",
      completedAt: new Date(now.getTime() - index * 86_400_000).toISOString(),
      level: index < 3 ? 2 : 1,
      pairs: 4,
      moves: 5 + index,
      mistakes: 1 + index,
      accuracy: Math.round(400 / (5 + index)),
      attempts: 5 + index,
      durationSeconds: 90 + index * 15,
      score: 390 - index * 10,
    })),
  );
  document.cookie = "cognicare-demo=1; Path=/; SameSite=Lax";
  window.location.replace(`/play/${profileId}`);
}

export default function DemoPage() {
  const started = useRef(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void prepareDemo().catch((cause) =>
      setError(cause instanceof Error ? cause.message : "Please allow browser storage and retry."),
    );
  }, []);
  return (
    <main id="main-content" className="mx-auto max-w-xl space-y-6 px-6 py-20">
      <h1 className="text-4xl font-bold">Preparing your demo</h1>
      <p role="status" className="text-xl">
        Opening Meera’s sample profile with familiar photos, a reminder, and a week of activity. No account needed.
      </p>
      {error && (
        <>
          <p role="alert">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </>
      )}
    </main>
  );
}
