import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resend, FROM_EMAIL } from '@/lib/resend'
import type { CartItem } from '@/lib/types'

// Abandoned-cart reminder job (Feature 5).
//
// Run on a schedule by Vercel Cron (see vercel.json). Because completing an
// order deletes the customer's cart_items, anything still in cart_items means
// that cart was never checked out — so a cart whose newest item is older than
// CART_ABANDON_DELAY_HOURS is a genuine abandonment.
//
// Ships SAFE: it only sends real email when CART_ABANDON_REMINDERS=on. Until
// then it runs as a dry run (reports who *would* be emailed, sends nothing).
//
// Env:
//   CRON_SECRET               required — Vercel Cron sends it as a Bearer token
//   CART_ABANDON_DELAY_HOURS  hours a cart must sit before a reminder (default 24)
//   CART_ABANDON_REMINDERS    "on" to actually send; anything else = dry run

export const dynamic = 'force-dynamic'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://certipure.net'
const DELAY_HOURS = Number(process.env.CART_ABANDON_DELAY_HOURS || '24')
const SEND_FOR_REAL = (process.env.CART_ABANDON_REMINDERS || '').toLowerCase() === 'on'

export async function GET(request: Request) {
  // Only Vercel Cron (or someone who knows CRON_SECRET) may trigger this.
  const secret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
  }

  const cutoffMs = Date.now() - DELAY_HOURS * 60 * 60 * 1000

  // Every cart item with its product. (Carts are small; a new store has few.)
  const { data: rawItems, error: itemsErr } = await admin
    .from('cart_items')
    .select('id,user_id,product_id,pack_size,quantity,price_at_add,created_at,product:products(name,slug)')
  if (itemsErr) {
    console.error('Abandoned-cart: cart_items query failed:', itemsErr.message)
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }

  const items = (rawItems ?? []) as unknown as CartItem[]

  // Group items by user; track each cart's newest item time.
  type CartGroup = { userId: string; latest: number; items: CartItem[] }
  const byUser = new Map<string, CartGroup>()
  for (const it of items) {
    const t = it.created_at ? Date.parse(it.created_at) : 0
    const g = byUser.get(it.user_id) ?? { userId: it.user_id, latest: 0, items: [] }
    g.items.push(it)
    if (t > g.latest) g.latest = t
    byUser.set(it.user_id, g)
  }

  // Only carts that have gone stale (newest item older than the cutoff).
  const stale = [...byUser.values()].filter((g) => g.latest > 0 && g.latest < cutoffMs)
  if (stale.length === 0) {
    return NextResponse.json({ scanned: byUser.size, stale: 0, reminded: 0, dryRun: !SEND_FOR_REAL })
  }

  const userIds = stale.map((g) => g.userId)

  // Carts we've already reminded. We store the newest-item time we last emailed
  // about; if the cart hasn't gained newer items, we don't email it again.
  const { data: reminders } = await admin
    .from('cart_reminders')
    .select('user_id,last_item_at')
    .in('user_id', userIds)
  const lastRemindedAt = new Map<string, number>()
  for (const r of reminders ?? []) {
    const at = r.last_item_at ? Date.parse(r.last_item_at as string) : 0
    lastRemindedAt.set(r.user_id as string, at)
  }

  // Email + first name for these users.
  const { data: profiles } = await admin
    .from('profiles')
    .select('id,email,first_name')
    .in('id', userIds)
  const profileById = new Map<string, { email: string | null; first_name: string | null }>()
  for (const p of profiles ?? []) {
    profileById.set(p.id as string, {
      email: (p.email as string | null) ?? null,
      first_name: (p.first_name as string | null) ?? null,
    })
  }

  let reminded = 0
  const planned: { email: string; items: number }[] = []

  for (const g of stale) {
    // Already reminded about this exact cart? Skip.
    if ((lastRemindedAt.get(g.userId) ?? 0) >= g.latest) continue

    const profile = profileById.get(g.userId)
    if (!profile?.email) continue

    planned.push({ email: profile.email, items: g.items.length })
    if (!SEND_FOR_REAL) continue // dry run — count it, send nothing

    const firstName = profile.first_name || 'there'
    const rows = g.items
      .map((it) => {
        const name = it.product?.name || 'Research item'
        const pack = it.pack_size === 1 ? 'Single Vial' : `${it.pack_size}-Pack`
        const line = (Number(it.price_at_add) * it.quantity).toFixed(2)
        return `<tr><td style="padding:8px;border-bottom:1px solid #eee">${name} (${pack})</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${it.quantity}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">$${line}</td></tr>`
      })
      .join('')

    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: profile.email,
        subject: 'You left some research items in your cart',
        // Compliant copy only: no urgency, no benefit/dosing/human-use claims.
        html: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333"><div style="background:#0f1540;padding:24px;border-radius:8px 8px 0 0;text-align:center"><h1 style="color:#fff;margin:0">CertiPure</h1><p style="color:#94a3b8;margin:8px 0 0">Research Peptides</p></div><div style="background:#fff;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px"><p>Hi ${firstName},</p><p>You started an order on CertiPure but didn't complete checkout. Your selected items are still in your cart:</p><table style="width:100%;border-collapse:collapse;margin:16px 0"><tbody>${rows}</tbody></table><p style="text-align:center;margin:28px 0"><a href="${SITE_URL}/cart" style="background:#2d3ca5;color:#fff;text-decoration:none;font-weight:bold;padding:12px 28px;border-radius:6px;display:inline-block">Return to your cart</a></p><p style="font-size:13px;color:#64748b">For research use only. Not for human consumption.</p><p style="font-size:13px;color:#64748b">&mdash; The CertiPure Team<br>DJT Peak Health LLC</p></div></body></html>`,
      })

      // Mark this cart reminded so we don't email it again unless it changes.
      await admin
        .from('cart_reminders')
        .upsert(
          {
            user_id: g.userId,
            last_item_at: new Date(g.latest).toISOString(),
            reminded_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' },
        )

      reminded++
    } catch (e) {
      console.error('Abandoned-cart email failed for user', g.userId, e)
    }
  }

  return NextResponse.json({
    scanned: byUser.size,
    stale: stale.length,
    reminded,
    dryRun: !SEND_FOR_REAL,
    // In a dry run, show who would have been emailed so you can sanity-check.
    planned: SEND_FOR_REAL ? undefined : planned,
  })
}
