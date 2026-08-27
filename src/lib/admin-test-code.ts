// The ADMIN checkout code — a way to walk the whole checkout end to end
// without money moving or anything being consumed.
//
// It is not a 100% discount. A test order:
//   • totals $0 — no subtotal, no shipping, no odd cents
//   • deducts no stock
//   • earns no affiliate commission and tags no affiliate to the customer
//   • does not use up the first-order welcome code
//   • is numbered CP-TEST-xxxxx so it is obvious in the admin list
//   • needs no payment screenshot
// The emails still send, subject-prefixed [TEST], because seeing those arrive
// is usually the point of the exercise.
//
// "ADMIN" is trivially guessable, so the code alone is not enough: the same
// browser must also be signed in at /admin/login. A customer who types ADMIN
// is simply told the code isn't valid — the same answer any wrong code gets,
// which avoids advertising that the code exists.
//
// Override the word itself with ADMIN_TEST_CODE if you ever want it changed.

export const ADMIN_TEST_CODE = (process.env.ADMIN_TEST_CODE || 'ADMIN').trim()

export const TEST_ORDER_PREFIX = 'CP-TEST-'

/** Did the customer type the test code? Says nothing about whether they may
 *  use it — pair this with isAdminAuthenticated(). */
export function isAdminTestCode(input: string | null | undefined): boolean {
  if (!input) return false
  return input.trim().toLowerCase() === ADMIN_TEST_CODE.toLowerCase()
}

export function buildTestOrderNumber(): string {
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase()
  return `${TEST_ORDER_PREFIX}${rand}`
}

export function isTestOrderNumber(orderNumber: string | null | undefined): boolean {
  return (orderNumber || '').startsWith(TEST_ORDER_PREFIX)
}
