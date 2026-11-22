import Link from "next/link";

import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

// The logo is four little game tiles, one in each game's colour.
export function LogoMark({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("grid size-10 shrink-0 grid-cols-2 gap-1", className)}>
      <span className="rounded-md rounded-tl-xl bg-memory" />
      <span className="rounded-md rounded-tr-xl bg-pattern" />
      <span className="rounded-md rounded-bl-xl bg-routine" />
      <span className="rounded-md rounded-br-xl bg-sequence" />
    </span>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn("flex min-h-12 items-center gap-3 rounded-lg font-display text-2xl font-bold", className)}
    >
      <LogoMark />
      {siteConfig.name}
    </Link>
  );
}
