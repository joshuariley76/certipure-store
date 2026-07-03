import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { addSubscriberToGroup, MAILERLITE_GROUPS } from '@/lib/mailerlite'
import {
  payrioxConfigured,
  payrioxPayoutWallet,
  payrioxCurrency,
  verifyInvoiceToken,
  callbackToken,
  createTempWallet,
  buildCheckoutUrl,
  sendIptEvent,
  iptTimestamp,
} from '@/lib/payriox'

export const dynamic = 'force-dynamic'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.certipure.net'

// Pay an admin-created invoice by CARD. No login: the request is authorised by
// the unguessable invoice token in the link. We attach the shipping details the
// customer just entered, flip the invoice into the normal card-payment flow, and
// hand back PayRio's hosted checkout URL. Confirmation is handled by the existing
// /api/payriox/callback (finds the order by number, marks paid, deducts stock).
export async function POST(request: Request) {
  if (!payrioxConfigured()) {
    return NextResponse.json({ error: 'Card payment is not available right now.' }, { status: 503 })
  }
  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'Server not configured.' }, { status: 500 })
  }

  const body = await request.json().catch(() => ({}))
  const orderNumber = typeof body?.orderNumber === 'string' ? body.orderNumber : ''
  const token = typeof body?.token === 'string' ? body.token : ''
  if (!orderNumber || !verifyInvoiceToken(orderNumber, token)) {
    return NextResponse.json({ error: 'Invalid or expired invoice link.' }, { status: 403 })
  }

  const firstName = (body.firstName as string) || ''
  const lastName  = (body.lastName  as string) || ''
  const email     = (body.email     as string) || ''
  const phone     = (body.phone     as string) || ''
  const address1  = (body.address1  as string) || ''
  const address2  = (body.address2  as string) || ''
  const city      = (body.city      as string) || ''
  const state     = (body.state     as string) || ''
  const zip       = (body.zip       as string) || ''
  if (!firstName || !lastName || !email || !address1 || !city || !state || !zip) {
    return NextResponse.json({ error: 'Please fill in all required shipping fields.' }, { status: 400 })
  }

  // Load the invoice. Only an unpaid invoice/pending order may proceed.
  const { data: order, error } = await admin
    .from('orders')
    .select('*')
    .eq('order_number', orderNumber)
    .single()
  if (error || !order) {
    return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 })
  }
  if (!['invoice', 'pending_payment'].includes(order.status)) {
    return NextResponse.json({ error: 'This invoice has already been paid or is no longer payable.' }, { status: 409 })
  }

  // Attach shipping + move into the card-payment state the callback expects.
  const { error: updErr } = await admin
    .from('orders')
    .update({
      status: 'pending_payment',
      payment_method: 'payriox',
      crypto_coin: 'CARD',
      customer_name: `${firstName} ${lastName}`,
      customer_email: email,
      customer_phone: phone || null,
      shipping_address: { line1: address1, line2: address2 || null, city, state, zip, country: 'US' },
    })
    .eq('id', order.id)
  if (updErr) {
    return NextResponse.json({ error: 'Could not start the payment. Please try again.' }, { status: 500 })
  }

  // Best-effort: capture this invoice customer into the MailerLite invoice group.
  await addSubscriberToGroup({
    email,
    groupId: MAILERLITE_GROUPS.invoices,
    fields: { name: firstName, last_name: lastName },
  }).catch(() => {})

  const orderTotal = Number(order.order_total) || 0
  const callbackUrl =
    `${SITE_URL}/api/payriox/callback` +
    `?number=${encodeURIComponent(orderNumber)}` +
    `&token=${callbackToken(orderNumber)}`

  let wallet
  try {
    wallet = await createTempWallet(callbackUrl)
  } catch (e) {
    console.error('Invoice PayRio wallet creation failed:', e)
    // Put it back to invoice so the customer can retry.
    await admin.from('orders').update({ status: 'invoice' }).eq('id', order.id)
    return NextResponse.json({ error: 'Could not start the card payment. Please try again.' }, { status: 502 })
  }

  sendIptEvent({
    event_type: 'wallet_created',
    platform: 'custom-backend',
    merchant_site: 'certipure.net',
    order_id: orderNumber,
    client_email: email,
    temp_wallet: wallet.polygon_address_in || '',
    network: 'polygon',
    token_symbol: 'USDC',
    expected_amount: orderTotal,
    order_total_usd: orderTotal,
    gateway_name: 'PayRioX',
    merchant_wallet: payrioxPayoutWallet(),
    created_at: iptTimestamp(),
  })

  const redirectUrl = buildCheckoutUrl({
    addressIn: wallet.address_in,
    amount: orderTotal,
    email,
    currency: payrioxCurrency(),
  })
  return NextResponse.json({ success: true, orderNumber, redirectUrl })
}
