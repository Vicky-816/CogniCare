import { notFound } from "next/navigation";

import { GAME_PAGES, isGameId } from "@/components/games/game-catalog";
import { GamePageShell } from "@/components/games/game-page-shell";
import { GuestPlayProvider } from "@/components/play/play-context";
import { SiteHeader } from "@/components/site-header";

export default async function GuestGamePage({ params }: { params: Promise<{ game: string }> }) {
  const { game } = await params;
  if (!isGameId(game) || game === "who-is-this") notFound();
  const { Game, intro, steps, tip } = GAME_PAGES[game];
  return (
    <>
      <SiteHeader />
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-4xl flex-1 px-4 pt-8 pb-16 sm:px-6 md:pt-12"
      >
        <GuestPlayProvider>
          <GamePageShell game={game} backHref="/#games-heading" intro={intro} steps={steps} tip={tip}>
            <Game />
          </GamePageShell>
        </GuestPlayProvider>
      </main>
    </>
  );
}

