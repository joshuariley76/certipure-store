import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resend } from '@/lib/resend'
import { verifyCallbackToken, sendIptEvent, iptTimestamp } from '@/lib/payriox'

const ADMIN_EMAIL = 'joshua@certipure.net'
const ORDERS_FROM = 'CertiPure Orders <noreply@certipure.net>'

// Statuses that mean the order is already finalised — a repeat callback for one
// of these is ignored (idempotency, per PayRio docs section 8.6).
const FINALISED = ['payment_verified', 'verified', 'shipped']

// PayRio's server-to-server payment confirmation (Section 8 of the API docs).
// This is the ONLY authoritative confirmation of a card payment. It arrives as a
// GET request to the secret URL we supplied during wallet creation, with our
// anti-spoof token plus PayRio's settlement details appended.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const orderNumber = searchParams.get('number') || ''
  const token       = searchParams.get('token') || ''
  const valueCoin   = parseFloat(searchParams.get('value_coin') || '')
  const coin        = searchParams.get('coin') || ''
  const txidIn      = searchParams.get('txid_in') || ''
  const txidOut     = searchParams.get('txid_out') || ''
  const addressIn   = searchParams.get('address_in') || ''

  // 1. Reject anything without our valid token. This is what makes the callback
  //    un-forgeable: the token is an HMAC of the order number with a server-only
  //    secret, and it is never exposed to the customer's browser.
  if (!orderNumber || !verifyCallbackToken(orderNumber, token)) {
    console.warn('PayRio callback rejected: bad/missing token for', orderNumber)
    return new NextResponse('Forbidden', { status: 403 })
  }

  const admin = createAdminClient()
  if (!admin) {
    console.error('PayRio callback: service role key not configured')
    return new NextResponse('Server not configured', { status: 500 })
  }

  // 2. Locate the order.
  const { data: order, error } = await admin
    .from('orders')
    .select('*')
    .eq('order_number', orderNumber)
    .single()
  if (error || !order) {
    console.warn('PayRio callback: order not found', orderNumber)
    return new NextResponse('Order not found', { status: 404 })
  }

  // 3. Idempotency — already finalised, acknowledge and stop.
  if (FINALISED.includes(order.status)) {
    return new NextResponse('OK', { status: 200 })
  }

  // 4. Decide the outcome from the amount actually received (USDC ≈ USD 1:1).
  //    Auto-approve if the shortfall is within a small tolerance; otherwise hold
  //    the order for manual review rather than shipping an underpaid order.
  const orderTotal = Number(order.order_total) || 0
  const tolerance = Math.max(1.0, orderTotal * 0.02)
  const paidOk = Number.isFinite(valueCoin) && orderTotal - valueCoin <= tolerance
  const newStatus = paidOk ? 'payment_verified' : 'pending_verification'

  // 5. Claim the order with a conditional update (from pending_payment only).
  //    If another concurrent callback already moved it, we get no row back and
  //    simply acknowledge — no double processing.
  const { data: claimed } = await admin
    .from('orders')
    .update({ status: newStatus })
    .eq('id', order.id)
    .eq('status', 'pending_payment')
    .select()
    .single()

  if (!claimed) {
    return new NextResponse('OK', { status: 200 })
  }

  // 6. Record settlement details on the order where columns exist (best-effort;
  //    silently skipped if these optional columns aren't present).
  await admin
    .from('orders')
    .update({ payriox_txid: txidOut || txidIn || null, paid_at: new Date().toISOString() })
    .eq('id', order.id)
    .then(
      () => {},
      () => {}, // optional columns may not exist — ignore
    )

  // 7. Deduct stock from the persisted line items (vials = quantity × pack_size).
  const { data: items } = await admin
    .from('order_items')
    .select('product_id, pack_size, quantity, product_name_snapshot, line_total')
    .eq('order_id', order.id)

  if (items && items.length) {
    for (const item of items as any[]) {
      const units = (item.quantity || 0) * (item.pack_size || 0)
      const { data: prod } = await admin
        .from('products')
        .select('stock_quantity')
        .eq('id', item.product_id)
        .single()
      if (!prod || typeof prod.stock_quantity !== 'number') continue
      const newQty = Math.max(0, prod.stock_quantity - units)
      const { error: stockErr } = await admin
        .from('products')
        .update({ stock_quantity: newQty })
        .eq('id', item.product_id)
      if (stockErr) console.error('PayRio stock deduction error:', stockErr.message)
    }
  }

  // 8. Clear the customer's cart now that the order is paid.
  await admin.from('cart_items').delete().eq('user_id', order.user_id)

  // 9. Tracking (no-op unless PAYRIOX_IPT_KEY is set).
  sendIptEvent({
    event_type: 'payment_confirmed',
    platform: 'custom-backend',
    merchant_site: 'certipure.net',
    api_domain: 'api.payriox.com',
    checkout_domain: 'checkout.payriox.com',
    order_id: orderNumber,
    client_email: order.customer_email || '',
    temp_wallet: addressIn,
    network: 'polygon',
    token_symbol: coin || 'USDC',
    amount_paid: Number.isFinite(valueCoin) ? valueCoin : 0,
    txid_out: txidOut,
    merchant_wallet: process.env.PAYRIOX_PAYOUT_WALLET || '',
    confirmed_at: iptTimestamp(),
  })

  // 10. Emails — customer confirmation + admin notification. Never block the 200.
  const itemRows = (items || [])
    .map(
      (i: any) =>
        `<tr><td style="padding:8px;border-bottom:1px solid #eee">${i.product_name_snapshot} (${i.pack_size === 1 ? 'Single' : i.pack_size + '-Pack'})</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">$${Number(i.line_total).toFixed(2)}</td></tr>`,
    )
    .join('')

  if (paidOk && order.customer_email) {
    try {
      await resend.emails.send({
        from: ORDERS_FROM,
        to: order.customer_email,
        subject: `Payment Received — ${orderNumber}`,
        html: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333"><div style="background:#0f172a;padding:24px;border-radius:8px 8px 0 0;text-align:center"><h1 style="color:#fff;margin:0">CertiPure</h1><p style="color:#94a3b8;margin:8px 0 0">Research Peptides</p></div><div style="background:#fff;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px"><h2 style="color:#0f172a;margin-top:0">Payment Received ✓</h2><p>Thank you! Your card payment was received and your order is now being prepared.</p><div style="background:#f8fafc;padding:16px;border-radius:6px;margin:20px 0"><p style="margin:0;font-size:14px;color:#64748b">Order Number</p><p style="margin:4px 0 0;font-size:20px;font-weight:bold;color:#0f172a">${orderNumber}</p></div><table style="width:100%;border-collapse:collapse"><tbody>${itemRows}</tbody><tfoot><tr><td colspan="2" style="padding:12px 8px 8px;font-weight:bold;text-align:right;border-top:1px solid #e2e8f0">Total Paid:</td><td style="padding:12px 8px 8px;font-weight:bold;text-align:right;border-top:1px solid #e2e8f0">$${orderTotal.toFixed(2)}</td></tr></tfoot></table><div style="margin-top:24px;padding:16px;background:#fffbeb;border:1px solid #fbbf24;border-radius:6px"><p style="margin:0;font-size:14px"><strong>What's next?</strong> We'll email you a shipping confirmation with tracking, usually within 1–2 business days.</p></div><p style="margin-top:24px;font-size:13px;color:#64748b">Questions? Email support@certipure.net<br><br><em>All products sold for research purposes only. Not for human consumption.</em></p></div></body></html>`,
      })
    } catch (e) { console.error('PayRio customer email failed:', e) }
  }

  try {
    const flag = paidOk
      ? ''
      : `<p style="margin:8px 0 0;color:#b91c1c"><strong>⚠️ UNDERPAID / amount mismatch — review before shipping.</strong> Expected $${orderTotal.toFixed(2)}, received ${Number.isFinite(valueCoin) ? '$' + valueCoin.toFixed(2) : 'unknown'} ${coin || 'USDC'}.</p>`
    await resend.emails.send({
      from: ORDERS_FROM,
      to: ADMIN_EMAIL,
      subject: `${paidOk ? '💳 Card Payment' : '⚠️ Card Payment NEEDS REVIEW'} — ${orderNumber}`,
      html: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333"><h2>${paidOk ? '💳 Card Payment Received' : '⚠️ Card Payment — Review Needed'}</h2><div style="background:#f8fafc;padding:16px;border-radius:6px;margin:16px 0"><p style="margin:0"><strong>Order:</strong> ${orderNumber}</p><p style="margin:8px 0 0"><strong>Order total:</strong> $${orderTotal.toFixed(2)}</p><p style="margin:8px 0 0"><strong>Received:</strong> ${Number.isFinite(valueCoin) ? '$' + valueCoin.toFixed(2) : 'unknown'} ${coin || 'USDC'}</p><p style="margin:8px 0 0"><strong>Status set to:</strong> ${newStatus === 'payment_verified' ? 'Verified (ready to ship)' : 'Pending verification'}</p><p style="margin:8px 0 0"><strong>Payout txid:</strong> ${txidOut || '—'}</p>${flag}</div><h3>Ship To</h3><p>${order.customer_name}<br>${order.shipping_address?.line1 || ''}${order.shipping_address?.line2 ? ', ' + order.shipping_address.line2 : ''}<br>${order.shipping_address?.city || ''}, ${order.shipping_address?.state || ''} ${order.shipping_address?.zip || ''}</p><h3>Items</h3><table style="width:100%;border-collapse:collapse"><tbody>${itemRows}</tbody></table></body></html>`,
    })
  } catch (e) { console.error('PayRio admin email failed:', e) }

  // PayRio expects an HTTP 200 with no required body.
  return new NextResponse('OK', { status: 200 })
}
