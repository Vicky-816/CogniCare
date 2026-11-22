import { MIN_PERSONAL_ITEMS } from "@/lib/games/memory-match";
import type { GameId } from "@/lib/games/theme";
import { WHO_MIN_ITEMS } from "@/lib/games/who-is-this";

/*
 * Which games the person sees on the tablet. CogniCare is a daily-life
 * companion first, so the four general games are hidden unless a carer turns
 * them on. Games built from the family's own photos show when there are
 * enough photos:
 *   - "Who is this?" needs WHO_MIN_ITEMS photos.
 *   - Memory Match uses the family's photos once there are MIN_PERSONAL_ITEMS.
 */

/** The four games that do not use the family's photos (Memory Match falls back to symbols). */
export const GENERAL_GAMES: readonly GameId[] = [
  "memory-match",
  "sequence-recall",
  "pattern-practice",
  "daily-routine",
];

/** All games, in the order they appear on the home screen. */
const ALL_GAMES: readonly GameId[] = [...GENERAL_GAMES, "who-is-this"];

export type GameVisibility = {
  /** The carer's "Show general games" setting for this person. */
  showGeneralGames: boolean;
  /** How many Life Story photos this person has. */
  photoCount: number;
};

export function isGameVisible(game: GameId, { showGeneralGames, photoCount }: GameVisibility): boolean {
  if (game === "who-is-this") return photoCount >= WHO_MIN_ITEMS;
  if (game === "memory-match") return showGeneralGames || photoCount >= MIN_PERSONAL_ITEMS;
  return showGeneralGames;
}

export function visibleGames(visibility: GameVisibility): GameId[] {
  return ALL_GAMES.filter((game) => isGameVisible(game, visibility));
}
