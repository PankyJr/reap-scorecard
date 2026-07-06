import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/seo/site'

const DISALLOW = [
  '/api/',
  '/admin',
  '/dashboard',
  '/login',
  '/auth/',
  '/reset-password',
  '/companies',
  '/procurement',
  '/scorecards',
  '/scorecard/upload',
  '/settings',
]

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl()
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: DISALLOW,
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}
