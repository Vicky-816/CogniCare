"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";

// Shown instead of a blank screen if something unexpected goes wrong.
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-16 sm:px-6">
      <h1 className="text-5xl font-bold">Something went wrong</h1>
      <p className="text-xl text-muted-foreground">
        Sorry about that. Your saved games are safe. Please try again, or go back to the home page.
      </p>
      <div className="flex flex-wrap gap-4">
        <Button size="lg" onClick={reset}>
          Try again
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/">Go to the home page</Link>
        </Button>
      </div>
    </main>
  );
}
