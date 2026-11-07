import Link from "next/link";
import type { LaunchSummary } from "@launchpad/contract";
import { formatDelta, formatMarketValue, kindOf, type CardCandidate } from "@/lib/board";
import { quoteTicker } from "@/lib/format";
import { CoinImage } from "./CoinImage";
import { progressOf } from "./CoinRow";
import { PairMark } from "./PairMark";
import { Price } from "./Price";
import { QuoteLogo } from "./QuoteLogo";
import { RelativeTime } from "./RelativeTime";
import { Sparkline } from "./Sparkline";
import styles from "./CoinCard.module.css";

/** The day's change beside the price: its sign and an arrow, so the direction never rests on colour alone; nothing before a trade. */
function DayChange({ value }: { value: number | null }) {
  const text = formatDelta(value);
  if (text === null) return null;
  const tone = value! > 0 ? styles.up : value! < 0 ? styles.down : styles.flat;
  return (
    <span className={`${styles.change} ${tone}`} title="Price change over the last 24 hours">
      {value !== 0 && (
        <svg viewBox="0 0 8 8" width="7" height="7" aria-hidden="true">
          {value! > 0 ? <path d="M4 1 7.5 7H.5Z" fill="currentColor" /> : <path d="M4 7 .5 1h7Z" fill="currentColor" />}
        </svg>
      )}
      <span className="visually-hidden">24h change </span>
      {text}
    </span>
  );
}

/** Where the curve stands: its progress as the heat bar with the percentage, or the word for what has happened since. */
function CurveState({ launch }: { launch: LaunchSummary }) {
  const { status } = launch.curve;
  if (status === "graduating") return <span className={`${styles.curve} ${styles.graduating}`}>Sold out, graduating</span>;
  if (status === "graduated") return <span className={`${styles.curve} ${styles.graduated}`}>Graduated</span>;
  const pct = progressOf(launch);
  return (
    <span className={styles.curve} title="How far the curve is toward its Graduation Target">
      <span className="visually-hidden">Curve </span>
      <span className={styles.track} aria-hidden>
        {pct > 0 && <span className={styles.fill} style={{ width: `${pct}%` }} />}
      </span>
      <span className={styles.pct}>{pct.toFixed(pct > 0 && pct < 10 ? 1 : 0)}%</span>
    </span>
  );
}

/**
 * One coin as a card (#161, owner 2026-10-31): the board's other shape, for browsing, where the table is for scanning.
 * The whole card is the link to the coin's page. It carries what the row does, in the row's formats (the market figures
 * in the most familiar terms, the price in the Quote Asset, the day's change signed), with the market cap as the
 * headline, the asset it is paired with by logo and kind, and the day's price as a sparkline. `variant` is the candidate
 * the owner is picking between (`?card=`); the parts are the same in each, only their arrangement differs.
 */
export function CoinCard({ launch, now, variant = "a" }: { launch: LaunchSummary; now: number; variant?: CardCandidate }) {
  const quote = quoteTicker(launch.quote);
  const { market } = launch;
  const cap = market.marketCap ? formatMarketValue(market.marketCap, launch.quote) : "-";
  const imageSize = variant === "c" ? 88 : variant === "b" ? 36 : 44;

  const image = <CoinImage src={launch.image} symbol={launch.symbol} size={imageSize} className={styles.image} loading="lazy" />;
  const title = (
    <span className={styles.title}>
      {/* The pair fits the box it is given (PairMark measures its parent), so it gets one of its own. */}
      <span className={styles.pairBox}>
        <PairMark base={launch.symbol} quote={quote} size="sm" />
      </span>
      <span className={styles.name}>
        {launch.name}
        {launch.rewardTax && <span className={styles.tax}>{launch.rewardTax.bps / 100}% tax</span>}
      </span>
    </span>
  );
  const headline = (
    <span className={styles.cap}>
      <span className={styles.capValue}>{cap}</span>
      <span className={styles.capLabel}>Market cap</span>
    </span>
  );
  const price = (
    <span className={styles.price}>
      {market.price === null ? <span className={styles.none}>No price yet</span> : <><Price value={market.price} /> {quote}</>}
      <DayChange value={market.change24h} />
    </span>
  );
  const paired = (
    <span className={styles.paired}>
      <QuoteLogo quote={launch.quote} size={16} />
      <span>
        {quote} <span className={styles.kind}>{kindOf(launch.quote)}</span>
      </span>
    </span>
  );
  const volume = (
    <span className={styles.fact}>
      <span className={styles.factLabel}>24h vol </span>
      {formatMarketValue(market.volume24h, launch.quote)}
    </span>
  );
  const age = (
    <span className={`${styles.fact} ${styles.age}`}>
      <RelativeTime iso={launch.createdAt} now={now} />
    </span>
  );

  if (variant === "b") {
    // B, compact: the line beside the headline, the facts in one row under the curve.
    return (
      <Link href={`/coin/${launch.mint}`} className={`card ${styles.card} ${styles.b}`} data-card="b">
        <span className={styles.top}>
          {image}
          {title}
        </span>
        <span className={styles.bMiddle}>
          <span className={styles.bFigures}>
            {headline}
            {price}
          </span>
          <Sparkline points={launch.sparkline} className={styles.bSpark} />
        </span>
        <CurveState launch={launch} />
        <span className={styles.foot}>
          {paired}
          {volume}
          {age}
        </span>
      </Link>
    );
  }
  if (variant === "c") {
    // C, picture-led: the coin's image large on the left, the pair and the headline beside it, the line across under both.
    return (
      <Link href={`/coin/${launch.mint}`} className={`card ${styles.card} ${styles.c}`} data-card="c">
        <span className={styles.cTop}>
          {image}
          <span className={styles.cSide}>
            {title}
            {headline}
            {price}
          </span>
        </span>
        <Sparkline points={launch.sparkline} />
        <span className={styles.foot}>
          <CurveState launch={launch} />
          {volume}
          {age}
        </span>
        {paired}
      </Link>
    );
  }
  // A, the headline stack: the coin, then the market cap large, the price with its change, the day's line, the curve, the facts.
  return (
    <Link href={`/coin/${launch.mint}`} className={`card ${styles.card} ${styles.a}`} data-card="a">
      <span className={styles.top}>
        {image}
        {title}
        {age}
      </span>
      {headline}
      {price}
      <Sparkline points={launch.sparkline} />
      <CurveState launch={launch} />
      <span className={styles.foot}>
        {paired}
        {volume}
      </span>
    </Link>
  );
}
