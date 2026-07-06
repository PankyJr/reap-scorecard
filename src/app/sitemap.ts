import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/seo/site'

const PUBLIC_ROUTES = [
  { path: '/', priority: 1, changeFrequency: 'weekly' as const },
  { path: '/about', priority: 0.8, changeFrequency: 'monthly' as const },
  { path: '/solutions', priority: 0.9, changeFrequency: 'monthly' as const },
  { path: '/scorecard', priority: 0.9, changeFrequency: 'monthly' as const },
  { path: '/services/bbbee-strategy', priority: 0.85, changeFrequency: 'monthly' as const },
  { path: '/services/ownership-advisory', priority: 0.85, changeFrequency: 'monthly' as const },
  { path: '/services/enterprise-supplier-development', priority: 0.85, changeFrequency: 'monthly' as const },
  { path: '/services/skills-planning', priority: 0.85, changeFrequency: 'monthly' as const },
  { path: '/training', priority: 0.8, changeFrequency: 'monthly' as const },
  { path: '/contact', priority: 0.85, changeFrequency: 'monthly' as const },
  { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' as const },
  { path: '/terms', priority: 0.3, changeFrequency: 'yearly' as const },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl()
  const now = new Date()
  return PUBLIC_ROUTES.map(({ path, priority, changeFrequency }) => ({
    url: `${siteUrl}${path === '/' ? '' : path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }))
}
