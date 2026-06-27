import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { codeMatches, discountAmountFor, DISCOUNT_CODE } from '@/lib/discount'
import {
  payrioxConfigured,
  payrioxPayoutWallet,
  payrioxCurrency,
  callbackToken,
  createTempWallet,
  buildCheckoutUrl,
  sendIptEvent,
  iptTimestamp,
} from '@/lib/payriox'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://certipure.net'

// Shipping rules — keep in sync with api/create-order/route.ts.
const FREE_SHIPPING_THRESHOLD = 300
const FLAT_SHIPPING = 12.99

function buildOrderNumber() {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `CP-${rand}`
}

// Starts a PayRio card payment. Creates the order in a `pending_payment` state
// (NOT paid — it only becomes ready-to-ship once PayRio's callback confirms the
// money arrived), asks PayRio for a one-time receiving wallet, and returns the
// hosted-checkout URL the browser should redirect to.
export async function POST(request: Request) {
  if (!payrioxConfigured()) {
    return NextResponse.json(
      { error: 'Card payment is not available right now. Please choose another payment method.' },
      { status: 503 },
    )
  }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const firstName = (body.firstName as string) || ''
  const lastName  = (body.lastName  as string) || ''
  const email     = (body.email     as string) || ''
  const phone     = (body.phone     as string) || ''
  const address1  = (body.address1  as string) || ''
  const address2  = (body.address2  as string) || ''
  const city      = (body.city      as string) || ''
  const state     = (body.state     as string) || ''
  const zip       = (body.zip       as string) || ''
  const discountCodeInput = (body.discountCode as string) || ''

  if (!firstName || !lastName || !email || !address1 || !city || !state || !zip) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Load cart and price it authoritatively (never trust client totals).
  const { data: cartItems, error: cartError } = await supabase
    .from('cart_items')
    .select('*, products(id, name, slug)')
    .eq('user_id', user.id)

  if (cartError || !cartItems || cartItems.length === 0) {
    return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
  }

  const subtotal = cartItems.reduce(
    (sum: number, item: any) => sum + item.price_at_add * item.quantity, 0,
  )

  const admin = createAdminClient()

  // First-order discount — same rules as the crypto checkout: valid code AND a
  // genuine first order, else reject rather than silently charge full price.
  let discountAmount = 0
  let discountCodeStored: string | null = null
  if (discountCodeInput && codeMatches(discountCodeInput)) {
    const client = admin || supabase
    const { count } = await client
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { error: 'The discount code is valid on your first order only. Please remove it and try again.' },
        { status: 400 },
      )
    }
    discountAmount = discountAmountFor(subtotal)
    discountCodeStored = DISCOUNT_CODE
  }

  const discountedSubtotal = subtotal - discountAmount
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING
  const orderTotal = discountedSubtotal + shipping

  // Create the order FIRST so we have the final order_number the database will
  // actually store. PayRio's callback finds the order by this number, so the
  // number in the callback URL must match what we persist.
  const orderNumber = buildOrderNumber()
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      user_id: user.id,
      order_number: orderNumber,
      status: 'pending_payment',
      customer_name: `${firstName} ${lastName}`,
      customer_email: email,
      customer_phone: phone || null,
      shipping_address: { line1: address1, line2: address2 || null, city, state, zip, country: 'US' },
      payment_method: 'payriox',
      crypto_coin: 'CARD',
      subtotal,
      ...(discountAmount > 0 ? { discount_code: discountCodeStored, discount_amount: discountAmount } : {}),
      shipping_cost: shipping,
      tax: 0,
      order_total: orderTotal,
    })
    .select()
    .single()

  if (orderError || !order) {
    console.error('PayRio order creation error:', orderError)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
  const displayNumber = order.order_number || orderNumber

  // Persist the line items now (snapshot of what they're paying for). Stock is
  // NOT deducted yet — that happens only when payment is confirmed.
  const orderItems = cartItems.map((item: any) => ({
    order_id: order.id,
    product_id: item.product_id,
    product_name_snapshot: item.products?.name || 'Unknown Product',
    pack_size: item.pack_size,
    quantity: item.quantity,
    price_per_pack: item.price_at_add,
    line_total: item.price_at_add * item.quantity,
  }))
  const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
  if (itemsError) console.error('PayRio order items insert error:', itemsError)

  // Step 1: ask PayRio for a one-time encrypted wallet, handing it our secret
  // server-only callback URL. If this fails, cancel the order so it can't linger.
  const callbackUrl =
    `${SITE_URL}/api/payriox/callback` +
    `?number=${encodeURIComponent(displayNumber)}` +
    `&token=${callbackToken(displayNumber)}`

  let wallet
  try {
    wallet = await createTempWallet(callbackUrl)
  } catch (e) {
    console.error('PayRio wallet creation failed:', e)
    // Best-effort: mark the just-created order cancelled so it isn't orphaned.
    const client = admin || supabase
    await client.from('orders').update({ status: 'cancelled' }).eq('id', order.id)
    return NextResponse.json(
      { error: 'Could not start the card payment. Please try again or use another payment method.' },
      { status: 502 },
    )
  }

  // Fire-and-forget tracking (no-op unless PAYRIOX_IPT_KEY is set).
  sendIptEvent({
    event_type: 'wallet_created',
    platform: 'custom-backend',
    merchant_site: 'certipure.net',
    api_domain: 'api.payriox.com',
    checkout_domain: 'checkout.payriox.com',
    order_id: displayNumber,
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

  // Step 2: hand the browser the hosted checkout URL.
  const redirectUrl = buildCheckoutUrl({
    addressIn: wallet.address_in,
    amount: orderTotal,
    email,
    currency: payrioxCurrency(),
  })

  return NextResponse.json({ success: true, orderNumber: displayNumber, redirectUrl })
}
