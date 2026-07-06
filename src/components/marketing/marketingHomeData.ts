import { REAP_TAGLINE } from '@/components/marketing/marketingBrandData'

export const HOME_INTRO = {
  eyebrow: REAP_TAGLINE,
  headline: 'B-BBEE transformation advisory—',
  headlineAccent: 'grounded in evidence, built for business.',
  body:
    'REAP Solutions is a specialist enterprise of B-BBEE experts in South Africa. We partner with organisations on strategy, ownership, supplier development, and skills—then support delivery with training and REAP Scorecard, our platform for procurement evidence, TMPS, points, and client-ready reporting.',
} as const

export const HOME_PILLARS = [
  {
    title: 'Transformation advisory',
    description:
      'Strategy, ownership transactions, enterprise & supplier development, and skills planning—aligned to your scorecard and commercial goals.',
    href: '/solutions',
    cta: 'Our solutions',
  },
  {
    title: 'Training & coaching',
    description:
      'Executive and team programmes on the Codes, ESD, and transformation leadership—so capability stays in your organisation.',
    href: '/training',
    cta: 'Training programmes',
  },
  {
    title: 'REAP Scorecard',
    description:
      'Upload supplier workbooks, map fields, confirm TMPS, preview procurement points, and export professional PDF reports.',
    href: '/scorecard',
    cta: 'Explore the platform',
  },
] as const
