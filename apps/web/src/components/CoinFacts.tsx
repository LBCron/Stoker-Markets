"use client";

import Link from "next/link";
import type { LaunchSummary, LaunchTrust, PlatformInfo } from "@launchpad/contract";
import { creatorEarnings } from "@/lib/fees";
import { explorerUrl, formatDuration, formatShare, formatUtc, quoteTicker } from "@/lib/format";
import { Address } from "./Address";
import { CopyButton } from "./CopyButton";
import styles from "./CoinFacts.module.css";

/**
 * The About block and the addresses, under the trade panel and the pair card (owner, 2026-10-31): the description, the
 * launch's details, what the Creator earns, the liquidity's state, the dates, the Copy Protection's length and end, the
 * coin's own links and the aggregators, then every address with its copy button. Drawn on the client from data like the
 * rest of the market: a server-rendered tree handed through the client boundary as a prop warned about missing keys on
 * the page with an Airdrop to send (2026-10-31), the same trap the pair card met.
 */
export function CoinFacts({ launch, platform, trust, renderedAt }: {
  launch: LaunchSummary;
  platform: PlatformInfo;
  /** Null until the API answered; the First Buy fact waits for it. */
  trust: LaunchTrust | null;
  /** The server's clock at render, so whether the window is over reads the same on the server and at hydration. */
  renderedAt: number;
}) {
  const quote = quoteTicker(launch.quote);
  const protectionOpen = new Date(launch.protection.until).getTime() <= renderedAt;
  // The window's length as well as its end: a short window ends the minute the coin launched, which read as the same date twice (owner, 2026-10-31).
  const protectionLength = formatDuration(new Date(launch.protection.until).getTime() - new Date(launch.createdAt).getTime());
  const addresses: (readonly [label: string, value: string, kind: "address" | "tx"])[] = [
    ["Creator", launch.creator, "address"],
    ["Coin", launch.mint, "address"],
    ["Curve", launch.pool, "address"],
    ["Launch transaction", launch.createdSignature, "tx"],
    ...(launch.graduation
      ? ([["Raydium pool", launch.graduation.pool, "address"], ["Graduation transaction", launch.graduation.signature, "tx"]] as const)
      : []),
  ];
  // The coin's own links (website, X, Telegram), where a visitor looks for them and where a coin without any says so; the aggregators, which know mainnet alone, after them (#41).
  const socials: { label: string; href: string; icon: string }[] = [
    { label: "Website", href: launch.links.website ?? "", icon: SocialIcon.website },
    { label: "X", href: launch.links.x ?? "", icon: SocialIcon.x },
    { label: "Telegram", href: launch.links.telegram ?? "", icon: SocialIcon.telegram },
  ].filter((s) => s.href);
  const elsewhere: [string, string][] = [
    ["DEX Screener", `https://dexscreener.com/solana/${launch.mint}`],
    ["Jupiter", `https://jup.ag/swap/${launch.quote.mint}-${launch.mint}`],
  ];
  const liquidity = launch.curve.status === "graduated"
    ? "Locked in its Raydium pool since graduation; its price is not."
    : launch.curve.status === "graduating"
      ? "The curve sold out; Raydium is moving the coin to its pool."
      : "On its bonding curve until the Graduation Target is raised; then locked in a Raydium pool.";

  return (
    <>
      <div className={`card ${styles.aboutCard}`}>
        <h2 className={`t-h3 ${styles.aboutTitle}`}>About {launch.symbol}</h2>
        {launch.description && <p className={styles.description}>{launch.description}</p>}
        <dl className={styles.facts}>
          <div>
            <dt>Launch type</dt>
            <dd>{launch.rewardTax ? "Reward Launch" : "Standard coin"}</dd>
          </div>
          {launch.rewardTax && (
            <div>
              <dt>Reward tax</dt>
              <dd>
                {launch.rewardTax.bps / 100}% of every transfer, paid out to holders in {launch.rewardTax.payout === "coin" ? launch.symbol : quote}
                {launch.rewardTax.locked ? (
                  <span>
                    Fixed for good:{" "}
                    <a href={explorerUrl("tx", launch.rewardTax.locked.signature, platform)} target="_blank" rel="noreferrer">
                      authority given up
                    </a>
                  </span>
                ) : (
                  <span>Fixed: LaunchLab holds the tax authority until graduation</span>
                )}
              </dd>
            </div>
          )}
          {trust && (
            <div>
              <dt>First Buy</dt>
              <dd>{trust.creator.firstBuy ? `${formatShare(trust.creator.firstBuy.share)} of the supply, bought by the Creator at launch` : "None: the Creator bought nothing at launch"}</dd>
            </div>
          )}
          <div>
            <dt>Creator earns</dt>
            <dd>
              {creatorEarnings(platform).summary}
              <span>Half of what the platform collects on this coin, sent to the Creator&apos;s wallet with nothing to claim.</span>
            </dd>
          </div>
          <div>
            <dt>Liquidity</dt>
            <dd>{liquidity}</dd>
          </div>
          <div>
            <dt>Launched</dt>
            <dd>
              <time dateTime={launch.createdAt}>{formatUtc(launch.createdAt)}</time>
            </dd>
          </div>
          {launch.graduation && (
            <div>
              <dt>Graduated</dt>
              <dd>
                <time dateTime={launch.graduation.graduatedAt}>{formatUtc(launch.graduation.graduatedAt)}</time>
              </dd>
            </div>
          )}
          <div>
            <dt>Copy protection</dt>
            {/* `data-until`: the suite sizes the time inside this sentence to the date's width for its mask. */}
            <dd data-until>
              {protectionLength} from launch
              <span>
                {protectionOpen ? "Ended " : "Until "}
                <time dateTime={launch.protection.until}>{formatUtc(launch.protection.until)}</time>
                {protectionOpen
                  ? ". Anyone may use this coin's name, ticker and image again."
                  : ": nobody else can launch a coin here with this name, ticker or image."}
                {launch.copyOf && (
                  <>
                    {" "}
                    {copyKind(launch.copyOf.kind)}{" "}
                    <Link href={`/coin/${launch.copyOf.mint}`}>{launch.copyOf.name} ({launch.copyOf.symbol})</Link>, launched{" "}
                    <time dateTime={launch.copyOf.launchedAt}>{formatUtc(launch.copyOf.launchedAt)}</time>
                  </>
                )}
              </span>
            </dd>
          </div>
          <div>
            <dt>Links</dt>
            <dd className={styles.elsewhere}>
              {socials.length === 0 && <span>None given by the Creator.</span>}
              {socials.map((s) => (
                <a key={s.label} href={s.href} className={`chip ${styles.social}`} target="_blank" rel="noreferrer nofollow">
                  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d={s.icon} /></svg>
                  {s.label}
                </a>
              ))}
            </dd>
          </div>
          <div>
            <dt>Elsewhere</dt>
            <dd className={styles.elsewhere}>
              {elsewhere.map(([label, href]) => (
                <a key={label} href={href} className="chip" target="_blank" rel="noreferrer">{label}</a>
              ))}
            </dd>
          </div>
        </dl>
      </div>

      <dl className={`card ${styles.addresses}`} aria-label="Addresses">
        {addresses.map(([label, value, kind]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>
              <Address value={value} kind={kind} platform={platform} />
              <CopyButton value={value} label={`Copy ${label.toLowerCase()}`} />
            </dd>
          </div>
        ))}
      </dl>
    </>
  );
}

/** The marks on the coin's own links: a globe, X's and Telegram's glyphs (the same two the site's header and footer draw). */
const SocialIcon = {
  website: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm7.9 9h-3.4a15.6 15.6 0 0 0-1.3-5.9A8 8 0 0 1 19.9 11ZM12 4c1 1.3 2.2 3.8 2.5 7h-5C9.8 7.8 11 5.3 12 4ZM4.1 13h3.4c.1 2.2.6 4.2 1.3 5.9A8 8 0 0 1 4.1 13Zm3.4-2H4.1a8 8 0 0 1 4.7-5.9A15.6 15.6 0 0 0 7.5 11ZM12 20c-1-1.3-2.2-3.8-2.5-7h5c-.3 3.2-1.5 5.7-2.5 7Zm3.2-1.1c.7-1.7 1.2-3.7 1.3-5.9h3.4a8 8 0 0 1-4.7 5.9Z",
  x: "M18.9 2H22l-7.1 8.1L23 22h-6.6l-5.2-6.7L5.3 22H2.2l7.6-8.6L2 2h6.8l4.7 6.2L18.9 2Zm-1.1 18h1.7L7.3 3.9H5.5L17.8 20Z",
  telegram: "M21.6 3.3 2.9 10.5c-1.1.4-1.1 1.1-.2 1.4l4.7 1.5 1.8 5.6c.2.6.1.8.7.8.5 0 .7-.2 1-.5l2.3-2.2 4.7 3.5c.9.5 1.5.2 1.7-.8l3.1-14.7c.3-1.3-.5-1.8-1.1-1.8Zm-3.4 4.3-8.6 7.8-.3 3.2-1.5-4.7 10-6.3c.5-.3.9 0 .4.3v-.3Z",
} as const;

/** How a coin took an earlier coin's identity, as the label's opening words. */
function copyKind(kind: "ticker" | "name" | "image" | "near") {
  return { ticker: "Its ticker is", name: "Its name is", image: "Its image is", near: "Its name or ticker is a near copy of" }[kind] + (kind === "near" ? "" : " that of");
}
