import { NextResponse } from 'next/server'
import { priceCart, unitPriceOf } from '@/lib/water-pricing'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resend } from '@/lib/resend'
import { resolveCode, discountFor, commissionFor, ownerForUser } from '@/lib/affiliate'
import { signOrderAction } from '@/lib/quick-action'
import {
  isAdminTestCode,
  buildTestOrderNumber,
  TEST_ORDER_PREFIX,
} from '@/lib/admin-test-code'
import { isAdminAuthenticated } from '@/lib/admin-auth'

// Where admin notifications go, and who emails are sent from. The certipure.net
// domain must stay verified in Resend for these to deliver.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.certipure.net'
const ADMIN_EMAIL = 'joshua@certipure.net'
const ORDERS_FROM = 'CertiPure Orders <noreply@certipure.net>'

const MAX_SCREENSHOT_BYTES = 10 * 1024 * 1024 // 10 MB

// Generates a customer-facing reference like CP-7Q3K9. Used unless the database
// fills in its own order_number on insert.
function buildOrderNumber() {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `CP-${rand}`
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const firstName   = formData.get('firstName')  as string
  const lastName    = formData.get('lastName')   as string
  const email       = formData.get('email')      as string
  const phone       = formData.get('phone')      as string
  const address1    = formData.get('address1')   as string
  const address2    = formData.get('address2')   as string
  const city        = formData.get('city')       as string
  const state       = formData.get('state')      as string
  const zip         = formData.get('zip')        as string
  const cryptoCoin  = formData.get('cryptoCoin') as string
  const screenshot  = formData.get('screenshot') as File
  const discountCodeInput = (formData.get('discountCode') as string) || ''

  // The payment selection arrives in the same `cryptoCoin` field for every
  // method. Cash App is the one non-crypto option, so we translate it into a
  // proper payment_method and a human-friendly label for the emails.
  const isCashApp    = cryptoCoin === 'CASHAPP'
  const isZelle      = cryptoCoin === 'ZELLE'
  const paymentMethod = isCashApp ? 'cashapp' : isZelle ? 'zelle' : 'crypto'
  const methodLabel   = isCashApp ? 'Cash App' : isZelle ? 'Zelle' : cryptoCoin

  if (!firstName || !lastName || !email || !address1 || !city || !state || !zip || !cryptoCoin) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // A test order (the ADMIN code, from a browser signed in at /admin/login)
  // totals $0, so there is no payment to screenshot and nothing to charge.
  const isTestOrder = isAdminTestCode(discountCodeInput) && (await isAdminAuthenticated())

  // Only the coins need a screenshot. Zelle and Cash App are matched by the odd
  // cents on the amount, so demanding one there is friction that proves nothing.
  const CRYPTO_COINS = ['BTC', 'ETH', 'USDT', 'USDC', 'SOL']
  if (!isTestOrder && CRYPTO_COINS.includes(cryptoCoin) && !screenshot) {
    return NextResponse.json({ error: 'Please upload a screenshot of your payment.' }, { status: 400 })
  }

  // Basic safety checks on the uploaded payment screenshot.
  if (screenshot && !screenshot.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Screenshot must be an image file.' }, { status: 400 })
  }
  if (screenshot && screenshot.size > MAX_SCREENSHOT_BYTES) {
    return NextResponse.json({ error: 'Screenshot is too large (max 10 MB).' }, { status: 400 })
  }

  // Get cart items
  const { data: cartItems, error: cartError } = await supabase
    .from('cart_items')
    .select('*, products(id, name, slug)')
    .eq('user_id', user.id)

  if (cartError || !cartItems || cartItems.length === 0) {
    return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
  }

  // Water reprices depending on what else is in the cart, so the charged
  // subtotal comes from the shared rule (lib/water-pricing.ts) rather than
  // from price_at_add. CheckoutClient shows the customer the result of this
  // exact same function, so the figure they saw is the figure they pay.
  const pricedCart = priceCart(cartItems as any[])
  const subtotal = pricedCart.subtotal
  const unitPriceFor = (item: any) => unitPriceOf(item, pricedCart.qualifies)

  // The service-role client lets us read/write tables the customer's own
  // session can't (orders history check below, stock deduction later).
  const admin = createAdminClient()

  // Resolve any typed code. Affiliate codes (from the DB) give a discount every
  // time they're entered; the legacy WELCOME code is first-order only.
  const resolved = await resolveCode(discountCodeInput, admin)

  let discountAmount = 0
  let discountCodeStored: string | null = null

  if (resolved?.kind === 'legacy') {
    // Legacy welcome discount: first order only. Reject a returning customer who
    // sends it (rather than silently charging full price) so the amount they
    // were told to pay always equals the amount we store.
    let priorOrders = 0
    const client = admin || supabase
    const { count } = await client
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      // Test orders are not real orders, so they must not use up a
      // first-order-only code.
      .not('order_number', 'like', `${TEST_ORDER_PREFIX}%`)
    priorOrders = count ?? 0
    if (priorOrders > 0) {
      return NextResponse.json(
        { error: 'The discount code is valid on your first order only. Please remove it and place your order again.' },
        { status: 400 },
      )
    }
    discountAmount = discountFor(subtotal, resolved.percent)
    discountCodeStored = resolved.code
  } else if (resolved?.kind === 'affiliate') {
    // Affiliate code: customer gets the discount every time they enter it.
    discountAmount = discountFor(subtotal, resolved.affiliate.discount_percent)
    discountCodeStored = resolved.affiliate.code
  }

  // Affiliate attribution + commission (independent of the discount above).
  // The affiliate that permanently owns this customer earns commission on EVERY
  // order. If the customer isn't owned yet and just entered a valid affiliate
  // code, that affiliate becomes the owner now (stamped on the profile below).
  const existingOwner = await ownerForUser(user.id, admin)
  const owner = existingOwner || (resolved?.kind === 'affiliate' ? resolved.affiliate : null)
  const newlyTagged = !isTestOrder && !existingOwner && resolved?.kind === 'affiliate'
  const commissionAmount = owner && !isTestOrder ? commissionFor(subtotal, owner.commission_percent) : 0

  // A test order is zeroed out completely: the whole subtotal comes off, no
  // shipping, no odd cents, and no commission for anyone.
  if (isTestOrder) {
    discountAmount = subtotal
    discountCodeStored = 'ADMIN'
  }

  const discountedSubtotal = subtotal - discountAmount

  // Shipping: free at $300+, otherwise a $12.99 flat rate. Computed server-side
  // so the stored total is authoritative (keep in sync with CheckoutClient.tsx).
  const FREE_SHIPPING_THRESHOLD = 300
  const FLAT_SHIPPING = 12.99
  const shipping = isTestOrder || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING
  // The odd cents the customer was shown, and paid. Storing them makes the
  // total match the payment alert exactly, which is the whole point.
  const oddCents = isTestOrder
    ? 0
    : Math.min(9, Math.max(0, Math.round(Number(formData.get('oddCents')) || 0)))
  const orderTotal = isTestOrder ? 0 : discountedSubtotal + shipping + oddCents / 100

  // Upload the screenshot when one was sent. Zelle and Cash App orders arrive
  // without one and simply have no screenshot on file.
  let screenshotPath: string | null = null
  if (screenshot) {
    const fileExt = screenshot.name.split('.').pop() || 'png'
    const fileName = `${user.id}/${Date.now()}.${fileExt}`
    const fileBuffer = await screenshot.arrayBuffer()

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('order-screenshots')
      .upload(fileName, fileBuffer, { contentType: screenshot.type, upsert: false })

    if (uploadError) {
      console.error('Screenshot upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload screenshot' }, { status: 500 })
    }
    screenshotPath = uploadData.path
  }

  // Create order. We pass a generated order_number; if the database generates
  // its own on insert, that value is returned instead and used below.
  const orderNumber = isTestOrder ? buildTestOrderNumber() : buildOrderNumber()
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      user_id: user.id,
      order_number: orderNumber,
      status: 'pending_verification',
      customer_name: `${firstName} ${lastName}`,
      customer_email: email,
      customer_phone: phone || null,
      shipping_address: { line1: address1, line2: address2 || null, city, state, zip, country: 'US' },
      payment_method: paymentMethod,
      crypto_coin: cryptoCoin,
      screenshot_url: screenshotPath,
      subtotal,
      // Only written when a discount was actually applied, so ordinary orders
      // never touch these columns (keeps checkout working even before the
      // discount_code / discount_amount columns are added to the orders table).
      ...(discountAmount > 0 ? { discount_code: discountCodeStored, discount_amount: discountAmount } : {}),
      // Affiliate attribution + commission. Only written when the customer is
      // owned by an affiliate (keeps checkout working before the affiliate
      // columns exist).
      ...(owner && !isTestOrder ? { affiliate_id: owner.id, affiliate_code: owner.code, commission_amount: commissionAmount } : {}),
      shipping_cost: shipping,
      tax: 0,
      order_total: orderTotal,
    })
    .select()
    .single()

  if (orderError || !order) {
    console.error('Order creation error:', orderError)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }

  // Use whatever order number ended up in the database (in case it auto-fills).
  const displayNumber = order.order_number || orderNumber

  // Permanently tag the customer to this affiliate the first time they use a
  // valid affiliate code. From here on, that affiliate earns commission on all
  // of this customer's orders (see ownerForUser). Best-effort — a failure never
  // blocks the order.
  if (admin && newlyTagged && owner) {
    const { error: tagErr } = await admin
      .from('profiles')
      .update({ referred_by_id: owner.id, referred_by_code: owner.code })
      .eq('id', user.id)
    if (tagErr) console.error('Affiliate tag error:', tagErr)
  }

  // Create order items
  const orderItems = cartItems.map((item: any) => ({
    order_id: order.id,
    product_id: item.product_id,
    product_name_snapshot: item.products?.name || 'Unknown Product',
    pack_size: item.pack_size,
    quantity: item.quantity,
    price_per_pack: unitPriceFor(item),
    line_total: unitPriceFor(item) * item.quantity,
  }))

  const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
  if (itemsError) console.error('Order items insert error:', itemsError)

  // Deduct stock for each item. We use the service-role client because the
  // customer's own session can't update the products table (row-level
  // security). This is best-effort: a stock-update failure is logged but never
  // blocks the order. Stock is counted in vials, so we subtract quantity ×
  // pack_size, clamped at 0 so it can never go negative. (`admin` is created
  // once near the top of this handler.)
  if (isTestOrder) {
    console.log('Test order ' + orderNumber + ': stock left untouched.')
  } else if (admin) {
    for (const item of cartItems as any[]) {
      const units = item.quantity * item.pack_size
      const { data: prod, error: readErr } = await admin
        .from('products')
        .select('stock_quantity')
        .eq('id', item.product_id)
        .single()
      if (readErr || !prod || typeof prod.stock_quantity !== 'number') continue
      const newQty = Math.max(0, prod.stock_quantity - units)
      const { error: stockErr } = await admin
        .from('products')
        .update({ stock_quantity: newQty })
        .eq('id', item.product_id)
      if (stockErr) console.error('Stock deduction error:', stockErr.message)
    }
  } else {
    console.error('Stock not deducted: service role key not configured.')
  }

  // Clear cart
  await supabase.from('cart_items').delete().eq('user_id', user.id)

  // A discount line shown in the emails only when a discount was applied.
  const discountRowCustomer = discountAmount > 0
    ? `<tr><td colspan="2" style="padding:8px;text-align:right;color:#16a34a">Discount (${discountCodeStored}):</td><td style="padding:8px;text-align:right;color:#16a34a">&minus;$${discountAmount.toFixed(2)}</td></tr>`
    : ''
  const discountLineAdmin = discountAmount > 0
    ? `<p style="margin:8px 0 0"><strong>Discount (${discountCodeStored}):</strong> &minus;$${discountAmount.toFixed(2)}</p>`
    : ''

  // Customer email
  try {
    // What we tell the customer depends on how they actually paid. Only the
    // coins send a screenshot; Zelle and Cash App are matched by amount, and a
    // test order was never charged at all.
    const intro = isTestOrder
      ? `This was a $0 test order — nothing was charged, no stock was taken, and nothing will ship.`
      : screenshotPath
        ? `Thank you! We received your payment screenshot and will verify your ${methodLabel} payment within 1–4 hours.`
        : `Thank you! We match your ${methodLabel} payment by the exact amount you sent, so there is nothing else for you to do. We will verify it within 1–4 hours.`

    const itemRows = cartItems.map((item: any) => `<tr><td style="padding:8px;border-bottom:1px solid #eee">${item.products?.name} (${item.pack_size === 1 ? 'Single' : item.pack_size + '-Pack'})</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${item.quantity}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">$${(unitPriceFor(item) * item.quantity).toFixed(2)}</td></tr>`).join('')
    await resend.emails.send({
      from: ORDERS_FROM,
      to: email,
      subject: `${isTestOrder ? "[TEST] " : ""}Order Received — ${displayNumber}`,
      html: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333"><div style="background:#0f172a;padding:24px;border-radius:8px 8px 0 0;text-align:center"><h1 style="color:#fff;margin:0">CertiPure</h1><p style="color:#94a3b8;margin:8px 0 0">Research Peptides</p></div><div style="background:#fff;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px"><h2 style="color:#0f172a;margin-top:0">Order Received</h2><p>${intro}</p><div style="background:#f8fafc;padding:16px;border-radius:6px;margin:20px 0"><p style="margin:0;font-size:14px;color:#64748b">Order Number</p><p style="margin:4px 0 0;font-size:20px;font-weight:bold;color:#0f172a">${displayNumber}</p></div><h3>Order Summary</h3><table style="width:100%;border-collapse:collapse"><thead><tr style="background:#f8fafc"><th style="padding:8px;text-align:left;font-size:13px;color:#64748b">Item</th><th style="padding:8px;text-align:center;font-size:13px;color:#64748b">Qty</th><th style="padding:8px;text-align:right;font-size:13px;color:#64748b">Price</th></tr></thead><tbody>${itemRows}</tbody><tfoot><tr><td colspan="2" style="padding:8px;text-align:right;color:#64748b">Subtotal:</td><td style="padding:8px;text-align:right">$${subtotal.toFixed(2)}</td></tr>${discountRowCustomer}<tr><td colspan="2" style="padding:8px;text-align:right;color:#64748b">Shipping:</td><td style="padding:8px;text-align:right">${shipping === 0 ? '<span style="color:#16a34a;font-weight:bold">FREE</span>' : '$' + shipping.toFixed(2)}</td></tr><tr><td colspan="2" style="padding:12px 8px 8px;font-weight:bold;text-align:right;border-top:1px solid #e2e8f0">Total:</td><td style="padding:12px 8px 8px;font-weight:bold;text-align:right;border-top:1px solid #e2e8f0">$${order.order_total.toFixed(2)}</td></tr></tfoot></table><h3>Shipping To</h3><p style="margin:0">${order.customer_name}<br>${order.shipping_address.line1}${order.shipping_address.line2 ? '<br>' + order.shipping_address.line2 : ''}<br>${order.shipping_address.city}, ${order.shipping_address.state} ${order.shipping_address.zip}</p><div style="margin-top:24px;padding:16px;background:#fffbeb;border:1px solid #fbbf24;border-radius:6px"><p style="margin:0;font-size:14px"><strong>What's next?</strong> Once payment is verified we'll email you a shipping confirmation with tracking. Most orders ship within 1–2 business days.</p></div><p style="margin-top:24px;font-size:13px;color:#64748b">Questions? Email support@certipure.net<br><br><em>All products sold for research purposes only. Not for human consumption.</em></p></div></body></html>`,
    })
  } catch (e) { console.error('Customer email failed:', e) }

  // Admin notification
  try {
    // One-tap "Mark paid" straight from the phone. The link is signed with the
    // admin password, so only a link this server produced will be accepted.
    let verifyButton = ''
    try {
      const token = signOrderAction(order.id, 'verify')
      const link = `${SITE_URL}/api/admin/quick-verify?order=${order.id}&token=${token}`
      verifyButton =
        `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 20px"><tr>` +
        `<td style="background:#0d6b48;border-radius:8px"><a href="${link}" ` +
        `style="display:inline-block;padding:15px 34px;color:#fff;text-decoration:none;font-weight:bold;font-size:16px">` +
        `✅ Mark this order paid</a></td></tr></table>` +
        `<p style="text-align:center;margin:-10px 0 18px;font-size:12px;color:#94a3b8">Tap once your payment alert shows $${order.order_total.toFixed(2)}</p>`
    } catch {
      // No ADMIN_KEY configured — the email still sends, just without the button.
    }
    const itemList = cartItems.map((item: any) => `• ${item.products?.name} (${item.pack_size === 1 ? 'Single' : item.pack_size + '-Pack'}) ×${item.quantity} — $${(unitPriceFor(item) * item.quantity).toFixed(2)}`).join('<br>')
    await resend.emails.send({
      from: ORDERS_FROM,
      to: ADMIN_EMAIL,
      subject: `${isTestOrder ? "[TEST] " : "🔔 "}New Order — ${displayNumber} (${methodLabel})`,
      html: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333"><h2 style="margin:0 0 4px">🔔 New Order — ${displayNumber}</h2><div style="background:#0f172a;border-radius:10px;padding:20px;margin:16px 0;text-align:center"><p style="margin:0;color:#94a3b8;font-size:13px;text-transform:uppercase;letter-spacing:1px">Watch for this exact amount</p><p style="margin:6px 0 0;color:#fff;font-size:34px;font-weight:bold">$${order.order_total.toFixed(2)}</p><p style="margin:6px 0 0;color:#94a3b8;font-size:14px">via ${methodLabel}</p></div>${verifyButton}<div style="background:#f8fafc;padding:16px;border-radius:6px;margin:16px 0"><p style="margin:0"><strong>Order:</strong> ${displayNumber}</p><p style="margin:8px 0 0"><strong>Subtotal:</strong> $${subtotal.toFixed(2)}</p>${discountLineAdmin}<p style="margin:8px 0 0"><strong>Shipping:</strong> ${shipping === 0 ? 'FREE' : '$' + shipping.toFixed(2)}</p><p style="margin:8px 0 0"><strong>Total:</strong> $${order.order_total.toFixed(2)} (${methodLabel})</p><p style="margin:8px 0 0"><strong>Status:</strong> Pending Verification</p></div><h3>Customer</h3><p>${order.customer_name}<br>${email}<br>${phone || 'No phone'}</p><h3>Ship To</h3><p>${order.shipping_address.line1}${order.shipping_address.line2 ? ', ' + order.shipping_address.line2 : ''}<br>${order.shipping_address.city}, ${order.shipping_address.state} ${order.shipping_address.zip}</p><h3>Items</h3><p>${itemList}</p></body></html>`,
    })
  } catch (e) { console.error('Admin email failed:', e) }

  return NextResponse.json({ success: true, orderNumber: displayNumber })
}
