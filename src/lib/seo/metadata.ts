import type { Metadata } from 'next'
import { DEFAULT_SITE_DESCRIPTION, getSiteUrl, SITE_NAME } from '@/lib/seo/site'

type MarketingMetadataInput = {
  title: string
  description?: string
  path: `/${string}` | '/'
  keywords?: string[]
  /** Use for home page to avoid title template duplication */
  absoluteTitle?: boolean
}

export function buildMarketingMetadata({
  title,
  description = DEFAULT_SITE_DESCRIPTION,
  path,
  keywords,
  absoluteTitle = false,
}: MarketingMetadataInput): Metadata {
  const url = `${getSiteUrl()}${path === '/' ? '' : path}`

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    ...(keywords?.length ? { keywords } : {}),
    alternates: {
      canonical: path,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: 'en_ZA',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export const PRIVATE_APP_ROBOTS: Metadata['robots'] = {
  index: false,
  follow: false,
  googleBot: { index: false, follow: false },
}
