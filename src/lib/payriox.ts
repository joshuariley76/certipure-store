import { createHmac, timingSafeEqual } from 'crypto'

// ---------------------------------------------------------------------------
// PayRio (PayRioX) card-payment gateway helper.
//
// PayRio is a redirect-based gateway: the customer pays by card on PayRio's own
// hosted page, the funds settle as USDC to our payout wallet, and PayRio then
// makes a server-to-server "callback" to confirm the payment. This file holds
// the small amount of shared logic used by the two API routes that drive that
// flow (`/api/payriox/create` and `/api/payriox/callback`).
//
// SECURITY NOTE: PayRio's callback is NOT cryptographically signed by them, so
// on its own anyone who guessed an order number could forge a "paid" message.
// We close that hole ourselves: we append our OWN token to the callback URL we
// hand PayRio in step 1. That token is an HMAC of the order number using a
// secret that lives only on the server and is never exposed to the browser, so
// only a real PayRio callback (which echoes our URL back) can carry it.
// ---------------------------------------------------------------------------

export const PAYRIOX_API_BASE = 'https://api.payriox.com'
export const PAYRIOX_CHECKOUT_BASE = 'https://checkout.payriox.com'
export const PAYRIOX_IPT_URL = 'https://api.payriox.com/ipt/v1/track'

// The merchant's self-custodial USDC (Polygon) payout wallet. Card payments are
// disabled until this is set.
export function payrioxPayoutWallet(): string {
  return process.env.PAYRIOX_PAYOUT_WALLET || ''
}

export function payrioxConfigured(): boolean {
  return Boolean(payrioxPayoutWallet() && process.env.PAYRIOX_CALLBACK_SECRET)
}

export function payrioxCurrency(): string {
  return process.env.PAYRIOX_CURRENCY || 'USD'
}

// --- Callback token: our anti-spoofing signature -------------------------------

function callbackSecret(): string {
  return process.env.PAYRIOX_CALLBACK_SECRET || ''
}

// A deterministic, unguessable token derived from the order number. Embedded in
// the server-to-server callback URL only — never sent to the customer.
export function callbackToken(orderNumber: string): string {
  return createHmac('sha256', callbackSecret()).update(orderNumber).digest('hex')
}

// Constant-time comparison so an attacker can't learn the token byte-by-byte.
export function verifyCallbackToken(orderNumber: string, token: string): boolean {
  if (!callbackSecret() || !token) return false
  const expected = callbackToken(orderNumber)
  const a = Buffer.from(expected)
  const b = Buffer.from(token)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

// --- Step 1: create a one-time encrypted receiving wallet ----------------------

export interface PayrioxWallet {
  address_in: string          // encrypted wallet string used to launch checkout
  polygon_address_in?: string // decrypted temp wallet (for our own records only)
  ipn_token?: string          // tracking token for support investigations
}

// Calls PayRio's wallet endpoint and returns the encrypted wallet. Throws on any
// network/format failure so the caller can abort the order cleanly.
export async function createTempWallet(callbackUrl: string): Promise<PayrioxWallet> {
  const url =
    `${PAYRIOX_API_BASE}/control/wallet.php` +
    `?address=${encodeURIComponent(payrioxPayoutWallet())}` +
    `&callback=${encodeURIComponent(callbackUrl)}`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)
  let res: Response
  try {
    res = await fetch(url, { method: 'GET', signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }

  if (!res.ok) {
    throw new Error(`PayRio wallet request failed (HTTP ${res.status})`)
  }
  const data = (await res.json()) as PayrioxWallet
  if (!data || !data.address_in) {
    throw new Error('PayRio wallet response missing address_in')
  }
  return data
}

// --- Step 2: build the hosted multi-provider checkout URL ----------------------

// Sends the customer to PayRio's hosted page where they choose card / Apple Pay /
// Google Pay etc. White-label params brand the page to match CertiPure.
export function buildCheckoutUrl(opts: {
  addressIn: string
  amount: number
  email: string
  currency?: string
}): string {
  const params = new URLSearchParams({
    address: opts.addressIn,
    amount: opts.amount.toFixed(2),
    email: opts.email,
    currency: opts.currency || payrioxCurrency(),
    theme: '2563eb',   // CertiPure blue
    button: '2563eb',
  })
  return `${PAYRIOX_CHECKOUT_BASE}/pay.php?${params.toString()}`
}

// --- IPT (Insta Payment Tracking): optional, fire-and-forget -------------------

// Reports lifecycle events to PayRio's tracking endpoint. Non-blocking and
// silent: a tracking failure must never affect checkout or order processing.
// Does nothing unless PAYRIOX_IPT_KEY is configured.
export function sendIptEvent(payload: Record<string, unknown>): void {
  const key = process.env.PAYRIOX_IPT_KEY
  if (!key) return
  // Intentionally not awaited.
  fetch(PAYRIOX_IPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-IPT-Key': key },
    body: JSON.stringify(payload),
  }).catch(() => { /* silent — IPT is non-authoritative */ })
}

// Formats a Date as "YYYY-MM-DD HH:MM:SS" (the format IPT expects).
export function iptTimestamp(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return (
    `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ` +
    `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`
  )
}
