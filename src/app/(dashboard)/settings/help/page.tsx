import Link from 'next/link'
import { SettingsPanel } from '@/components/settings/SettingsPanel'
import { HelpCentre } from '@/components/help/HelpCentre'

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

/** The Help centre: search, tours, guides by page, glossary A–Z and questions by topic (components/help/HelpCentre). */
export default function HelpCenterPage() {
  return (
    <SettingsPanel title="Help centre" description="Search everything, take a guided tour, or look up a B-BBEE word.">
      <HelpCentre
        steps={
          <>
            <ol className="space-y-4">
              {STEPS.map((step, index) => (
                <li key={step.title} className="flex gap-3 text-body">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-segment text-caps font-semibold tabular-nums text-label">
                    {index + 1}
                  </span>
                  <span>
                    <span className="block font-medium text-ink">{step.title}</span>
                    <span className="block text-meta text-label">{step.body}</span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-meta text-label">
              <span className="font-medium text-ink">How the two fit together:</span> procurement is one of the seven areas of the full scorecard. Do
              it on its own when you only need the supplier score, or attach it to the full scorecard (on its Procurement area) to count towards the
              level.
            </p>
            <p className="mt-3">
              <Link href="/start" className="-my-3 inline-flex min-h-11 items-center text-body font-medium text-teal hover:underline sm:my-0 sm:min-h-0">
                Start new
              </Link>
            </p>
          </>
        }
      />
    </SettingsPanel>
  )
}
