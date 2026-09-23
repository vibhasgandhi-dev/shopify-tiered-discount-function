/**
 * Shared tier logic used by both discount targets.
 *
 * Configuration lives in the discount's `$app:config` JSON metafield, e.g.
 * {
 *   "basis": "subtotal",            // "subtotal" (cart subtotal) or "quantity" (total items)
 *   "message": "Spend & save",      // optional, shown at checkout; %p is replaced with the percentage
 *   "tiers": [
 *     { "threshold": 100, "percentage": 5 },
 *     { "threshold": 200, "percentage": 10 },
 *     { "threshold": 500, "percentage": 15, "freeShipping": true }
 *   ]
 * }
 * The highest tier whose threshold is met wins.
 */

export type Tier = {
  threshold: number;
  percentage: number;
  freeShipping?: boolean;
};

export type TierConfig = {
  basis: 'subtotal' | 'quantity';
  message?: string;
  tiers: Tier[];
};

type CartShape = {
  cost: {subtotalAmount: {amount: string | number}};
  lines: {quantity: number}[];
};

const num = (v: unknown, fallback = 0): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : fallback;
};

/** Parse and sanitise the metafield JSON. Returns null when there is nothing usable. */
export function parseConfig(raw: unknown): TierConfig | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const tiersRaw = Array.isArray(obj.tiers) ? obj.tiers : [];
  const tiers: Tier[] = tiersRaw
    .map((t) => {
      const tier = (t ?? {}) as Record<string, unknown>;
      return {
        threshold: num(tier.threshold, -1),
        percentage: num(tier.percentage, 0),
        freeShipping: tier.freeShipping === true,
      };
    })
    .filter((t) => t.threshold >= 0 && t.percentage >= 0 && t.percentage <= 100)
    .sort((a, b) => a.threshold - b.threshold);
  if (!tiers.length) return null;
  return {
    basis: obj.basis === 'quantity' ? 'quantity' : 'subtotal',
    message: typeof obj.message === 'string' ? obj.message : undefined,
    tiers,
  };
}

/** The value the tiers are compared against: cart subtotal or total item count. */
export function cartBasisValue(cart: CartShape, basis: TierConfig['basis']): number {
  if (basis === 'quantity') {
    return cart.lines.reduce((sum, line) => sum + num(line.quantity), 0);
  }
  return num(cart.cost.subtotalAmount.amount);
}

/** Highest tier whose threshold is met, or null. */
export function qualifyingTier(config: TierConfig, value: number): Tier | null {
  let best: Tier | null = null;
  for (const tier of config.tiers) {
    if (value >= tier.threshold) best = tier;
  }
  return best;
}

export function tierMessage(config: TierConfig, tier: Tier): string {
  const template = config.message ?? '%p% off your order';
  return template.replace('%p', String(tier.percentage));
}
