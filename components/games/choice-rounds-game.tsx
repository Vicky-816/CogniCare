"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";

import { ResultCard, RoundDots } from "@/components/games/game-ui";
import { usePlay } from "@/components/play/play-context";
import { Button } from "@/components/ui/button";
import { evaluateDifficulty, levelForNextGame, type GameSession } from "@/lib/games/memory-match";
import { limitChoices, type ChoiceQuestion } from "@/lib/games/pattern-practice";
import { loadGameHistory, saveGameSession } from "@/lib/games/session-history";
import { GAME_THEME } from "@/lib/games/theme";
import { capLevel, maxChoices } from "@/lib/profiles/support";
import { syncGameSession, syncPendingSessions } from "@/lib/supabase/sync";
import { cn } from "@/lib/utils";

const ROUNDS = 3;
// Wrapped in a function so the lint rule about "impure" calls is happy: it is
// only ever called from event handlers and effects, never while drawing.
const timestamp = () => Date.now();

const RIGHT = ["That is right!", "Well done.", "Lovely."];

type GameKind = "pattern-practice" | "daily-routine" | "who-is-this";

type Props = {
  game: GameKind;
  /** Builds the questions for one game at a level. */
  getQuestions: (level: number, count: number) => ChoiceQuestion[];
  calculateScore: (correct: number, mistakes: number) => number;
};

/*
 * Three questions, answered without failure. A wrong answer is never marked
 * with a cross: the game says "Let's look again", quietly fades that answer,
 * and the person simply tries again. Only first-try answers count towards the
 * accuracy the family sees. The player never sees a score or a level.
 */
export function ChoiceRoundsGame({ game, getQuestions, calculateScore }: Props) {
  const { profile, profileId } = usePlay();
  const support = profile.supportLevel;
  const [level, setLevel] = useState(1);
  const [questions, setQuestions] = useState<ChoiceQuestion[]>([]);
  const [round, setRound] = useState(1);
  const [firstTry, setFirstTry] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [eliminated, setEliminated] = useState<string[]>([]);
  const [solved, setSolved] = useState(false);
  const [shownAnswer, setShownAnswer] = useState(false);
  const [usedHelp, setUsedHelp] = useState(false);
  const [answerStartedAt, setAnswerStartedAt] = useState<number | null>(null);
  const [responseTotalMs, setResponseTotalMs] = useState(0);
  const [nextLevel, setNextLevel] = useState<number | null>(null);

  // True once the player has answered or restarted, so a late account sync
  // cannot change the game under their hands.
  const touched = useRef(false);
  const nextButton = useRef<HTMLButtonElement>(null);
  const theme = GAME_THEME[game];

  const question = questions[round - 1];
  const startingLevel = useCallback(
    (history: GameSession[]) => capLevel(levelForNextGame(history), support),
    [support],
  );

  const begin = useCallback(
    (level: number) => {
      setLevel(level);
      setQuestions(getQuestions(level, ROUNDS).map((item) => limitChoices(item, maxChoices(support))));
      setRound(1);
      setFirstTry(0);
      setMistakes(0);
      setEliminated([]);
      setSolved(false);
      setShownAnswer(false);
      setUsedHelp(false);
      setResponseTotalMs(0);
      setAnswerStartedAt(timestamp());
      setNextLevel(null);
    },
    [getQuestions, support],
  );

  // The game starts from what is saved on this device straight away. The
  // account sync runs in the background and never makes the player wait.
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      begin(startingLevel(loadGameHistory(profileId, game)));
    });
    void syncPendingSessions(profileId).then(({ history }) => {
      if (cancelled || touched.current) return;
      begin(startingLevel(history.filter((session) => session.game === game)));
    });
    return () => {
      cancelled = true;
    };
  }, [game, begin, startingLevel, profileId]);

  // After a right answer, move focus to the Next button for keyboard and screen reader users.
  useEffect(() => {
    if (solved) nextButton.current?.focus();
  }, [solved]);

  function choose(key: string) {
    if (!question || solved || eliminated.includes(key)) return;
    touched.current = true;
    if (key === question.correctKey) {
      setSolved(true);
      setResponseTotalMs((total) => total + (timestamp() - (answerStartedAt ?? timestamp())));
      if (eliminated.length === 0) setFirstTry((value) => value + 1);
    } else {
      setEliminated((list) => [...list, key]);
      setMistakes((value) => value + 1);
    }
  }

  function next() {
    if (!solved) return;
    if (round < ROUNDS) {
      setRound(round + 1);
      setEliminated([]);
      setSolved(false);
      setShownAnswer(false);
      setAnswerStartedAt(timestamp());
      return;
    }

    // Assisted sessions are not comparable to unaided answers. Do not save
    // them as accuracy data or use them to change the next difficulty.
    if (usedHelp) {
      setNextLevel(level);
      return;
    }

    const accuracy = Math.round((firstTry / ROUNDS) * 100);
    const session: GameSession = {
      id: `${timestamp()}-${Math.random().toString(36).slice(2, 8)}`,
      game,
      completedAt: new Date().toISOString(),
      level,
      activityCount: ROUNDS,
      roundsCompleted: ROUNDS,
      attempts: ROUNDS + mistakes,
      mistakes,
      accuracy,
      durationSeconds: Math.max(1, Math.round(responseTotalMs / 1000)),
      responseTimeSeconds: Math.max(1, Math.round(responseTotalMs / ROUNDS / 1000)),
      score: calculateScore(firstTry, mistakes),
    };
    const saved = saveGameSession(profileId, session);
    void syncGameSession(profileId, session);
    setNextLevel(capLevel(evaluateDifficulty(saved, level).level, support));
  }

  const message = solved
    ? question?.praise
      ? `${shownAnswer ? "This is" : "Yes! This is"} ${question.praise}`
      : RIGHT[(round - 1) % RIGHT.length]
    : eliminated.length > 0
      ? "Let us look again. Take your time."
      : "";

  if (nextLevel !== null) {
    return (
      <ResultCard
        game={game}
        onPlayAgain={() => {
          touched.current = true;
          begin(nextLevel);
        }}
      />
    );
  }

  if (!question) {
    return (
      <p role="status" className="rounded-2xl border-2 bg-card p-6 text-center text-lg">
        Getting your game ready…
      </p>
    );
  }

  return (
    <section aria-labelledby="choice-question" className="space-y-6 rounded-3xl border-2 bg-card p-5 sm:p-8">
      <div className="flex items-center justify-between gap-4">
        <RoundDots game={game} total={ROUNDS} current={round} />
        <p className="text-lg font-semibold text-muted-foreground">
          {round} of {ROUNDS}
        </p>
      </div>

      <div className="space-y-2 text-center">
        <h2 id="choice-question" className="text-3xl font-bold">
          {question.prompt}
        </h2>
        <p className="text-lg text-muted-foreground">{question.hint}</p>
      </div>

      {question.imageUrl ? (
        // A plain <img>: the photo is a local blob, so next/image has nothing to optimise.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={question.imageUrl}
          alt={question.visualLabel}
          className="mx-auto aspect-square w-full max-w-sm rounded-3xl border-2 object-cover"
        />
      ) : (
        <div
          role="img"
          aria-label={question.visualLabel}
          className="flex flex-wrap justify-center gap-3 text-4xl sm:text-5xl"
        >
          {question.visual.map((item, index) => (
            <span
              key={`${item}-${index}`}
              aria-hidden
              className={cn(
                "flex min-h-16 min-w-16 items-center justify-center rounded-2xl px-3 font-display font-bold sm:min-h-20 sm:min-w-20",
                item === "?" ? cn("border-2 border-dashed bg-card", theme.border, theme.text) : theme.soft,
              )}
            >
              {item}
            </span>
          ))}
        </div>
      )}

      <div
        className={cn(
          "mx-auto grid max-w-2xl gap-4",
          question.choices.length > 2 ? "sm:grid-cols-3" : "sm:grid-cols-2",
        )}
      >
        {question.choices.map((choice) => {
          const isCorrect = choice.key === question.correctKey;
          const isOut = eliminated.includes(choice.key);
          return (
            <button
              key={choice.key}
              type="button"
              disabled={solved || isOut}
              onClick={() => choose(choice.key)}
              className={cn(
                "flex min-h-20 tile items-center justify-center gap-2 rounded-2xl border-2 px-4 py-3 text-xl font-bold focus-visible:ring-4 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
                support === 3 && "min-h-24 text-2xl",
                !solved && !isOut && "border-primary bg-card [--lip:#9aa4bb] hover:bg-secondary",
                isOut && "border-border bg-muted text-muted-foreground opacity-60 [--lip:#cfd4de]",
                solved && isCorrect && "border-success bg-routine-soft text-success [--lip:#124a2e]",
                solved && !isCorrect && !isOut && "border-border bg-card text-muted-foreground [--lip:#cfd4de]",
              )}
            >
              {solved && isCorrect && <Check aria-hidden className="size-6 shrink-0" strokeWidth={3} />}
              <span>{choice.label}</span>
              {isOut && <span className="sr-only">(not this one)</span>}
              {solved && isCorrect && <span className="sr-only">(the right answer)</span>}
            </button>
          );
        })}
      </div>

      <div role="status" aria-live="polite" className="min-h-16">
        {message && (
          <p
            className={cn(
              "rounded-xl p-4 text-center text-xl font-semibold",
              solved ? "bg-routine-soft text-success" : "bg-accent-soft text-foreground",
            )}
          >
            {message}
          </p>
        )}
      </div>

      {game === "who-is-this" && !solved && (
        <div className="text-center">
          <Button
            variant="outline"
            size="lg"
            onClick={() => {
              touched.current = true;
              setShownAnswer(true);
              setUsedHelp(true);
              setSolved(true);
              setResponseTotalMs((total) => total + (timestamp() - (answerStartedAt ?? timestamp())));
            }}
          >
            Show me the name
          </Button>
        </div>
      )}

      {solved && (
        <div className="text-center">
          <Button ref={nextButton} size="lg" onClick={next}>
            {round === ROUNDS ? "Finish" : "Next"}
          </Button>
        </div>
      )}
    </section>
  );
}
