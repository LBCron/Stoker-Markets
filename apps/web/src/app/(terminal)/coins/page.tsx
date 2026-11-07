import type { Metadata } from "next";
import { cookies } from "next/headers";
import { pageMeta } from "@/lib/meta";
import { getPlatform, listLaunchQuotes, listLaunches } from "@/lib/api";
import { BOARD_VIEW_COOKIE, boardQueryFrom, boardViewFrom } from "@/lib/board";
import { Board } from "@/components/Board";

export const metadata: Metadata = pageMeta({
  path: "/coins",
  title: "Coins",
  description: "Every coin launched on Stoker, searched, sorted and filtered by what it is paired with.",
});

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** The board: every coin, in the terminal look; the home page is the landing. */
export default async function CoinsPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = boardQueryFrom(params);
  // The address's view, else the visitor's own (#161), so the server draws the shape the visitor sees from the first paint.
  const view = boardViewFrom(params.view, (await cookies()).get(BOARD_VIEW_COOKIE)?.value);
  const [board, quotes, platform] = await Promise.all([
    listLaunches({ ...query, fields: view === "cards" ? ["sparkline"] : [] }),
    listLaunchQuotes(),
    getPlatform(),
  ]);
  return (
    <Board
      initial={board.launches}
      initialMore={board.nextOffset !== null}
      initialQuery={query}
      initialView={view}
      platform={{ cluster: platform.cluster, rpcUrl: platform.rpcUrl }}
      quotes={quotes.quotes}
      renderedAt={Date.now()}
    />
  );
}
