import Link from 'next/link'

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="bg-gray-50 border-b py-16 px-4 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">About CertiPure</h1>
        <p className="text-gray-500 text-sm max-w-xl mx-auto">A U.S.-based research peptide supplier built on a simple promise: the highest purity, backed by real data.</p>
      </div>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Story</h2>
        <p className="text-gray-600 text-sm leading-relaxed mb-4">CertiPure was founded with a single frustration in mind: too many peptide suppliers treat quality as an afterthought. Researchers were left guessing about purity, waiting weeks for Certificates of Analysis, or never receiving them at all.</p>
        <p className="text-gray-600 text-sm leading-relaxed mb-4">We set out to do things differently. Every product on our site ships with a publicly available COA from an independent, third-party lab.</p>
        <p className="text-gray-600 text-sm leading-relaxed mb-10">Based in the United States, we focus on fast domestic shipping, responsive customer support, and a curated catalog of the most in-demand research compounds.</p>
        <div className="bg-[#0f1540] text-white rounded-2xl p-8 mb-10">
          <h2 className="text-xl font-bold mb-3">Our Mission</h2>
          <p className="text-white/70 text-sm leading-relaxed">To provide researchers with the highest-quality peptides available, backed by transparent third-party testing, fast U.S. shipping, and genuine customer support.</p>
        </div>
        <div className="text-center bg-gray-50 border border-gray-200 rounded-2xl p-8">
          <h3 className="font-bold text-lg mb-2">Ready to see our products?</h3>
          <Link href="/shop" className="inline-block bg-[#2d3ca5] text-white font-semibold text-sm px-8 py-3 rounded-full hover:bg-[#232f82] transition">Shop Peptides</Link>
        </div>
      </div>
    </main>
  )
}