import type { MetadataRoute } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://certipure.net'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Keep private and transactional routes out of search results. These
      // pages have no value in Google and crawling them wastes the limited
      // budget Google spends on the site, which slows down indexing of the
      // pages that DO matter (homepage, shop, product pages).
      disallow: [
        '/admin/',
        '/api/',
        '/cart',
        '/checkout',
        '/account/',
        '/order-confirmed/',
        '/invoice/',
        '/auth/',
        '/handoff',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
