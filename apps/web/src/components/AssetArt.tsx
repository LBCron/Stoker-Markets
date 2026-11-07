"use client";

import { useState } from "react";
import type { QuoteRef } from "@launchpad/contract";
import { quoteTicker } from "@/lib/format";

/**
 * The paired asset drawn large behind a card (CoinCard, owner 2026-11-07): its logo, or its ticker's first letter when it
 * has none or the logo fails. The caller's class places, sizes, clips and fades it; the element never reaches past the
 * card's edge (the circle is cut by `clip-path`, not by overflow), so nothing widens a phone's page.
 */
export function AssetArt({ quote, className, letterClassName }: { quote: Pick<QuoteRef, "mint" | "symbol" | "logo">; className?: string; letterClassName?: string }) {
  const [failed, setFailed] = useState(false);
  if (quote.logo && !failed) return <img className={className} src={quote.logo} alt="" aria-hidden onError={() => setFailed(true)} />;
  return (
    <span className={`${className ?? ""} ${letterClassName ?? ""}`} aria-hidden>
      {quoteTicker(quote).charAt(0).toUpperCase()}
    </span>
  );
}
