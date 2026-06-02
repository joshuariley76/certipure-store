import type { MetadataRoute } from 'next'
import { supabase } from '@/lib/supabase'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://certipure.net'

// Rebuild on each request so newly added products appear in the sitemap.
export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  // Static, public marketing/legal pages.
  const staticPaths = ['', '/shop', '/testing', '/about', '/contact', '/privacy', '/terms']
  const staticEntries: MetadataRoute.Sitemap = staticPaths.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
  }))

  // Every active product's detail page.
  const { data: products } = await supabase
    .from('products')
    .select('slug')
    .eq('is_active', true)

  const productEntries: MetadataRoute.Sitemap = (products || [])
    .filter((p) => p.slug)
    .map((p) => ({
      url: `${SITE_URL}/product/${p.slug}`,
      lastModified: now,
    }))

  return [...staticEntries, ...productEntries]
}
