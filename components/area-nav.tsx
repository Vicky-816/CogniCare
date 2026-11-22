"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gamepad2, House, LineChart, Link2, UsersRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

// Icons are chosen by name because a server component cannot hand a component
// function to a client component.
const ICONS = {
  home: House,
  games: Gamepad2,
  progress: LineChart,
  people: UsersRound,
  connect: Link2,
} satisfies Record<string, LucideIcon>;

export type AreaNavItem = { href: string; label: string; icon: keyof typeof ICONS; exact?: boolean };

function useActive() {
  const pathname = usePathname();
  return (item: AreaNavItem) => (item.exact ? pathname === item.href : pathname.startsWith(item.href));
}

/** Links in the header on wide screens. */
export function TopNav({ label, items }: { label: string; items: AreaNavItem[] }) {
  const isActive = useActive();
  return (
    <nav aria-label={label} className="hidden md:block">
      <ul role="list" className="flex gap-1">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={isActive(item) ? "page" : undefined}
              className={cn(
                "flex min-h-12 items-center rounded-xl px-4 text-lg font-semibold transition-colors",
                isActive(item) ? "bg-primary text-primary-foreground" : "hover:bg-muted",
              )}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** A big tab bar fixed to the bottom of the screen on phones and tablets. */
export function BottomNav({ label, items }: { label: string; items: AreaNavItem[] }) {
  const isActive = useActive();
  return (
    <nav
      aria-label={`${label} (tabs)`}
      className="fixed inset-x-0 bottom-0 z-40 border-t-2 bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul
        role="list"
        className="mx-auto grid max-w-xl gap-1 p-2"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item) => {
          const Icon = ICONS[item.icon];
          const active = isActive(item);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-center text-base leading-tight font-semibold",
                  active ? "bg-primary text-primary-foreground" : "text-foreground active:bg-muted",
                )}
              >
                <Icon aria-hidden className="size-6" strokeWidth={active ? 2.5 : 2} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
