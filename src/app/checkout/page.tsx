import Link from 'next/link'

export const metadata = {
  title: 'Checkout | CertiPure',
  description: 'Complete your CertiPure order.',
}

export default function CheckoutPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <h1 className="text-4xl font-bold mb-2 text-gray-900">Checkout</h1>
      <p className="text-sm text-gray-500 mb-10">Almost there — payment integration is on the way.</p>

      <div className="prose prose-lg max-w-none text-gray-700 space-y-6">
        <section>
          <p>
            Checkout is being set up. We&apos;re working on integrating our payment processor. Your cart
            will be preserved — please check back soon.
          </p>
        </section>
      </div>

      <Link
        href="/cart"
        className="mt-8 inline-block bg-[#2d3ca5] hover:bg-[#232f82] text-white font-semibold text-sm px-6 py-3 rounded-lg transition"
      >
        Back to Cart
      </Link>
    </div>
  )
}
