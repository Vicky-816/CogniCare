import type { ComponentType, ReactNode } from "react";

import { DailyRoutineGame } from "@/components/games/daily-routine-game";
import { MemoryMatchGame } from "@/components/games/memory-match-game";
import { PatternPracticeGame } from "@/components/games/pattern-practice-game";
import { SequenceRecallGame } from "@/components/games/sequence-recall-game";
import { WhoIsThisGame } from "@/components/games/who-is-this-game";
import { GAME_IDS } from "@/lib/games/session-history";
import type { GameId } from "@/lib/games/theme";

export function isGameId(value: string): value is GameId {
  return (GAME_IDS as string[]).includes(value);
}

/** What each game's page shows around the game itself. */
export const GAME_PAGES: Record<GameId, { intro: string; steps: ReactNode[]; tip: string; Game: ComponentType }> = {
  "memory-match": {
    intro:
      "Turn over two cards at a time. If they show the same picture, they stay face up. Keep going until every pair is matched.",
    steps: [
      "Choose one card to turn it over.",
      "Choose a second card. If the two pictures match, the cards stay face up.",
      "If they do not match, they turn back over after a moment. Try to remember where each picture was.",
    ],
    tip: "There is no time limit. Take as long as you need.",
    Game: MemoryMatchGame,
  },
  "sequence-recall": {
    intro: "Watch a short sequence of pictures, then choose the same pictures in the same order.",
    steps: [
      <>
        Choose <strong>Show sequence</strong> and watch each highlighted picture.
      </>,
      "When the pictures stop, choose them in the same order.",
      "Complete three rounds. Each round adds one more picture.",
    ],
    tip: "There is no time limit. Take your time before choosing each picture.",
    Game: SequenceRecallGame,
  },
  "pattern-practice": {
    intro: "Look at the pictures and choose the item that completes the pattern.",
    steps: [
      "Each question has a missing picture, shown as a box with a question mark.",
      "Look for what repeats or changes, then choose the best answer.",
      "Answer three questions. The patterns become more detailed as your level goes up.",
    ],
    tip: "There is no time limit. Take your time and choose one large answer button.",
    Game: PatternPracticeGame,
  },
  "daily-routine": {
    intro: "Recognise familiar objects and choose sensible everyday actions.",
    steps: [
      "Look at the familiar picture and read the question.",
      "Choose the answer that best fits the everyday task.",
      "Answer three questions. They become more detailed as your level goes up.",
    ],
    tip: "There is no time limit. You can use a mouse, keyboard, or touch.",
    Game: DailyRoutineGame,
  },
  "who-is-this": {
    intro: "Look at a photo of someone or somewhere you know, then choose the right name.",
    steps: [
      "Look at the photo for as long as you like.",
      "Touch the name that belongs to it.",
      "If it is not the right one, do not worry. Just have another look and try again.",
    ],
    tip: "There is no time limit, and no wrong answers to worry about.",
    Game: WhoIsThisGame,
  },
};
