import { createAdminClient } from '@/lib/supabase/admin'
import { verifyOrderAction } from '@/lib/quick-action'

// The "Mark paid" button in the order email lands here. Josh taps it from his
// phone the moment his Zelle or Cash App alert shows the matching amount; the
// order flips to verified and the customer gets their confirmation, without him
// opening the admin at all.
//
// Returns a plain page rather than JSON, because a person is looking at it.

const FINAL = ['payment_verified', 'shipped', 'delivered']

function page(title: string, body: string, tone: 'ok' | 'warn' | 'bad') {
  const colour = tone === 'ok' ? '#0d6b48' : tone === 'warn' ? '#8f5306' : '#b42318'
  return new Response(
    `<!DOCTYPE html><html><head><meta charset="utf-8">
     <meta name="viewport" content="width=device-width,initial-scale=1">
     <title>${title}</title></head>
     <body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
                  background:#f1f5f9;font-family:system-ui,-apple-system,Segoe UI,sans-serif;padding:24px">
       <div style="max-width:26rem;width:100%;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:32px;text-align:center">
         <h1 style="margin:0 0 12px;font-size:22px;color:${colour}">${title}</h1>
         <p style="margin:0;font-size:15px;line-height:1.6;color:#475569">${body}</p>
       </div>
     </body></html>`,
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  )
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const orderId = url.searchParams.get('order') || ''
  const token = url.searchParams.get('token') || ''

  if (!verifyOrderAction(orderId, 'verify', token)) {
    return page('Link not valid', 'This link is not recognised. Mark the order paid from the admin instead.', 'bad')
  }

  const admin = createAdminClient()
  if (!admin) return page('Not configured', 'The server is missing its database key.', 'bad')

  const { data: order, error } = await admin
    .from('orders')
    .select('id, order_number, status, order_total, customer_name')
    .eq('id', orderId)
    .single()

  if (error || !order) return page('Order not found', 'That order no longer exists.', 'bad')

  if (FINAL.includes(order.status)) {
    return page(
      'Already done',
      `Order <strong>${order.order_number}</strong> is already marked <strong>${order.status.replace('_', ' ')}</strong>. Nothing changed.`,
      'warn',
    )
  }

  // Only move it from an awaiting-payment state, so a stale link cannot undo a
  // cancellation or reopen a refunded order.
  const { data: updated, error: updateError } = await admin
    .from('orders')
    .update({ status: 'payment_verified', paid_at: new Date().toISOString() })
    .eq('id', orderId)
    .in('status', ['pending_verification', 'pending_payment'])
    .select('order_number')
    .single()

  if (updateError || !updated) {
    return page('Could not update', 'The order was not in a state that can be marked paid. Check the admin.', 'warn')
  }

  return page(
    'Marked as paid',
    `Order <strong>${order.order_number}</strong> for <strong>$${Number(order.order_total).toFixed(2)}</strong> — ${order.customer_name} — is verified and ready to ship.`,
    'ok',
  )
}
