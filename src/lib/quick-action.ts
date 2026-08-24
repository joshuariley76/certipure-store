import crypto from 'node:crypto'

// Lets the order email carry a "Mark paid" button that works from a phone
// without logging in. The link carries a signature made from the order id and
// the admin password, so only a link this server produced will be accepted —
// guessing one is not feasible, and it cannot be reused for a different order.
//
// SERVER ONLY.

function secret() {
  const key = process.env.ADMIN_KEY
  if (!key) throw new Error('ADMIN_KEY is not set')
  return key
}

export function signOrderAction(orderId: string, action: string): string {
  return crypto
    .createHmac('sha256', secret())
    .update(`${action}:${orderId}`)
    .digest('hex')
    .slice(0, 32)
}

export function verifyOrderAction(orderId: string, action: string, token: string): boolean {
  if (!orderId || !action || !token) return false
  let expected: string
  try {
    expected = signOrderAction(orderId, action)
  } catch {
    return false
  }
  const a = Buffer.from(expected)
  const b = Buffer.from(token)
  // Length check first — timingSafeEqual throws on a mismatch.
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}
