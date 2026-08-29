import type { MetadataRoute } from 'next'
import { supabase } from '@/lib/supabase'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.certipure.net'

// Rebuild on each request so newly added products appear in the sitemap.
export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  // Static, public marketing/legal pages. Priority tells Google which pages
  // matter most; changeFrequency hints how often to come back and re-check.
  const staticPages: {
    path: string
    priority: number
    changeFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  }[] = [
    { path: '', priority: 1.0, changeFrequency: 'daily' },
    { path: '/shop', priority: 0.9, changeFrequency: 'daily' },
    { path: '/testing', priority: 0.8, changeFrequency: 'weekly' },
    { path: '/about', priority: 0.6, changeFrequency: 'monthly' },
    { path: '/contact', priority: 0.5, changeFrequency: 'monthly' },
    { path: '/disclaimers', priority: 0.3, changeFrequency: 'yearly' },
    { path: '/privacy', priority: 0.2, changeFrequency: 'yearly' },
    { path: '/terms', priority: 0.2, changeFrequency: 'yearly' },
  ]

  const staticEntries: MetadataRoute.Sitemap = staticPages.map((p) => ({
    url: `${SITE_URL}${p.path}`,
    lastModified: now,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
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
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))

  return [...staticEntries, ...productEntries]
}
