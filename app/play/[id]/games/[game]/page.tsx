import { notFound } from "next/navigation";

import { GAME_PAGES, isGameId } from "@/components/games/game-catalog";
import { GamePageShell } from "@/components/games/game-page-shell";
import { GameAccess } from "@/components/play/game-access";

export default async function GamePage({ params }: { params: Promise<{ id: string; game: string }> }) {
  const { id, game } = await params;
  if (!isGameId(game)) notFound();
  const { Game, intro, steps, tip } = GAME_PAGES[game];
  return (
    <GameAccess game={game}>
      <GamePageShell game={game} backHref={`/play/${id}`} intro={intro} steps={steps} tip={tip}>
        <Game />
      </GamePageShell>
    </GameAccess>
  );
}
