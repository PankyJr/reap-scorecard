import type { LucideIcon } from 'lucide-react'
import { ClipboardCheck, FileDown, LineChart, Shield, Users } from 'lucide-react'

export const SCORECARD_WORKFLOW_STEPS = [
  { id: 'upload', label: 'Upload workbook', description: 'Import supplier procurement data from Excel.' },
  { id: 'map', label: 'Map columns', description: 'Match fields to supplier name, spend, and B-BBEE level.' },
  { id: 'tmps', label: 'TMPS denominator', description: 'Choose the correct total measured procurement spend basis.' },
  { id: 'preview', label: 'Preview scorecard', description: 'Review points, recognition levels, and portfolio totals.' },
  { id: 'export', label: 'Export reports', description: 'Generate PDF outputs for EXCO and client review.' },
] as const

export type ScorecardCapability = {
  title: string
  description: string
  icon: LucideIcon
}

export const SCORECARD_CAPABILITIES: ScorecardCapability[] = [
  {
    title: 'Structured assessments',
    description:
      'Guided procurement assessments with clear inputs, saved runs, and outputs your team can repeat each cycle.',
    icon: ClipboardCheck,
  },
  {
    title: 'Trends you can defend',
    description:
      'Portfolio views and score analytics built for leadership reviews—not spreadsheet archaeology.',
    icon: LineChart,
  },
  {
    title: 'Professional exports',
    description:
      'PDF and workbook exports aligned to how you already present to forums, EXCO, and partners.',
    icon: FileDown,
  },
]

export const SCORECARD_AUDIENCE = [
  {
    title: 'Transformation & procurement teams',
    description: 'Run assessments, track suppliers, and keep evidence in one workspace.',
    icon: Users,
  },
  {
    title: 'Advisory & client delivery',
    description: 'Produce consistent, client-ready scorecard views without rebuilding models each engagement.',
    icon: Shield,
  },
] as const
