"use client";

import { useEffect, useRef, useState } from "react";
import { explorerUrl } from "@/lib/format";
import styles from "./CoinActions.module.css";

export type ExplorerCluster = { cluster: string; rpcUrl: string };

/**
 * A coin's two quick actions wherever the board lists it (owner, 2026-11-07): copy its contract address, and open it on
 * the explorer. They sit over the row's or card's link (CoinRow, BoardCard), never inside it, so a press copies or opens
 * the explorer without also opening the coin's page.
 */
export function CoinActions({ mint, symbol, platform, className = "" }: { mint: string; symbol: string; platform: ExplorerCluster; className?: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(mint);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1400);
    } catch {
      // No clipboard here; the explorer link beside it still carries the address.
    }
  }

  return (
    <span className={`${styles.actions} ${className}`}>
      <button type="button" className={styles.ca} onClick={() => void copy()} aria-label={`Copy ${symbol}'s contract address`} title={mint} data-copied={copied || undefined}>
        CA
        {copied ? (
          <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
            <path d="m3.5 8.5 3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
            <rect x="5.5" y="5.5" width="8" height="8" rx="1.8" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10.5 3.5v-.3A1.7 1.7 0 0 0 8.8 1.5H3.2a1.7 1.7 0 0 0-1.7 1.7v5.6a1.7 1.7 0 0 0 1.7 1.7h.3" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        )}
      </button>
      {/* Only while it applies: a status region in every row would make the board's own status line one of sixty. */}
      {copied && <span className="visually-hidden" role="status">Contract address copied</span>}
      <a className={styles.explorer} href={explorerUrl("address", mint, platform)} target="_blank" rel="noreferrer" aria-label={`View ${symbol} on the explorer`} title="View on the explorer">
        <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
          <path d="M9 2.5h4.5V7M13.5 2.5 7.5 8.5M11.5 9.5v3a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </a>
    </span>
  );
}
