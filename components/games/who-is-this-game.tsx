"use client";

import Link from "next/link";
import { useCallback } from "react";

import { ChoiceRoundsGame } from "@/components/games/choice-rounds-game";
import { usePlay } from "@/components/play/play-context";
import { Button } from "@/components/ui/button";
import { calculateChoiceScore } from "@/lib/games/pattern-practice";
import { WHO_MIN_ITEMS, buildWhoQuestions } from "@/lib/games/who-is-this";
import { useLifeStory } from "@/lib/life-story/use-life-story";

/** Shows photos from the person's own Life Story and asks for their names. */
export function WhoIsThisGame() {
  const { profile, profileId } = usePlay();
  const { status, items } = useLifeStory(profileId);
  const support = profile.supportLevel;

  const getQuestions = useCallback(
    (level: number, count: number) => buildWhoQuestions(items, level, count, support),
    [items, support],
  );

  if (status === "loading") {
    return (
      <p role="status" className="rounded-2xl border-2 bg-card p-6 text-center text-lg">
        Getting the photos ready…
      </p>
    );
  }

  if (items.length < WHO_MIN_ITEMS) {
    return (
      <div className="space-y-5 rounded-3xl border-2 bg-card p-6 text-center sm:p-10">
        <h2 className="text-3xl font-bold">This game needs a few photos</h2>
        <p className="text-xl text-muted-foreground">
          Ask your family to add photos of people and places you know. Then this game will be ready.
        </p>
        <Button asChild size="lg">
          <Link href={`/play/${profileId}/activities`}>Back to the activities</Link>
        </Button>
      </div>
    );
  }

  return <ChoiceRoundsGame game="who-is-this" getQuestions={getQuestions} calculateScore={calculateChoiceScore} />;
}
