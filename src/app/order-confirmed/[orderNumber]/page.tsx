import { createAdminClient } from '@/lib/supabase/admin'
import { isTestOrderNumber } from '@/lib/admin-test-code'

export const metadata = {
  title: 'Order Confirmed | CertiPure',
}

export const dynamic = 'force-dynamic'

// What the customer is told depends on how they actually paid. Getting this
// wrong is worse than saying nothing: the page used to promise every customer
// that we had received their payment screenshot, including the Zelle and Cash
// App customers who were never asked for one.
type Wording = { blurb: string; steps: string[] }

const AWAITING_SCREENSHOT: Wording = {
  blurb: 'Thank you for your order. We received your payment screenshot and will verify it shortly.',
  steps: [
    'We verify your payment (usually within 1–4 hours)',
    'You receive a confirmation email when verified',
    'Your order ships within 1–2 business days with tracking',
  ],
}

const MATCHED_BY_AMOUNT: Wording = {
  blurb:
    'Thank you for your order. We match your payment by the exact amount you send, so there is nothing else for you to do.',
  steps: [
    'Send the exact amount shown at checkout, if you have not already',
    'We match it to this order and verify it (usually within 1–4 hours)',
    'You receive a confirmation email, then it ships within 1–2 business days with tracking',
  ],
}

const CARD: Wording = {
  blurb: 'Thank you for your order. Your card payment is being processed.',
  steps: [
    'Your payment is confirmed with the card processor',
    'You receive a confirmation email once it clears',
    'Your order ships within 1–2 business days with tracking',
  ],
}

const TEST_ORDER: Wording = {
  blurb:
    'This was a $0 test order. Nothing was charged, no stock was taken, and nothing will be shipped.',
  steps: [
    'No payment was taken — the total was $0',
    'Stock was left untouched',
    'It appears in the admin list as a CP-TEST order, and can be deleted whenever you like',
  ],
}

async function wordingFor(orderNumber: string): Promise<Wording> {
  if (isTestOrderNumber(orderNumber)) return TEST_ORDER

  const admin = createAdminClient()
  if (!admin) return AWAITING_SCREENSHOT

  const { data } = await admin
    .from('orders')
    .select('payment_method, screenshot_url')
    .eq('order_number', orderNumber)
    .maybeSingle()

  if (!data) return AWAITING_SCREENSHOT
  if (data.payment_method === 'payriox') return CARD
  // Only the coins ever send a screenshot; Zelle and Cash App are identified
  // by the exact amount instead.
  if (data.screenshot_url) return AWAITING_SCREENSHOT
  return MATCHED_BY_AMOUNT
}

export default async function OrderConfirmedPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params
  const isTest = isTestOrderNumber(orderNumber)
  const { blurb, steps } = await wordingFor(orderNumber)

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="text-6xl mb-4">{isTest ? '🧪' : '✅'}</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {isTest ? 'Test Order Placed' : 'Order Received!'}
        </h1>
        <p className="text-gray-600 mb-6">{blurb}</p>
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <p className="text-sm text-gray-500">Your Order Number</p>
          <p className="text-2xl font-bold text-blue-600 font-mono">{orderNumber}</p>
        </div>
        <div className="text-left space-y-3 mb-8">
          <h3 className="font-semibold text-gray-900">{isTest ? 'What this did' : 'What happens next?'}</h3>
          {steps.map((step, i) => (
            <div key={i} className="flex gap-3 items-start">
              <div className="shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">{i + 1}</div>
              <p className="text-sm text-gray-600">{step}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-3">
          <a href="/shop" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors block">Continue Shopping</a>
          <a href="/" className="text-gray-500 hover:text-gray-700 text-sm">Back to Home</a>
        </div>
        <p className="mt-6 text-xs text-gray-400">Questions? Email support@certipure.net</p>
      </div>
    </div>
  );
}
