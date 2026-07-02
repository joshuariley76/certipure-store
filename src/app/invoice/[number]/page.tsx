import { createAdminClient } from '@/lib/supabase/admin'
import { verifyInvoiceToken } from '@/lib/payriox'
import InvoicePayClient from '@/components/InvoicePayClient'

export const dynamic = 'force-dynamic'

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full bg-white border border-gray-200 rounded-2xl p-8 text-center">
        {children}
      </div>
    </main>
  )
}

export default async function InvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ number: string }>
  searchParams: Promise<{ t?: string }>
}) {
  const { number } = await params
  const { t } = await searchParams
  const token = (t || '').trim()

  if (!number || !verifyInvoiceToken(number, token)) {
    return (
      <Shell>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Invoice link not valid</h1>
        <p className="text-sm text-gray-500">This payment link is invalid or has expired. Please contact us for a new one.</p>
      </Shell>
    )
  }

  const admin = createAdminClient()
  if (!admin) {
    return (
      <Shell>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Temporarily unavailable</h1>
        <p className="text-sm text-gray-500">Please try again shortly.</p>
      </Shell>
    )
  }

  const { data: order } = await admin
    .from('orders')
    .select('*')
    .eq('order_number', number)
    .single()

  if (!order) {
    return (
      <Shell>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Invoice not found</h1>
        <p className="text-sm text-gray-500">We couldn&rsquo;t find this invoice. Please contact us.</p>
      </Shell>
    )
  }

  // Already paid / being processed — don't show the pay form again.
  const paidStates = ['payment_verified', 'verified', 'shipped', 'delivered', 'pending_verification']
  if (paidStates.includes(order.status)) {
    const submitted = order.status === 'pending_verification'
    return (
      <Shell>
        <div className="text-4xl mb-3">{submitted ? '⏳' : '✅'}</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">
          {submitted ? 'Payment submitted' : 'This invoice is paid'}
        </h1>
        <p className="text-sm text-gray-500">
          {submitted
            ? `We've received your payment for invoice ${number} and are verifying it now. You'll get an email once it's confirmed.`
            : `Invoice ${number} has already been paid. Thank you!`}
        </p>
      </Shell>
    )
  }

  const { data: items } = await admin
    .from('order_items')
    .select('product_name_snapshot, pack_size, quantity, line_total')
    .eq('order_id', order.id)

  return (
    <InvoicePayClient
      orderNumber={number}
      token={token}
      items={(items || []).map((i: any) => ({
        name: i.product_name_snapshot,
        packSize: i.pack_size,
        quantity: i.quantity,
        lineTotal: Number(i.line_total),
      }))}
      subtotal={Number(order.subtotal) || 0}
      shipping={Number(order.shipping_cost) || 0}
      total={Number(order.order_total) || 0}
      customerEmail={order.customer_email || ''}
    />
  )
}
