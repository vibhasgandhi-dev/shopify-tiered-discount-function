# Tiered discount — Shopify Function (Discount API 2026-07)

"Spend & save" tiers as a native Shopify Function: the highest tier the cart qualifies for is applied as a percentage off the order subtotal, with optional free shipping on any tier. This is the modern replacement for the tiered-discount Shopify Scripts that were retired on 30 June 2026.

Built and maintained by Vibhas Gandhi. Runs on Shopify and Shopify Plus.

## What it does

| Cart | Result |
|------|--------|
| Subtotal $99.99 | no discount |
| Subtotal $250 | 10% off order, message "Spend & save: 10% off" |
| Subtotal $640 | 15% off order + free shipping on every delivery group |
| `basis: "quantity"`, 6 items | 12% off (tiers measured by item count instead of money) |

Configuration is per discount, in a JSON metafield, so merchants change thresholds without a redeploy:

```json
{
  "basis": "subtotal",
  "message": "Spend & save: %p% off",
  "tiers": [
    { "threshold": 100, "percentage": 5 },
    { "threshold": 200, "percentage": 10 },
    { "threshold": 500, "percentage": 15, "freeShipping": true }
  ]
}
```

- `basis`: `subtotal` (cart subtotal in the cart currency) or `quantity` (total items).
- `message`: shown at checkout; `%p` is replaced with the percentage.
- `freeShipping`: when true on the qualifying tier, 100% off all delivery options (needs the SHIPPING discount class).

## Layout

```
extensions/tiered-discount/
  src/lib/tiers.ts                                  shared tier logic (parse, basis, qualify)
  src/cart_lines_discounts_generate_run.ts          order-level percentage discount
  src/cart_delivery_options_discounts_generate_run.ts  free shipping on qualifying tier
  src/*.graphql                                     input queries (metafield $app:config)
  tests/fixtures/*.json                             10 input/output fixtures run through the real wasm
```

## Run it

```bash
npm install
cd extensions/tiered-discount
npm run typegen          # regenerate types after editing a .graphql file
npm run build            # bundles + compiles to dist/function.wasm
npm test                 # builds, validates fixtures against the schema, runs wasm for each
```

Try a single input: `shopify app function run --input tests/fixtures/cart-lines-top-tier.json --export cart-lines-discounts-generate-run`.

## Install on a store

1. `shopify app deploy` (creates an app version with the function).
2. Install the app on the store, then create an automatic discount that uses the function and seed its config metafield — see `scripts/create-discount.graphql`.
3. Add items to the cart and watch the tier apply at checkout; edit the metafield JSON to change tiers live.

## Design notes

- Pure function: no network, no dates. Everything it needs comes through the input query.
- Config is sanitised (`threshold >= 0`, `0 <= percentage <= 100`, tiers sorted) so a bad metafield degrades to "no discount", never to a broken checkout.
- Order + shipping handled in one function with two targets, one config.
- Selection strategy FIRST: this function submits exactly one candidate, so FIRST and MAXIMUM behave the same.
