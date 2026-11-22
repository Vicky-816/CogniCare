import {
  ACCURACY_TO_MOVE_DOWN,
  ACCURACY_TO_MOVE_UP,
  MAX_LEVEL,
  getLevel,
  type GameSession,
  type LevelDecision,
} from "@/lib/games/memory-match";

/**
 * Plain-language explanation of the adaptive rule, used on the results screen
 * of every game. Kept next to the numbers so the wording cannot drift away
 * from the actual thresholds.
 */
export function explainDecision(
  decision: LevelDecision,
  describeLevel: (level: number) => string = (level) => {
    const next = getLevel(level);
    return `Level ${next.level} — ${next.name}, with ${next.pairs} pairs`;
  },
): string {
  const next = describeLevel(decision.level);

  if (decision.action === "increase") {
    return `Great work. Your last two games at this level were both ${ACCURACY_TO_MOVE_UP}% accurate or more, so the next game is one step harder: ${next}.`;
  }

  if (decision.action === "decrease") {
    return `That one was tricky. Your last two games at this level were both below ${ACCURACY_TO_MOVE_DOWN}% accurate, so the next game is one step easier: ${next}.`;
  }

  if (decision.gamesAtLevel < 2) {
    return `You are on ${next}. Play one more game at this level and it will start adjusting to how you do.`;
  }

  if (decision.level === MAX_LEVEL) {
    return `You are on the hardest level, ${next}. Well done.`;
  }

  return `The next game stays at ${next}. Finish two games in a row with ${ACCURACY_TO_MOVE_UP}% accuracy or more to move up a level.`;
}

export function summarizeSession(session: GameSession): string {
  if (session.game === "sequence-recall") {
    return `Level ${session.level}, ${session.accuracy}% accuracy, ${session.sequenceLength} items, ${session.responseTimeSeconds}s average response`;
  }

  if (session.game !== "memory-match") {
    return `Level ${session.level}, ${session.accuracy}% accuracy, ${session.roundsCompleted} questions, ${session.responseTimeSeconds}s average response`;
  }

  return `Level ${session.level}, ${session.accuracy}% accuracy, ${session.moves} moves, ${session.durationSeconds} seconds`;
}
