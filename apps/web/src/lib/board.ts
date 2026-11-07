import { LaunchSort, QuoteCategory, QuoteIssuer, type MarketValue, type QuoteRef } from "@launchpad/contract";
import type { BoardQuery } from "./api";
import { quoteTicker } from "./format";

export const SORT_LABELS: Record<LaunchSort, string> = {
  market_cap: "Market cap",
  new: "Newest",
  trending: "24h volume",
  graduation: "Near graduation",
};

/** The sorts in the order the toolbar shows them. */
export const SORT_ORDER: LaunchSort[] = ["market_cap", "new", "trending", "graduation"];

/** The list named as the fact it is (#135): what the rows are ordered by, said in the board's status line. */
export const SORT_FACTS: Record<LaunchSort, string> = {
  market_cap: "by market cap",
  new: "newest first",
  trending: "by 24h volume",
  graduation: "nearest Graduation first",
};

/**
 * A price change for a table cell: the API's fraction as a signed percentage ("+12.3%", "-0.8%", "0.0%"), one decimal
 * under a hundred and none above, so a column keeps one precision. Null where there is no trade to measure from.
 */
export function formatDelta(value: number | null) {
  if (value === null) return null;
  const pct = value * 100;
  const text = `${Math.abs(pct) >= 100 ? Math.abs(pct).toFixed(0) : Math.abs(pct).toFixed(1)}%`;
  return pct > 0 ? `+${text}` : pct < 0 ? `-${text}` : text;
}

export const CATEGORY_LABELS: Record<QuoteCategory, string> = {
  sol: "Solana",
  stablecoin: "Currencies",
  tokenized_stock: "Stocks",
  rwa: "Real-world assets",
  wrapped: "Wrapped",
  defi: "DeFi",
  leveraged: "Leverage",
  collectible: "Collectibles",
  meme: "Memes",
  community: "Community",
};

/** The categories in the order the site lists them: the money first, then what it buys, the long tail last. */
export const CATEGORY_ORDER: QuoteCategory[] = ["sol", "stablecoin", "tokenized_stock", "wrapped", "defi", "rwa", "leveraged", "collectible", "meme", "community"];

/** In the order the chips show them. */
export const ISSUER_LABELS: Record<QuoteIssuer, string> = {
  xstocks: "xStocks",
  prestocks: "PreStocks",
  tessera: "Tessera",
  backpack: "Backpack",
};

/**
 * The "Paired with" chips: a stock issuer, or a category for everything that has no issuer. A chip sets one of the two
 * filters and clears the other; "All" clears both. Backpack Securities' stocks are the set shown elsewhere as "Sunrise".
 */
export type PairedChip = { label: string; category: QuoteCategory | null; issuer: QuoteIssuer | null };
export const PAIRED_CHIPS: PairedChip[] = [
  { label: "All", category: null, issuer: null },
  ...(Object.keys(ISSUER_LABELS) as QuoteIssuer[]).map((issuer) => ({ label: ISSUER_LABELS[issuer], category: null, issuer })),
  ...CATEGORY_ORDER.filter((c) => c !== "tokenized_stock").map((category) => ({ label: CATEGORY_LABELS[category], category, issuer: null })),
];

/** Whether a Quote Asset is within the chosen chip: by issuer when one is chosen, else by category, else always. */
export function inChip(q: Pick<QuoteRef, "category" | "issuer">, query: Pick<BoardQuery, "category" | "issuer">) {
  if (query.issuer) return q.issuer === query.issuer;
  if (query.category) return q.category === query.category;
  return true;
}

export const DEFAULT_BOARD: BoardQuery = { sort: "market_cap", category: null, issuer: null, quote: null, q: "" };

const MINT = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
export const SEARCH_MAX = 64;

/** The board's query from the page's URL. Anything unknown falls back to the default, so an old or mangled link still shows coins. */
export function boardQueryFrom(params: Record<string, string | string[] | undefined>): BoardQuery {
  const one = (key: string) => {
    const v = params[key];
    return Array.isArray(v) ? v[0] : v;
  };
  const sort = LaunchSort.safeParse(one("sort"));
  const category = QuoteCategory.safeParse(one("category"));
  const issuer = QuoteIssuer.safeParse(one("issuer"));
  const quote = one("quote");
  return {
    sort: sort.success ? sort.data : DEFAULT_BOARD.sort,
    // An issuer is finer than a category, so a link naming both keeps the issuer.
    category: category.success && !issuer.success ? category.data : null,
    issuer: issuer.success ? issuer.data : null,
    quote: quote && MINT.test(quote) ? quote : null,
    q: (one("q") ?? "").trim().slice(0, SEARCH_MAX),
  };
}

/** The URL search string for a board query, leaving out defaults so the plain board stays at "/". */
export function boardSearch(q: BoardQuery) {
  const params = new URLSearchParams();
  if (q.sort !== DEFAULT_BOARD.sort) params.set("sort", q.sort);
  if (q.issuer) params.set("issuer", q.issuer);
  else if (q.category) params.set("category", q.category);
  if (q.quote) params.set("quote", q.quote);
  if (q.q) params.set("q", q.q);
  const s = params.toString();
  return s ? `?${s}` : "";
}

/**
 * The board's two shapes (#161, owner 2026-10-31): the table, one row a pair for scanning, and the cards, one card a coin
 * with its market cap as the headline, for browsing. The table is the default. A visitor's choice is a cookie, so the
 * server draws the chosen shape and a load never paints the other one first (the scheme's way, src/lib/scheme.ts), and
 * the address carries `?view=cards`, so a shared link opens in the sender's view; the address wins over the cookie.
 */
export const BOARD_VIEWS = ["table", "cards"] as const;
export type BoardView = (typeof BOARD_VIEWS)[number];
export const BOARD_VIEW_COOKIE = "board-view";
export const VIEW_LABELS: Record<BoardView, string> = { table: "Table", cards: "Cards" };

const isView = (v: string | undefined): v is BoardView => (BOARD_VIEWS as readonly string[]).includes(v ?? "");

/** The view a page load shows: the address's, else the visitor's cookie, else the table. */
export function boardViewFrom(param: string | string[] | undefined, cookie: string | undefined): BoardView {
  const v = Array.isArray(param) ? param[0] : param;
  if (isView(v)) return v;
  return isView(cookie) ? cookie : "table";
}

/** The address's search for a board query in a view: the query's own, then `view=cards` (the table is the default). */
export function boardViewSearch(q: BoardQuery, view: BoardView) {
  const params = new URLSearchParams(boardSearch(q));
  if (view === "cards") params.set("view", "cards");
  const s = params.toString();
  return s ? `?${s}` : "";
}

/** What a Quote Asset is, in a word or two for a card: "Solana", "Stablecoin", "xStocks stock". */
const KIND_WORDS: Record<QuoteCategory, string> = {
  sol: "Solana",
  stablecoin: "Stablecoin",
  tokenized_stock: "Stock",
  rwa: "Real-world asset",
  wrapped: "Wrapped coin",
  defi: "DeFi token",
  leveraged: "Leveraged token",
  collectible: "Collectible",
  meme: "Meme coin",
  community: "Community coin",
};
export const kindOf = (q: Pick<QuoteRef, "category" | "issuer">) => (q.issuer ? `${ISSUER_LABELS[q.issuer]} stock` : KIND_WORDS[q.category]);

export const isDefaultBoard = (q: BoardQuery) => !q.category && !q.issuer && !q.quote && !q.q && q.sort === DEFAULT_BOARD.sort;

const compact = (n: number) => n.toLocaleString("en-US", { notation: "compact", maximumSignificantDigits: 3 });

/**
 * A market figure in the most familiar terms available: US dollars, else SOL, else the Quote Asset itself when it has
 * no price. Compact, for a card: $1.23K, 45.6 SOL, 1.2M BULLWHALE.
 */
export function formatMarketValue(v: MarketValue, quote: Pick<QuoteRef, "mint" | "symbol">) {
  if (v.usd !== null) return v.usd.toLocaleString("en-US", { style: "currency", currency: "USD", notation: "compact", maximumSignificantDigits: 3 });
  if (v.sol !== null) return `${compact(v.sol)} SOL`;
  return `${compact(v.quote)} ${quoteTicker(quote)}`;
}
