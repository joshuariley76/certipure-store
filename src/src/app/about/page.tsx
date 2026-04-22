import Link from 'next/link'

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gray-50 border-b py-16 px-4 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>About CertiPure</h1>
        <p className="text-gray-500 text-sm max-w-xl mx-auto">A U.S.-based research peptide supplier built on a simple promise: the highest purity, backed by real data.</p>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Our Story */}
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Story</h2>
        <p className="text-gray-600 text-sm leading-relaxed mb-4">
          CertiPure was founded with a single frustration in mind: too many peptide suppliers treat quality as an afterthought. Researchers were left guessing about purity, waiting weeks for Certificates of Analysis, or never receiving them at all.
        </p>
        <p className="text-gray-600 text-sm leading-relaxed mb-4">
          We set out to do things differently. Every product on our site ships with a publicly available COA from an independent, third-party lab. Our peptides are synthesized under strict quality controls and verified via HPLC and mass spectrometry before they ever reach a customer.
        </p>
        <p className="text-gray-600 text-sm leading-relaxed mb-10">
          Based in the United States, we focus on fast domestic shipping, responsive customer support, and a curated catalog of the most in-demand research compounds. We are not trying to list thousands of SKUs. We would rather do fewer things exceptionally well.
        </p>

        {/* Mission */}
        <div className="bg-[#0f1540] text-white rounded-2xl p-8 mb-10">
          <h2 className="text-xl font-bold mb-3">Our Mission</h2>
          <p className="text-white/70 text-sm leading-relaxed">
            To provide researchers with the highest-quality peptides available, backed by transparent third-party testing, fast U.S. shipping, and genuine customer support. No guesswork, no compromises.
          </p>
        </div>

        {/* Values */}
        <h2 className="text-2xl font-bold text-gray-900 mb-6">What We Stand For</h2>
        <div className="grid md:grid-cols-3 gap-6 mb-10">
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-[#2d3ca5]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <h3 className="font-bold text-base mb-2">Purity</h3>
            <p className="text-gray-500 text-sm leading-relaxed">Every peptide undergoes rigorous HPLC testing to verify identity and purity. We never cut corners on synthesis quality.</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-[#2d3ca5]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
            </div>
            <h3 className="font-bold text-base mb-2">Transparency</h3>
            <p className="text-gray-500 text-sm leading-relaxed">Full Certificates of Analysis are published for every batch. We believe researchers deserve complete visibility into what they receive.</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-[#2d3ca5]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
            </div>
            <h3 className="font-bold text-base mb-2">Quality</h3>
            <p className="text-gray-500 text-sm leading-relaxed">From raw materials to final lyophilized product, we maintain strict quality controls that meet or exceed industry standards.</p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center bg-gray-50 border border-gray-200 rounded-2xl p-8">
          <h3 className="font-bold text-lg mb-2">Ready to see our products?</h3>
          <p className="text-gray-400 text-sm mb-4">Browse our catalog of third-party tested research peptides.</p>
          <Link href="/shop" className="inline-block bg-[#2d3ca5] text-white font-semibold text-sm px-8 py-3 rounded-full hover:bg-[#232f82] transition">
            Shop Peptides
          </Link>
        </div>
      </div>
    </main>
  )
}
