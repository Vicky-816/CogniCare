"use client";

import { useCallback } from "react";

import { ChoiceRoundsGame } from "@/components/games/choice-rounds-game";
import { ROUTINE_QUESTIONS } from "@/lib/games/daily-routine";
import { calculateChoiceScore, pickQuestionSet } from "@/lib/games/pattern-practice";

export function DailyRoutineGame() {
  const getQuestions = useCallback(
    (level: number, count: number) => pickQuestionSet(ROUTINE_QUESTIONS, level, count),
    [],
  );
  return <ChoiceRoundsGame game="daily-routine" getQuestions={getQuestions} calculateScore={calculateChoiceScore} />;
}
