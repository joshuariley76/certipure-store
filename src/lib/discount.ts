// First-order discount configuration and math.
//
// Shared by three places so "what we show" and "what we charge" can never
// drift apart:
//   1. CheckoutClient.tsx   — live preview of the discounted total
//   2. /api/validate-discount — checks a code before checkout
//   3. /api/create-order      — the authoritative calculation that gets stored
//
// The code and percentage can be overridden with environment variables; the
// defaults below mean it works out of the box.
//   CHECKOUT_DISCOUNT_CODE     (default "WELCOME10")
//   CHECKOUT_DISCOUNT_PERCENT  (default 10)

export const DISCOUNT_CODE = (process.env.CHECKOUT_DISCOUNT_CODE || 'WELCOME10').trim()
export const DISCOUNT_PERCENT = Number(process.env.CHECKOUT_DISCOUNT_PERCENT || '10')

/** True if the customer-typed code matches our code (case-insensitive). */
export function codeMatches(input: string | null | undefined): boolean {
  if (!input) return false
  return input.trim().toLowerCase() === DISCOUNT_CODE.toLowerCase()
}

/**
 * The dollar discount for a given subtotal, rounded to whole cents. Applies to
 * the subtotal only — never to shipping. Using the same formula everywhere
 * keeps the previewed amount and the charged amount identical.
 */
export function discountAmountFor(subtotal: number, percent: number = DISCOUNT_PERCENT): number {
  return Math.round(subtotal * percent) / 100
}
