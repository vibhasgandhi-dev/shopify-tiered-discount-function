import {
  DiscountClass,
  OrderDiscountSelectionStrategy,
  CartInput,
  CartLinesDiscountsGenerateRunResult,
} from '../generated/api';
import {parseConfig, cartBasisValue, qualifyingTier, tierMessage} from './lib/tiers';

/**
 * Tiered order discount: the highest tier whose threshold the cart meets
 * is applied as a percentage off the order subtotal.
 */
export function cartLinesDiscountsGenerateRun(
  input: CartInput,
): CartLinesDiscountsGenerateRunResult {
  const empty: CartLinesDiscountsGenerateRunResult = {operations: []};

  if (!input.cart.lines.length) return empty;
  if (!input.discount.discountClasses.includes(DiscountClass.Order)) return empty;

  const config = parseConfig(input.discount.metafield?.jsonValue);
  if (!config) return empty;

  const tier = qualifyingTier(config, cartBasisValue(input.cart, config.basis));
  if (!tier || tier.percentage <= 0) return empty;

  return {
    operations: [
      {
        orderDiscountsAdd: {
          selectionStrategy: OrderDiscountSelectionStrategy.First,
          candidates: [
            {
              message: tierMessage(config, tier),
              targets: [{orderSubtotal: {excludedCartLineIds: []}}],
              value: {percentage: {value: tier.percentage}},
            },
          ],
        },
      },
    ],
  };
}
