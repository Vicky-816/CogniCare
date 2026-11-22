"use client";

import { useEffect, useReducer, useRef } from "react";
import { Cloud, Flower2, Heart, Leaf, Star, Sun } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RestartButton, ResultCard, RoundDots } from "@/components/games/game-ui";
import { evaluateDifficulty, levelForNextGame, type GameSession } from "@/lib/games/memory-match";
import {
  ROUNDS_PER_GAME,
  SEQUENCE_ITEMS,
  calculateSequenceScore,
  createSequence,
  isCorrectAnswer,
  sequenceLengthForRound,
  type SequenceItem,
} from "@/lib/games/sequence-recall";
import { usePlay } from "@/components/play/play-context";
import { loadGameHistory, saveGameSession } from "@/lib/games/session-history";
import { capLevel } from "@/lib/profiles/support";
import { syncGameSession, syncPendingSessions } from "@/lib/supabase/sync";

const ICONS: Record<string, LucideIcon> = {
  sun: Sun,
  leaf: Leaf,
  heart: Heart,
  cloud: Cloud,
  star: Star,
  flower: Flower2,
};
const SHOW_ITEM_MS = 900;
/** A round may be watched and tried twice before the game gently moves on. */
const MAX_ATTEMPTS = 2;

type Phase = "ready" | "showing" | "answering" | "retry" | "correct" | "incorrect" | "saving" | "complete";
type State = {
  level: number;
  round: number;
  sequence: SequenceItem[];
  answer: string[];
  phase: Phase;
  shownIndex: number;
  attempt: number;
  mistakes: number;
  firstTryRounds: number;
  responseStartedAt: number | null;
  responseTotalMs: number;
  announcement: string;
  nextLevel: number | null;
};
type Action =
  | { type: "start"; level: number }
  | { type: "sync"; level: number }
  | { type: "show" }
  | { type: "advance"; now: number }
  | { type: "choose"; key: string; now: number }
  | { type: "next" }
  | { type: "finish"; nextLevel: number };

function newRound(level: number, round: number) {
  return createSequence(sequenceLengthForRound(level, round));
}

const initialState: State = {
  level: 1,
  round: 1,
  sequence: [],
  answer: [],
  phase: "ready",
  shownIndex: 0,
  attempt: 1,
  mistakes: 0,
  firstTryRounds: 0,
  responseStartedAt: null,
  responseTotalMs: 0,
  announcement: "",
  nextLevel: null,
};

/*
 * A wrong answer never ends the round. The sequence is shown again and the
 * person tries once more; only a first-try success counts towards accuracy.
 * After two attempts the game kindly moves on.
 */
function reducer(state: State, action: Action): State {
  if (action.type === "start") {
    return {
      ...initialState,
      level: action.level,
      sequence: newRound(action.level, 1),
      announcement: `New game. Round 1 of ${ROUNDS_PER_GAME}.`,
    };
  }
  if (action.type === "sync") {
    // Account history arrived after the game was drawn. Before the first round
    // starts, adopt the combined history's level; afterwards change nothing.
    if (state.round !== 1 || state.phase !== "ready" || state.attempt !== 1 || action.level === state.level)
      return state;
    return {
      ...initialState,
      level: action.level,
      sequence: newRound(action.level, 1),
      announcement: state.announcement,
    };
  }
  if (action.type === "show" && (state.phase === "ready" || state.phase === "retry")) {
    return { ...state, phase: "showing", shownIndex: 0, answer: [], announcement: "Watch carefully." };
  }
  if (action.type === "advance" && state.phase === "showing") {
    if (state.shownIndex + 1 < state.sequence.length) return { ...state, shownIndex: state.shownIndex + 1 };
    return {
      ...state,
      phase: "answering",
      shownIndex: -1,
      responseStartedAt: action.now,
      announcement: "Now you try.",
    };
  }
  if (action.type === "choose" && state.phase === "answering") {
    const answer = [...state.answer, action.key];
    const expected = state.sequence[state.answer.length];
    const elapsed = action.now - (state.responseStartedAt ?? action.now);
    if (!expected || expected.key !== action.key) {
      if (state.attempt < MAX_ATTEMPTS) {
        return {
          ...state,
          answer: [],
          phase: "retry",
          attempt: state.attempt + 1,
          mistakes: state.mistakes + 1,
          responseTotalMs: state.responseTotalMs + elapsed,
          announcement: "Let us watch it once more.",
        };
      }
      return {
        ...state,
        answer,
        phase: "incorrect",
        mistakes: state.mistakes + 1,
        responseTotalMs: state.responseTotalMs + elapsed,
        announcement: "Good try. Let us go on.",
      };
    }
    if (!isCorrectAnswer(state.sequence, answer)) return { ...state, answer, announcement: `${expected.label}.` };
    return {
      ...state,
      answer,
      phase: "correct",
      firstTryRounds: state.firstTryRounds + (state.attempt === 1 ? 1 : 0),
      responseTotalMs: state.responseTotalMs + elapsed,
      announcement: "Well done!",
    };
  }
  if (action.type === "next" && (state.phase === "correct" || state.phase === "incorrect")) {
    const round = state.round + 1;
    if (round <= ROUNDS_PER_GAME)
      return {
        ...state,
        round,
        attempt: 1,
        sequence: newRound(state.level, round),
        answer: [],
        phase: "ready",
        responseStartedAt: null,
        announcement: `Round ${round} of ${ROUNDS_PER_GAME}.`,
      };
    return { ...state, phase: "saving", announcement: "Finishing up." };
  }
  if (action.type === "finish") return { ...state, phase: "complete", nextLevel: action.nextLevel };
  return state;
}

export function SequenceRecallGame() {
  const { profile, profileId } = usePlay();
  const support = profile.supportLevel;
  const [state, dispatch] = useReducer(reducer, initialState);
  const finishSaved = useRef(false);
  const activeItem = state.phase === "showing" ? state.sequence[state.shownIndex] : undefined;

  useEffect(() => {
    let cancelled = false;
    // Start from what is saved on this device straight away; the account sync
    // runs in the background and never makes the player wait.
    queueMicrotask(() => {
      if (cancelled) return;
      dispatch({
        type: "start",
        level: capLevel(levelForNextGame(loadGameHistory(profileId, "sequence-recall")), support),
      });
    });
    void syncPendingSessions(profileId).then(({ history }) => {
      if (cancelled) return;
      const saved = history.filter((session) => session.game === "sequence-recall");
      dispatch({ type: "sync", level: capLevel(levelForNextGame(saved), support) });
    });
    return () => {
      cancelled = true;
    };
  }, [profileId, support]);

  useEffect(() => {
    if (state.phase !== "showing") return;
    const timeout = setTimeout(() => dispatch({ type: "advance", now: Date.now() }), SHOW_ITEM_MS);
    return () => clearTimeout(timeout);
  }, [state.phase, state.shownIndex]);

  useEffect(() => {
    if (state.phase !== "saving" || state.nextLevel !== null || finishSaved.current) return;
    finishSaved.current = true;
    const accuracy = Math.round((state.firstTryRounds / ROUNDS_PER_GAME) * 100);
    const session: GameSession = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      game: "sequence-recall",
      completedAt: new Date().toISOString(),
      level: state.level,
      sequenceLength: sequenceLengthForRound(state.level, ROUNDS_PER_GAME),
      roundsCompleted: ROUNDS_PER_GAME,
      attempts: ROUNDS_PER_GAME + state.mistakes,
      mistakes: state.mistakes,
      accuracy,
      durationSeconds: Math.max(1, Math.round(state.responseTotalMs / 1000)),
      responseTimeSeconds: Math.max(1, Math.round(state.responseTotalMs / ROUNDS_PER_GAME / 1000)),
      score: calculateSequenceScore(state.firstTryRounds, state.mistakes),
    };
    const history = saveGameSession(profileId, session);
    void syncGameSession(profileId, session);
    dispatch({ type: "finish", nextLevel: capLevel(evaluateDifficulty(history, state.level).level, support) });
  }, [
    state.phase,
    state.firstTryRounds,
    state.mistakes,
    state.responseTotalMs,
    state.nextLevel,
    state.level,
    profileId,
    support,
  ]);

  function restart(level = state.level) {
    finishSaved.current = false;
    dispatch({ type: "start", level });
  }

  const heading =
    state.phase === "showing"
      ? "Watch carefully"
      : state.phase === "answering"
        ? "Now you try"
        : state.phase === "retry"
          ? "Let us watch it again"
          : state.phase === "correct"
            ? "Well done!"
            : state.phase === "incorrect"
              ? "Good try. Let us go on."
              : state.phase === "saving"
                ? "Finishing up…"
                : "Ready when you are";
  const hint =
    state.phase === "ready"
      ? "Press the button, then watch each picture light up."
      : state.phase === "answering"
        ? "Touch the pictures in the same order."
        : state.phase === "retry"
          ? "That is alright. Watch once more, then try again."
          : "Take your time.";

  if (state.nextLevel !== null) {
    return <ResultCard game="sequence-recall" onPlayAgain={() => restart(state.nextLevel ?? state.level)} />;
  }

  return (
    <div className="space-y-6">
      <RestartButton onRestart={() => restart()} />
      <p aria-live="polite" className="sr-only">
        {state.announcement}
      </p>

      <section aria-labelledby="sequence-board" className="space-y-6 rounded-3xl border-2 bg-card p-5 sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <RoundDots game="sequence-recall" total={ROUNDS_PER_GAME} current={state.round} />
          <p className="text-lg font-semibold text-muted-foreground">
            {state.round} of {ROUNDS_PER_GAME}
          </p>
        </div>

        <div className="space-y-2 text-center">
          <h2 id="sequence-board" className="text-3xl font-bold">
            {heading}
          </h2>
          <p className="min-h-7 text-lg text-muted-foreground">{hint}</p>
        </div>

        <div className="mx-auto grid max-w-xl grid-cols-3 gap-3 sm:gap-5">
          {state.sequence.length > 0 &&
            SEQUENCE_ITEMS.map((item) => {
              const Icon = ICONS[item.key] ?? Star;
              const selectable = state.phase === "answering";
              const lit = activeItem?.key === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  disabled={!selectable}
                  aria-label={selectable ? `Choose ${item.label}` : item.label}
                  onClick={() => dispatch({ type: "choose", key: item.key, now: Date.now() })}
                  className={cn(
                    "aspect-square tile rounded-3xl focus-visible:ring-4 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-default",
                    item.colorClass,
                    lit && "scale-110 ring-4 ring-primary ring-offset-4",
                    !lit && !selectable && "opacity-40",
                    selectable && "hover:brightness-110",
                  )}
                >
                  <Icon aria-hidden className="mx-auto size-12 sm:size-16" strokeWidth={2} />
                  <span className="sr-only">{item.label}</span>
                </button>
              );
            })}
        </div>

        {state.phase === "ready" && (
          <div className="text-center">
            <Button size="lg" onClick={() => dispatch({ type: "show" })}>
              Show me
            </Button>
          </div>
        )}
        {state.phase === "retry" && (
          <div className="text-center">
            <Button size="lg" onClick={() => dispatch({ type: "show" })}>
              Watch again
            </Button>
          </div>
        )}
        {(state.phase === "correct" || state.phase === "incorrect") && (
          <div className="text-center">
            <Button size="lg" onClick={() => dispatch({ type: "next" })}>
              {state.round === ROUNDS_PER_GAME ? "Finish" : "Next"}
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
