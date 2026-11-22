"use client";

import { useCallback } from "react";

import { ChoiceRoundsGame } from "@/components/games/choice-rounds-game";
import { PATTERN_QUESTIONS, calculateChoiceScore, pickQuestionSet } from "@/lib/games/pattern-practice";

export function PatternPracticeGame() {
  const getQuestions = useCallback(
    (level: number, count: number) => pickQuestionSet(PATTERN_QUESTIONS, level, count),
    [],
  );
  return <ChoiceRoundsGame game="pattern-practice" getQuestions={getQuestions} calculateScore={calculateChoiceScore} />;
}
