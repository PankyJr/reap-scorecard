import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/seo/site'
import { isDemoInstance } from '@/lib/demo/demoMode'

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

  // The demonstration deployment asks every crawler to stay out entirely, and
  // publishes no sitemap. This is belt-and-braces alongside the `noindex`
  // directive in the root layout, which is the control that does the real work
  // once the URL has been linked from somewhere.
  if (isDemoInstance()) {
    return {
      rules: {
        userAgent: '*',
        disallow: '/',
      },
    }
  }

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
