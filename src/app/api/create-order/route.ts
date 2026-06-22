import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resend } from '@/lib/resend'
import { codeMatches, discountAmountFor, DISCOUNT_CODE } from '@/lib/discount'

// Where admin notifications go, and who emails are sent from. The certipure.net
// domain must stay verified in Resend for these to deliver.
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
  const paymentMethod = isCashApp ? 'cashapp' : 'crypto'
  const methodLabel   = isCashApp ? 'Cash App' : cryptoCoin

  if (!firstName || !lastName || !email || !address1 || !city || !state || !zip || !cryptoCoin || !screenshot) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Basic safety checks on the uploaded payment screenshot.
  if (!screenshot.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Screenshot must be an image file.' }, { status: 400 })
  }
  if (screenshot.size > MAX_SCREENSHOT_BYTES) {
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

  const subtotal = cartItems.reduce((sum: number, item: any) => sum + item.price_at_add * item.quantity, 0)

  // The service-role client lets us read/write tables the customer's own
  // session can't (orders history check below, stock deduction later).
  const admin = createAdminClient()

  // First-order discount. We only apply it when the typed code matches AND this
  // is genuinely the customer's first order — checked with the service-role
  // client so row-level security can't let the check pass incorrectly. If a
  // matching code is sent by a returning customer we reject the order outright
  // (rather than silently charging full price) so the amount they were told to
  // pay always equals the amount we store.
  let discountAmount = 0
  let discountCodeStored: string | null = null
  if (discountCodeInput && codeMatches(discountCodeInput)) {
    let priorOrders = 0
    if (admin) {
      const { count } = await admin
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
      priorOrders = count ?? 0
    } else {
      const { count } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
      priorOrders = count ?? 0
    }
    if (priorOrders > 0) {
      return NextResponse.json(
        { error: 'The discount code is valid on your first order only. Please remove it and place your order again.' },
        { status: 400 },
      )
    }
    discountAmount = discountAmountFor(subtotal)
    discountCodeStored = DISCOUNT_CODE
  }

  const discountedSubtotal = subtotal - discountAmount

  // Shipping: free at $300+, otherwise a $12.99 flat rate. Computed server-side
  // so the stored total is authoritative (keep in sync with CheckoutClient.tsx).
  const FREE_SHIPPING_THRESHOLD = 300
  const FLAT_SHIPPING = 12.99
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING
  const orderTotal = discountedSubtotal + shipping

  // Upload screenshot
  const fileExt  = screenshot.name.split('.').pop() || 'png'
  const fileName = `${user.id}/${Date.now()}.${fileExt}`
  const fileBuffer = await screenshot.arrayBuffer()

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('order-screenshots')
    .upload(fileName, fileBuffer, { contentType: screenshot.type, upsert: false })

  if (uploadError) {
    console.error('Screenshot upload error:', uploadError)
    return NextResponse.json({ error: 'Failed to upload screenshot' }, { status: 500 })
  }

  // Create order. We pass a generated order_number; if the database generates
  // its own on insert, that value is returned instead and used below.
  const orderNumber = buildOrderNumber()
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
      screenshot_url: uploadData.path,
      subtotal,
      // Only written when a discount was actually applied, so ordinary orders
      // never touch these columns (keeps checkout working even before the
      // discount_code / discount_amount columns are added to the orders table).
      ...(discountAmount > 0 ? { discount_code: discountCodeStored, discount_amount: discountAmount } : {}),
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

  // Create order items
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
  if (itemsError) console.error('Order items insert error:', itemsError)

  // Deduct stock for each item. We use the service-role client because the
  // customer's own session can't update the products table (row-level
  // security). This is best-effort: a stock-update failure is logged but never
  // blocks the order. Stock is counted in vials, so we subtract quantity ×
  // pack_size, clamped at 0 so it can never go negative. (`admin` is created
  // once near the top of this handler.)
  if (admin) {
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
    const itemRows = cartItems.map((item: any) => `<tr><td style="padding:8px;border-bottom:1px solid #eee">${item.products?.name} (${item.pack_size === 1 ? 'Single' : item.pack_size + '-Pack'})</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${item.quantity}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">$${(item.price_at_add * item.quantity).toFixed(2)}</td></tr>`).join('')
    await resend.emails.send({
      from: ORDERS_FROM,
      to: email,
      subject: `Order Received — ${displayNumber}`,
      html: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333"><div style="background:#0f172a;padding:24px;border-radius:8px 8px 0 0;text-align:center"><h1 style="color:#fff;margin:0">CertiPure</h1><p style="color:#94a3b8;margin:8px 0 0">Research Peptides</p></div><div style="background:#fff;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px"><h2 style="color:#0f172a;margin-top:0">Order Received</h2><p>Thank you! We received your payment screenshot and will verify your ${methodLabel} payment within 1–4 hours.</p><div style="background:#f8fafc;padding:16px;border-radius:6px;margin:20px 0"><p style="margin:0;font-size:14px;color:#64748b">Order Number</p><p style="margin:4px 0 0;font-size:20px;font-weight:bold;color:#0f172a">${displayNumber}</p></div><h3>Order Summary</h3><table style="width:100%;border-collapse:collapse"><thead><tr style="background:#f8fafc"><th style="padding:8px;text-align:left;font-size:13px;color:#64748b">Item</th><th style="padding:8px;text-align:center;font-size:13px;color:#64748b">Qty</th><th style="padding:8px;text-align:right;font-size:13px;color:#64748b">Price</th></tr></thead><tbody>${itemRows}</tbody><tfoot><tr><td colspan="2" style="padding:8px;text-align:right;color:#64748b">Subtotal:</td><td style="padding:8px;text-align:right">$${subtotal.toFixed(2)}</td></tr>${discountRowCustomer}<tr><td colspan="2" style="padding:8px;text-align:right;color:#64748b">Shipping:</td><td style="padding:8px;text-align:right">${shipping === 0 ? '<span style="color:#16a34a;font-weight:bold">FREE</span>' : '$' + shipping.toFixed(2)}</td></tr><tr><td colspan="2" style="padding:12px 8px 8px;font-weight:bold;text-align:right;border-top:1px solid #e2e8f0">Total:</td><td style="padding:12px 8px 8px;font-weight:bold;text-align:right;border-top:1px solid #e2e8f0">$${order.order_total.toFixed(2)}</td></tr></tfoot></table><h3>Shipping To</h3><p style="margin:0">${order.customer_name}<br>${order.shipping_address.line1}${order.shipping_address.line2 ? '<br>' + order.shipping_address.line2 : ''}<br>${order.shipping_address.city}, ${order.shipping_address.state} ${order.shipping_address.zip}</p><div style="margin-top:24px;padding:16px;background:#fffbeb;border:1px solid #fbbf24;border-radius:6px"><p style="margin:0;font-size:14px"><strong>What's next?</strong> Once payment is verified we'll email you a shipping confirmation with tracking. Most orders ship within 1–2 business days.</p></div><p style="margin-top:24px;font-size:13px;color:#64748b">Questions? Email support@certipure.net<br><br><em>All products sold for research purposes only. Not for human consumption.</em></p></div></body></html>`,
    })
  } catch (e) { console.error('Customer email failed:', e) }

  // Admin notification
  try {
    const itemList = cartItems.map((item: any) => `• ${item.products?.name} (${item.pack_size === 1 ? 'Single' : item.pack_size + '-Pack'}) ×${item.quantity} — $${(item.price_at_add * item.quantity).toFixed(2)}`).join('<br>')
    await resend.emails.send({
      from: ORDERS_FROM,
      to: ADMIN_EMAIL,
      subject: `🔔 New Order — ${displayNumber} (${methodLabel})`,
      html: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333"><h2>🔔 New Order Received</h2><div style="background:#f8fafc;padding:16px;border-radius:6px;margin:16px 0"><p style="margin:0"><strong>Order:</strong> ${displayNumber}</p><p style="margin:8px 0 0"><strong>Subtotal:</strong> $${subtotal.toFixed(2)}</p>${discountLineAdmin}<p style="margin:8px 0 0"><strong>Shipping:</strong> ${shipping === 0 ? 'FREE' : '$' + shipping.toFixed(2)}</p><p style="margin:8px 0 0"><strong>Total:</strong> $${order.order_total.toFixed(2)} (${methodLabel})</p><p style="margin:8px 0 0"><strong>Status:</strong> Pending Verification</p></div><h3>Customer</h3><p>${order.customer_name}<br>${email}<br>${phone || 'No phone'}</p><h3>Ship To</h3><p>${order.shipping_address.line1}${order.shipping_address.line2 ? ', ' + order.shipping_address.line2 : ''}<br>${order.shipping_address.city}, ${order.shipping_address.state} ${order.shipping_address.zip}</p><h3>Items</h3><p>${itemList}</p></body></html>`,
    })
  } catch (e) { console.error('Admin email failed:', e) }

  return NextResponse.json({ success: true, orderNumber: displayNumber })
}
