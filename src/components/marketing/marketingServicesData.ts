export type MarketingService = {
  slug: string
  title: string
  description: string
  detail: string
  bullets: string[]
  metaDescription: string
}

export const MARKETING_SERVICES: MarketingService[] = [
  {
    slug: 'bbbee-strategy',
    title: 'B-BBEE Strategy & Advisory',
    description:
      'Translate your business strategy into a commercially sound transformation model with measurable outcomes for internal and external stakeholders.',
    detail:
      'We work with leadership and transformation teams to align scorecard targets with commercial priorities—so initiatives are defensible, funded, and ready for verification. Engagements typically cover target setting, initiative design, governance, and verification readiness across the scorecard.',
    bullets: [
      'B-BBEE Strategy Development',
      'Transformation Roadmap & Implementation Support',
      'Ongoing Advisory Support',
    ],
    metaDescription:
      'B-BBEE strategy and transformation advisory for South African businesses—roadmaps, implementation support, and evidence-ready scorecard outcomes.',
  },
  {
    slug: 'ownership-advisory',
    title: 'Ownership Transaction Advisory',
    description:
      'Specialist support on structuring ownership transactions aligned to B-BBEE objectives and commercial realities.',
    detail:
      'From shareholder profiling to funding structures, we help you navigate ownership deals with clarity on B-BBEE impact, risk, and long-term scorecard outcomes. We coordinate with your legal and tax advisors where specialist input is required.',
    bullets: [
      'Advisory on Ownership Transactions',
      'Shareholder Profile & Partner Identification',
      'Funding Model Advisory',
      'Tax, Accounting & Legal Advisory (Associates)',
    ],
    metaDescription:
      'Ownership transaction advisory aligned to B-BBEE objectives—structuring, partner identification, and funding model guidance.',
  },
  {
    slug: 'enterprise-supplier-development',
    title: 'Enterprise & Supplier Development',
    description:
      'Design and implement ESD initiatives that strengthen supplier pipelines and improve scorecard outcomes sustainably.',
    detail:
      'We design ESD and supplier development programmes with clear beneficiaries, measurable impact, and evidence trails that stand up in audits and stakeholder reviews. Focus areas include beneficiary selection, contract structures, and impact reporting.',
    bullets: [
      'ESD Strategy & Solutions',
      'Supplier Development Planning',
      'Enterprise Development Enablement',
    ],
    metaDescription:
      'Enterprise and supplier development (ESD) strategy and implementation—beneficiary selection, planning, and audit-ready evidence.',
  },
  {
    slug: 'skills-planning',
    title: 'Skills Planning & Implementation',
    description:
      'Facilitate skills planning aligned to B-BBEE priorities, ensuring initiatives are actionable and auditable.',
    detail:
      'Skills plans are translated into implementable initiatives—with ownership, budgets, and documentation aligned to what your scorecard and HR teams need. We support facilitation, rollout, and internal coaching so plans do not stall after sign-off.',
    bullets: [
      'Skills Planning Facilitation',
      'Implementation & Evidence Readiness',
      'Coaching for Internal Teams',
    ],
    metaDescription:
      'B-BBEE skills development planning and implementation—facilitation, evidence readiness, and team coaching.',
  },
]

const bySlug = new Map(MARKETING_SERVICES.map((s) => [s.slug, s]))

export function getMarketingService(slug: string): MarketingService | undefined {
  return bySlug.get(slug)
}

export function getMarketingServicePath(slug: string): string {
  return `/services/${slug}`
}
