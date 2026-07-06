import { REAP_TAGLINE } from '@/components/marketing/marketingBrandData'

export { REAP_TAGLINE }

export const ABOUT_HERO = {
  eyebrow: 'About REAP Solutions',
  title: 'Pleased to meet you.',
  description:
    `${REAP_TAGLINE} — we help organisations across South Africa turn B-BBEE from compliance into a commercially sound transformation programme.`,
} as const

export const ABOUT_INTRO_PARAGRAPHS = [
  'REAP Solutions is a specialist enterprise of B-BBEE experts based in South Africa. We partner with organisations to implement sustainable transformation solutions, translating business strategy into a transformation model that works for internal teams, verification, and stakeholders.',
  'Our team brings more than 20 years of combined experience across commercial law, financial management, taxation, human resources, training, and sales—so advice is practical, defensible, and aligned to how your business actually operates.',
  'We are committed to educating the market on the social and commercial advantages of economic transformation, with programmes that build lasting capability inside your organisation.',
] as const

export const ABOUT_CORE_SERVICES = [
  'B-BBEE strategy development',
  'Advisory services on ownership transactions',
  'Ownership analysis',
  'B-BBEE training and coaching',
  'Facilitation of skills planning and implementation',
  'Enterprise and Supplier Development solutions',
] as const

export const ABOUT_EDUCATION_PROGRAMS = [
  'Understanding the B-BBEE Codes',
  'Enterprise and Supplier Development Sessions',
  'Transformation / Corporate Identity',
] as const

export const FOUNDER_BIO = {
  name: 'Tshepo Mokoena',
  role: 'Managing Consultant & Founder',
  initials: 'TM',
} as const

export type MarketingTeamMember = {
  name: string
  role: string
  /** Omit until a real headshot is available — initials placeholder is shown instead */
  imageSrc?: string
  initials?: string
  href?: string
}

/** Practice-area cards (no individual photos yet). Add imageSrc when headshots arrive. */
export const MARKETING_PRACTICE_MEMBERS: MarketingTeamMember[] = [
  {
    name: 'Ownership Advisory',
    role: 'Transaction structuring & compliance',
    initials: 'OA',
    href: '/services/ownership-advisory',
  },
  {
    name: 'Enterprise & Supplier Development',
    role: 'Programme design & supplier mapping',
    initials: 'ES',
    href: '/services/enterprise-supplier-development',
  },
  {
    name: 'Skills Planning',
    role: 'Workplace skills plans & implementation',
    initials: 'SP',
    href: '/services/skills-planning',
  },
  {
    name: 'Training & Coaching',
    role: 'B-BBEE workshops and capability building',
    initials: 'TC',
    href: '/training',
  },
]

/** Home page carousel: founder + practice areas — add imageSrc per member when headshots arrive */
export const MARKETING_TEAM_MEMBERS: MarketingTeamMember[] = [
  {
    name: FOUNDER_BIO.name,
    role: FOUNDER_BIO.role,
    initials: FOUNDER_BIO.initials,
    href: '/about#team',
  },
  ...MARKETING_PRACTICE_MEMBERS,
]

export const FEATURED_TEAM_MEMBER = MARKETING_TEAM_MEMBERS[0]
