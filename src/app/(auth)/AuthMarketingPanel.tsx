import { LevelLadder } from '@/components/ui/LevelLadder'

/**
 * Right-hand panel on sign-in, sign-up and password pages: what the app does,
 * in three plain steps. No figures: an invented "84.6%" told a first-time user
 * nothing and could be mistaken for real data.
 */
export function AuthMarketingPanel() {
  const steps = [
    { title: 'Add the company', body: 'Only its name is needed to begin.' },
    {
      title: 'Choose what to work out',
      body: 'A full B-BBEE scorecard from the REAP workbook, or procurement only from the supplier list.',
    },
    { title: 'Check, calculate and report', body: 'See the level and points, what held them back, and print the report.' },
  ]
  return (
    <div className="relative hidden flex-1 items-center justify-center bg-sidebar px-12 py-14 lg:flex">
      <div className="w-full max-w-[30rem] space-y-8 text-sidebar-ink">
        <div className="space-y-3">
          <p className="text-[15px] text-sidebar-muted">REAP Scorecard</p>
          <h2 className="font-serif text-4xl font-semibold leading-tight text-white">B-BBEE scorecards without the spreadsheet maths.</h2>
          <p className="text-base">
            Upload a client’s workbook or supplier list. The app works out the points and the level using the Generic Codes,
            and shows exactly why.
          </p>
        </div>
        <ol className="space-y-4">
          {steps.map((step, index) => (
            <li key={step.title} className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface/10 text-[15px] font-semibold text-white">
                {index + 1}
              </span>
              <span>
                <span className="block text-base font-semibold text-white">{step.title}</span>
                <span className="block text-[15px]">{step.body}</span>
              </span>
            </li>
          ))}
        </ol>
        <div className="rounded-card bg-surface p-5">
          <p className="pb-3 text-[15px] text-muted">The result is a B-BBEE level from 1 (best) to 8, or Non-compliant.</p>
          <LevelLadder level="Level 4" />
        </div>
      </div>
    </div>
  )
}
