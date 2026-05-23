import type { LucideIcon } from 'lucide-react'
import { BookOpen, Handshake, MessageCircle, Sparkles, UsersRound } from 'lucide-react'

export type TrainingProgram = {
  slug: string
  title: string
  description: string
  format: string
  audience: string
}

export type TrainingCategory = {
  id: string
  name: string
  overview: string
  programs: TrainingProgram[]
}

export const trainingCategories: TrainingCategory[] = [
  {
    id: 'core-training-programs',
    name: 'Core Training Programs',
    overview:
      'Foundational programmes for practitioners and leaders who need a clear, practical grasp of the Codes, ESD, and transformation—before initiatives go to verification.',
    programs: [
      {
        slug: 'bbbee-codes',
        title: 'Understanding the B-BBEE Codes',
        description:
          'A practical overview of the amended B-BBEE Codes, how scorecards work, and what drives points in real organisations.',
        format: 'Executive session',
        audience: 'EXCO, transformation & compliance teams',
      },
      {
        slug: 'esd-sessions',
        title: 'Enterprise & Supplier Development Sessions',
        description:
          'Hands-on training on ESD strategy, beneficiary selection, impact tracking, and evidence requirements.',
        format: 'Workshop series',
        audience: 'ESD owners, procurement & supplier teams',
      },
      {
        slug: 'corporate-identity',
        title: 'Transformation / Corporate Identity',
        description:
          'Training focused on positioning transformation as a business advantage and embedding it into organisational culture.',
        format: 'Leadership programme',
        audience: 'Leadership & internal communications',
      },
    ],
  },
  {
    id: 'workshops-coaching',
    name: 'Workshops & Coaching',
    overview:
      'Tailored workshops and ongoing coaching to align transformation with your strategy and keep teams on track throughout the year.',
    programs: [
      {
        slug: 'tailor-made-workshops',
        title: 'Tailor-Made Workshops (Leadership / Teams)',
        description:
          "Custom workshops designed around your organisation's priorities, gaps, and industry context.",
        format: 'Custom workshop',
        audience: 'Leadership, functional teams',
      },
      {
        slug: 'coaching-enablement',
        title: 'Coaching & Enablement',
        description:
          'Ongoing coaching to help teams implement initiatives correctly and maintain momentum throughout the year.',
        format: 'Ongoing enablement',
        audience: 'Transformation & programme owners',
      },
    ],
  },
]

export const TRAINING_PROGRAM_ICONS: Record<string, LucideIcon> = {
  'bbbee-codes': BookOpen,
  'esd-sessions': Handshake,
  'corporate-identity': Sparkles,
  'tailor-made-workshops': UsersRound,
  'coaching-enablement': MessageCircle,
}

/** Shape expected by header mega-menu */
export const trainingDropdown = {
  categories: trainingCategories.map((cat) => ({
    name: cat.name,
    services: cat.programs.map((p) => ({ title: p.title, description: p.description })),
  })),
}

export function getTrainingProgramPath(slug: string): string {
  return `/training#program-${slug}`
}
