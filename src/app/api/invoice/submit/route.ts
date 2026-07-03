import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resend } from '@/lib/resend'
import { verifyInvoiceToken } from '@/lib/payriox'
import { addSubscriberToGroup, MAILERLITE_GROUPS } from '@/lib/mailerlite'

export const dynamic = 'force-dynamic'

const ADMIN_EMAIL = 'joshua@certipure.net'
const ORDERS_FROM = 'CertiPure Orders <noreply@certipure.net>'
const MAX_SCREENSHOT_BYTES = 10 * 1024 * 1024

// Pay an admin-created invoice by CRYPTO or CASH APP. No login — authorised by
// the invoice token. Customer sends payment out-of-band and uploads a screenshot;
// we attach shipping, store the screenshot, and mark the order
// 'pending_verification' for admin review (same as the normal crypto checkout).
export async function POST(request: Request) {
  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'Server not configured.' }, { status: 500 })

  const formData = await request.formData()
  const orderNumber = (formData.get('orderNumber') as string) || ''
  const token       = (formData.get('token') as string) || ''
  if (!orderNumber || !verifyInvoiceToken(orderNumber, token)) {
    return NextResponse.json({ error: 'Invalid or expired invoice link.' }, { status: 403 })
  }

  const firstName  = (formData.get('firstName') as string) || ''
  const lastName   = (formData.get('lastName')  as string) || ''
  const email      = (formData.get('email')     as string) || ''
  const phone      = (formData.get('phone')     as string) || ''
  const address1   = (formData.get('address1')  as string) || ''
  const address2   = (formData.get('address2')  as string) || ''
  const city       = (formData.get('city')      as string) || ''
  const state      = (formData.get('state')     as string) || ''
  const zip        = (formData.get('zip')       as string) || ''
  const cryptoCoin = (formData.get('cryptoCoin') as string) || ''
  const screenshot = formData.get('screenshot') as File | null

  if (!firstName || !lastName || !email || !address1 || !city || !state || !zip || !cryptoCoin || !screenshot) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
  }
  if (!screenshot.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Screenshot must be an image file.' }, { status: 400 })
  }
  if (screenshot.size > MAX_SCREENSHOT_BYTES) {
    return NextResponse.json({ error: 'Screenshot is too large (max 10 MB).' }, { status: 400 })
  }

  const { data: order, error } = await admin
    .from('orders').select('*').eq('order_number', orderNumber).single()
  if (error || !order) return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 })
  if (!['invoice', 'pending_payment', 'pending_verification'].includes(order.status)) {
    return NextResponse.json({ error: 'This invoice has already been paid.' }, { status: 409 })
  }

  const isCashApp = cryptoCoin === 'CASHAPP'
  const paymentMethod = isCashApp ? 'cashapp' : 'crypto'
  const methodLabel = isCashApp ? 'Cash App' : cryptoCoin

  // Store the screenshot under an invoice-scoped path (no user id available).
  const fileExt = (screenshot.name.split('.').pop() || 'png').toLowerCase()
  const fileName = `invoices/${orderNumber}-${Date.now()}.${fileExt}`
  const fileBuffer = await screenshot.arrayBuffer()
  const { data: uploadData, error: uploadError } = await admin.storage
    .from('order-screenshots')
    .upload(fileName, fileBuffer, { contentType: screenshot.type, upsert: false })
  if (uploadError) {
    return NextResponse.json({ error: 'Failed to upload screenshot.' }, { status: 500 })
  }

  const { error: updErr } = await admin
    .from('orders')
    .update({
      status: 'pending_verification',
      payment_method: paymentMethod,
      crypto_coin: cryptoCoin,
      screenshot_url: uploadData.path,
      customer_name: `${firstName} ${lastName}`,
      customer_email: email,
      customer_phone: phone || null,
      shipping_address: { line1: address1, line2: address2 || null, city, state, zip, country: 'US' },
    })
    .eq('id', order.id)
  if (updErr) return NextResponse.json({ error: 'Could not submit. Please try again.' }, { status: 500 })

  // Best-effort: capture this invoice customer into the MailerLite invoice group.
  await addSubscriberToGroup({
    email,
    groupId: MAILERLITE_GROUPS.invoices,
    fields: { name: firstName, last_name: lastName },
  }).catch(() => {})

  const { data: items } = await admin
    .from('order_items')
    .select('product_name_snapshot, pack_size, quantity, line_total')
    .eq('order_id', order.id)
  const itemRows = (items || []).map((i: any) =>
    `<tr><td style="padding:8px;border-bottom:1px solid #eee">${i.product_name_snapshot} (${i.pack_size === 1 ? 'Single' : i.pack_size + '-Pack'})</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">$${Number(i.line_total).toFixed(2)}</td></tr>`).join('')
  const orderTotal = Number(order.order_total) || 0

  try {
    await resend.emails.send({
      from: ORDERS_FROM, to: email,
      subject: `Payment Submitted — ${orderNumber}`,
      html: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333"><div style="background:#0f172a;padding:24px;border-radius:8px 8px 0 0;text-align:center"><h1 style="color:#fff;margin:0">CertiPure</h1></div><div style="background:#fff;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px"><h2 style="color:#0f172a;margin-top:0">Payment Submitted</h2><p>Thank you! We received your ${methodLabel} payment screenshot for invoice <strong>${orderNumber}</strong> and will verify it shortly.</p><table style="width:100%;border-collapse:collapse">${itemRows}</table><p style="text-align:right;font-weight:bold;margin-top:12px">Total: $${orderTotal.toFixed(2)}</p><p style="margin-top:24px;font-size:13px;color:#64748b"><em>All products sold for research purposes only. Not for human consumption.</em></p></div></body></html>`,
    })
  } catch (e) { console.error('Invoice customer email failed:', e) }

  try {
    await resend.emails.send({
      from: ORDERS_FROM, to: ADMIN_EMAIL,
      subject: `🔔 Invoice Paid (needs verify) — ${orderNumber} (${methodLabel})`,
      html: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333"><h2>🔔 Invoice payment submitted</h2><p><strong>Order:</strong> ${orderNumber}<br><strong>Total:</strong> $${orderTotal.toFixed(2)} (${methodLabel})<br><strong>Status:</strong> Pending Verification</p><h3>Ship To</h3><p>${firstName} ${lastName}<br>${address1}${address2 ? ', ' + address2 : ''}<br>${city}, ${state} ${zip}<br>${email} · ${phone || 'no phone'}</p><h3>Items</h3><table style="width:100%;border-collapse:collapse">${itemRows}</table><p style="margin-top:12px">Review the screenshot in the admin Orders tab and mark Verified to ship.</p></body></html>`,
    })
  } catch (e) { console.error('Invoice admin email failed:', e) }

  return NextResponse.json({ success: true, orderNumber })
}
