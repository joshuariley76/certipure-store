import { redirect } from 'next/navigation'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import AdminDashboard from './AdminDashboard'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Orders | CertiPure Admin',
}

export default async function AdminOrdersPage() {
  if (!(await isAdminAuthenticated())) {
    redirect('/admin/login')
  }

  const admin = createAdminClient()

  // The service role key is required to read every customer's orders. If it
  // isn't configured yet, show setup instructions instead of crashing.
  if (!admin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-lg bg-white rounded-2xl border border-gray-200 p-8">
          <h1 className="text-xl font-bold text-gray-900 mb-3">One setup step left</h1>
          <p className="text-sm text-gray-600 mb-4">
            To let this page read all orders, add your Supabase{' '}
            <strong>service role key</strong> to <code>.env.local</code>:
          </p>
          <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1 mb-4">
            <li>Open your Supabase project → <strong>Project Settings → API Keys</strong>.</li>
            <li>Copy the <strong>service_role</strong> secret key.</li>
            <li>Add this line to <code>.env.local</code>:<br />
              <code className="text-xs bg-gray-100 px-2 py-1 rounded">SUPABASE_SERVICE_ROLE_KEY=your-key-here</code>
            </li>
            <li>Stop and restart the dev server.</li>
          </ol>
          <p className="text-xs text-red-600">
            Keep this key secret — never share it. It must NOT start with NEXT_PUBLIC_.
          </p>
        </div>
      </div>
    )
  }

  const { data: orders, error } = await admin
    .from('orders')
    .select('*, order_items(*)')
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <p className="text-sm text-red-600">Failed to load orders: {error.message}</p>
      </div>
    )
  }

  // Turn each order's stored screenshot path into a temporary viewable link.
  const list = orders || []
  const withScreenshots = await Promise.all(
    list.map(async (order: any) => {
      let screenshotUrl: string | null = null
      if (order.screenshot_url) {
        const { data } = await admin.storage
          .from('order-screenshots')
          .createSignedUrl(order.screenshot_url, 60 * 60) // valid 1 hour
        screenshotUrl = data?.signedUrl ?? null
      }
      return { ...order, screenshotUrl }
    }),
  )

  // Products for the Inventory tab.
  const { data: products } = await admin
    .from('products')
    .select('id, name, sku, stock_quantity')
    .order('name')

  return <AdminDashboard orders={withScreenshots} products={products || []} />
}
