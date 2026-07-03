'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import PaymentSelector from '@/components/PaymentSelector';

// Shipping rules — keep in sync with api/create-order/route.ts.
const FREE_SHIPPING_THRESHOLD = 300;   // orders at/above this ship free
const FLAT_SHIPPING = 12.99;           // flat rate below the threshold

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

interface CartItem {
  id: string; product_id: string; quantity: number;
  pack_size: number; price_at_add: number;
  products: { name: string; slug: string };
}

export default function CheckoutClient() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const fileRef = useRef<HTMLInputElement>(null);

  const [cartItems, setCartItems]       = useState<CartItem[]>([]);
  const [loading, setLoading]           = useState(true);
  const [submitting, setSubmitting]     = useState(false);
  const [selectedCoin, setSelectedCoin] = useState('');
  const [screenshot, setScreenshot]     = useState<File | null>(null);
  const [preview, setPreview]           = useState<string | null>(null);
  const [error, setError]               = useState('');
  const [form, setForm] = useState({
    firstName:'', lastName:'', email:'', phone:'',
    address1:'', address2:'', city:'', state:'', zip:'',
  });

  // Promo / first-order discount. `appliedPercent` and `appliedCode` are set
  // only after the server confirms the code is valid for this customer; the
  // amount is recomputed authoritatively in /api/create-order.
  const [discountCode, setDiscountCode] = useState('');
  const [appliedCode, setAppliedCode]   = useState('');
  const [appliedPercent, setAppliedPercent] = useState(0);
  const [discountMsg, setDiscountMsg]   = useState('');
  const [applyingCode, setApplyingCode] = useState(false);

  useEffect(() => { loadCart(); }, []);

  async function loadCart() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/'); return; }
    const { data: profile } = await supabase.from('profiles').select('email,first_name,last_name').eq('id', user.id).single();
    if (profile) setForm(f => ({ ...f, email: profile.email || user.email || '', firstName: profile.first_name || '', lastName: profile.last_name || '' }));
    const { data } = await supabase.from('cart_items').select('*, products(name,slug)').eq('user_id', user.id);
    setCartItems((data as unknown as CartItem[]) || []);
    setLoading(false);
  }

  const subtotal = cartItems.reduce((s, i) => s + i.price_at_add * i.quantity, 0);
  // Discount preview. Uses the exact same formula as src/lib/discount.ts so the
  // amount shown here matches what /api/create-order stores and charges.
  const discount        = appliedPercent ? Math.round(subtotal * appliedPercent) / 100 : 0;
  // Shipping: free at $300+, otherwise a $12.99 flat rate. The server
  // (api/create-order) recomputes this same logic so the stored total is
  // authoritative — these values are just for display here.
  const shipping        = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING;
  const total           = subtotal - discount + shipping;
  const remainingForFree = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const freeShipProgress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);
  const handle   = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setScreenshot(file);
    const r = new FileReader();
    r.onload = ev => setPreview(ev.target?.result as string);
    r.readAsDataURL(file);
  }

  async function applyDiscount() {
    const code = discountCode.trim();
    if (!code) { setDiscountMsg('Enter a code first.'); return; }
    setApplyingCode(true); setDiscountMsg('');
    try {
      const res = await fetch('/api/validate-discount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const json = await res.json();
      if (json.valid) {
        setAppliedCode(json.code);
        setAppliedPercent(json.percent);
        setDiscountMsg(`${json.percent}% off applied!`);
      } else {
        setAppliedCode(''); setAppliedPercent(0);
        setDiscountMsg(json.reason || "That code isn't valid.");
      }
    } catch {
      setDiscountMsg('Could not check that code. Please try again.');
    } finally {
      setApplyingCode(false);
    }
  }

  function removeDiscount() {
    setAppliedCode(''); setAppliedPercent(0); setDiscountCode(''); setDiscountMsg('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('');
    if (!selectedCoin)  { setError('Please select a payment method.'); return; }

    // Card payment (PayRio): no screenshot. We create the order server-side then
    // redirect the customer to PayRio's hosted card page to actually pay. The
    // order is confirmed later by PayRio's server-to-server callback.
    if (selectedCoin === 'PAYRIOX') {
      setSubmitting(true);
      try {
        const res = await fetch('/api/payriox/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, discountCode: appliedCode || '' }),
        });
        const json = await res.json();
        if (!res.ok || !json.redirectUrl) {
          setError(json.error || 'Could not start card payment. Please try again.');
          setSubmitting(false);
          return;
        }
        window.location.href = json.redirectUrl; // off to PayRio's hosted checkout
      } catch {
        setError('Could not start card payment. Please try again.');
        setSubmitting(false);
      }
      return;
    }

    if (!screenshot)    { setError('Please upload a screenshot of your payment.'); return; }
    setSubmitting(true);
    const data = new FormData();
    Object.entries(form).forEach(([k, v]) => data.append(k, v));
    data.append('cryptoCoin', selectedCoin);
    data.append('screenshot', screenshot);
    if (appliedCode) data.append('discountCode', appliedCode);
    const res  = await fetch('/api/create-order', { method: 'POST', body: data });
    const json = await res.json();
    if (!res.ok) { setError(json.error || 'Something went wrong. Please try again.'); setSubmitting(false); return; }
    router.push(`/order-confirmed/${json.orderNumber}`);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" /></div>;

  if (!cartItems.length) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="text-xl text-gray-600">Your cart is empty.</p>
      <a href="/shop" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">Browse Products</a>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Order Summary */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>
            <div className="space-y-3">
              {cartItems.map(item => (
                <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">{item.products?.name}</p>
                    <p className="text-sm text-gray-500">{item.pack_size === 1 ? 'Single Vial' : `${item.pack_size}-Pack`} × {item.quantity}</p>
                  </div>
                  <span className="font-semibold">${(item.price_at_add * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium text-gray-900">${subtotal.toFixed(2)}</span>
              </div>

              {/* Promo / first-order discount code */}
              {appliedCode ? (
                <div className="flex justify-between text-sm items-center">
                  <span className="text-green-700 font-medium">Discount ({appliedCode})</span>
                  <span className="font-semibold text-green-700">
                    &minus;${discount.toFixed(2)}
                    <button type="button" onClick={removeDiscount} className="ml-2 text-xs font-normal text-gray-400 underline hover:text-gray-600">remove</button>
                  </span>
                </div>
              ) : (
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyDiscount(); } }}
                    placeholder="Promo code"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm uppercase placeholder:normal-case focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={applyDiscount}
                    disabled={applyingCode}
                    className="shrink-0 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium px-4 py-2 rounded-lg"
                  >
                    {applyingCode ? 'Checking…' : 'Apply'}
                  </button>
                </div>
              )}
              {discountMsg && (
                <p className={`text-xs ${appliedCode ? 'text-green-600' : 'text-amber-600'}`}>{discountMsg}</p>
              )}

              <div className="flex justify-between text-sm items-center">
                <span className="text-gray-600">Shipping</span>
                {shipping === 0
                  ? <span className="font-bold text-green-600">FREE</span>
                  : <span className="font-medium text-gray-900">${shipping.toFixed(2)}</span>}
              </div>

              {/* Free-shipping progress — only while under the threshold */}
              {remainingForFree > 0 ? (
                <div className="pt-1">
                  <p className="text-xs font-medium text-blue-700 mb-1.5">
                    Add <strong>${remainingForFree.toFixed(2)}</strong> more for <strong>FREE shipping!</strong>
                  </p>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full transition-all duration-300" style={{ width: `${freeShipProgress}%` }} />
                  </div>
                </div>
              ) : (
                <p className="text-xs font-semibold text-green-700 pt-1">🎉 You&rsquo;ve unlocked FREE shipping!</p>
              )}

              <div className="pt-3 mt-1 border-t border-gray-200 flex justify-between items-center">
                <span className="text-lg font-bold text-gray-900">Total</span>
                <span className="text-2xl font-bold text-blue-600">${total.toFixed(2)}</span>
              </div>
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
                <input name="address1" value={form.address1} onChange={handle} required placeholder="Street address" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
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
            <p className="text-sm text-gray-500 mb-4">We accept credit/debit card, cryptocurrency, or Cash App.</p>
            <PaymentSelector total={total} selectedCoin={selectedCoin} onSelectCoin={setSelectedCoin} />
          </section>

          {/* Screenshot Upload — not needed for card payments (PayRio confirms automatically) */}
          {selectedCoin !== 'PAYRIOX' && (
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">③ Upload Payment Screenshot</h2>
            <p className="text-sm text-gray-500 mb-4">Upload a screenshot from your wallet showing the completed transaction.</p>
            <div onClick={() => fileRef.current?.click()} className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${preview ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'}`}>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={onFile} className="hidden" />
              {preview ? (
                <div className="space-y-2">
                  <img src={preview} alt="Payment screenshot" className="max-h-48 mx-auto rounded-lg shadow-sm" />
                  <p className="text-sm text-green-700 font-medium">✓ {screenshot?.name}</p>
                  <p className="text-xs text-gray-500">Click to change</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-4xl">📸</div>
                  <p className="text-gray-600 font-medium">Click to upload screenshot</p>
                  <p className="text-xs text-gray-400">JPG, PNG, WEBP or GIF — max 10MB</p>
                </div>
              )}
            </div>
          </section>
          )}

          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4"><p className="text-red-700 text-sm">{error}</p></div>}

          <button type="submit" disabled={submitting} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-4 px-6 rounded-xl text-lg transition-colors">
            {submitting
              ? (selectedCoin === 'PAYRIOX' ? 'Redirecting to payment…' : 'Placing Order...')
              : (selectedCoin === 'PAYRIOX' ? `Continue to Card Payment — $${total.toFixed(2)}` : `Place Order — $${total.toFixed(2)}`)}
          </button>
          <p className="text-center text-xs text-gray-400">All products sold for research purposes only. Not for human consumption.</p>
        </form>
      </div>
    </div>
  );
}
