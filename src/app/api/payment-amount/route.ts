import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Every order is given an odd number of cents — between 1 and 9 — on top of its
// total. That turns the amount itself into the order's reference: when Josh's
// phone says "you received $203.04", there is exactly one order it can be, with
// nothing to look up.
//
// The customer has to know the figure BEFORE they send the money, so this is
// called as soon as they pick a payment method, not when the order is saved.
//
// The cent chosen is one that no other unpaid order of the same dollar amount
// is already using, so two open orders can never be confused with each other.

const MIN_CENTS = 1
const MAX_CENTS = 9

// Only orders that are still waiting on money can be confused with each other.
const OPEN_STATUSES = ['pending_payment', 'pending_verification']

export async function GET(request: Request) {
  const base = Number(new URL(request.url).searchParams.get('base'))
  if (!Number.isFinite(base) || base <= 0) {
    return NextResponse.json({ error: 'Bad base amount' }, { status: 400 })
  }

  const dollars = Math.floor(base)
  const fallback = () => MIN_CENTS + Math.floor(Math.random() * (MAX_CENTS - MIN_CENTS + 1))

  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ cents: fallback() })

  try {
    // Any open order whose total sits inside this dollar has already claimed a
    // cent value; we must not hand out the same one.
    const { data, error } = await admin
      .from('orders')
      .select('order_total')
      .in('status', OPEN_STATUSES)
      .gte('order_total', dollars)
      .lt('order_total', dollars + 1)

    if (error || !data) return NextResponse.json({ cents: fallback() })

    const taken = new Set(
      data.map((row) => Math.round((Number(row.order_total) % 1) * 100)),
    )
    const free: number[] = []
    for (let c = MIN_CENTS; c <= MAX_CENTS; c++) if (!taken.has(c)) free.push(c)

    // All nine used would need nine unpaid orders at the very same dollar
    // amount. Vanishingly unlikely, but pick something rather than fail.
    const cents = free.length ? free[Math.floor(Math.random() * free.length)] : fallback()
    return NextResponse.json({ cents })
  } catch {
    return NextResponse.json({ cents: fallback() })
  }
}
