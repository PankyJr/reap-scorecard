import { MARKETING_CONTACT } from '@/components/marketing/marketingContactData'
import { getSiteUrl, SITE_NAME } from '@/lib/seo/site'

export function MarketingJsonLd() {
  const siteUrl = getSiteUrl()

  const organization = {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    name: SITE_NAME,
    url: siteUrl,
    description:
      'B-BBEE transformation advisory, ownership advisory, enterprise supplier development, skills planning, training, and REAP Scorecard procurement assessments in South Africa.',
    email: MARKETING_CONTACT.email,
    telephone: `+27-${MARKETING_CONTACT.phone.replace(/^0/, '')}`,
    areaServed: {
      '@type': 'Country',
      name: 'South Africa',
    },
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Pretoria',
      addressRegion: 'Gauteng',
      addressCountry: 'ZA',
    },
    sameAs: [
      'https://www.linkedin.com/company/reap-solutions',
      'https://twitter.com/reapsolutions',
    ],
  }

  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: siteUrl,
    inLanguage: 'en-ZA',
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: siteUrl,
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }}
      />
    </>
  )
}
