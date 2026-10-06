import Link from 'next/link'
import { HelpGuideButtons } from '@/components/tour/HelpGuideButtons'
import { SettingsPanel, SettingsSection } from '@/components/settings/SettingsPanel'
import { GLOSSARY } from '@/lib/glossary'

export const metadata = { title: 'Help' }

const STEPS = [
  {
    title: 'Start',
    body: (
      <>
        Press <strong>Start new</strong> at the top of the menu. Choose a full B-BBEE scorecard or procurement only, then
        choose the company (or add it: only its name is needed).
      </>
    ),
  },
  {
    title: 'Full scorecard: upload the workbook',
    body: 'Upload the client’s REAP Generic Scorecard workbook. The app reads it and shows what it found; nothing is saved until you confirm.',
  },
  {
    title: 'Full scorecard: fill in the areas',
    body: 'The overview shows each of the seven areas with its points and the one thing still missing, if any. Follow the links to fill the gaps and confirm evidence.',
  },
  {
    title: 'Procurement: suppliers, checks, then total spend',
    body: 'Upload the supplier list (Excel or CSV, or start from the template) or add suppliers by hand. Fix anything under Needs attention, such as expired certificates, then confirm the total spend. The score, out of 25 plus 2 bonus points, updates as you go.',
  },
  {
    title: 'Calculate and report',
    body: 'Press Calculate. The result shows the level, the points per area and anything that held the level back. Open the report to print it or save it as a PDF.',
  },
]

export default function HelpCenterPage() {
  return (
    <SettingsPanel title="Help" description="How to get from a new company to a finished scorecard, and what the B-BBEE words mean.">
      <div className="space-y-6">
        <SettingsSection title="From start to finished scorecard">
          <ol className="space-y-4">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-3 text-[15px]">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-soft font-semibold text-brand">
                  {index + 1}
                </span>
                <span>
                  <span className="block font-semibold text-ink">{step.title}</span>
                  <span className="block text-muted">{step.body}</span>
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-[15px] text-muted">
            <strong className="text-ink">How the two fit together:</strong> procurement is one of the seven areas of the full
            scorecard. Do it on its own when you only need the supplier score, or attach it to the full scorecard (on its
            Preferential procurement element) to count towards the level.
          </p>
          <p className="mt-3">
            <Link href="/start" className="text-[15px] font-semibold text-brand hover:underline">
              Start new
            </Link>
          </p>
        </SettingsSection>

        <SettingsSection title="Guided tours">
          <HelpGuideButtons />
        </SettingsSection>

        <SettingsSection title="B-BBEE words explained">
          <dl className="divide-y divide-line rounded-control border border-line">
            {Object.values(GLOSSARY).map((entry) => (
              <div key={entry.term} className="px-4 py-3 text-[15px]">
                <dt className="font-semibold text-ink">{entry.term}</dt>
                <dd className="text-muted">{entry.meaning}</dd>
              </div>
            ))}
          </dl>
        </SettingsSection>

        <SettingsSection title="Getting help">
          <p className="text-[15px] text-muted">
            For access problems or questions about a result, contact REAP Solutions or the administrator who gave you access.
            The <Link href="/dashboard/activity" className="font-semibold text-brand hover:underline">activity log</Link> shows
            who changed what and when.
          </p>
        </SettingsSection>
      </div>
    </SettingsPanel>
  )
}
