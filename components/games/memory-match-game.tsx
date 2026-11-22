"use client";

import { useEffect, useReducer, useRef } from "react";
import { Bird, Car, Check, Cloud, Fish, Flower2, Heart, House, Leaf, Moon, Star, Sun, Umbrella } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  calculateAccuracy,
  calculateScore,
  createDeck,
  createPersonalDeck,
  evaluateDifficulty,
  getLevel,
  levelForNextGame,
  personalPairCount,
  shouldStartMismatchTimer,
  type GameSession,
  type MemoryCard,
  type PersonalCardItem,
} from "@/lib/games/memory-match";
import { RestartButton, ResultCard } from "@/components/games/game-ui";
import { usePlay } from "@/components/play/play-context";
import { loadGameHistory, saveGameSession } from "@/lib/games/session-history";
import { useLifeStory } from "@/lib/life-story/use-life-story";
import { capLevel } from "@/lib/profiles/support";
import { syncGameSession, syncPendingSessions } from "@/lib/supabase/sync";

const SYMBOL_ICONS: Record<string, LucideIcon> = {
  sun: Sun,
  moon: Moon,
  star: Star,
  heart: Heart,
  flower: Flower2,
  leaf: Leaf,
  cloud: Cloud,
  umbrella: Umbrella,
  fish: Fish,
  bird: Bird,
  car: Car,
  house: House,
};

// How long a pair that does not match stays visible before turning back over.
const MISMATCH_DELAY_MS = 1200;

// Fixed class strings per deck size so Tailwind can see every grid class at
// build time. Four columns keeps cards large enough to tap on a phone, and
// every layout fills its last row completely.
const BOARD_GRID: Record<number, string> = {
  8: "grid-cols-4",
  12: "grid-cols-4",
  16: "grid-cols-4",
  20: "grid-cols-4 sm:grid-cols-5",
  24: "grid-cols-4 sm:grid-cols-6",
};

type GameCardProps = {
  card: MemoryCard;
  index: number;
  faceUp: boolean;
  matched: boolean;
  notAPair: boolean;
  onFlip: (card: MemoryCard) => void;
};

function GameCard({ card, index, faceUp, matched, notAPair, onFlip }: GameCardProps) {
  const Icon = SYMBOL_ICONS[card.symbol.key] ?? Star;
  const personal = card.personal;
  const label = matched
    ? `${card.symbol.label}, matched`
    : faceUp
      ? `${card.symbol.label}, face up`
      : `Card ${index + 1}, face down`;

  return (
    <button
      type="button"
      aria-label={label}
      aria-disabled={matched || undefined}
      onClick={() => onFlip(card)}
      className={cn(
        "relative aspect-square w-full overflow-hidden rounded-2xl border-2",
        "focus-visible:ring-4 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
        // Matched cards are finished, so they stop looking pressable.
        !matched && "tile",
        matched && "border-routine bg-routine-soft",
        // A pair that does not match is shown softly, never in alarm red.
        notAPair && "border-accent bg-accent-soft [--lip:#a37700]",
        !matched && !notAPair && faceUp && "border-primary bg-card [--lip:#9aa4bb]",
        !matched && !notAPair && !faceUp && "border-memory bg-memory [--lip:#172a8a] hover:brightness-110",
      )}
    >
      {faceUp || matched ? (
        personal ? (
          <span className="flex h-full w-full flex-col">
            {personal.face !== "name" && (
              // A plain <img>: the photo is a local blob, so next/image has nothing to optimise.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={personal.photoUrl} alt="" className="min-h-0 w-full flex-1 object-cover" />
            )}
            {personal.face !== "photo" && (
              <span
                className={cn(
                  "flex items-center justify-center gap-1 px-1 text-center leading-tight font-bold",
                  personal.face === "name" ? "h-full text-xl sm:text-2xl" : "bg-card py-1 text-base",
                )}
              >
                {matched && <Check aria-hidden className="size-4 shrink-0 text-routine" strokeWidth={3} />}
                {card.symbol.label}
              </span>
            )}
          </span>
        ) : (
          <span className="flex h-full w-full flex-col items-center justify-center gap-1 p-1">
            <Icon
              aria-hidden
              className={cn("h-1/2 w-1/2", matched ? "text-routine" : "text-memory")}
              strokeWidth={1.75}
            />
            <span className="flex items-center gap-1 text-base leading-tight font-semibold">
              {matched && <Check aria-hidden className="size-4 text-routine" strokeWidth={3} />}
              {card.symbol.label}
            </span>
          </span>
        )
      ) : (
        <span
          aria-hidden
          className="flex h-full w-full items-center justify-center rounded-xl bg-[repeating-linear-gradient(45deg,rgb(255_255_255/0.14)_0_7px,transparent_7px_14px)] font-display text-4xl font-bold text-white sm:text-5xl"
        >
          ?
        </span>
      )}
    </button>
  );
}

type GameState = {
  level: number;
  deck: MemoryCard[];
  flipped: string[];
  matched: string[];
  moves: number;
  mistakes: number;
  startedAt: number | null;
  locked: boolean;
  announcement: string;
  /** Set when the next level has been worked out and the game is over. */
  nextLevel: number | null;
};

type GameAction =
  | { type: "start"; level: number; personal: PersonalCardItem[] }
  | { type: "sync"; level: number; personal: PersonalCardItem[] }
  | { type: "flip"; card: MemoryCard; now: number }
  | { type: "clear-mismatch" }
  | { type: "finish"; nextLevel: number };

const initialState: GameState = {
  level: 1,
  deck: [],
  flipped: [],
  matched: [],
  moves: 0,
  mistakes: 0,
  startedAt: null,
  locked: false,
  announcement: "",
  nextLevel: null,
};

/** The family's photos make the deck when there are enough of them; otherwise the usual symbols. */
function buildDeck(level: number, personal: readonly PersonalCardItem[]): MemoryCard[] {
  const config = getLevel(level);
  const pairs = personalPairCount(config.pairs, personal.length);
  return pairs > 0
    ? createPersonalDeck(personal, pairs, config.level <= 2 ? "same" : "name")
    : createDeck(config.pairs);
}

/*
 * All game state changes happen in this one pure function. A flip is the only
 * thing that can create a pair, and a finished game cannot be changed by a
 * late tap.
 */
function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "start": {
      const config = getLevel(action.level);
      return {
        ...initialState,
        level: config.level,
        deck: buildDeck(config.level, action.personal),
        announcement: "New game. Find the matching pairs.",
      };
    }

    case "sync": {
      // The account history arrived after the board was drawn. If no card has
      // been turned yet, adopt the level from the combined history; otherwise
      // leave the game exactly as it is.
      if (state.startedAt !== null || state.nextLevel !== null) return state;
      const config = getLevel(action.level);
      if (state.deck.length > 0 && state.level === config.level) return state;
      return {
        ...initialState,
        level: config.level,
        deck: buildDeck(config.level, action.personal),
        announcement: state.announcement,
      };
    }

    case "flip": {
      const { card, now } = action;
      if (
        state.locked ||
        state.nextLevel !== null ||
        state.flipped.includes(card.id) ||
        state.matched.includes(card.id)
      ) {
        return state;
      }

      const startedAt = state.startedAt ?? now;
      // First card of a pair: just turn it over.
      if (state.flipped.length === 0) {
        return { ...state, startedAt, flipped: [card.id], announcement: `${card.symbol.label} revealed.` };
      }

      // Second card: a move has been made, so compare the two cards.
      const firstId = state.flipped[0];
      const first = state.deck.find((item) => item.id === firstId);
      const moves = state.moves + 1;

      if (first && first.symbol.key === card.symbol.key) {
        const matched = [...state.matched, firstId, card.id];
        const pairsLeft = state.deck.length / 2 - matched.length / 2;
        return {
          ...state,
          startedAt,
          moves,
          matched,
          flipped: [],
          announcement: pairsLeft > 0 ? `A match! ${pairsLeft} to go.` : "A match! You found them all.",
        };
      }

      return {
        ...state,
        startedAt,
        moves,
        mistakes: state.mistakes + 1,
        flipped: [firstId, card.id],
        locked: true,
        announcement: "Those two are not a pair. Have another look.",
      };
    }

    case "clear-mismatch":
      return { ...state, flipped: [], locked: false };

    case "finish":
      return { ...state, nextLevel: action.nextLevel };

    default:
      return state;
  }
}

export function MemoryMatchGame() {
  const { profile, profileId } = usePlay();
  const support = profile.supportLevel;
  const life = useLifeStory(profileId);
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const { level, deck, flipped, matched, moves, mistakes, startedAt, locked, announcement, nextLevel } = state;

  const mismatchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A saved result is final: this ref stops the finish effect from running
  // twice for the same board.
  const savedRef = useRef(false);
  const totalPairs = deck.length / 2;

  // Wait for the photos (if any), then start straight from what is saved on
  // this device. The account sync runs in the background and never makes the
  // player wait.
  useEffect(() => {
    if (life.status === "loading") return;
    const personal: PersonalCardItem[] = life.items.map((item) => ({
      id: item.id,
      label: item.label,
      photoUrl: item.photoUrl,
    }));
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const local = loadGameHistory(profileId, "memory-match");
      dispatch({ type: "start", level: capLevel(levelForNextGame(local), support), personal });
    });
    void syncPendingSessions(profileId).then(({ history: synced }) => {
      if (cancelled) return;
      const saved = synced.filter((session) => session.game === "memory-match");
      dispatch({ type: "sync", level: capLevel(levelForNextGame(saved), support), personal });
    });
    return () => {
      cancelled = true;
    };
  }, [profileId, support, life.status, life.items]);

  // Cancel a pending mismatch timer when the screen goes away.
  useEffect(
    () => () => {
      if (mismatchTimer.current) clearTimeout(mismatchTimer.current);
    },
    [],
  );

  function handleFlip(card: MemoryCard) {
    // Ignore taps the reducer would ignore anyway.
    if (nextLevel !== null || locked || flipped.includes(card.id) || matched.includes(card.id)) return;

    // A pair that does not match stays visible for a moment, then turns back
    // over. Only a second card that does not match starts that timer: a single
    // flipped card always waits for the player, however long they take.
    const first = flipped.length === 1 ? deck.find((item) => item.id === flipped[0]) : undefined;
    const isMismatch = shouldStartMismatchTimer(first, card);

    dispatch({ type: "flip", card, now: Date.now() });

    if (isMismatch) {
      if (mismatchTimer.current) clearTimeout(mismatchTimer.current);
      mismatchTimer.current = setTimeout(() => {
        dispatch({ type: "clear-mismatch" });
      }, MISMATCH_DELAY_MS);
    }
  }

  // Finish the game once every card is matched. Saving lives here so it
  // happens exactly once, after React has settled the final state.
  useEffect(() => {
    if (deck.length === 0 || matched.length !== deck.length || nextLevel !== null) return;
    if (savedRef.current) return;
    savedRef.current = true;

    const seconds = startedAt === null ? 1 : Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    const session: GameSession = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      game: "memory-match",
      completedAt: new Date().toISOString(),
      level,
      pairs: totalPairs,
      moves,
      mistakes,
      accuracy: calculateAccuracy(totalPairs, moves),
      attempts: moves,
      durationSeconds: seconds,
      score: calculateScore(totalPairs, mistakes),
    };

    const history = saveGameSession(profileId, session);
    void syncGameSession(profileId, session);
    dispatch({ type: "finish", nextLevel: capLevel(evaluateDifficulty(history, level).level, support) });
  }, [deck.length, matched.length, nextLevel, startedAt, totalPairs, moves, mistakes, level, profileId, support]);

  function startGame(next: number) {
    if (mismatchTimer.current) clearTimeout(mismatchTimer.current);
    savedRef.current = false;
    const personal: PersonalCardItem[] = life.items.map((item) => ({
      id: item.id,
      label: item.label,
      photoUrl: item.photoUrl,
    }));
    dispatch({ type: "start", level: next, personal });
  }

  const notAPair = flipped.length === 2 ? flipped : [];

  return (
    <div className="space-y-6">
      <RestartButton onRestart={() => startGame(level)} />

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {nextLevel !== null ? (
        <ResultCard game="memory-match" onPlayAgain={() => startGame(nextLevel)} />
      ) : deck.length === 0 ? (
        <p role="status" className="rounded-2xl border-2 bg-card p-6 text-center text-lg">
          Getting your game ready…
        </p>
      ) : (
        <>
          <p className="text-center text-xl font-semibold">
            Pairs found: {matched.length / 2} of {totalPairs}
          </p>
          <ul
            role="list"
            aria-label="Memory match board"
            className={cn("mx-auto grid w-full max-w-2xl gap-3 sm:gap-4", BOARD_GRID[deck.length] ?? "grid-cols-4")}
          >
            {deck.map((card, index) => (
              <li key={card.id}>
                <GameCard
                  card={card}
                  index={index}
                  faceUp={flipped.includes(card.id)}
                  matched={matched.includes(card.id)}
                  notAPair={notAPair.includes(card.id)}
                  onFlip={handleFlip}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
