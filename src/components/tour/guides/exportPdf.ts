import type { Guide } from './types'

export const exportPdfGuide: Guide = {
  id: 'export-pdf',
  title: 'Export & PDF guide',
  description: 'Download a client-ready PDF from a saved procurement assessment.',
  estimatedMinutes: 1,
  routePrefixes: ['/procurement/assessments'],
  steps: [
    {
      id: 'export-intro',
      phase: 'Export',
      title: 'Share your results',
      body: 'Once a procurement assessment is saved, you can download a formatted PDF report to share with clients or internal stakeholders.',
      target: 'scorecard-workspace',
      placement: 'bottom',
      mode: 'info',
      requiredPath: '/procurement/assessments',
    },
    {
      id: 'export-button',
      phase: 'Export',
      title: 'Download PDF',
      body: 'Click Download PDF to generate a client-ready report with procurement points, REAP level, and category breakdown.',
      hint: 'Click the button to download your report.',
      target: 'scorecard-export',
      placement: 'bottom',
      mode: 'action',
      advanceOn: 'click',
      requiredPath: '/procurement/assessments',
    },
    {
      id: 'export-tips',
      phase: 'Tips',
      title: 'PDF tips',
      body: 'The PDF includes your company name, assessment year, and full score summary. Open the full report view for an on-screen version before exporting.',
      placement: 'center',
      mode: 'info',
    },
    {
      id: 'finish',
      phase: 'Complete',
      title: 'Export guide complete',
      body: 'You know how to download PDF reports. Use Need help? anytime for other guides.',
      placement: 'center',
      mode: 'info',
    },
  ],
}
