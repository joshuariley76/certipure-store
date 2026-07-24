import { redirect } from 'next/navigation'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import AffiliatesAdmin from './AffiliatesAdmin'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Affiliates | CertiPure Admin',
}

export default async function AffiliatesPage() {
  if (!(await isAdminAuthenticated())) {
    redirect('/admin/login')
  }

  const admin = createAdminClient()
  if (!admin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <p className="text-sm text-red-600">Service role key not configured.</p>
      </div>
    )
  }

  // If the affiliates table doesn't exist yet (SQL not run), show setup help
  // instead of crashing.
  const { data: affiliates, error } = await admin
    .from('affiliates')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-lg bg-white rounded-2xl border border-gray-200 p-8">
          <h1 className="text-xl font-bold text-gray-900 mb-3">One setup step left</h1>
          <p className="text-sm text-gray-600 mb-4">
            The affiliate tables aren&rsquo;t created yet. Open your Supabase project →{' '}
            <strong>SQL Editor</strong>, paste the contents of{' '}
            <code>affiliate-tracking.sql</code> (in the project root), and run it. Then reload this page.
          </p>
          <p className="text-xs text-red-500">Details: {error.message}</p>
        </div>
      </div>
    )
  }

  // Aggregate per-affiliate stats from orders. Commission is only counted on
  // orders that have progressed past the initial pending state, so cancelled
  // orders don't inflate what's owed.
  const COUNTED = ['payment_verified', 'verified', 'shipped', 'delivered']
  const { data: orders } = await admin
    .from('orders')
    .select('affiliate_id, order_total, commission_amount, status')
    .not('affiliate_id', 'is', null)

  const stats: Record<string, { orders: number; sales: number; commission: number }> = {}
  for (const o of (orders || []) as any[]) {
    if (!o.affiliate_id) continue
    const s = (stats[o.affiliate_id] ||= { orders: 0, sales: 0, commission: 0 })
    s.orders += 1
    s.sales += Number(o.order_total || 0)
    if (COUNTED.includes(o.status)) s.commission += Number(o.commission_amount || 0)
  }

  const rows = (affiliates || []).map((a: any) => ({
    ...a,
    stat: stats[a.id] || { orders: 0, sales: 0, commission: 0 },
  }))

  return <AffiliatesAdmin affiliates={rows} />
}
