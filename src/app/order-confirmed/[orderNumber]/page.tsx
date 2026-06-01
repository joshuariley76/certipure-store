export const metadata = {
  title: 'Order Confirmed | CertiPure',
}

export default async function OrderConfirmedPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="text-6xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Received!</h1>
        <p className="text-gray-600 mb-6">Thank you for your order. We received your payment screenshot and will verify it shortly.</p>
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <p className="text-sm text-gray-500">Your Order Number</p>
          <p className="text-2xl font-bold text-blue-600 font-mono">{orderNumber}</p>
        </div>
        <div className="text-left space-y-3 mb-8">
          <h3 className="font-semibold text-gray-900">What happens next?</h3>
          {[
            'We verify your payment (usually within 1–4 hours)',
            'You receive a confirmation email when verified',
            'Your order ships within 1–2 business days with tracking',
          ].map((step, i) => (
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
