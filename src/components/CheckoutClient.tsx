'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const WALLET: Record<string, string> = {
  BTC:  process.env.NEXT_PUBLIC_WALLET_BTC  || '',
  ETH:  process.env.NEXT_PUBLIC_WALLET_ETH  || '',
  USDT: process.env.NEXT_PUBLIC_WALLET_USDT || '',
  USDC: process.env.NEXT_PUBLIC_WALLET_USDC || '',
  SOL:  process.env.NEXT_PUBLIC_WALLET_SOL  || '',
};
const COINS = [
  { coin: 'BTC',  label: 'Bitcoin',        network: 'Bitcoin'   },
  { coin: 'ETH',  label: 'Ethereum',        network: 'ERC-20'    },
  { coin: 'USDT', label: 'Tether (USDT)',   network: 'ERC-20'    },
  { coin: 'USDC', label: 'USD Coin',        network: 'ERC-20'    },
  { coin: 'SOL',  label: 'Solana',          network: 'Solana'    },
];
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
  const [copied, setCopied]             = useState(false);
  const [screenshot, setScreenshot]     = useState<File | null>(null);
  const [preview, setPreview]           = useState<string | null>(null);
  const [error, setError]               = useState('');
  const [form, setForm] = useState({
    firstName:'', lastName:'', email:'', phone:'',
    address1:'', address2:'', city:'', state:'', zip:'',
  });

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
  const handle   = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setScreenshot(file);
    const r = new FileReader();
    r.onload = ev => setPreview(ev.target?.result as string);
    r.readAsDataURL(file);
  }

  async function copyAddress() {
    await navigator.clipboard.writeText(WALLET[selectedCoin] || '');
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('');
    if (!selectedCoin)  { setError('Please select a payment method.'); return; }
    if (!screenshot)    { setError('Please upload a screenshot of your payment.'); return; }
    setSubmitting(true);
    const data = new FormData();
    Object.entries(form).forEach(([k, v]) => data.append(k, v));
    data.append('cryptoCoin', selectedCoin);
    data.append('screenshot', screenshot);
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
            <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
              <span className="text-lg font-bold text-gray-900">Total</span>
              <span className="text-2xl font-bold text-blue-600">${subtotal.toFixed(2)}</span>
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
            <p className="text-sm text-gray-500 mb-4">We accept cryptocurrency only.</p>
            <div className="flex flex-wrap gap-3">
              {COINS.map(opt => (
                <button key={opt.coin} type="button" onClick={() => setSelectedCoin(opt.coin)}
                  className={`px-4 py-3 rounded-lg border-2 font-semibold transition-all text-left ${selectedCoin === opt.coin ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-700 hover:border-blue-300'}`}>
                  <div className="text-sm font-bold">{opt.coin}</div>
                  <div className="text-xs font-normal text-gray-500">{opt.network}</div>
                </button>
              ))}
            </div>
            {selectedCoin && WALLET[selectedCoin] && (
              <div className="mt-5 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-sm font-medium text-gray-600 mb-2">Send <strong className="text-gray-900">${subtotal.toFixed(2)} USD in {selectedCoin}</strong> to this address:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-mono text-gray-800 break-all">{WALLET[selectedCoin]}</code>
                  <button type="button" onClick={copyAddress} className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium">
                    {copied ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  ⚠️ Send the exact USD equivalent at current market rate. Then upload your transaction screenshot below.
                </p>
              </div>
            )}
            {selectedCoin && !WALLET[selectedCoin] && (
              <p className="mt-4 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                No receiving address is configured for {selectedCoin} yet. (Set NEXT_PUBLIC_WALLET_{selectedCoin} in .env.local.)
              </p>
            )}
          </section>

          {/* Screenshot Upload */}
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

          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4"><p className="text-red-700 text-sm">{error}</p></div>}

          <button type="submit" disabled={submitting} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-4 px-6 rounded-xl text-lg transition-colors">
            {submitting ? 'Placing Order...' : `Place Order — $${subtotal.toFixed(2)}`}
          </button>
          <p className="text-center text-xs text-gray-400">All products sold for research purposes only. Not for human consumption.</p>
        </form>
      </div>
    </div>
  );
}
