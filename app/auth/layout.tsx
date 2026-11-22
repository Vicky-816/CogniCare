import type { ReactNode } from "react";
import { Check } from "lucide-react";

import { Logo, LogoMark } from "@/components/logo";

const reassurance = ["Large text and simple screens", "No time limits, ever", "Your results stay private"];

// Sign-in and sign-up share a calm two-part layout: a colour panel on wide
// screens, and the form. On phones only the form is shown, under a small header.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid flex-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="hidden flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex">
        <Logo className="text-primary-foreground" />
        <div className="space-y-8">
          <h2 className="max-w-md text-5xl leading-[1.05] font-bold">Your games are waiting.</h2>
          <ul role="list" className="space-y-3 text-xl">
            {reassurance.map((line) => (
              <li key={line} className="flex items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-full bg-accent text-accent-foreground">
                  <Check aria-hidden className="size-5" strokeWidth={3} />
                </span>
                {line}
              </li>
            ))}
          </ul>
        </div>
        <LogoMark aria-hidden className="size-24 opacity-90" />
      </aside>

      <div className="flex flex-col">
        <header className="border-b-2 bg-card lg:hidden">
          <div className="mx-auto flex min-h-20 w-full max-w-xl items-center px-4 sm:px-6">
            <Logo />
          </div>
        </header>
        <main
          id="main-content"
          tabIndex={-1}
          className="flex flex-1 items-start justify-center px-4 py-10 sm:px-8 lg:items-center lg:py-14"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
