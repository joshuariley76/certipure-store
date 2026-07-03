'use client'

// Professional, row-based payment method picker shared by the checkout and the
// invoice pay page. Renders one row per method (Card / Crypto / Cash App / Link)
// with real brand logos; expands to show the coin picker + receiving address
// for crypto and Cash App. The parent owns `selectedCoin` and the submit flow.
import { useState } from 'react'

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
const isCoin = (v: string) => COINS.some((c) => c.coin === v)

// --- Brand logos (inline SVG, self-contained) --------------------------------
function VisaLogo({ className = 'h-6 w-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 32" className={className} aria-label="Visa">
      <rect width="48" height="32" rx="4" fill="#fff" stroke="#e5e7eb" />
      <text x="24" y="22" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontWeight="800" fontStyle="italic" fontSize="14" fill="#1434CB" letterSpacing="0.5">VISA</text>
    </svg>
  )
}
function MastercardLogo({ className = 'h-6 w-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 32" className={className} aria-label="Mastercard">
      <rect width="48" height="32" rx="4" fill="#fff" stroke="#e5e7eb" />
      <circle cx="20" cy="16" r="8" fill="#EB001B" />
      <circle cx="28" cy="16" r="8" fill="#F79E1B" fillOpacity="0.9" />
    </svg>
  )
}
function CashAppLogo({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-label="Cash App">
      <rect width="40" height="40" rx="9" fill="#00D632" />
      <text x="20" y="21" textAnchor="middle" dominantBaseline="central" fontFamily="Arial" fontWeight="800" fontSize="22" fill="#fff">$</text>
    </svg>
  )
}
function LinkLogo({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-label="Link">
      <rect width="40" height="40" rx="9" fill="#e5e7eb" />
      <path d="M12 26V15m0 11h4m10 0V15m0 11h-4M14 14h12M13 20h14" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  )
}
function CoinIcon({ coin, className = 'w-8 h-8' }: { coin: string; className?: string }) {
  const c = COINS.find((x) => x.coin === coin)
  if (!c) return null
  if (coin === 'ETH')
    return (
      <svg viewBox="0 0 256 417" className={className} aria-hidden="true">
        <polygon fill="#627EEA" fillOpacity="0.6" points="127.96 0 125.17 9.5 125.17 285.17 127.96 287.96 255.92 212.32" />
        <polygon fill="#627EEA" points="127.96 0 0 212.32 127.96 287.96 127.96 154.16" />
        <polygon fill="#627EEA" fillOpacity="0.6" points="127.96 312.19 126.39 314.11 126.39 412.31 127.96 416.91 255.99 236.59" />
        <polygon fill="#627EEA" points="127.96 416.91 127.96 312.19 0 236.59" />
        <polygon fill="#627EEA" fillOpacity="0.2" points="127.96 287.96 255.92 212.32 127.96 154.16" />
        <polygon fill="#627EEA" fillOpacity="0.45" points="0 212.32 127.96 287.96 127.96 154.16" />
      </svg>
    )
  const letter = coin === 'USDC' || coin === 'USDT' ? '$' : coin[0]
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <circle cx="20" cy="20" r="20" fill={c.color} />
      <text x="20" y="21" textAnchor="middle" dominantBaseline="central" fontFamily="Arial" fontWeight="700" fontSize="18" fill="#fff">{letter}</text>
    </svg>
  )
}

function Row({
  active, disabled = false, onClick, logo, title, subtitle, right,
}: {
  active: boolean; disabled?: boolean; onClick?: () => void
  logo: React.ReactNode; title: string; subtitle: string; right?: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      aria-disabled={disabled}
      className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border-2 text-left transition-all ${
        disabled
          ? 'border-gray-200 bg-gray-50 opacity-70 cursor-not-allowed'
          : active
          ? 'border-[#2d3ca5] bg-blue-50/40 shadow-sm'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      <span className={`grid place-items-center h-5 w-5 rounded-full border-2 shrink-0 ${active ? 'border-[#2d3ca5]' : 'border-gray-300'}`}>
        {active && <span className="h-2.5 w-2.5 rounded-full bg-[#2d3ca5]" />}
      </span>
      <span className="shrink-0 flex items-center gap-1">{logo}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-gray-900">{title}</span>
        <span className="block text-xs text-gray-500">{subtitle}</span>
      </span>
      {right && <span className="shrink-0">{right}</span>}
    </button>
  )
}

export default function PaymentSelector({
  total, selectedCoin, onSelectCoin,
}: {
  total: number; selectedCoin: string; onSelectCoin: (v: string) => void
}) {
  const [copied, setCopied] = useState(false)
  const cryptoActive = isCoin(selectedCoin)

  async function copy(value: string) {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-3">
      {/* Card */}
      <Row
        active={selectedCoin === 'PAYRIOX'}
        onClick={() => onSelectCoin('PAYRIOX')}
        logo={<><VisaLogo /><MastercardLogo /></>}
        title="Credit / Debit Card"
        subtitle="Visa & Mastercard — secure card checkout"
      />
      {selectedCoin === 'PAYRIOX' && (
        <div className="ml-1 p-4 bg-blue-50 rounded-xl border border-blue-200">
          <p className="text-sm font-medium text-blue-900">You&rsquo;ll be taken to our secure card page to pay <strong>${total.toFixed(2)}</strong>. Your order confirms automatically once the payment goes through.</p>
        </div>
      )}

      {/* Crypto */}
      <Row
        active={cryptoActive}
        onClick={() => onSelectCoin(cryptoActive ? selectedCoin : 'BTC')}
        logo={<span className="flex -space-x-1"><CoinIcon coin="BTC" className="w-7 h-7" /><CoinIcon coin="ETH" className="w-7 h-7" /></span>}
        title="Cryptocurrency"
        subtitle="Bitcoin, Ethereum, USDT, USDC, Solana"
      />
      {cryptoActive && (
        <div className="ml-1 p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
          <div className="flex flex-wrap gap-2">
            {COINS.map((opt) => {
              const sel = selectedCoin === opt.coin
              return (
                <button key={opt.coin} type="button" onClick={() => onSelectCoin(opt.coin)}
                  style={sel ? { borderColor: opt.color, boxShadow: `0 0 0 3px ${opt.color}22` } : undefined}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 bg-white transition ${sel ? '' : 'border-gray-200 hover:border-gray-300'}`}>
                  <CoinIcon coin={opt.coin} className="w-5 h-5" />
                  <span className="text-xs font-bold" style={{ color: opt.color }}>{opt.coin}</span>
                </button>
              )
            })}
          </div>
          {WALLET[selectedCoin] ? (
            <>
              <p className="text-sm text-gray-600">Send <strong className="text-gray-900">${total.toFixed(2)} USD in {selectedCoin}</strong> to:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-mono break-all">{WALLET[selectedCoin]}</code>
                <button type="button" onClick={() => copy(WALLET[selectedCoin])} className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium">{copied ? '✓' : 'Copy'}</button>
              </div>
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">⚠️ Send the exact USD equivalent at the current rate, then upload your transaction screenshot below.</p>
              <p className="text-xs font-semibold text-white bg-red-600 border border-red-700 rounded-lg p-3">⚠️ Do NOT include the word &lsquo;peptide&rsquo; or any product names in your payment note. Payments with flagged notes will be cancelled.</p>
            </>
          ) : (
            <p className="text-xs text-red-600">No receiving address configured for {selectedCoin} yet.</p>
          )}
        </div>
      )}

      {/* Cash App */}
      <Row
        active={selectedCoin === 'CASHAPP'}
        onClick={() => onSelectCoin('CASHAPP')}
        logo={<CashAppLogo />}
        title="Cash App"
        subtitle="Pay with your $Cashtag"
      />
      {selectedCoin === 'CASHAPP' && (
        <div className="ml-1 p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
          {WALLET.CASHAPP ? (
            <>
              <p className="text-sm text-gray-600">Send <strong className="text-gray-900">exactly ${total.toFixed(2)}</strong> via Cash App to:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-mono break-all">{WALLET.CASHAPP}</code>
                <button type="button" onClick={() => copy(WALLET.CASHAPP)} className="shrink-0 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium">{copied ? '✓' : 'Copy'}</button>
              </div>
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">⚠️ Send exactly ${total.toFixed(2)}, then upload your payment screenshot below.</p>
            </>
          ) : (
            <p className="text-xs text-red-600">No Cash App $Cashtag configured yet.</p>
          )}
        </div>
      )}

      {/* Link — coming soon (placeholder) */}
      <Row
        active={false}
        disabled
        logo={<LinkLogo />}
        title="Link — Bank Transfer"
        subtitle="Same-day secure bank transfer"
        right={<span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-gray-200 text-gray-600 whitespace-nowrap">Coming soon</span>}
      />
    </div>
  )
}
