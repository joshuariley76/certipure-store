import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { resend } from '@/lib/resend'

const ALLOWED_STATUSES = ['pending_verification', 'verified', 'shipped', 'cancelled']
const ORDERS_FROM = 'CertiPure Orders <noreply@certipure.net>'

// Shared dark-navy header + white body shell, matching the existing order
// emails sent from the checkout flow.
function emailShell(heading: string, bodyHtml: string, orderNumber: string) {
  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333"><div style="background:#0f172a;padding:24px;border-radius:8px 8px 0 0;text-align:center"><h1 style="color:#fff;margin:0">CertiPure</h1><p style="color:#94a3b8;margin:8px 0 0">Research Peptides</p></div><div style="background:#fff;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px"><h2 style="color:#0f172a;margin-top:0">${heading}</h2>${bodyHtml}<div style="background:#f8fafc;padding:16px;border-radius:6px;margin:20px 0"><p style="margin:0;font-size:14px;color:#64748b">Order Number</p><p style="margin:4px 0 0;font-size:20px;font-weight:bold;color:#0f172a">${orderNumber}</p></div><p style="margin-top:24px;font-size:13px;color:#64748b">Questions? Email support@certipure.net<br><br><em>All products sold for research purposes only. Not for human consumption.</em></p></div></body></html>`
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { orderId, status, trackingNumber, carrier } = await request.json().catch(() => ({}))
  if (!orderId || !ALLOWED_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json(
      { error: 'Service role key not configured.' },
      { status: 500 },
    )
  }

  // Update the status and read the order back so we have the email + number.
  const { data: order, error } = await admin
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .select()
    .single()
  if (error || !order) {
    return NextResponse.json({ error: error?.message || 'Order not found.' }, { status: 500 })
  }

  // Notify the customer when payment is verified. (Your app's status for this
  // is "verified" — the "Mark Verified" button.) Wrapped in try/catch so a
  // failed email never blocks the status update.
  if (status === 'verified' && order.customer_email) {
    try {
      await resend.emails.send({
        from: ORDERS_FROM,
        to: order.customer_email,
        subject: `Payment Verified — ${order.order_number}`,
        html: emailShell(
          'Payment Confirmed ✓',
          `<p>Good news — we&rsquo;ve verified your payment and your order is now being prepared.</p><p>You can expect a shipping confirmation with tracking within <strong>1&ndash;2 business days</strong>.</p>`,
          order.order_number,
        ),
      })
    } catch (e) {
      console.error('Payment verified email failed:', e)
    }
  }

  // Notify the customer when the order ships, including tracking details.
  if (status === 'shipped' && order.customer_email) {
    const trackingBlock =
      carrier || trackingNumber
        ? `<div style="background:#f8fafc;padding:16px;border-radius:6px;margin:20px 0"><p style="margin:0;font-size:14px;color:#64748b">Carrier</p><p style="margin:4px 0 12px;font-size:16px;font-weight:bold;color:#0f172a">${carrier || '—'}</p><p style="margin:0;font-size:14px;color:#64748b">Tracking Number</p><p style="margin:4px 0 0;font-size:16px;font-weight:bold;color:#0f172a">${trackingNumber || '—'}</p></div>`
        : `<p style="color:#64748b">Tracking details will follow shortly.</p>`

    try {
      await resend.emails.send({
        from: ORDERS_FROM,
        to: order.customer_email,
        subject: `Your Order Has Shipped — ${order.order_number}`,
        html: emailShell(
          'Your Order Is On Its Way 📦',
          `<p>Your order has shipped and is on its way to you.</p>${trackingBlock}`,
          order.order_number,
        ),
      })
    } catch (e) {
      console.error('Shipped email failed:', e)
    }
  }

  return NextResponse.json({ ok: true })
}
