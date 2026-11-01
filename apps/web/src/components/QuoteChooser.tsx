"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { QuoteAsset } from "@launchpad/contract";
import { searchQuotes } from "@/lib/assets";
import { CATEGORY_LABELS, inChip, ISSUER_LABELS, PAIRED_CHIPS, type PairedChip } from "@/lib/board";
import { recommendedQuotes } from "@/lib/landing";
import { formatAmount, quoteTicker } from "@/lib/format";
import { QuoteLogo } from "./QuoteLogo";
import styles from "./QuoteChooser.module.css";

/**
 * A card's Graduation Target fits one line: whole units from a thousand up (9,360 USDC), 1.66M from a million. The
 * summary beside the form carries the exact figure.
 */
const WHOLE_FROM = 1_000n;
const COMPACT_FROM = 1_000_000n;

/** The kind the chips name the asset by: its issuer for a stock, its category otherwise. */
const kindOf = (q: QuoteAsset) => (q.issuer ? ISSUER_LABELS[q.issuer] : CATEGORY_LABELS[q.category]);

/** The name, unless it only repeats the ticker (common for memecoins) or the kind ("Solana" under SOL). */
const distinctName = (q: QuoteAsset) =>
  q.name && q.name.toLowerCase() !== q.symbol?.toLowerCase() && q.name.toLowerCase() !== kindOf(q).toLowerCase() ? q.name : null;

function graduationAmount(q: QuoteAsset) {
  if (!q.graduationTarget) return null;
  const units = BigInt(q.graduationTarget.raw) / 10n ** BigInt(q.decimals);
  const amount = units >= COMPACT_FROM
    ? Number(units).toLocaleString("en-US", { notation: "compact", maximumSignificantDigits: 3 })
    : units >= WHOLE_FROM
      ? units.toLocaleString("en-US")
      : formatAmount(q.graduationTarget.raw, q.decimals);
  return `${amount} ${quoteTicker(q)}`;
}

/** The picker's search: a well with the line and the ring on focus. */
export function QuoteSearch({ value, onChange, autoFocus = false }: { value: string; onChange: (query: string) => void; autoFocus?: boolean }) {
  return (
    <label className={styles.search}>
      <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true">
        <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="m13 13 4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      <input
        type="search"
        aria-label="Search Quote Assets"
        placeholder="Search by name, ticker or mint"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        spellCheck={false}
        autoFocus={autoFocus}
      />
    </label>
  );
}

/** A card's inner content: the logo, then the ticker, the name, the kind and what a coin raises in it. */
function CardBody({ q, size }: { q: QuoteAsset; size: number }) {
  return (
    <>
      <QuoteLogo quote={q} size={size} />
      <span className={styles.text}>
        <span className={styles.title}>
          <span className={styles.ticker}>{quoteTicker(q)}</span>
          {distinctName(q) && <span className={styles.name}>{distinctName(q)}</span>}
        </span>
        <span className={styles.meta}>
          <span className={styles.kind}>{kindOf(q)}</span>
          <span className={q.launchable ? styles.target : styles.reason}>{q.launchable ? `graduates at ${graduationAmount(q)}` : q.reason}</span>
        </span>
      </span>
    </>
  );
}

/**
 * The Quote Asset chooser on the launch form (phase 5, #136, after the research): the recommended three as cards (SOL,
 * the deepest stablecoin and the deepest stock) and one more cell, "Choose another", which opens the full picker. An
 * asset chosen from the picker takes that cell, so the chosen asset is never shown twice. Each card says what kind of
 * asset it is; what its issuer can do is on the asset's page, never a chip under its name (owner, 2026-10-10).
 */
export function QuoteChooser({ quotes, value, onChange }: { quotes: QuoteAsset[]; value: string | null; onChange: (mint: string) => void }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const picks = useMemo(() => recommendedQuotes(quotes), [quotes]);
  const chosen = quotes.find((q) => q.mint === value) ?? null;
  const other = chosen && !picks.some((q) => q.mint === chosen.mint) ? chosen : null;

  return (
    <div className={styles.chooser}>
      <div className={styles.featured} role="radiogroup" aria-label="Recommended">
        {picks.map((q) => (
          <label key={q.mint} className={`${styles.card} ${styles.big} ${q.launchable ? "" : styles.closed}`}>
            <input type="radio" name={`${id}-pick`} value={q.mint} checked={q.mint === value} disabled={!q.launchable} onChange={() => onChange(q.mint)} />
            <CardBody q={q} size={40} />
          </label>
        ))}
        {/* The fourth cell: the asset chosen from the picker, or the way to it. */}
        <button
          type="button"
          className={`${styles.card} ${styles.big} ${styles.another} ${other ? styles.chosenOther : ""}`}
          aria-pressed={other ? true : undefined}
          aria-label={other ? `${quoteTicker(other)} chosen. Choose another Quote Asset` : "Choose another Quote Asset"}
          onClick={() => setOpen(true)}
        >
          {other ? (
            <CardBody q={other} size={40} />
          ) : (
            <>
              <span className={styles.plus} aria-hidden />
              <span className={styles.text}>
                <span className={styles.title}><span className={styles.ticker}>Choose another</span></span>
                <span className={styles.meta}><span className={styles.kind}>Any of the {quotes.filter((q) => q.launchable).length.toLocaleString("en-US")} assets Raydium quotes</span></span>
              </span>
            </>
          )}
        </button>
      </div>
      <QuotePicker quotes={quotes} value={value} open={open} onChange={onChange} onClose={() => setOpen(false)} />
    </div>
  );
}

/**
 * The full picker, a modal on the site's dialog primitive (a sheet on a phone): the search, the kinds as chips with
 * their counts (the same chips as the board and the assets page), and the assets as cards, one radio each, the deepest
 * markets first, in a region that scrolls on its own. An asset that can't be launched against stays in view with its
 * reason but can't be chosen. Choosing one closes the picker; it stays mounted so the choice keeps its checked state.
 */
function QuotePicker({ quotes, value, open, onChange, onClose }: { quotes: QuoteAsset[]; value: string | null; open: boolean; onChange: (mint: string) => void; onClose: () => void }) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  const [chip, setChip] = useState<PairedChip>(PAIRED_CHIPS[0]!);
  // Only kinds something is quoted in: the test chain quotes six assets, mainnet six hundred.
  const chips = useMemo(() => PAIRED_CHIPS.map((c) => ({ chip: c, count: quotes.filter((q) => inChip(q, c)).length })).filter((c) => c.count > 0), [quotes]);
  const matches = useMemo(() => searchQuotes(quotes.filter((q) => inChip(q, chip)), query), [quotes, chip, query]);

  // The picker stays mounted and opens and closes as a modal, so a chosen card keeps its checked state in the form.
  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog ref={dialog} className={`dialog ${styles.picker}`} aria-labelledby={`${id}-title`} onClose={onClose} onCancel={(e) => { e.preventDefault(); onClose(); }}>
      <div className={styles.pickerHead}>
        <h2 id={`${id}-title`} className={`t-h3 ${styles.pickerTitle}`}>Pair with</h2>
        <button type="button" className={`button button-ghost button-sm ${styles.close}`} onClick={onClose}>Close</button>
      </div>
      <QuoteSearch value={query} onChange={setQuery} autoFocus />
      <div className={styles.chips} role="group" aria-label="Kind">
        {chips.map(({ chip: c, count }) => (
          <button key={c.label} type="button" className="chip" aria-pressed={c === chip} onClick={() => setChip(c)}>
            {c.label} <span className={styles.count}>{count.toLocaleString("en-US")}</span>
          </button>
        ))}
      </div>
      <div className={styles.grid} role="radiogroup" aria-label="Pair with">
        {matches.map((q) => (
          <label key={q.mint} className={`${styles.card} ${q.launchable ? "" : styles.closed}`}>
            <input
              type="radio"
              name={`${id}-quote`}
              value={q.mint}
              checked={q.mint === value}
              disabled={!q.launchable}
              onChange={() => {
                onChange(q.mint);
                onClose();
              }}
            />
            <CardBody q={q} size={34} />
          </label>
        ))}
        {matches.length === 0 && <p className={styles.note}>No Quote Asset matches &ldquo;{query.trim()}&rdquo;.</p>}
      </div>
    </dialog>
  );
}
