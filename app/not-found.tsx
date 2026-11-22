import Link from "next/link";

import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-16 sm:px-6">
        <p aria-hidden className="font-display text-8xl font-bold text-accent">
          ?
        </p>
        <h1 className="text-5xl font-bold">We could not find that page</h1>
        <p className="text-xl text-muted-foreground">
          The link may be old or mistyped. Go back to the home page and start again.
        </p>
        <Button asChild size="lg">
          <Link href="/">Go to the home page</Link>
        </Button>
      </main>
    </>
  );
}
