import { supabase } from '@/lib/supabase'
import CoaHistory, { type CoaRow } from '@/components/CoaHistory'

export const dynamic = 'force-dynamic'

// Build the COA history: every batch (old + new) as its own row, newest first.
// coas + products are fetched separately and joined in JS so this does not
// depend on a PostgREST foreign-key relationship being present.
async function getCoaHistory(): Promise<CoaRow[]> {
  const [{ data: coas }, { data: products }] = await Promise.all([
    supabase.from('coas').select('*').order('test_date', { ascending: false }),
    supabase
      .from('products')
      .select('id, name, slug, size, unit, is_active')
      .eq('is_active', true),
  ])

  const pmap = new Map((products || []).map((p: any) => [p.id, p]))
  const rows: CoaRow[] = []
  for (const c of coas || []) {
    const p = pmap.get(c.product_id)
    if (!p) continue
    const size =
      c.size ||
      (p.size != null ? `${p.size}${p.unit || ''}` : '')
    rows.push({
      id: c.id,
      product: p.name,
      slug: p.slug,
      size,
      batch: c.batch_number || '',
      date: c.test_date || '',
      net: c.net_content ?? null,
      purity: c.purity ?? null,
      pdf: c.pdf_url ?? null,
    })
  }
  return rows
}

export default async function TestingPage() {
  const rows = await getCoaHistory()

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Page header */}
      <div className="bg-[#0f1540] text-white py-16 px-4 text-center">
        <h1 className="text-3xl font-bold mb-3">Testing &amp; Certifications</h1>
        <p className="text-white/60 text-sm max-w-2xl mx-auto leading-relaxed">
          All CertiPure products undergo independent third-party testing for
          identity, purity, and concentration by accredited analytical
          laboratories. Each batch is evaluated before release so you can
          research with confidence. Every tested batch — current and past — is
          listed below.
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        <CoaHistory rows={rows} />

        {/* COA-on-request section */}
        <div className="mt-12 bg-white border border-gray-200 rounded-2xl p-8 text-center">
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            Certificates of Analysis available upon request
          </h2>
          <p className="text-sm text-gray-500 max-w-xl mx-auto leading-relaxed">
            A Certificate of Analysis (COA) for any product batch is available on
            request. To obtain documentation for a specific item, please contact
            our compliance team at{' '}
            <a
              href="mailto:compliance@certipure.net"
              className="text-[#2d3ca5] font-semibold hover:underline"
            >
              compliance@certipure.net
            </a>
            .
          </p>
        </div>
      </div>
    </main>
  )
}
