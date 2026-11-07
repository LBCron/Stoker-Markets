import type { LaunchSummary } from "@launchpad/contract";
import type { CardCandidate } from "@/lib/board";
import { CoinCard } from "./CoinCard";
import styles from "./CoinGrid.module.css";

/**
 * The board's cards (#161): one card a coin, three across on a wide window, two on a narrower one and one on a phone.
 * The same list as the table's (named "Coins" for assistive technology and the tests, `busy` while a new answer is on
 * its way), so either shape lists the same coins in the same order.
 */
export function CoinGrid({ launches, now, busy = false, variant }: { launches: LaunchSummary[]; now: number; busy?: boolean; variant: CardCandidate }) {
  return (
    <ul className={styles.grid} aria-busy={busy} aria-label="Coins">
      {launches.map((l) => (
        <li key={l.mint} className={styles.item}>
          <CoinCard launch={l} now={now} variant={variant} />
        </li>
      ))}
    </ul>
  );
}
