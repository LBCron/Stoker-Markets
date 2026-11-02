import type { Metadata } from "next";
import Link from "next/link";
import { SITE_LINKS } from "@/lib/site";
import styles from "../document.module.css";

export const metadata: Metadata = { title: "Risk disclosure", description: "What can go wrong with a coin launched on Stoker, in plain words." };

/**
 * The risk disclosure the footer's one bold sentence links to (#131; the facts are the site's own: the fee model of
 * ADR 0009, the curve rules, the Quote Asset labels, the Burn of ADR 0006 and the confirmed excluded regions; the Platform
 * Token section answers the owner's question of 2026-11-02 about a competitor's token disclaimer, in our own words). DRAFT:
 * the owner approves this text before the site opens.
 */
export default function RiskPage() {
  return (
    <div className={`shell ${styles.page}`}>
      <h1 className={`t-h1 ${styles.title}`}>Risk disclosure</h1>
      <p className={styles.dated}>Draft of 28 October 2026, pending the operator&apos;s approval.</p>
      <div className={styles.prose}>
        <p><strong>Coins launched here are speculative and can lose all their value.</strong> Most new coins do. Nobody sets or supports a coin&apos;s price: it comes from what other people pay for it, and it can fall to nothing at any time.</p>

        <h2 className="t-h3">How a coin trades</h2>
        <p>A coin starts on a bonding curve, where every buy raises the price and every sell lowers it. Once the curve has sold out, Raydium moves the coin into a liquidity pool, where it trades at whatever price buyers and sellers agree. A coin&apos;s pool liquidity is locked at Graduation; its price is not.</p>

        <h2 className="t-h3">The asset a coin is priced in</h2>
        <p>Each coin is priced in an asset its creator chose: SOL, a stablecoin, a tokenized stock or another asset Raydium quotes. Some of those assets are issued by companies that can freeze or move them, some can be changed by their issuer, and some trade thinly, so a coin&apos;s value moves with its asset as well as with itself. What is known about each asset is on its page under <Link href="/assets">Assets</Link>, as risk labels read from the chain.</p>

        <h2 className="t-h3">Creators, early buyers and taxes</h2>
        <p>A coin&apos;s creator may hold a large share of it and may sell at any time; so may the wallets that bought in its first moments. A coin&apos;s page shows the creator&apos;s holding, the early buyers and the largest wallets as the chain records them. A Reward Launch carries a transfer tax of 1%, 3% or 5% on every transfer of the coin, taken in the coin itself.</p>

        <h2 className="t-h3">Fees</h2>
        <p>Every trade pays a fee to Raydium and to the platform, on the curve and after Graduation, and a coin&apos;s creator pays a Graduation Fee out of their earnings once it graduates. Every fee, who pays it and who receives it, with its figure read from the chain, is on the <Link href="/fees">Fees page</Link>, the one place the site shows a fee figure. Half of what the platform collects on a coin&apos;s trades is forwarded to its creator, and every payment is on the public Ledger. Fees are set on-chain and can only change with notice under <Link href="/announcements">Announcements</Link>.</p>

        <h2 id="platform-token" className="t-h3">The Platform Token and the Burn</h2>
        <p>STOKER, the Platform Token, is a coin like any launched here: holding it gives no right to the platform&apos;s revenue, to any payment or to a say in how the platform is run. The Burn spends a published share of the platform&apos;s own revenue, net of the creators&apos; half, to buy STOKER and the top graduated coins in their own pools and destroys what it buys, which can hold up or raise their prices compared with no Burn; the shares, every buy and every burn are on the <Link href="/burns">Burns page</Link> and the Ledger. The shares can change with notice under <Link href="/announcements">Announcements</Link>, and no past buy, on the Ledger or anywhere else, is a promise of a future one. The platform&apos;s wallets, the treasury among them, hold STOKER and the other coins that pool fees pay in, take their share of Reward Rounds as the <Link href="/rewards">rewards page</Link> says, and may buy or sell at any time.</p>

        <h2 className="t-h3">Technology</h2>
        <p>Stoker builds transactions for Raydium&apos;s programs on Solana and shows what the chain records; it never holds your funds or your keys. A signed transaction cannot be reversed. The programs, the Solana network, your wallet and the data providers the site reads from are outside Stoker&apos;s control and can fail, pause or change.</p>

        <h2 className="t-h3">Who may use the site</h2>
        <p>The site is not offered to people in the United States, the United Kingdom, Canada or any country under sanctions, nor to anyone where launching or trading these coins is not allowed. Nothing on this site is financial, legal or tax advice. Questions go to <a href={`mailto:${SITE_LINKS.email}`}>{SITE_LINKS.email}</a>.</p>
      </div>
    </div>
  );
}
