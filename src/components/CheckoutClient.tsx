'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const WALLET: Record<string, string> = {
  BTC:     process.env.NEXT_PUBLIC_WALLET_BTC     || '',
  ETH:     process.env.NEXT_PUBLIC_WALLET_ETH     || '',
  USDT:    process.env.NEXT_PUBLIC_WALLET_USDT    || '',
  USDC:    process.env.NEXT_PUBLIC_WALLET_USDC    || '',
  SOL:     process.env.NEXT_PUBLIC_WALLET_SOL     || '',
  CASHAPP: process.env.NEXT_PUBLIC_WALLET_CASHAPP || '',
};
// Each crypto option carries its official brand color, used for the coin name
// and the selected card's border/glow. The logo itself is an inline SVG drawn
// by <CoinIcon> below — no external image files or icon packages.
const COINS = [
  { coin: 'BTC',  label: 'Bitcoin',  network: 'Bitcoin', color: '#F7931A' },
  { coin: 'ETH',  label: 'Ethereum', network: 'ERC-20',  color: '#627EEA' },
  { coin: 'USDT', label: 'Tether',   network: 'ERC-20',  color: '#26A17B' },
  { coin: 'USDC', label: 'USD Coin', network: 'ERC-20',  color: '#2775CA' },
  { coin: 'SOL',  label: 'Solana',   network: 'Solana',  color: '#9945FF' },
];
const CASHAPP_COLOR = '#00D632';

// Shipping rules — keep in sync with api/create-order/route.ts.
const FREE_SHIPPING_THRESHOLD = 300;   // orders at/above this ship free
const FLAT_SHIPPING = 12.99;           // flat rate below the threshold

// Inline SVG logos for each coin — fully self-contained so nothing can fail to
// load. Each is sized by the className passed in (the cards use w-11 h-11).
function CoinIcon({ coin, className = 'w-11 h-11' }: { coin: string; className?: string }) {
  switch (coin) {
    case 'BTC':
      return (
        <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
          <circle cx="20" cy="20" r="20" fill="#F7931A" />
          {/* ₿ — vertical extenders top and bottom, plus the double-bumped B */}
          <g fill="#fff">
            <rect x="17.2" y="8.5"  width="2.3" height="23" rx="0.6" />
            <rect x="21.0" y="8.5"  width="2.3" height="23" rx="0.6" />
            <path d="M14 11.5h7.6c3.1 0 5.2 1.4 5.2 4.1 0 1.8-1 3-2.6 3.5 2 .4 3.3 1.7 3.3 3.8 0 3-2.3 4.6-5.8 4.6H14V11.5zm3.4 2.7v4.1h3.4c1.5 0 2.5-.7 2.5-2.1 0-1.3-.9-2-2.5-2h-3.4zm0 6.6v4.4h3.8c1.7 0 2.7-.8 2.7-2.2 0-1.5-1.1-2.2-2.9-2.2h-3.6z" />
          </g>
        </svg>
      );
    case 'ETH':
      return (
        // Official Ethereum diamond, single-hue #627EEA with faceted opacities.
        <svg viewBox="0 0 256 417" className={className} aria-hidden="true">
          <polygon fill="#627EEA" fillOpacity="0.6"  points="127.96 0 125.17 9.5 125.17 285.17 127.96 287.96 255.92 212.32" />
          <polygon fill="#627EEA"                     points="127.96 0 0 212.32 127.96 287.96 127.96 154.16" />
          <polygon fill="#627EEA" fillOpacity="0.6"  points="127.96 312.19 126.39 314.11 126.39 412.31 127.96 416.91 255.99 236.59" />
          <polygon fill="#627EEA"                     points="127.96 416.91 127.96 312.19 0 236.59" />
          <polygon fill="#627EEA" fillOpacity="0.2"  points="127.96 287.96 255.92 212.32 127.96 154.16" />
          <polygon fill="#627EEA" fillOpacity="0.45" points="0 212.32 127.96 287.96 127.96 154.16" />
        </svg>
      );
    case 'USDT':
      return (
        <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
          <circle cx="20" cy="20" r="20" fill="#26A17B" />
          {/* ₮ — top bar, centre stem, and the lower cross-stroke */}
          <g fill="#fff">
            <rect x="10" y="11"   width="20"  height="3.4" rx="0.5" />
            <rect x="17.6" y="11" width="4.8" height="18"  rx="0.5" />
            <rect x="13.5" y="17.6" width="13" height="3.2" rx="0.5" />
          </g>
        </svg>
      );
    case 'USDC':
      return (
        <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
          <circle cx="20" cy="20" r="20" fill="#2775CA" />
          <text x="20" y="20.5" textAnchor="middle" dominantBaseline="central"
            fontFamily="Arial, Helvetica, sans-serif" fontSize="24" fontWeight="700" fill="#fff">$</text>
        </svg>
      );
    case 'SOL':
      return (
        // Solana's three slanted bars, rendered in a single purple (#9945FF).
        <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
          <circle cx="20" cy="20" r="20" fill="#9945FF" />
          <g fill="#fff">
            <polygon points="13 13 31 13 27 17 9 17" />
            <polygon points="9 19 27 19 31 23 13 23" />
            <polygon points="13 25 31 25 27 29 9 29" />
          </g>
        </svg>
      );
    default:
      return null;
  }
}
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
  // Shipping: free at $300+, otherwise a $12.99 flat rate. The server
  // (api/create-order) recomputes this same logic so the stored total is
  // authoritative — these values are just for display here.
  const shipping        = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING;
  const total           = subtotal + shipping;
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
            <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium text-gray-900">${subtotal.toFixed(2)}</span>
              </div>
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
            <p className="text-sm text-gray-500 mb-4">We accept cryptocurrency or Cash App.</p>
            <div className="flex flex-wrap gap-3">
              {COINS.map(opt => {
                const selected = selectedCoin === opt.coin;
                return (
                  <button key={opt.coin} type="button" onClick={() => setSelectedCoin(opt.coin)}
                    style={selected ? { borderColor: opt.color, boxShadow: `0 0 0 3px ${opt.color}26, 0 6px 16px ${opt.color}40` } : undefined}
                    className={`group w-[104px] flex flex-col items-center justify-center gap-2 px-3 py-4 rounded-xl border-2 bg-white transition-all ${selected ? 'scale-[1.03]' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'}`}>
                    <CoinIcon coin={opt.coin} className="w-11 h-11 drop-shadow-sm" />
                    <div className="text-sm font-bold leading-tight" style={{ color: opt.color }}>{opt.label}</div>
                    <div className="text-[11px] font-medium text-gray-400">{opt.coin} · {opt.network}</div>
                  </button>
                );
              })}
              <button type="button" onClick={() => setSelectedCoin('CASHAPP')}
                style={selectedCoin === 'CASHAPP' ? { borderColor: CASHAPP_COLOR, boxShadow: `0 0 0 3px ${CASHAPP_COLOR}26, 0 6px 16px ${CASHAPP_COLOR}40` } : undefined}
                className={`w-[104px] flex flex-col items-center justify-center gap-2 px-3 py-4 rounded-xl border-2 bg-white transition-all ${selectedCoin === 'CASHAPP' ? 'scale-[1.03]' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'}`}>
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-white text-2xl font-extrabold drop-shadow-sm" style={{ backgroundColor: CASHAPP_COLOR }}>$</div>
                <div className="text-sm font-bold leading-tight" style={{ color: CASHAPP_COLOR }}>Cash App</div>
                <div className="text-[11px] font-medium text-gray-400">$Cashtag</div>
              </button>
            </div>
            {selectedCoin === 'CASHAPP' && WALLET.CASHAPP && (
              <div className="mt-5 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-sm font-medium text-gray-600 mb-2">Send <strong className="text-gray-900">exactly ${total.toFixed(2)}</strong> via Cash App to this $Cashtag:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-mono text-gray-800 break-all">{WALLET.CASHAPP}</code>
                  <button type="button" onClick={copyAddress} className="shrink-0 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium">
                    {copied ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  ⚠️ Open Cash App and send <strong>exactly ${total.toFixed(2)}</strong> (the order total) to {WALLET.CASHAPP}. Then upload your payment screenshot below.
                </p>
              </div>
            )}
            {selectedCoin && selectedCoin !== 'CASHAPP' && WALLET[selectedCoin] && (
              <div className="mt-5 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-sm font-medium text-gray-600 mb-2">Send <strong className="text-gray-900">${total.toFixed(2)} USD in {selectedCoin}</strong> to this address:</p>
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
            {selectedCoin && !COINS.some(c => c.coin === selectedCoin) && (
              <p className="mt-4 text-sm font-bold text-white bg-red-600 border border-red-700 rounded-lg p-4">
                ⚠️ WARNING: Do NOT include the word &lsquo;peptide&rsquo; or any product names in your payment note. Orders with flagged payment notes will be immediately cancelled.
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
            {submitting ? 'Placing Order...' : `Place Order — $${total.toFixed(2)}`}
          </button>
          <p className="text-center text-xs text-gray-400">All products sold for research purposes only. Not for human consumption.</p>
        </form>
      </div>
    </div>
  );
}
