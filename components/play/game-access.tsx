"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { usePlay } from "@/components/play/play-context";
import type { GameId } from "@/lib/games/theme";
import { isGameVisible } from "@/lib/games/visible-games";
import { useLifeStory } from "@/lib/life-story/use-life-story";

/**
 * Shows a game only if it is switched on for this person (see visible-games).
 * Otherwise, for example after following an old link, it quietly goes back to
 * their home screen: no error message in patient mode.
 */
export function GameAccess({ game, children }: { game: GameId; children: ReactNode }) {
  const { profile, profileId } = usePlay();
  const life = useLifeStory(profileId);
  const router = useRouter();
  const checked = life.status !== "loading";
  const allowed =
    checked && isGameVisible(game, { showGeneralGames: profile.showGeneralGames, photoCount: life.items.length });

  useEffect(() => {
    if (checked && !allowed) router.replace(`/play/${profileId}`);
  }, [checked, allowed, router, profileId]);

  if (!allowed) {
    return (
      <p role="status" className="text-xl">
        Getting ready…
      </p>
    );
  }
  return children;
}
