// Affiliate code resolution + money math.
//
// An affiliate `code` is BOTH the customer's discount code and the affiliate's
// tracking tag. Rules (see /api/create-order for the authoritative use):
//   • The customer must type the code to get the discount — every order.
//   • The FIRST time a customer uses any affiliate code, that affiliate
//     permanently "owns" them (stored on profiles.referred_by_id).
//   • The owning affiliate earns commission on ALL of that customer's future
//     orders, whether or not the code is entered again.
//
// Legacy first-order welcome code (WELCOME10) still works, handled separately.

import { codeMatches as legacyMatches, DISCOUNT_PERCENT as LEGACY_PERCENT, DISCOUNT_CODE as LEGACY_CODE } from './discount'

export interface Affiliate {
  id: string
  code: string
  name: string
  email: string | null
  discount_percent: number
  commission_percent: number
  is_active: boolean
}

export type ResolvedCode =
  | { kind: 'affiliate'; affiliate: Affiliate }
  | { kind: 'legacy'; code: string; percent: number }
  | null

/**
 * Resolve a customer-typed code. Active affiliate codes (from the DB) take
 * priority; otherwise the legacy first-order welcome code. Returns null when
 * nothing matches. Defensive: if the affiliates table doesn't exist yet (SQL
 * not run) the DB error is swallowed so checkout keeps working.
 */
export async function resolveCode(input: string | null | undefined, admin: any): Promise<ResolvedCode> {
  const code = (input || '').trim()
  if (!code) return null

  if (admin) {
    try {
      const { data } = await admin
        .from('affiliates')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()
      if (data) return { kind: 'affiliate', affiliate: data as Affiliate }
    } catch {
      /* table missing or transient error — fall through to legacy */
    }
  }

  if (legacyMatches(code)) return { kind: 'legacy', code: LEGACY_CODE, percent: LEGACY_PERCENT }
  return null
}

/** Whole-cent money helpers, applied to the subtotal only (never shipping). */
export function discountFor(subtotal: number, percent: number): number {
  return Math.round(subtotal * percent) / 100
}
export function commissionFor(subtotal: number, percent: number): number {
  return Math.round(subtotal * percent) / 100
}

/** Look up the affiliate that permanently owns a customer, if any. */
export async function ownerForUser(userId: string, admin: any): Promise<Affiliate | null> {
  if (!admin) return null
  try {
    const { data: profile } = await admin
      .from('profiles')
      .select('referred_by_id')
      .eq('id', userId)
      .maybeSingle()
    if (!profile?.referred_by_id) return null
    const { data: aff } = await admin
      .from('affiliates')
      .select('*')
      .eq('id', profile.referred_by_id)
      .maybeSingle()
    return (aff as Affiliate) || null
  } catch {
    return null
  }
}
