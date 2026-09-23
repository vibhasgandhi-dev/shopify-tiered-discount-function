import {
  DeliveryDiscountSelectionStrategy,
  DiscountClass,
  DeliveryInput,
  CartDeliveryOptionsDiscountsGenerateRunResult,
} from '../generated/api';
import {parseConfig, cartBasisValue, qualifyingTier} from './lib/tiers';

/**
 * Free shipping on every delivery group when the qualifying tier has
 * `freeShipping: true`. Requires the SHIPPING discount class on the discount.
 */
export function cartDeliveryOptionsDiscountsGenerateRun(
  input: DeliveryInput,
): CartDeliveryOptionsDiscountsGenerateRunResult {
  const empty: CartDeliveryOptionsDiscountsGenerateRunResult = {operations: []};

  if (!input.cart.deliveryGroups.length) return empty;
  if (!input.discount.discountClasses.includes(DiscountClass.Shipping)) return empty;

  const config = parseConfig(input.discount.metafield?.jsonValue);
  if (!config) return empty;

  const tier = qualifyingTier(config, cartBasisValue(input.cart, config.basis));
  if (!tier?.freeShipping) return empty;

  return {
    operations: [
      {
        deliveryDiscountsAdd: {
          selectionStrategy: DeliveryDiscountSelectionStrategy.All,
          candidates: [
            {
              message: 'Free shipping',
              targets: input.cart.deliveryGroups.map((group) => ({
                deliveryGroup: {id: group.id},
              })),
              value: {percentage: {value: 100}},
            },
          ],
        },
      },
    ],
  };
}
