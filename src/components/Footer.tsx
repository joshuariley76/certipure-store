import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <svg width="28" height="28" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                <circle cx="20" cy="20" r="20" fill="#1a1a2e"/>
                <path d="M25.5 13C23.5 10.8 20.8 9.5 17.8 9.5C12.2 9.5 7.8 14 7.8 20C7.8 26 12.2 30.5 17.8 30.5C20.8 30.5 23.5 29.2 25.5 27" stroke="white" strokeWidth="3.8" strokeLinecap="round" fill="none"/>
              </svg>
              <span className="text-lg font-extrabold text-gray-900">CertiPure</span>
            </div>
            <p className="text-gray-400 text-xs leading-relaxed mb-4">Premium research peptides with 99%+ purity, backed by third-party lab testing.</p>
            <span className="inline-block bg-[#2d3ca5] text-white text-[10px] font-bold tracking-wider px-3 py-1.5 rounded uppercase">For Research Use Only</span>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-4">Shop</h4>
            <ul className="space-y-2.5">
              <li><Link href="/shop" className="text-gray-500 hover:text-[#2d3ca5] text-sm transition">All Peptides</Link></li>
              <li><Link href="/shop" className="text-gray-500 hover:text-[#2d3ca5] text-sm transition">Best Sellers</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-4">Company</h4>
            <ul className="space-y-2.5">
              <li><Link href="/about" className="text-gray-500 hover:text-[#2d3ca5] text-sm transition">About Us</Link></li>
              <li><Link href="/testing" className="text-gray-500 hover:text-[#2d3ca5] text-sm transition">Lab Results</Link></li>
              <li><Link href="/contact" className="text-gray-500 hover:text-[#2d3ca5] text-sm transition">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-4">Support</h4>
            <ul className="space-y-2.5">
              <li><Link href="/contact" className="text-gray-500 hover:text-[#2d3ca5] text-sm transition">FAQ</Link></li>
              <li><Link href="/contact" className="text-gray-500 hover:text-[#2d3ca5] text-sm transition">Shipping</Link></li>
              <li><Link href="/contact" className="text-gray-500 hover:text-[#2d3ca5] text-sm transition">Privacy Policy</Link></li>
              <li><Link href="/contact" className="text-gray-500 hover:text-[#2d3ca5] text-sm transition">Terms</Link></li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-gray-400 text-xs">&copy; 2026 CertiPure. All rights reserved.</p>
          <p className="text-gray-400 text-[11px] text-center sm:text-right max-w-md leading-relaxed">All products are intended strictly for laboratory and research purposes only. Not for human consumption.</p>
        </div>
      </div>
    </footer>
  )
}