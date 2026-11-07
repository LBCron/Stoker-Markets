import BN from "bn.js";

/**
 * The launch shape every new Launch on our platform has, pinned on-chain by our curve rules (ADR 0005).
 * Supply 1T at 6 decimals (owner, 2026-11-02, #166), 793.1B sold on a constant-product curve, migration to CPMM, no
 * vesting, CPMM creator fee on the quote side. The share sold is the 1B shape's, so a Graduation Target raises the same
 * amount and a coin's market cap is the same figure; only the count of coins, and so the price of one, differs.
 */
export const LAUNCH_SHAPE = {
  decimals: 6,
  supply: new BN("1000000000000000000"),
  totalBaseSell: new BN("793100000000000000"),
  migrateType: 1, // CPMM
  curveType: 0, // constant product
  ammFeeOn: "QuoteToken" as const,
};

/**
 * The supplies and sales coins launched before the current shape have: 1B at 6 decimals with 793.1M sold, every coin
 * until #166. The curve rules pin only LAUNCH_SHAPE, so no new coin can launch on one of these, but a coin that did
 * keeps its shape for good, and the Indexer still takes its launch as ours (a webhook redelivery, a history backfill,
 * a launch prepared before the Quote Registry rewrote the rules).
 */
export const EARLIER_LAUNCH_SHAPES = [
  { supply: new BN("1000000000000000"), totalBaseSell: new BN("793100000000000") },
] as const;

/** Whether a launch's supply and sale, raw units, are the current launch shape's or one an earlier coin has. */
export const isOurSupplyAndSale = (supply: BN, totalBaseSell: BN) =>
  [LAUNCH_SHAPE, ...EARLIER_LAUNCH_SHAPES].some((s) => supply.eq(s.supply) && totalBaseSell.eq(s.totalBaseSell));

/** Rates use LaunchLab's 1e6 denominator: 5_000 is 0.5%. */
export const RATE_DENOMINATOR = 1_000_000;

/** The Reward Tax rates a Reward Launch may choose, in basis points: 1%, 3% or 5% (LaunchLab allows up to 5%). */
export const REWARD_TAX_BPS = [100, 300, 500] as const;
export type RewardTaxBps = (typeof REWARD_TAX_BPS)[number];

/** Curve rule groups: 0 pins a standard Launch, 1 a Reward Launch (a Token-2022 coin with a transfer fee). */
export const RULE_GROUP = { standard: 0, reward: 1 } as const;

// Curve rule field and operator codes, from raydium-sdk-V2 `LaunchpadCurveRuleField` / `LaunchpadCurveRuleOp`.
export const RuleField = {
  CurveType: 0, MigrateType: 1, MigrateCpmmFeeOn: 2, Supply: 3, TotalSellA: 4, TotalFundRaisingB: 5,
  TotalLockedAmount: 6, CliffPeriod: 7, UnlockPeriod: 8, BaseTokenProgram: 9, TransferFeeEnabled: 10,
} as const;
export const RuleOp = { Eq: 0, Gte: 1, Lte: 2, Neq: 3 } as const;

export type RuleConstraint = { field: number; op: number; value: BN };

/** The Graduation Targets, in the Quote Asset's raw units, a curve rule accepts. SOL's is a single value. */
export type GraduationBand = { min: BN; max: BN };

/** Constraints for a standard (SPL, no transfer fee) Launch against one Quote Asset. */
export function standardLaunchConstraints(band: GraduationBand): RuleConstraint[] {
  return launchConstraints(band, { baseTokenProgram: 0, transferFeeEnabled: 0 });
}

/**
 * Constraints for a Reward Launch against one Quote Asset: the same shape on a Token-2022 coin with a transfer fee (its
 * Reward Tax). The rate itself is not a rule field; the Indexer keeps only launches at one of REWARD_TAX_BPS.
 */
export function rewardLaunchConstraints(band: GraduationBand): RuleConstraint[] {
  return launchConstraints(band, { baseTokenProgram: 1, transferFeeEnabled: 1 });
}

function launchConstraints(band: GraduationBand, coin: { baseTokenProgram: 0 | 1; transferFeeEnabled: 0 | 1 }): RuleConstraint[] {
  const c = (field: number, op: number, value: BN | number) => ({ field, op, value: new BN(value.toString()) });
  const eq = (field: number, value: BN | number) => c(field, RuleOp.Eq, value);
  const target = band.min.eq(band.max)
    ? [eq(RuleField.TotalFundRaisingB, band.min)]
    : [c(RuleField.TotalFundRaisingB, RuleOp.Gte, band.min), c(RuleField.TotalFundRaisingB, RuleOp.Lte, band.max)];
  return [
    eq(RuleField.CurveType, LAUNCH_SHAPE.curveType),
    eq(RuleField.MigrateType, LAUNCH_SHAPE.migrateType),
    eq(RuleField.MigrateCpmmFeeOn, 0),
    eq(RuleField.Supply, LAUNCH_SHAPE.supply),
    eq(RuleField.TotalSellA, LAUNCH_SHAPE.totalBaseSell),
    ...target,
    eq(RuleField.TotalLockedAmount, 0),
    eq(RuleField.CliffPeriod, 0),
    eq(RuleField.UnlockPeriod, 0),
    eq(RuleField.BaseTokenProgram, coin.baseTokenProgram),
    eq(RuleField.TransferFeeEnabled, coin.transferFeeEnabled),
  ];
}

/**
 * A group no launch can satisfy (a raise of at least 1 and at most 0), for a Quote Asset we can't price.
 * Needed because a Quote Asset with no curve rule at all is not restricted, even with `restrict_curve_param` on.
 */
export function closedLaunchConstraints(): RuleConstraint[] {
  return [
    { field: RuleField.TotalFundRaisingB, op: RuleOp.Gte, value: new BN(1) },
    { field: RuleField.TotalFundRaisingB, op: RuleOp.Lte, value: new BN(0) },
  ];
}

/**
 * Whether a group of constraints pins the current launch shape's supply and sale. A group written before #166 pins the
 * 1B shape, which LaunchLab then holds every new launch to, so a launch built on LAUNCH_SHAPE would fail with 6025 until
 * the Quote Registry rewrites the group.
 */
export function pinsLaunchShape(constraints: RuleConstraint[]) {
  const pins = (field: number, value: BN) => constraints.some((c) => c.field === field && c.op === RuleOp.Eq && c.value.eq(value));
  return pins(RuleField.Supply, LAUNCH_SHAPE.supply) && pins(RuleField.TotalSellA, LAUNCH_SHAPE.totalBaseSell);
}

/** The Graduation Target band a group of constraints allows, or null when it allows none (a closed group). */
export function graduationBandOf(constraints: RuleConstraint[]): GraduationBand | null {
  let min: BN | null = null;
  let max: BN | null = null;
  for (const c of constraints) {
    if (c.field !== RuleField.TotalFundRaisingB) continue;
    if (c.op === RuleOp.Eq || c.op === RuleOp.Gte) min = min && min.gt(c.value) ? min : c.value;
    if (c.op === RuleOp.Eq || c.op === RuleOp.Lte) max = max && max.lt(c.value) ? max : c.value;
  }
  return min && max && min.lte(max) ? { min, max } : null;
}

export const sameConstraints = (a: RuleConstraint[], b: RuleConstraint[]) =>
  a.length === b.length && a.every((c, i) => c.field === b[i]!.field && c.op === b[i]!.op && c.value.eq(b[i]!.value));
