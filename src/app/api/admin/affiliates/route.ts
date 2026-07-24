import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// Admin-only: create and edit affiliate codes. Reading/reporting happens in the
// /admin/affiliates page itself (server-side).

// Create a new affiliate.
export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'Service role key not configured.' }, { status: 500 })

  const body = await request.json().catch(() => ({}))
  const code = String(body?.code || '').trim().toUpperCase()
  const name = String(body?.name || '').trim()
  const email = body?.email ? String(body.email).trim() : null
  const discount = Number(body?.discount_percent)
  const commission = Number(body?.commission_percent)

  if (!code || !name) {
    return NextResponse.json({ error: 'Code and name are required.' }, { status: 400 })
  }
  if (!/^[A-Z0-9]+$/.test(code)) {
    return NextResponse.json({ error: 'Code can only contain letters and numbers (no spaces).' }, { status: 400 })
  }
  if (!Number.isFinite(discount) || discount < 0 || discount > 100) {
    return NextResponse.json({ error: 'Discount % must be between 0 and 100.' }, { status: 400 })
  }
  if (!Number.isFinite(commission) || commission < 0 || commission > 100) {
    return NextResponse.json({ error: 'Commission % must be between 0 and 100.' }, { status: 400 })
  }

  const { data, error } = await admin
    .from('affiliates')
    .insert({ code, name, email, discount_percent: discount, commission_percent: commission })
    .select()
    .single()

  if (error) {
    const msg = error.code === '23505'
      ? `Code "${code}" already exists.`
      : error.message
    return NextResponse.json({ error: msg }, { status: 400 })
  }
  return NextResponse.json({ ok: true, affiliate: data })
}

// Edit an affiliate: toggle active, or update name/email/percentages.
export async function PATCH(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'Service role key not configured.' }, { status: 500 })

  const body = await request.json().catch(() => ({}))
  const id = String(body?.id || '')
  if (!id) return NextResponse.json({ error: 'Missing affiliate id.' }, { status: 400 })

  const patch: Record<string, unknown> = {}
  if (typeof body.is_active === 'boolean') patch.is_active = body.is_active
  if (body.name != null) patch.name = String(body.name).trim()
  if (body.email !== undefined) patch.email = body.email ? String(body.email).trim() : null
  if (body.discount_percent != null) {
    const d = Number(body.discount_percent)
    if (!Number.isFinite(d) || d < 0 || d > 100) return NextResponse.json({ error: 'Bad discount %.' }, { status: 400 })
    patch.discount_percent = d
  }
  if (body.commission_percent != null) {
    const c = Number(body.commission_percent)
    if (!Number.isFinite(c) || c < 0 || c > 100) return NextResponse.json({ error: 'Bad commission %.' }, { status: 400 })
    patch.commission_percent = c
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 })
  }

  const { error } = await admin.from('affiliates').update(patch).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
