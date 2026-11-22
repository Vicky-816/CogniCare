import type { ReactNode } from "react";

import { AuthControls } from "@/components/auth/auth-controls";
import { BottomNav, TopNav, type AreaNavItem } from "@/components/area-nav";
import { Logo } from "@/components/logo";

// The frame around the patient and caregiver areas: a header with the main
// links on wide screens, and a big tab bar on phones.
export function AreaShell({
  area,
  navLabel,
  items,
  children,
}: {
  area: string;
  navLabel: string;
  items: AreaNavItem[];
  children: ReactNode;
}) {
  // A single link is not worth a menu, so navigation appears from two links up.
  const hasNav = items.length > 1;
  return (
    <>
      <header className="border-b-2 bg-card">
        <div className="mx-auto flex min-h-20 w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-6">
            <Logo />
            {hasNav && <TopNav label={navLabel} items={items} />}
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full bg-accent-soft px-4 py-1.5 text-base font-semibold sm:inline-flex">
              {area}
            </span>
            <AuthControls />
          </div>
        </div>
      </header>
      <main
        id="main-content"
        tabIndex={-1}
        className={`mx-auto w-full max-w-6xl flex-1 px-4 pt-8 sm:px-6 md:pt-12 md:pb-16 ${hasNav ? "pb-32" : "pb-16"}`}
      >
        {children}
      </main>
      {hasNav && <BottomNav label={navLabel} items={items} />}
    </>
  );
}
