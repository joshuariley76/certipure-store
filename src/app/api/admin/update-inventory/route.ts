import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

// Bulk-update product stock levels from the admin Inventory tab. Protected by
// the same ADMIN_KEY cookie as the rest of the admin area. Expects:
//   { updates: [{ id: string, stock_quantity: number }, ...] }
export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const updates = Array.isArray(body?.updates) ? body.updates : null
  if (!updates || updates.length === 0) {
    return NextResponse.json({ error: 'No updates provided.' }, { status: 400 })
  }

  // Validate every row before touching the database: each needs a string id and
  // a whole number >= 0.
  const clean: { id: string; stock_quantity: number }[] = []
  for (const u of updates) {
    const id = typeof u?.id === 'string' ? u.id : null
    const qty = Number(u?.stock_quantity)
    if (!id || !Number.isInteger(qty) || qty < 0) {
      return NextResponse.json(
        { error: 'Each quantity must be a whole number of 0 or more.' },
        { status: 400 },
      )
    }
    clean.push({ id, stock_quantity: qty })
  }

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json(
      { error: 'Service role key not configured.' },
      { status: 500 },
    )
  }

  let updated = 0
  for (const row of clean) {
    const { error } = await admin
      .from('products')
      .update({ stock_quantity: row.stock_quantity })
      .eq('id', row.id)
    if (error) {
      return NextResponse.json(
        { error: `Failed to update one of the products: ${error.message}` },
        { status: 500 },
      )
    }
    updated++
  }

  return NextResponse.json({ ok: true, updated })
}
