import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ListOrdered,
  Puzzle,
  Shapes,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Timer,
  UserRound,
  Utensils,
} from "lucide-react";

import { HeroDemo } from "@/components/home/hero-demo";
import { Logo } from "@/components/logo";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { GAME_THEME, type GameId } from "@/lib/games/theme";
import { cn } from "@/lib/utils";

const games: { id: GameId; icon: LucideIcon; line: string }[] = [
  { id: "memory-match", icon: Puzzle, line: "Find the matching pairs." },
  { id: "sequence-recall", icon: ListOrdered, line: "Watch, then repeat the order." },
  { id: "pattern-practice", icon: Shapes, line: "Spot what comes next." },
  { id: "daily-routine", icon: Utensils, line: "Everyday objects and habits." },
  { id: "who-is-this", icon: UserRound, line: "Your own family photos and names." },
];

const steps = [
  { title: "Play a short game", text: "Each game takes two to five minutes. There is no clock and nothing to lose." },
  { title: "See how it went", text: "You get stars and a plain-language summary, never a score to feel bad about." },
  {
    title: "The next game adjusts",
    text: "After two strong games it gets a little harder. After two tough ones, a little easier.",
  },
];

const comfort: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Sparkles, title: "Large, clear text", text: "Big buttons and a typeface designed for easy reading." },
  { icon: Timer, title: "No time pressure", text: "Take as long as you like on every move." },
  { icon: Smartphone, title: "Phone, tablet or computer", text: "Works in the browser. Nothing to install." },
  {
    icon: ShieldCheck,
    title: "Your results stay yours",
    text: "Saved on your device first, and backed up when you sign in.",
  },
];

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="flex-1">
        {/* Hero: the first game is right here. */}
        <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 md:py-20 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <div className="space-y-6">
            <h1 className="text-5xl leading-[1.05] font-bold sm:text-6xl">Five minutes of play, every day.</h1>
            <p className="max-w-xl text-xl text-muted-foreground">
              Gentle memory games that get easier or harder to match how you are doing. A family member sets it up once,
              and after that, playing is a single tap.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <Button asChild size="lg" variant="accent">
                <Link href="/play">Start playing</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/family">Set up for someone</Link>
              </Button>
            </div>
          </div>
          <HeroDemo />
        </section>

        {/* The four games */}
        <section aria-labelledby="games-heading" className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 md:pb-24">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <h2 id="games-heading" className="text-4xl font-bold">
              Games built around the person
            </h2>
            <Button asChild variant="link" size="sm">
              <Link href="/play">Open the games</Link>
            </Button>
          </div>
          <ul role="list" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {games.map(({ id, icon: Icon, line }) => {
              const theme = GAME_THEME[id];
              return (
                <li key={id}>
                  <Link
                    href="/play"
                    className={cn(
                      "flex h-full min-h-48 tile flex-col justify-between gap-6 rounded-3xl p-6 focus-visible:ring-4 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
                      theme.solid,
                      theme.lip,
                    )}
                  >
                    <Icon aria-hidden className="size-12" strokeWidth={1.75} />
                    <span className="space-y-1">
                      <span className="block font-display text-2xl leading-tight font-bold">{theme.label}</span>
                      <span className="block text-lg">{line}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        {/* How it works: a real sequence, so the steps are numbered. */}
        <section aria-labelledby="how-heading" className="border-y-2 bg-card">
          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 md:py-20">
            <h2 id="how-heading" className="mb-10 max-w-2xl text-4xl font-bold">
              A game that learns how you play
            </h2>
            <ol role="list" className="grid gap-8 md:grid-cols-3">
              {steps.map((step, index) => (
                <li key={step.title} className="flex gap-4">
                  <span
                    aria-hidden
                    className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent font-display text-2xl font-bold"
                  >
                    {index + 1}
                  </span>
                  <div className="space-y-1">
                    <h3 className="text-2xl font-bold">{step.title}</h3>
                    <p className="text-lg text-muted-foreground">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Families */}
        <section aria-labelledby="family-heading" className="bg-primary text-primary-foreground">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-8 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr] md:py-20">
            <div className="space-y-4">
              <h2 id="family-heading" className="text-4xl font-bold">
                For the people who care
              </h2>
              <p className="max-w-2xl text-xl text-primary-foreground/90">
                A family member or carer sets everything up: who is playing, and what they see. The person playing just
                taps their name, with no password to remember. Progress for the family is in the family area, and more
                is on the way.
              </p>
            </div>
            <div className="flex md:justify-end">
              <Button asChild size="lg" variant="accent">
                <Link href="/auth/signup">Create a family account</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Comfort */}
        <section aria-labelledby="comfort-heading" className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 md:py-20">
          <h2 id="comfort-heading" className="mb-10 text-4xl font-bold">
            Made to be comfortable
          </h2>
          <ul role="list" className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {comfort.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-accent-soft">
                  <Icon aria-hidden className="size-7" />
                </span>
                <div>
                  <h3 className="text-2xl font-bold">{title}</h3>
                  <p className="text-lg text-muted-foreground">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t-2 bg-card">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 sm:px-6">
          <Logo />
          <p className="max-w-xl text-base text-muted-foreground">
            CogniCare is a practice and engagement tool. It does not diagnose, treat or monitor any medical condition.
          </p>
        </div>
      </footer>
    </>
  );
}
