import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

async function getCOAs() {
  const { data } = await supabase.from('coas').select('*, product:products(name, slug, size, unit)').order('test_date', { ascending: false })
  return data || []
}

export default async function TestingPage() {
  const coas = await getCOAs()

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-[#0f1540] text-white py-16 px-4 text-center">
        <h1 className="text-3xl font-bold mb-3">Third-Party Testing Results</h1>
        <p className="text-white/50 text-sm max-w-xl mx-auto">Every batch independently tested. Full Certificates of Analysis published for complete transparency.</p>
      </div>
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
                <th className="px-5 py-3 font-semibold">Product</th>
                <th className="px-5 py-3 font-semibold">Batch #</th>
                <th className="px-5 py-3 font-semibold">Purity</th>
                <th className="px-5 py-3 font-semibold">Date</th>
                <th className="px-5 py-3 font-semibold">Endotoxins</th>
              </tr>
            </thead>
            <tbody>
              {coas.map((coa: any) => (
                <tr key={coa.id} className="border-t border-gray-100 hover:bg-gray-50 transition">
                  <td className="px-5 py-3.5 font-semibold">
                    <Link href={`/product/${coa.product?.slug}`} className="hover:text-[#2d3ca5] transition">{coa.product?.name}</Link>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs text-gray-500">{coa.batch_number}</td>
                  <td className="px-5 py-3.5 text-green-600 font-bold">{coa.purity_percent}%</td>
                  <td className="px-5 py-3.5 text-gray-500">{new Date(coa.test_date).toLocaleDateString()}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${coa.endotoxins_pass ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                      {coa.endotoxins_pass ? 'Pass' : 'Fail'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}