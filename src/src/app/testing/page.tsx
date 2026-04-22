import { supabase } from '@/lib/supabase'
import Link from 'next/link'

async function getCOAs() {
  const { data } = await supabase
    .from('coas')
    .select('*, product:products(name, slug, size, unit)')
    .order('test_date', { ascending: false })
  return data || []
}

export default async function TestingPage() {
  const coas = await getCOAs()

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-[#0f1540] text-white py-16 px-4 text-center relative overflow-hidden">
        <div className="absolute top-[-80px] right-[-80px] w-[300px] h-[300px] bg-[#2d3ca5] opacity-15 rounded-full" />
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>Third-Party Testing Results</h1>
          <p className="text-white/50 text-sm max-w-xl mx-auto">Every batch independently tested. Full Certificates of Analysis published for complete transparency. Click any COA to view the full report.</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Test badges */}
        <div className="flex justify-center gap-8 mb-10 flex-wrap">
          {['Purity (HPLC)', 'Net Weight', 'Sterility', 'Endotoxins (LAL)'].map(t => (
            <div key={t} className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
              </div>
              {t}
            </div>
          ))}
        </div>

        {/* Results table */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-5 py-3 font-semibold">Product</th>
                  <th className="px-5 py-3 font-semibold">Size</th>
                  <th className="px-5 py-3 font-semibold">Batch #</th>
                  <th className="px-5 py-3 font-semibold">Purity</th>
                  <th className="px-5 py-3 font-semibold">Net Content</th>
                  <th className="px-5 py-3 font-semibold">Endotoxins</th>
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 font-semibold">Vials</th>
                  <th className="px-5 py-3 font-semibold text-right">COA</th>
                </tr>
              </thead>
              <tbody>
                {coas.map((coa: any) => (
                  <tr key={coa.id} className="border-t border-gray-100 hover:bg-gray-50 transition">
                    <td className="px-5 py-3.5 font-semibold">
                      <Link href={`/product/${coa.product?.slug}`} className="hover:text-[#2d3ca5] transition">
                        {coa.product?.name || 'Product'}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500">{coa.product?.size}{coa.product?.unit}</td>
                    <td className="px-5 py-3.5 font-mono text-xs text-gray-500">{coa.batch_number}</td>
                    <td className="px-5 py-3.5 text-green-600 font-bold">{coa.purity_percent}%</td>
                    <td className="px-5 py-3.5 text-gray-700">{coa.net_content_mg}mg</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${coa.endotoxins_pass ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                        {coa.endotoxins_pass ? 'Pass' : 'Fail'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500">{new Date(coa.test_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                    <td className="px-5 py-3.5 text-gray-500">{coa.vials_tested}</td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="text-[#2d3ca5] font-semibold text-xs cursor-pointer hover:underline">View COA</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">All results are from independent third-party testing. Lab noted on each certificate of analysis (COA).</p>
      </div>
    </main>
  )
}
