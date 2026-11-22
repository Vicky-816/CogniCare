"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Heart, Leaf, Sun } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// A tiny real game on the home page: three pairs, no sign-in, no pressure.
// It shows what the first game feels like before anyone has to create an account.
const TILES: { key: string; label: string; icon: LucideIcon }[] = [
  { key: "sun", label: "Sun", icon: Sun },
  { key: "heart", label: "Heart", icon: Heart },
  { key: "leaf", label: "Leaf", icon: Leaf },
  { key: "leaf", label: "Leaf", icon: Leaf },
  { key: "sun", label: "Sun", icon: Sun },
  { key: "heart", label: "Heart", icon: Heart },
];

export function HeroDemo() {
  const [open, setOpen] = useState<number[]>([]);
  const [found, setFound] = useState<string[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const done = found.length === 3;

  function flip(index: number) {
    if (open.length === 2 || open.includes(index) || found.includes(TILES[index].key)) return;
    const next = [...open, index];
    setOpen(next);
    if (next.length === 2) {
      const [a, b] = next;
      if (TILES[a].key === TILES[b].key) {
        setFound((value) => [...value, TILES[a].key]);
        setOpen([]);
      } else {
        timer.current = setTimeout(() => setOpen([]), 900);
      }
    }
  }

  function reset() {
    clearTimeout(timer.current);
    setOpen([]);
    setFound([]);
  }

  const message = done
    ? "You found all three pairs. That is Memory Match."
    : found.length > 0
      ? `A pair! ${found.length} of 3 found.`
      : "Try it: turn over two tiles and find a matching pair.";

  return (
    <div className="rounded-3xl border-2 bg-card p-5 sm:p-6">
      <ul role="list" aria-label="Practice memory game" className="grid grid-cols-3 gap-3 sm:gap-4">
        {TILES.map((tile, index) => {
          const isFound = found.includes(tile.key);
          const faceUp = open.includes(index) || isFound;
          const Icon = tile.icon;
          return (
            <li key={index}>
              <button
                type="button"
                aria-label={faceUp ? tile.label : `Tile ${index + 1}, face down`}
                onClick={() => flip(index)}
                className={cn(
                  "relative aspect-square w-full rounded-2xl border-2",
                  !isFound && "tile",
                  isFound && "border-routine bg-routine-soft",
                  !isFound && faceUp && "border-primary bg-card [--lip:#9aa4bb]",
                  !isFound && !faceUp && "border-memory bg-memory [--lip:#172a8a] hover:brightness-110",
                )}
              >
                {faceUp ? (
                  <Icon
                    aria-hidden
                    className={cn("mx-auto size-1/2", isFound ? "text-routine" : "text-memory")}
                    strokeWidth={1.75}
                  />
                ) : (
                  <span
                    aria-hidden
                    className="flex h-full w-full items-center justify-center rounded-xl bg-[repeating-linear-gradient(45deg,rgb(255_255_255/0.14)_0_7px,transparent_7px_14px)] font-display text-4xl font-bold text-white"
                  >
                    ?
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      <p role="status" className="mt-5 min-h-14 text-lg font-semibold">
        {message}
      </p>
      {done && (
        <div className="mt-2 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/play">Play the real game</Link>
          </Button>
          <Button variant="secondary" onClick={reset}>
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}
