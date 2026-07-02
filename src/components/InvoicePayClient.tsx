'use client'
import { useRef, useState } from 'react'

const WALLET: Record<string, string> = {
  BTC: process.env.NEXT_PUBLIC_WALLET_BTC || '',
  ETH: process.env.NEXT_PUBLIC_WALLET_ETH || '',
  USDT: process.env.NEXT_PUBLIC_WALLET_USDT || '',
  USDC: process.env.NEXT_PUBLIC_WALLET_USDC || '',
  SOL: process.env.NEXT_PUBLIC_WALLET_SOL || '',
  CASHAPP: process.env.NEXT_PUBLIC_WALLET_CASHAPP || '',
}
const COINS = [
  { coin: 'BTC', label: 'Bitcoin', network: 'Bitcoin', color: '#F7931A' },
  { coin: 'ETH', label: 'Ethereum', network: 'ERC-20', color: '#627EEA' },
  { coin: 'USDT', label: 'Tether', network: 'ERC-20', color: '#26A17B' },
  { coin: 'USDC', label: 'USD Coin', network: 'ERC-20', color: '#2775CA' },
  { coin: 'SOL', label: 'Solana', network: 'Solana', color: '#9945FF' },
]
const CASHAPP_COLOR = '#00D632'
const CARD_COLOR = '#2563eb'
const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']

type Item = { name: string; packSize: number; quantity: number; lineTotal: number }

export default function InvoicePayClient({
  orderNumber, token, items, subtotal, shipping, total, customerEmail,
}: {
  orderNumber: string; token: string; items: Item[]
  subtotal: number; shipping: number; total: number; customerEmail: string
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [selectedCoin, setSelectedCoin] = useState('')
  const [copied, setCopied] = useState(false)
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: customerEmail || '', phone: '',
    address1: '', address2: '', city: '', state: '', zip: '',
  })
  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setScreenshot(file)
    const r = new FileReader(); r.onload = ev => setPreview(ev.target?.result as string); r.readAsDataURL(file)
  }
  async function copyAddress() {
    await navigator.clipboard.writeText(WALLET[selectedCoin] || '')
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }
  function shippingValid() {
    const f = form
    return f.firstName && f.lastName && f.email && f.address1 && f.city && f.state && f.zip
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (!shippingValid()) { setError('Please fill in all required shipping fields.'); return }
    if (!selectedCoin) { setError('Please select a payment method.'); return }

    if (selectedCoin === 'PAYRIOX') {
      setSubmitting(true)
      try {
        const res = await fetch('/api/invoice/pay-card', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderNumber, token, ...form }),
        })
        const json = await res.json()
        if (!res.ok || !json.redirectUrl) { setError(json.error || 'Could not start card payment.'); setSubmitting(false); return }
        window.location.href = json.redirectUrl
      } catch { setError('Could not start card payment. Please try again.'); setSubmitting(false) }
      return
    }

    if (!screenshot) { setError('Please upload a screenshot of your payment.'); return }
    setSubmitting(true)
    const data = new FormData()
    data.append('orderNumber', orderNumber); data.append('token', token)
    Object.entries(form).forEach(([k, v]) => data.append(k, v))
    data.append('cryptoCoin', selectedCoin); data.append('screenshot', screenshot)
    try {
      const res = await fetch('/api/invoice/submit', { method: 'POST', body: data })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Something went wrong. Please try again.'); setSubmitting(false); return }
      setDone(true)
    } catch { setError('Something went wrong. Please try again.'); setSubmitting(false) }
  }

  if (done) return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full bg-white border border-gray-200 rounded-2xl p-8 text-center">
        <div className="text-4xl mb-3">⏳</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Payment submitted</h1>
        <p className="text-sm text-gray-500">Thanks! We received your payment for invoice <strong>{orderNumber}</strong> and will verify it shortly. You&rsquo;ll get an email once it&rsquo;s confirmed.</p>
      </div>
    </main>
  )

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Pay Invoice</h1>
        <p className="text-sm text-gray-500 mb-8">Invoice {orderNumber}</p>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Summary */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>
            <div className="space-y-3">
              {items.map((it, idx) => (
                <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">{it.name}</p>
                    <p className="text-sm text-gray-500">{it.packSize === 1 ? 'Single Vial' : `${it.packSize}-Pack`} × {it.quantity}</p>
                  </div>
                  <span className="font-semibold">${it.lineTotal.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-gray-600">Subtotal</span><span className="font-medium">${subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-600">Shipping</span>{shipping === 0 ? <span className="font-bold text-green-600">FREE</span> : <span className="font-medium">${shipping.toFixed(2)}</span>}</div>
              <div className="pt-3 mt-1 border-t border-gray-200 flex justify-between items-center"><span className="text-lg font-bold text-gray-900">Total</span><span className="text-2xl font-bold text-blue-600">${total.toFixed(2)}</span></div>
            </div>
          </section>

          {/* Shipping */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">① Shipping Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(['firstName','lastName'] as const).map(f => (
                <div key={f}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{f === 'firstName' ? 'First Name' : 'Last Name'} *</label>
                  <input name={f} value={form[f]} onChange={handle} required className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input name="email" type="email" value={form.email} onChange={handle} required className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input name="phone" type="tel" value={form.phone} onChange={handle} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Street Address *</label>
                <input name="address1" value={form.address1} onChange={handle} required className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="md:col-span-2">
                <input name="address2" value={form.address2} onChange={handle} placeholder="Apt, suite, etc. (optional)" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                <input name="city" value={form.city} onChange={handle} required className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                  <select name="state" value={form.state} onChange={handle} required className="w-full border border-gray-300 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">—</option>
                    {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ZIP *</label>
                  <input name="zip" value={form.zip} onChange={handle} required maxLength={10} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>
          </section>

          {/* Payment */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">② Select Payment Method</h2>
            <p className="text-sm text-gray-500 mb-4">Card, cryptocurrency, or Cash App.</p>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => setSelectedCoin('PAYRIOX')}
                style={selectedCoin === 'PAYRIOX' ? { borderColor: CARD_COLOR, boxShadow: `0 0 0 3px ${CARD_COLOR}26` } : undefined}
                className={`w-[104px] flex flex-col items-center justify-center gap-2 px-3 py-4 rounded-xl border-2 bg-white transition-all ${selectedCoin === 'PAYRIOX' ? 'scale-[1.03]' : 'border-gray-200 hover:border-gray-300'}`}>
                <div className="w-11 h-11 rounded-lg flex items-center justify-center text-white text-2xl" style={{ backgroundColor: CARD_COLOR }}>💳</div>
                <div className="text-sm font-bold" style={{ color: CARD_COLOR }}>Card</div>
                <div className="text-[11px] text-gray-400">Visa · MC</div>
              </button>
              {COINS.map(opt => {
                const sel = selectedCoin === opt.coin
                return (
                  <button key={opt.coin} type="button" onClick={() => setSelectedCoin(opt.coin)}
                    style={sel ? { borderColor: opt.color, boxShadow: `0 0 0 3px ${opt.color}26` } : undefined}
                    className={`w-[104px] flex flex-col items-center justify-center gap-2 px-3 py-4 rounded-xl border-2 bg-white transition-all ${sel ? 'scale-[1.03]' : 'border-gray-200 hover:border-gray-300'}`}>
                    <div className="w-11 h-11 rounded-full flex items-center justify-center text-white text-lg font-bold" style={{ backgroundColor: opt.color }}>{opt.coin[0]}</div>
                    <div className="text-sm font-bold" style={{ color: opt.color }}>{opt.label}</div>
                    <div className="text-[11px] text-gray-400">{opt.coin} · {opt.network}</div>
                  </button>
                )
              })}
              <button type="button" onClick={() => setSelectedCoin('CASHAPP')}
                style={selectedCoin === 'CASHAPP' ? { borderColor: CASHAPP_COLOR, boxShadow: `0 0 0 3px ${CASHAPP_COLOR}26` } : undefined}
                className={`w-[104px] flex flex-col items-center justify-center gap-2 px-3 py-4 rounded-xl border-2 bg-white transition-all ${selectedCoin === 'CASHAPP' ? 'scale-[1.03]' : 'border-gray-200 hover:border-gray-300'}`}>
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-white text-2xl font-extrabold" style={{ backgroundColor: CASHAPP_COLOR }}>$</div>
                <div className="text-sm font-bold" style={{ color: CASHAPP_COLOR }}>Cash App</div>
                <div className="text-[11px] text-gray-400">$Cashtag</div>
              </button>
            </div>

            {selectedCoin === 'PAYRIOX' && (
              <div className="mt-5 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <p className="text-sm font-medium text-blue-900">You&rsquo;ll be taken to our secure card page to pay <strong>${total.toFixed(2)}</strong>. Your order confirms automatically once payment goes through.</p>
              </div>
            )}
            {selectedCoin === 'CASHAPP' && WALLET.CASHAPP && (
              <div className="mt-5 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-sm font-medium text-gray-600 mb-2">Send <strong className="text-gray-900">exactly ${total.toFixed(2)}</strong> via Cash App to:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-mono break-all">{WALLET.CASHAPP}</code>
                  <button type="button" onClick={copyAddress} className="shrink-0 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium">{copied ? '✓' : 'Copy'}</button>
                </div>
                <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">⚠️ Send exactly ${total.toFixed(2)}, then upload your screenshot below.</p>
              </div>
            )}
            {selectedCoin && selectedCoin !== 'CASHAPP' && selectedCoin !== 'PAYRIOX' && WALLET[selectedCoin] && (
              <div className="mt-5 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-sm font-medium text-gray-600 mb-2">Send <strong className="text-gray-900">${total.toFixed(2)} USD in {selectedCoin}</strong> to:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-mono break-all">{WALLET[selectedCoin]}</code>
                  <button type="button" onClick={copyAddress} className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium">{copied ? '✓' : 'Copy'}</button>
                </div>
                <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">⚠️ Send the exact USD equivalent at current rate, then upload your screenshot below.</p>
              </div>
            )}
          </section>

          {/* Screenshot — not for card */}
          {selectedCoin && selectedCoin !== 'PAYRIOX' && (
            <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">③ Upload Payment Screenshot</h2>
              <p className="text-sm text-gray-500 mb-4">Show the completed transaction.</p>
              <div onClick={() => fileRef.current?.click()} className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer ${preview ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'}`}>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={onFile} className="hidden" />
                {preview ? (
                  <div className="space-y-2"><img src={preview} alt="Payment" className="max-h-48 mx-auto rounded-lg shadow-sm" /><p className="text-sm text-green-700 font-medium">✓ {screenshot?.name}</p><p className="text-xs text-gray-500">Click to change</p></div>
                ) : (
                  <div className="space-y-2"><div className="text-4xl">📸</div><p className="text-gray-600 font-medium">Click to upload screenshot</p><p className="text-xs text-gray-400">JPG, PNG, WEBP or GIF — max 10MB</p></div>
                )}
              </div>
            </section>
          )}

          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4"><p className="text-red-700 text-sm">{error}</p></div>}

          <button type="submit" disabled={submitting} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-4 px-6 rounded-xl text-lg transition-colors">
            {submitting ? (selectedCoin === 'PAYRIOX' ? 'Redirecting to payment…' : 'Submitting…') : (selectedCoin === 'PAYRIOX' ? `Continue to Card Payment — $${total.toFixed(2)}` : `Submit Payment — $${total.toFixed(2)}`)}
          </button>
          <p className="text-center text-xs text-gray-400">All products sold for research purposes only. Not for human consumption.</p>
        </form>
      </div>
    </div>
  )
}
