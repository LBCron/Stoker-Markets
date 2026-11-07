import styles from "./Sparkline.module.css";

/**
 * A coin's price over the last day as a word-sized line (#161, after Tufte's sparkline): the API's 24 hourly points,
 * the latest last, drawn edge to edge in the box it is given, in the gain colour when the day ends above where it began
 * and the loss colour when below. A coin nobody has traded, or a list that has not brought the line yet, draws a flat
 * hairline, so every card keeps one shape. The figures beside it say what the line shows; the line is never the only
 * place a number is.
 */
export function Sparkline({ points, className = "" }: { points: number[] | undefined; className?: string }) {
  const line = points ?? [];
  if (line.length < 2) {
    return (
      <svg className={`${styles.spark} ${styles.empty} ${className}`} viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true" data-sparkline="">
        <path d="M0 20H100" vectorEffect="non-scaling-stroke" />
      </svg>
    );
  }
  const first = line[0]!;
  const last = line[line.length - 1]!;
  const min = Math.min(...line);
  const max = Math.max(...line);
  const span = max - min;
  // A held price is a level line through the middle; otherwise the range fills the box with a little room top and bottom.
  const y = (v: number) => (span === 0 ? 20 : 36 - ((v - min) / span) * 32);
  const x = (i: number) => (i / (line.length - 1)) * 100;
  const d = line.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(2)} ${y(v).toFixed(2)}`).join("");
  const tone = last > first ? styles.up : last < first ? styles.down : styles.flat;
  return (
    <svg className={`${styles.spark} ${tone} ${className}`} viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true" data-sparkline="">
      <path className={styles.area} d={`${d}L100 40L0 40Z`} />
      <path className={styles.line} d={d} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
