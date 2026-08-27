// Bacteriostatic water pricing — the one place the rule lives.
//
// eBac Brand Water is $15 on its own, and $10 each the moment there is
// anything else in the cart (a single vial counts, not just a pack). In
// practice $15 is only ever charged to someone buying water and nothing else.
//
// Four separate places need to agree on that number: the cart drawer, the
// cart page, the checkout summary, and the order API that decides what the
// customer is actually charged. They all call in here, so they cannot drift
// apart and quote different prices.
//
// Why the price is worked out on the fly rather than stored: cart rows keep a
// `price_at_add`, but whether the water qualifies can change *after* it was
// added — take the peptide out of the cart and the water has to go back to
// $15. So for water we ignore `price_at_add` and recompute every time.

export const WATER_SLUG = 'ebac-bac-water-30ml'
export const WATER_PRICE_ALONE = 15
export const WATER_PRICE_WITH_ORDER = 10

type ProductLike = { slug?: string | null } | null | undefined

// Cart rows reach us in two shapes: the browser queries `product:products(*)`
// and the order API queries `products(*)`. Accept either.
type CartRowLike = {
  quantity: number
  price_at_add: number | string
  product?: ProductLike
  products?: ProductLike
}

function slugOf(row: CartRowLike): string {
  return row.product?.slug ?? row.products?.slug ?? ''
}

export function isWaterRow(row: CartRowLike): boolean {
  return slugOf(row) === WATER_SLUG
}

/** True when the cart holds something other than water, which is what earns
 *  the add-on price. */
export function cartQualifies(rows: CartRowLike[]): boolean {
  return rows.some((row) => !isWaterRow(row))
}

export function cartHasWater(rows: CartRowLike[]): boolean {
  return rows.some(isWaterRow)
}

export function unitPriceOf(row: CartRowLike, qualifies: boolean): number {
  if (!isWaterRow(row)) return Number(row.price_at_add)
  return qualifies ? WATER_PRICE_WITH_ORDER : WATER_PRICE_ALONE
}

export type PricedLine<T> = {
  row: T
  /** What this line is actually charged, per unit. */
  unitPrice: number
  /** What it would cost without the add-on discount — for the struck-through price. */
  listPrice: number
  lineTotal: number
  isDiscounted: boolean
}

/** Price a whole cart in one pass. Everything else in the app reads from this. */
export function priceCart<T extends CartRowLike>(rows: T[]) {
  const qualifies = cartQualifies(rows)

  const lines: PricedLine<T>[] = rows.map((row) => {
    const unitPrice = unitPriceOf(row, qualifies)
    const listPrice = isWaterRow(row) ? WATER_PRICE_ALONE : Number(row.price_at_add)
    return {
      row,
      unitPrice,
      listPrice,
      lineTotal: unitPrice * row.quantity,
      isDiscounted: unitPrice < listPrice,
    }
  })

  return {
    lines,
    qualifies,
    hasWater: cartHasWater(rows),
    subtotal: lines.reduce((sum, line) => sum + line.lineTotal, 0),
  }
}

/** Should the "need water?" reminder be shown for this cart? Only when the
 *  $10 it advertises is a price the customer genuinely qualifies for. */
export function shouldOfferWater(rows: CartRowLike[]): boolean {
  return cartQualifies(rows) && !cartHasWater(rows)
}
