/**
 * Page help: ONE file with the help for every signed-in page, keyed by route.
 *
 * Each entry has
 *   purpose   1–2 plain sentences: what this page is for
 *   next      reads data the page ALREADY loaded (passed through <PageHelpData>)
 *             and returns the single most useful next action. Never a new query.
 *   steps     3–6 numbered steps; each targets a real element by its
 *             data-help="…" attribute. The same steps are the page's tour.
 *   terms     glossary keys for the B-BBEE words on the page (lib/glossary.ts)
 *   problems  3–5 "Why is…?" / "What if…?" questions for this page
 *
 * Statements we could not confirm against the B-BBEE codes or the engine are
 * marked TODO-VERIFY (in `todoVerify`, and in a comment by the text).
 *
 * Plain language: write for a consultant who is smart but not a B-BBEE
 * specialist. Say what to do and where, not how the code works.
 */

import type { GlossaryKey } from '@/lib/glossary'

// ─── Types ───────────────────────────────────────────────────────────────────

export type NextAction = { text: string; href: string; label: string }

export type HelpStep = {
  /** Matches data-help="…" on the real element (space-separated lists allowed). */
  target: string
  title: string
  body: string
  /** The user must click the element itself to continue (it usually navigates). */
  action?: boolean
  /** Shown, centred, when the element is not on the page (an empty list, say). */
  missing?: string
}

export type HelpProblem = { id: string; q: string; a: string; link?: { href: string; label: string } }

export type HelpTopic = 'Getting started' | 'Full scorecard' | 'Scorecard areas' | 'Procurement' | 'Account' | 'Client workspace'

export type PageHelpEntry<D = unknown> = {
  /** Next.js route pattern, e.g. /companies/[id]. */
  route: string
  title: string
  topic: HelpTopic
  purpose: string
  next?: (data: D) => NextAction | null
  steps: HelpStep[]
  terms: GlossaryKey[]
  problems: HelpProblem[]
  /** Statements to check with a B-BBEE specialist before relying on them. */
  todoVerify?: string[]
}

/** Typed helper: the data a page passes to <PageHelpData> is checked against `next`. */
function page<D = undefined>(entry: PageHelpEntry<D>): PageHelpEntry<D> {
  return entry
}

// ─── Small helpers for next actions ──────────────────────────────────────────

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`


// ─── Data shapes pages pass in (what each page already has) ──────────────────

export type HomeHelpData = {
  /** pickNextAction(): the same next step Home shows in "Needs you". */
  next: { title: string; body: string; href: string; button: string } | null
}

export type SettingsHelpData = undefined

// ─── Getting started: companies, lists, start, activity ────────────────────

// ─── Data shapes these pages pass in (what each page already has) ────────────

export type CompaniesHelpData = {
  companies: number
  /** The most recently changed company whose latest full scorecard is not finished (selected-areas-only work left out). */
  unfinished: { name: string; next: string; href: string } | null
  /** The most recently changed company with no full scorecard yet. */
  notStarted: { name: string; href: string } | null
}

export type CompanyHelpData = {
  companyId: string
  name: string
  /** False for REAP staff viewing another user's company: they cannot start or edit. */
  isOwner: boolean
  scorecards: number
  hasProcurement: boolean
  /** The most recently changed full scorecard, with its status from fullScorecardStatus(). */
  latestFull: { next: string; href: string; explain: string; finished: boolean } | null
}

export type CompanyNewHelpData = {
  /** The message the form shows when the last save was refused. */
  error: string | null
  /** True when the user came from somewhere that needs a company (they go back there after saving). */
  returning: boolean
}

export type CompanyEditHelpData = {
  companyId: string
  error: string | null
  /** Financial year end, turnover or black ownership is still empty. */
  missingProfile: boolean
}

export type ScorecardsHelpData = {
  total: number
  /** The most recently changed full scorecard that is not finished (selected-areas-only work left out). */
  unfinished: { title: string; next: string; href: string; explain: string } | null
}

export type StartHelpData = {
  /** 'company': "Which company is it for?"; 'need': "What do you need?". */
  step: 'company' | 'need'
  companies: number
  /** Where "Add a company" goes (it comes back to /start afterwards). */
  addHref: string
  company: { id: string; name: string } | null
}

export type ActivityHelpData = {
  entries: number
}

// ─── Entries ─────────────────────────────────────────────────────────────────

const COMPANIES_HELP = {
  companies: page<CompaniesHelpData>({
    route: '/companies',
    title: 'Companies',
    topic: 'Getting started',
    purpose:
      'Every client you score, with its size, where its full scorecard stands and its latest points. Open a company to see and continue all of its work.',
    next: (d) => {
      if (d.companies === 0) {
        return { text: 'Add your first company. Every scorecard is saved under a company.', href: '/companies/new', label: 'Add company' }
      }
      if (d.unfinished) {
        return { text: `${d.unfinished.name}: the full scorecard is not finished yet.`, href: d.unfinished.href, label: d.unfinished.next }
      }
      if (d.notStarted) {
        return { text: `${d.notStarted.name} has no full scorecard yet.`, href: d.notStarted.href, label: 'Start a scorecard' }
      }
      return {
        text: `All ${plural(d.companies, 'company', 'companies')} have a finished full scorecard. Add the next client when you have one.`,
        href: '/companies/new',
        label: 'Add company',
      }
    },
    steps: [
      {
        target: 'companies-add',
        title: 'Add a company',
        body: 'Adds a new client. You need five details: name, industry, financial year end, annual turnover and black ownership.',
      },
      {
        target: 'companies-filter',
        title: 'Filter by status',
        body: 'Show all companies, or only those whose latest full scorecard is In progress, Not final (calculated, but the level is not final yet or something changed since) or Finished. The number shows how many are in each.',
        missing: 'The filter appears once you have at least one company.',
      },
      {
        target: 'companies-list',
        title: 'Your companies',
        body: 'Each row shows the company’s size, the status of its latest full scorecard, its live score and its latest procurement points. Click a row to open the company; click a column heading to sort.',
        missing: 'You have no companies yet. They appear here once you add one.',
      },
    ],
    terms: ['fullScorecard', 'procurementScorecard', 'level', 'eme', 'qse', 'generic'],
    problems: [
      {
        id: 'companies-not-started',
        q: 'Why does a company say “Not started”?',
        a: 'It has no full scorecard yet. A procurement scorecard on its own shows only in the Procurement column. Open the company and press Start a scorecard.',
      },
      {
        id: 'companies-not-final',
        q: 'What do “Not final” and “Recalculate” mean?',
        a: 'Not final: the scorecard has been calculated, but some information is still missing before the level is final. Recalculate: something was edited after the last calculation, so the saved result is out of date. Open the company, then the scorecard, to see what to do.',
      },
      {
        id: 'companies-score-dash',
        q: 'Why is the score a dash (—)?',
        a: 'The company has no full scorecard yet, or its scorecard has no points to show yet. The score fills in as figures are added.',
      },
      {
        id: 'companies-size',
        q: 'Where does the size (EME, QSE, large company) come from?',
        a: 'From the latest full scorecard’s turnover when there is one, otherwise from the turnover on the company’s details. To change it, open the company and choose Edit details.',
      },
      {
        id: 'companies-missing',
        q: 'Why is a company missing from the list?',
        a: 'Check the filter at the top is set to All. The list shows only the companies added under your login.',
        link: { href: '/companies', label: 'Show all companies' },
      },
    ],
    todoVerify: [],
  }),

  company: page<CompanyHelpData>({
    route: '/companies/[id]',
    title: 'Company',
    topic: 'Getting started',
    purpose:
      'One client’s page: its latest score and level, every full and procurement scorecard it has, and its details. Start new work for the company from here.',
    next: (d) => {
      if (!d.isOwner) {
        return d.latestFull
          ? { text: 'You are viewing another user’s company. Only the owner can change it.', href: d.latestFull.href, label: 'Open its scorecard' }
          : null
      }
      if (d.scorecards === 0) {
        return {
          text: `${d.name} has no scorecards yet. Start a full scorecard for the B-BBEE level, or procurement only.`,
          href: `/start?companyId=${d.companyId}`,
          label: 'Start a scorecard',
        }
      }
      if (d.latestFull && !d.latestFull.finished) return { text: d.latestFull.explain, href: d.latestFull.href, label: d.latestFull.next }
      if (d.latestFull) return { text: 'The latest full scorecard is calculated and its level is final.', href: d.latestFull.href, label: d.latestFull.next }
      return {
        text: 'There is a procurement scorecard but no full scorecard. Start a full scorecard to get the B-BBEE level.',
        href: `/start?companyId=${d.companyId}`,
        label: 'Start a scorecard',
      }
    },
    steps: [
      {
        target: 'company-start',
        title: 'Start a scorecard',
        body: 'Opens “What do you need?” for this company: a full scorecard or procurement only.',
        missing: 'Only the company’s owner can start scorecards or edit its details. You are viewing it as REAP staff.',
      },
      {
        target: 'company-glance',
        title: 'At a glance',
        body: 'The live score and level of the latest full scorecard, the latest procurement points, and when anything last changed. Click Score or Procurement to open that scorecard.',
      },
      {
        target: 'company-tabs',
        title: 'Scorecards and Details',
        body: 'Scorecards lists all of this company’s work. Details shows its industry, contact details and notes.',
      },
      {
        target: 'company-scorecards',
        title: 'All its scorecards',
        body: 'Full and procurement scorecards, newest first, each with its status and points. Click one to open it where you left off.',
        missing: 'Open the Scorecards tab to see this company’s scorecards.',
      },
      {
        target: 'company-more',
        title: 'Older and specialist tools',
        body: 'The older workbook calculator, and Delete company. Deleting removes the company and all of its scorecards for good.',
        missing: 'Only the company’s owner sees these tools.',
      },
    ],
    terms: ['fullScorecard', 'procurementScorecard', 'level', 'element'],
    problems: [
      {
        id: 'company-not-final',
        q: 'Why does the level say “Not final”?',
        a: 'Something the level depends on is still missing, such as a figure or confirmed evidence. Open the scorecard: its Review page lists what is still missing, grouped by area.',
      },
      {
        id: 'company-score-zero',
        q: 'Why is the score 0?',
        a: 'No points have been earned yet, usually because the figures are not in. Upload the client’s workbook or fill in the areas, and the score updates as you go.',
      },
      {
        id: 'company-procurement-count',
        q: 'Does the procurement scorecard count towards the level?',
        a: 'Only once you attach it. Open the full scorecard, go to its Procurement area and attach the procurement scorecard there.',
      },
      {
        id: 'company-score-changed',
        q: 'Why is the score different from the last calculated result?',
        a: 'This page shows the live score: it updates as soon as a figure changes. The saved result only changes when you calculate again on the Review page.',
      },
      {
        id: 'company-delete',
        q: 'How do I delete a company?',
        a: 'Open Older and specialist tools at the bottom of the page and choose Delete. This removes the company and all of its scorecards for good.',
      },
    ],
    todoVerify: [],
  }),

  'company-new': page<CompanyNewHelpData>({
    route: '/companies/new',
    title: 'Add a company',
    topic: 'Getting started',
    purpose:
      'Adds a client. The five details decide how the company is measured: its size comes from turnover and black ownership, and its financial year end sets the year a scorecard covers.',
    next: (d) =>
      d.error
        ? { text: `Not saved yet: ${d.error}`, href: '#new-company-form', label: 'Go to the form' }
        : {
            text: d.returning
              ? 'Fill in the five details, then press Save company. You go straight back to where you were, with this company chosen.'
              : 'Fill in the five details, then press Save company. You go straight on to choosing a full scorecard or procurement only.',
            href: '#new-company-form',
            label: 'Go to the form',
          },
    steps: [
      {
        target: 'company-form-name',
        title: 'Company name',
        body: 'The registered or trading name, exactly as it should appear on reports. For example, Mokoena Logistics (Pty) Ltd.',
      },
      {
        target: 'company-form-industry',
        title: 'Industry',
        body: 'Pick the closest match to what the company mainly does. If the industry may have its own B-BBEE sector code, the form tells you.',
      },
      {
        target: 'company-form-year-end',
        title: 'Financial year end',
        body: 'The month the financial year ends, as on the annual financial statements. A scorecard covers one financial year.',
      },
      {
        target: 'company-form-figures',
        title: 'Turnover and black ownership',
        body: 'Annual turnover in rand (for example 30 000 000) and the percentage owned by black South Africans (for example 51, or 0 if none). Take both from the latest financial statements and share register.',
      },
      {
        target: 'company-form-size',
        title: 'The company’s size',
        body: 'Worked out as you type: EME, QSE or large company. It also says when the company may get a level automatically, or when this app cannot give it a level.',
      },
      {
        target: 'company-form-save',
        title: 'Save',
        body: 'Save company adds it and takes you on to choose a full scorecard or procurement only. Contact details above are optional.',
      },
    ],
    terms: ['bbbee', 'eme', 'qse', 'generic', 'measurementPeriod', 'applicability', 'verification'],
    problems: [
      {
        id: 'company-new-automatic-level',
        q: 'Why does it say the company may not need a full scorecard?',
        a: 'Some small companies get a level automatically. A company with turnover of R10 million or less is Level 4. A company with turnover under R50 million is Level 2 if it is at least 51% black owned, and Level 1 if it is 100% black owned. Confirm with your verification agency.',
      },
      {
        id: 'company-new-qse',
        q: 'Why does it say the full-scorecard level would not apply?',
        a: 'A company with turnover between R10 million and R50 million that is less than 51% black owned is measured on the QSE scorecard. This app works out the Generic scorecard only, so its level would not apply to that company.',
      },
      {
        id: 'company-new-sector',
        q: 'Why does it say my industry may have its own B-BBEE rules?',
        // TODO-VERIFY: which industries are flagged as possibly having their own sector code (lib/company/industries.ts).
        a: 'Some industries are measured on their own sector code instead of the Generic codes this app uses. Confirm with your verification agency which scorecard applies.',
      },
      {
        id: 'company-new-not-saved',
        q: 'What if the company is not saved?',
        a: 'The message at the top of the form names the detail to fix. Turnover must be an amount in rand, like 30 000 000; black ownership a percentage from 0 to 100, like 51.',
      },
      {
        id: 'company-new-figures-change',
        q: 'What if the turnover or ownership changes next year?',
        // TODO-VERIFY: that each scorecard keeps its own year's figures and new ones start from the company's details.
        a: 'Edit the company’s details any time. Each scorecard keeps its own year’s figures; these details are the starting point for new scorecards.',
      },
    ],
    todoVerify: [
      'Which industries the form flags as possibly having their own B-BBEE sector code (lib/company/industries.ts says the list is for a verification expert to confirm).',
      'That each scorecard keeps its own year’s turnover and ownership, and that new scorecards start from the company’s details.',
    ],
  }),

  'company-edit': page<CompanyEditHelpData>({
    route: '/companies/[id]/edit',
    title: 'Edit company details',
    topic: 'Getting started',
    purpose: 'Change a client’s name, industry, financial year end, turnover, black ownership or contact details.',
    next: (d) => {
      if (d.error) return { text: `Not saved yet: ${d.error}`, href: '#edit-company-form', label: 'Go to the form' }
      if (d.missingProfile) {
        return {
          text: 'Add the financial year end, turnover and black ownership. With them, the app shows the company’s size and fills in new scorecards for you.',
          href: '#edit-company-form',
          label: 'Go to the form',
        }
      }
      return { text: 'Change what you need, then press Save changes. You go back to the company page.', href: `/companies/${d.companyId}`, label: 'Back to the company' }
    },
    steps: [
      {
        target: 'company-form-name',
        title: 'Company name',
        body: 'The registered or trading name, as it should appear on reports.',
      },
      {
        target: 'company-form-year-end',
        title: 'Financial year end',
        body: 'The month the financial year ends. A scorecard covers one financial year.',
      },
      {
        target: 'company-form-figures',
        title: 'Turnover and black ownership',
        // TODO-VERIFY: that each scorecard keeps its own year's figures and new ones start from these.
        body: 'The latest known figures. Each scorecard keeps its own year’s figures; these are the starting point for new ones.',
      },
      {
        target: 'company-form-size',
        title: 'The company’s size',
        body: 'Updates as you type: EME, QSE or large company, and whether the company may get a level automatically.',
      },
      {
        target: 'company-form-save',
        title: 'Save changes',
        body: 'Saves the details and takes you back to the company page. Cancel leaves without saving.',
      },
    ],
    terms: ['eme', 'qse', 'generic', 'measurementPeriod', 'applicability', 'verification'],
    problems: [
      {
        id: 'company-edit-optional',
        q: 'Why can I save without the turnover or ownership here?',
        a: 'Companies added before these fields existed may not have them, so editing only insists on the name and industry. Fill them in when you can: the app then shows the size and fills in new scorecards.',
      },
      {
        id: 'company-edit-scorecards',
        q: 'Does changing the turnover change a scorecard I already started?',
        // TODO-VERIFY: that a started scorecard keeps its own turnover and is not updated from the company's details.
        a: 'No. Each scorecard keeps its own year’s figures. The company’s details are the starting point for new scorecards.',
      },
      {
        id: 'company-edit-automatic-level',
        q: 'Why does it say the company may not need a full scorecard?',
        a: 'With turnover of R10 million or less the company is Level 4 automatically; under R50 million and at least 51% black owned it is Level 2, and 100% black owned Level 1. Confirm with your verification agency.',
      },
    ],
    todoVerify: ['That a scorecard already started keeps its own turnover and ownership figures when the company’s details are edited.'],
  }),

  scorecards: page<ScorecardsHelpData>({
    route: '/scorecards',
    title: 'Full scorecards',
    topic: 'Full scorecard',
    purpose:
      'Every full scorecard across your companies, how far each has got, and the next step for each. Continue any of them from here.',
    next: (d) => {
      if (d.total === 0) {
        return { text: 'You have no full scorecards yet. Start one for a company.', href: '/start?type=full', label: 'Start a full scorecard' }
      }
      if (d.unfinished) return { text: `${d.unfinished.title}: ${d.unfinished.explain}`, href: d.unfinished.href, label: d.unfinished.next }
      return {
        text: `All ${plural(d.total, 'full scorecard')} are finished. Start a new one for the next client or year.`,
        href: '/start?type=full',
        label: 'New full scorecard',
      }
    },
    steps: [
      {
        target: 'scorecards-new',
        title: 'New full scorecard',
        body: 'Starts a new full scorecard: choose the company, then add its REAP scorecard workbook or its figures.',
      },
      {
        target: 'scorecards-filter',
        title: 'Filter by status',
        body: 'Show all, or only those In progress, Not final (calculated, but the level is not final yet or something changed since) or Finished.',
        missing: 'The filter appears once you have a full scorecard.',
      },
      {
        target: 'scorecards-list',
        title: 'Your full scorecards',
        body: 'Each row shows the company, the status, the live points and the next step. Click a row to continue where you left off.',
        missing: 'You have no full scorecards yet. They appear here after you start one.',
      },
      {
        target: 'scorecards-older',
        title: 'Older and specialist tools',
        body: 'Scoring a few areas only (no B-BBEE level), typing in points worked out elsewhere, and the older workbook calculator.',
      },
    ],
    terms: ['fullScorecard', 'level', 'element', 'workbook'],
    problems: [
      {
        id: 'scorecards-not-final',
        q: 'What does “Not final” mean?',
        a: 'The scorecard is calculated, but some information is still missing before the level is final. Open it: the Review page lists what is still missing, grouped by area.',
      },
      {
        id: 'scorecards-recalculate',
        q: 'Why does it say “Recalculate”?',
        a: 'Something was edited after the last calculation, so the saved result is out of date. Open it and calculate again on the Review page.',
      },
      {
        id: 'scorecards-no-workbook',
        q: 'What does “No workbook” mean?',
        a: 'No workbook has been uploaded and the scorecard has not been calculated yet. Open it to upload the client’s REAP scorecard workbook.',
      },
      {
        id: 'scorecards-points-differ',
        q: 'Why are the points different from the last calculated result?',
        a: 'The list shows the live points, which update as soon as a figure changes. The saved result only changes when you calculate again.',
      },
      {
        id: 'scorecards-selected-areas',
        q: 'What does “Selected areas” mean?',
        a: 'That work scores only a few areas and does not give a B-BBEE level. It was started from Older and specialist tools.',
      },
    ],
    todoVerify: [],
  }),

  start: page<StartHelpData>({
    route: '/start',
    title: 'Start new',
    topic: 'Getting started',
    purpose:
      'Where all new work begins. First choose the company, then choose a full B-BBEE scorecard or procurement only.',
    next: (d) => {
      if (d.step === 'company' && d.companies === 0) {
        return { text: 'Add your first company. Every scorecard is saved under a company.', href: '/companies/new', label: 'Add a company' }
      }
      if (d.step === 'company') {
        return { text: 'Choose the company in the list, then press Continue. Not listed? Add it and you come straight back here.', href: d.addHref, label: 'Add a company' }
      }
      return {
        text: 'Choose Full B-BBEE scorecard for the level, or Procurement only for supplier spend, then press Continue. To see what already exists first, open the company.',
        href: d.company ? `/companies/${d.company.id}` : '/companies',
        label: 'Open the company',
      }
    },
    steps: [
      {
        target: 'start-progress',
        title: 'Two quick steps',
        body: 'First the company, then what you need. Click Company to go back and choose another one.',
      },
      {
        target: 'start-companies',
        title: 'Choose the company',
        body: 'Every scorecard is saved under a company. Click one, then press Continue.',
        missing: 'This list shows while you choose a company. With no companies yet, an “Add your first company” button takes its place.',
      },
      {
        target: 'start-add-company',
        title: 'Or add a new one',
        body: 'Five details: name, industry, financial year end, turnover and black ownership. You come straight back here afterwards.',
        missing: 'This shows while you choose a company. You have already chosen one.',
      },
      {
        target: 'start-choices',
        title: 'What do you need?',
        body: 'Full B-BBEE scorecard: all seven areas and the level. Procurement only: one area, how your spend with suppliers scores.',
        missing: 'Once you choose a company, two choices appear here: Full B-BBEE scorecard and Procurement only.',
      },
      {
        target: 'start-continue',
        title: 'Continue',
        body: 'Goes on with what you picked. It works once something is chosen.',
        missing: 'Continue appears once there is something to choose.',
      },
    ],
    terms: ['fullScorecard', 'procurementScorecard', 'level', 'eme', 'qse', 'generic', 'verification', 'workbook'],
    problems: [
      {
        id: 'start-full-or-procurement',
        q: 'Do I need a full scorecard or procurement only?',
        a: 'A full scorecard scores all seven areas and gives the B-BBEE level, for a verification, a tender or a client request. Procurement only scores spend with suppliers, out of 25 plus bonus points. If you are not sure, start with procurement: you can attach it to a full scorecard later.',
      },
      {
        id: 'start-not-listed',
        q: 'Why is my company not in the list?',
        a: 'The list shows only companies added under your login. Press “Add a company”: once it is saved you come straight back here with it chosen.',
      },
      {
        id: 'start-may-not-need',
        q: 'Why does it say I may not need a full scorecard?',
        a: 'Some small companies get a level automatically, from turnover and black ownership on the company’s details: R10 million turnover or less is Level 4; under R50 million and at least 51% black owned is Level 2; 100% black owned is Level 1. Confirm with your verification agency.',
      },
      {
        id: 'start-qse-level',
        q: 'Why does it say the full-scorecard level would not apply?',
        a: 'A company with turnover between R10 million and R50 million that is less than 51% black owned is measured on the QSE scorecard. This app works out the Generic scorecard only.',
      },
    ],
    todoVerify: [],
  }),

  activity: page<ActivityHelpData>({
    route: '/dashboard/activity',
    title: 'Activity',
    topic: 'Getting started',
    purpose:
      'A record of your recent changes to companies and scorecards, newest first. Use it to see what changed and when, for example when a score moves.',
    next: (d) =>
      d.entries === 0
        ? { text: 'Nothing is recorded yet. Start a scorecard and your changes appear here.', href: '/start', label: 'Start new' }
        : { text: 'This is a record only. To change something, open the company or scorecard it names.', href: '/companies', label: 'Open companies' },
    steps: [
      {
        target: 'activity-list',
        title: 'Your recent changes',
        body: 'Your last 100 recorded changes, newest first, grouped by day.',
        missing: 'Nothing has been recorded yet. Changes appear here as you work.',
      },
      {
        target: 'activity-day',
        title: 'Grouped by day',
        body: 'Today first, then earlier dates. Today’s entries say how long ago; older ones give the time of day (South African time).',
        missing: 'Days appear here once something is recorded.',
      },
      {
        target: 'activity-entry',
        title: 'One change',
        body: 'What was done, to which company or scorecard (and area, for scorecard work), and who did it.',
        missing: 'Each change appears as a line like this once something is recorded.',
      },
    ],
    terms: ['workbook', 'evidence', 'eap', 'procurementScorecard'],
    problems: [
      {
        id: 'activity-missing',
        q: 'Why is a change I made not here?',
        a: 'Only some actions are recorded, and only your latest 100 show. Adding a new company, for example, is not recorded at the moment; editing or deleting one is.',
      },
      {
        id: 'activity-others',
        q: 'Why do I see only my own changes?',
        a: 'This page lists the changes made under your login. Each login sees its own.',
      },
      {
        id: 'activity-user',
        q: 'Why does it say “User” instead of my email?',
        a: 'Changes made inside a full scorecard are stored against your login, not your email address, so they show as “User”. They are still yours.',
      },
      {
        id: 'activity-undo',
        q: 'Can I undo a change from here?',
        a: 'No. Activity is a record only. Open the company or scorecard and change it again there.',
        link: { href: '/companies', label: 'Open companies' },
      },
    ],
    todoVerify: [],
  }),
} satisfies Record<string, PageHelpEntry<never>>

// ─── Full scorecard flow ───────────────────────────────────────────────────

// ─── Data shapes the full-scorecard pages pass in (what each page already has) ─

type AreaLink = { label: string; href: string }

const lowerFirst = (s: string) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s)
const list = (names: string[]) =>
  names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`

export type OverviewHelpData = {
  /** A workbook has been read and is waiting to be checked: the link to check it. */
  pendingReviewHref: string | null
  /** No workbook and nothing typed yet: the page offers "Upload your workbook" or "fill it in by hand". */
  notStarted: boolean
  /** The workspace's next step: the next area that still needs something. */
  next: (AreaLink & { status: 'done' | 'progress' | 'todo' | 'problem'; note: string | null }) | null
  reviewHref: string
}

export type WorkbookReviewHelpData = {
  /** A workbook is waiting to be checked. */
  waiting: boolean
  overviewHref: string
  /** The Confirm card on this page. */
  confirmHref: string
  /** At least one section has warnings, so the "Import the sections as chosen" box must be ticked. */
  hasWarnings: boolean
  /** Sections that will still need figures after the import. */
  needsInput: number
}

export type ApplicabilityHelpData = {
  /** The engine's missing answers, in the page's own words. */
  missing: string[]
  /** "Does a sector code apply?" was answered Yes. */
  sectorCode: boolean
  /** The company is an EME or QSE that has not chosen the full scorecard. */
  smallCompany: 'EME' | 'QSE' | null
  /** The full scorecard was chosen, but the reason or the evidence is empty. */
  electionIncomplete: boolean
  inputsHref: string
  next: AreaLink | null
  reviewHref: string
}

export type FinancialHelpData = {
  npatEntered: boolean
  marginEntered: boolean
  /** The engine still wants a REAP administrator to confirm the profit figure. */
  needsConfirmation: boolean
  inputsHref: string
  next: AreaLink | null
  reviewHref: string
}

export type ReviewHelpData = {
  /** Nothing is missing for a final level. */
  complete: boolean
  stillNeeded: number
  /** The first item in "Still needed", worded as an action. */
  first: { title: string; href: string | null } | null
  eapAttached: boolean
  hasSaved: boolean
  needsRecalculation: boolean
  selfHref: string
  resultHref: string
}

export type ResultHelpData = {
  calculated: boolean
  /** Something changed since the saved result. */
  outdated: boolean
  final: boolean
  reviewHref: string
  /** Areas below their priority sub-minimum (they dropped the level). */
  droppedBy: AreaLink[]
  /** "Where to gain points": the line with the most points still to win. */
  topGain: { area: string; name: string; href: string } | null
  reportHref: string
}

export type ReportHelpData = {
  calculated: boolean
  /** A full scorecard (false: a selected-areas assessment, which has no level). */
  fullScorecard: boolean
  /** A final B-BBEE level is shown (a full scorecard with nothing missing). */
  final: boolean
  reviewHref: string
  overviewHref: string
}

// ─── Entries ─────────────────────────────────────────────────────────────────

const SCORECARD_FLOW_HELP = {
  // ── The start of a full scorecard: create it, then upload the workbook ──
  // The upload itself is on the scorecard overview (data-help="upload"), which
  // has its own entry below. /scorecards/new is the live first step that leads
  // to it (Start new → company → Full B-BBEE scorecard).
  'workbook-upload': page({
    route: '/scorecards/new',
    title: 'New full scorecard',
    topic: 'Full scorecard',
    purpose:
      'Create a full B-BBEE scorecard for a company: give it a name and the year being measured. On the next page you upload the client’s workbook or fill in the figures by hand.',
    steps: [
      {
        target: 'new-scorecard-steps',
        title: 'Where you are',
        body: 'The five steps of a full scorecard. This is the first: create it. Next you add the figures (upload the workbook or type them), check what was imported, fill in the areas and see the result.',
        missing: 'You are on “Score selected areas”, which has no steps: it scores one or a few areas and gives no B-BBEE level.',
      },
      {
        target: 'new-scorecard-form',
        title: 'Name and year',
        body: 'Keep the suggested name or change it. The year is the financial year being measured, by the year it ends.',
        missing: 'You are on “Score selected areas”, so its own form is shown instead.',
      },
      {
        target: 'new-scorecard-create',
        title: 'Create the scorecard',
        body: 'Creates the scorecard and opens its overview, where you upload the workbook or start typing the figures.',
        missing: 'You are on “Score selected areas”, so its own button is shown instead.',
      },
      {
        target: 'new-scorecard-other',
        title: 'Other ways to score',
        body: 'Older and specialist tools: scoring selected areas only (no level) and the original manual scorecard.',
      },
    ],
    terms: ['fullScorecard', 'workbook', 'measurementPeriod', 'level'],
    problems: [
      {
        id: 'workbook-upload-where',
        q: 'Where do I upload the workbook?',
        a: 'On the next page. Press Create the scorecard, and the scorecard overview offers “Upload your workbook” or “Or fill it in by hand”.',
      },
      {
        id: 'workbook-upload-year',
        q: 'Which year do I enter?',
        a: 'The financial year being measured, by the year it ends. A financial year from March 2025 to February 2026 is 2026.',
      },
      {
        id: 'workbook-upload-prefilled',
        q: 'Why does it say some figures are already filled in?',
        a: 'The company’s turnover and ownership are copied from its details, or from its previous scorecard if it has one. You check them on Company size and sector, the first page of the scorecard.',
      },
      {
        id: 'workbook-upload-procurement',
        q: 'Does the workbook cover procurement?',
        a: 'No. Procurement comes from a procurement scorecard that you attach on the scorecard’s Procurement area.',
      },
    ],
  }),

  // ── The scorecard overview (the hub) ──
  overview: page<OverviewHelpData>({
    route: '/scorecards/calculator/[assessmentId]/generic',
    title: 'Scorecard overview',
    topic: 'Full scorecard',
    purpose:
      'The home of one full scorecard: its score and level so far, every area with its status, and the one next thing to do. Start here by uploading the workbook or filling in the areas by hand.',
    next: (d) => {
      if (d.pendingReviewHref) {
        return {
          text: 'Your workbook has been read. Check what it found and confirm it to fill in the scorecard.',
          href: d.pendingReviewHref,
          label: 'Check imported data',
        }
      }
      if (d.notStarted) {
        const first = d.next ?? { label: 'Company size and sector', href: d.reviewHref }
        return {
          text: `Upload the client’s workbook on this page, or fill the scorecard in by hand, starting with ${first.label}.`,
          href: first.href,
          label: `Start with ${first.label}`,
        }
      }
      if (d.next) {
        const why = d.next.note
          ? `${d.next.label}: ${lowerFirst(d.next.note)}.`
          : d.next.status === 'todo'
            ? `${d.next.label} has not been started yet.`
            : `${d.next.label} still needs something from you.`
        return { text: why, href: d.next.href, label: `Go to ${d.next.label}` }
      }
      return {
        text: 'Everything is filled in. Review the scorecard, then calculate to save the result and the level.',
        href: d.reviewHref,
        label: 'Review my scorecard',
      }
    },
    steps: [
      {
        target: 'overview-score',
        title: 'The score so far',
        body: 'The whole scorecard on the figures entered so far: the points, the level and each area as a ring. It updates as you type. The saved result only changes when you calculate on the Review page.',
      },
      {
        target: 'overview-start',
        title: 'Your next step',
        body: 'Before anything is entered: upload the workbook, or fill it in by hand. After that, this shows the one area that still needs something, with a button to go there.',
      },
      {
        target: 'area-checklist',
        title: 'Every area, with its status',
        body: 'Company size and sector and Financial figures come first, then the seven areas with their points and a status: Done, In progress, Not started or Needs attention. Click one to open it.',
      },
      {
        target: 'live-score-bar',
        title: 'Level so far',
        body: 'The level on the figures so far, “Not final” while something is still missing, and a button to the next area. When nothing is left it takes you to the Review page.',
      },
      {
        target: 'overview-workbook',
        title: 'Workbook and rules',
        body: 'Open this to upload or replace the workbook, and to see which rules and measurement year the scorecard uses.',
      },
    ],
    terms: ['fullScorecard', 'workbook', 'element', 'level', 'subMinimum'],
    problems: [
      {
        id: 'overview-not-final',
        q: 'Why does the level say “Not final”?',
        a: 'Something a final level needs is still missing: a figure, an answer about the company’s size, confirmed evidence or an attached procurement scorecard. The Review page lists each item with a link to where it is fixed.',
      },
      {
        id: 'overview-order',
        q: 'Do I have to fill in the areas in order?',
        a: 'No. Fill them in any order; each area saves as you type. Do Financial figures early, because enterprise development, supplier development and socio-economic development are measured against the profit entered there.',
      },
      {
        id: 'overview-procurement',
        q: 'Why is Procurement not filled in from the workbook?',
        a: 'The workbook does not carry procurement. Attach a procurement scorecard on the Procurement area and its points count here.',
      },
      {
        id: 'overview-replace',
        q: 'What happens if I upload a new workbook?',
        a: 'It is read and shown on Check imported data. Nothing changes until you confirm, and for each area that already has figures you choose whether to keep them, replace them or only fill in the gaps.',
      },
      {
        id: 'overview-live-vs-saved',
        q: 'Why is this score different from the saved result?',
        a: 'This page shows the live score on the figures as they are now. The saved result, which reports use, only changes when you press Calculate scorecard on the Review page.',
      },
    ],
  }),

  // ── Check imported data ──
  'workbook-review': page<WorkbookReviewHelpData>({
    route: '/scorecards/calculator/[assessmentId]/generic/workbook-review',
    title: 'Check imported data',
    topic: 'Full scorecard',
    purpose:
      'Check what the app found in the uploaded workbook and choose, area by area, what to import. Nothing is saved until you press Confirm and import.',
    next: (d) => {
      if (!d.waiting) {
        return {
          text: 'No workbook is waiting to be checked. Upload one from the scorecard overview.',
          href: d.overviewHref,
          label: 'Go to the overview',
        }
      }
      const boxes = d.hasWarnings ? 'tick all three boxes (some sections have warnings)' : 'tick the boxes'
      const after = d.needsInput > 0 ? ` ${plural(d.needsInput, 'section')} will still need figures from you afterwards.` : ''
      return {
        text: `Check the choice for each section, ${boxes}, then press Confirm and import.${after}`,
        href: d.confirmHref,
        label: 'Go to Confirm',
      }
    },
    steps: [
      {
        target: 'workbook-review-summary',
        title: 'What was found',
        body: 'How many sections of the scorecard were found in the file, how many are complete, and how many will need something from you after the import.',
        missing: 'No workbook is waiting to be checked, so there is nothing to show. Upload one from the scorecard overview.',
      },
      {
        target: 'workbook-review-choices',
        title: 'Choose what to import',
        body: 'One row per section. The recommended choice is already selected. Open “See what was read” to check the figures before you import them.',
        missing: 'This list appears when a workbook is waiting to be checked.',
      },
      {
        target: 'workbook-review-confirm',
        title: 'Confirm',
        body: 'Tick the boxes and press Confirm and import. The scorecard is filled in and you go back to the overview.',
        missing: 'This appears when a workbook is waiting to be checked.',
      },
      {
        target: 'workbook-review-audit',
        title: 'Audit details',
        body: 'The file name, size, checksum and every sheet the app recognised, for your records.',
        missing: 'This appears when a workbook is waiting to be checked.',
      },
    ],
    terms: ['workbook', 'element', 'procurementScorecard'],
    problems: [
      {
        id: 'workbook-review-ignored',
        q: 'Why are the scores in the workbook ignored?',
        a: 'The app works out the points and the level itself from the figures in the workbook. Scores and levels typed into the workbook are not used, so the result always follows the same rules.',
      },
      {
        id: 'workbook-review-choices',
        q: 'What do Keep what is there, Replace and Only fill in the gaps do?',
        a: 'They appear when the scorecard already has figures for that section. Keep what is there leaves your figures alone. Replace with the workbook overwrites them. Only fill in the gaps keeps your figures and adds the workbook’s only where yours are empty; for a list of contributions, the workbook’s list is used only when yours is empty.',
      },
      {
        id: 'workbook-review-error',
        q: 'Why did Confirm and import stop with a message?',
        a: 'The boxes about missing figures and procurement must always be ticked. The first box, “Import the sections as chosen above”, must also be ticked when any section shows warnings (under See what was read).',
      },
      {
        id: 'workbook-review-still-needed',
        q: 'What does “Still needed” mean?',
        a: 'The workbook did not have that figure. After the import the area shows it as missing; type it in there.',
      },
      {
        id: 'workbook-review-empty',
        q: 'What if it says no workbook is waiting?',
        a: 'Either the workbook was already imported, or none has been uploaded. Upload one from the scorecard overview; you come back here to check it.',
      },
    ],
  }),

  // ── First: Company size and sector ──
  'area-applicability': page<ApplicabilityHelpData>({
    route: '/scorecards/calculator/[assessmentId]/generic/applicability',
    title: 'Company size and sector',
    topic: 'Scorecard areas',
    purpose:
      'Answer a few questions about the company: the year measured, its turnover, ownership and sector. They decide which scorecard applies and whether this full scorecard can give a final B-BBEE level.',
    next: (d) => {
      if (d.sectorCode) {
        return {
          text: 'A sector code applies to this company, so this scorecard cannot give it a final level. It is measured under its sector code instead.',
          href: d.inputsHref,
          label: 'Check the sector answers',
        }
      }
      if (d.smallCompany) {
        return {
          text: `This company is ${d.smallCompany === 'EME' ? 'an EME' : 'a QSE'}, so the full scorecard gives no final level unless the company chooses to be measured on it (under More options at the bottom).`,
          href: d.inputsHref,
          label: 'Go to the questions',
        }
      }
      if (d.electionIncomplete) {
        return {
          text: 'To use the full scorecard for a small company, record both why and the evidence under More options.',
          href: d.inputsHref,
          label: 'Go to the questions',
        }
      }
      if (d.missing.length > 0) {
        return {
          text: `${plural(d.missing.length, 'answer')} still missing: ${list(d.missing)}.`,
          href: d.inputsHref,
          label: 'Go to the questions',
        }
      }
      if (d.next) return { text: `Company size and sector is complete. Next: ${d.next.label}.`, href: d.next.href, label: `Go to ${d.next.label}` }
      return { text: 'Company size and sector is complete.', href: d.reviewHref, label: 'Review my scorecard' }
    },
    steps: [
      {
        target: 'applicability-summary',
        title: 'What your answers mean',
        body: 'The company’s size from its turnover, any automatic level it qualifies for, and, in amber, why this scorecard cannot give a final level yet.',
      },
      {
        target: 'applicability-year',
        title: 'The year being measured',
        body: 'The first and last day of the 12 months the scorecard covers, usually the last financial year.',
      },
      {
        target: 'applicability-size',
        title: 'Size and ownership',
        body: 'Turnover decides the size: R10 million or less is an EME, under R50 million a QSE, R50 million or more is measured on this full scorecard.',
      },
      {
        target: 'applicability-sector',
        title: 'Sector',
        body: 'Some industries have their own sector code. If one applies, this scorecard cannot give the level.',
      },
      {
        target: 'applicability-election',
        title: 'A small company choosing the full scorecard',
        body: 'An EME or QSE may choose to be measured on the full scorecard. Open this to record the choice, the reason and the evidence.',
      },
    ],
    terms: ['applicability', 'eme', 'qse', 'generic', 'measurementPeriod', 'level', 'verification'],
    problems: [
      {
        id: 'area-applicability-no-final',
        q: 'Why can this scorecard not give a final level?',
        a: 'The amber box at the top names the reason. There are three: a sector code applies; the company is an EME or QSE that has not chosen the full scorecard (turnover under R50 million, or a start-up); or an answer on this page is missing.',
      },
      {
        id: 'area-applicability-automatic',
        q: 'What is the automatic level?',
        a: 'An EME or QSE that is 100% black owned is a Level 1 contributor, and one that is at least 51% black owned is Level 2. Any other EME is Level 4. A QSE under 51% black owned is measured on the QSE scorecard, which this app does not calculate. Confirm the level with your verification agency.',
      },
      {
        id: 'area-applicability-startup',
        q: 'What happens if I answer Yes to start-up?',
        a: 'The company is then treated as an EME whatever its turnover, so this full scorecard gives no final level unless it chooses the full scorecard. If you are not sure whether the company counts as a start-up, ask your verification agency.',
      },
      {
        id: 'area-applicability-election',
        q: 'Can a small company use the full scorecard anyway?',
        a: 'Yes. Under More options, choose the full scorecard and fill in both Why and Evidence. Without both, the choice is not accepted and there is no final level. Its automatic level then no longer applies.',
      },
      {
        id: 'area-applicability-done',
        q: 'Why does the list of areas say Done when answers are still missing?',
        a: 'It shows Done as soon as the turnover or the type of entity is filled in. The amber box on this page, and the Review page, list every answer that is still missing.',
      },
    ],
    // TODO-VERIFY: the start-up definition is not in the engine; the existing field hint says "a company in its first year".
    todoVerify: [
      'Start-up: the field hint says “A company in its first year”. The engine only treats Yes as an EME; the definition of a start-up in the codes was not checked.',
      'Election evidence: the example “a signed board resolution” is a suggestion; the codes’ requirement for evidence of the election was not checked.',
      'Black ownership source: “the company’s share register” as where to find it.',
      'Which sector code: that a B-BBEE certificate names the code the company was measured on (given as where to find it).',
    ],
  }),

  // ── First: Financial figures ──
  'area-financial': page<FinancialHelpData>({
    route: '/scorecards/calculator/[assessmentId]/generic/financial',
    title: 'Financial figures',
    topic: 'Scorecard areas',
    purpose:
      'Enter the year’s profit, revenue and payroll from the annual financial statements. Enterprise development, supplier development and socio-economic development are measured against the profit entered here.',
    next: (d) => {
      if (!d.npatEntered) {
        return {
          text: 'Enter the net profit after tax. Enterprise development, supplier development and socio-economic development are measured against it.',
          href: d.inputsHref,
          label: 'Go to the figures',
        }
      }
      if (d.needsConfirmation && !d.marginEntered) {
        return {
          text: 'Add the industry profit margin and where it comes from, under More options. Until then the profit figure needs a REAP administrator to confirm it, so the level cannot be final.',
          href: d.inputsHref,
          label: 'Go to the figures',
        }
      }
      if (d.needsConfirmation) {
        return {
          text: 'A REAP administrator must confirm which profit figure is used before the level can be final.',
          href: d.reviewHref,
          label: 'See what else is needed',
        }
      }
      if (d.next) return { text: `The financial figures are in. Next: ${d.next.label}.`, href: d.next.href, label: `Go to ${d.next.label}` }
      return { text: 'The financial figures are in.', href: d.reviewHref, label: 'Review my scorecard' }
    },
    steps: [
      {
        target: 'financial-targets',
        title: 'Targets worked out from the profit',
        body: 'What enterprise development (1% of profit), supplier development (2%) and socio-economic development (1%) are measured against, and which profit figure was used and why.',
      },
      {
        target: 'financial-profit',
        title: 'Profit',
        body: 'Net profit after tax and revenue, from the income statement. A loss is entered as a negative number.',
      },
      {
        target: 'financial-payroll',
        title: 'Payroll and staff',
        body: 'The leviable payroll, total payroll and number of employees. Skills development and management control each ask for their own payroll and staff figures on their pages.',
      },
      {
        target: 'financial-more',
        title: 'A small profit or a loss',
        body: 'Open this to enter the industry’s typical profit margin and where it comes from. The app uses it to check the company’s profit, and needs it for a final level.',
      },
      {
        target: 'financial-override',
        title: 'Administrator override',
        body: 'REAP administrators can fix which profit figure is used, with a reason that is kept in the audit trail.',
        missing: 'Only REAP administrators see the profit override.',
      },
    ],
    terms: ['npat', 'deemedNpat', 'leviable', 'measurementPeriod', 'esd'],
    problems: [
      {
        id: 'area-financial-which-profit',
        q: 'Which profit figure is used?',
        a: 'The higher of the actual net profit after tax and the deemed profit (revenue × the industry profit margin × 25%). Without an industry margin the actual profit is used, but a REAP administrator must confirm it before the level is final.',
      },
      {
        id: 'area-financial-loss',
        q: 'What if the company made a loss?',
        a: 'Enter the loss as a negative number, and enter the industry profit margin and its source under More options; the deemed profit is then used. Without the margin there is no profit figure to measure against, so the three areas that use it cannot be scored.',
      },
      {
        id: 'area-financial-admin',
        q: 'Why does it say a REAP administrator must confirm the profit figure?',
        a: 'The app cannot yet tell which profit figure applies, usually because the industry profit margin is missing. Add the margin and its source under More options, or ask a REAP administrator to set the figure.',
      },
      {
        id: 'area-financial-leviable',
        q: 'Is the leviable payroll here used for skills development?',
        a: 'No. Skills development is scored from the leviable amount entered on the Skills development page. Enter the same figure there.',
      },
      {
        id: 'area-financial-targets',
        q: 'Where do the 1%, 2% and 1% come from?',
        a: 'They are the targets the app uses: enterprise development 1%, supplier development 2% and socio-economic development 1% of the profit figure used.',
      },
    ],
    // TODO-VERIFY: where to find the industry profit margin, and whether Stats SA is an accepted source.
    todoVerify: [
      'Industry profit margin source: the example “Stats SA Annual Financial Statistics” is a suggestion; which publication a verification agency accepts was not checked.',
      'All employees: the counting basis (headcount at year end or an average) was not checked; the field is not used by the scoring engine.',
    ],
  }),

  // ── Review my scorecard ──
  review: page<ReviewHelpData>({
    route: '/scorecards/calculator/[assessmentId]/generic/review',
    title: 'Review my scorecard',
    topic: 'Full scorecard',
    purpose:
      'See what is still missing for a final level, then press Calculate scorecard to save the result. You can calculate at any time; the level is final once nothing is missing.',
    next: (d) => {
      if (!d.eapAttached) {
        return {
          text: 'Attach the workforce (EAP) targets: management control and skills development are measured against them.',
          href: `${d.selfHref}#eap-targets`,
          label: 'Attach the targets',
        }
      }
      if (d.complete && (!d.hasSaved || d.needsRecalculation)) {
        return {
          text: 'Everything needed is in. Press Calculate scorecard to save the result and the final level.',
          href: `${d.selfHref}#calculate`,
          label: 'Go to Calculate',
        }
      }
      if (d.complete) return { text: 'The saved result is up to date.', href: d.resultHref, label: 'See the result' }
      if (d.first) {
        return {
          text: `${plural(d.stillNeeded, 'thing')} still needed for a final level. First: ${d.first.title}.`,
          href: d.first.href ?? `${d.selfHref}#still-needed`,
          label: d.first.href ? 'Go there' : 'See the list',
        }
      }
      return { text: 'Press Calculate scorecard to save the result.', href: `${d.selfHref}#calculate`, label: 'Go to Calculate' }
    },
    steps: [
      {
        target: 'review-calculate',
        title: 'Calculate',
        body: 'Saves the result and works out the level. You can calculate before everything is in: points are worked out for what is there, but the level is not final.',
      },
      {
        target: 'review-level',
        title: 'Score and level',
        body: 'The score on the figures as they stand, and the level scale. The level shows here once a calculation is saved.',
      },
      {
        target: 'review-eap',
        title: 'Workforce targets',
        body: 'Management control and skills development are measured against the workforce (EAP) targets for the year. Attach them here.',
        missing: 'Workforce targets are attached, so there is nothing to do here.',
      },
      {
        target: 'review-still-needed',
        title: 'Still needed for a final level',
        body: 'Every missing item, grouped by area, worded as what to do. Start or Finish takes you to the place to fix it.',
        missing: 'Nothing is missing, so there is no list.',
      },
      {
        target: 'review-details',
        title: 'Points and priority sub-minimums',
        body: 'Open this for each area’s points and whether each priority sub-minimum is met.',
      },
    ],
    terms: ['level', 'subMinimum', 'priorityElement', 'discounting', 'eap', 'element'],
    problems: [
      {
        id: 'review-calc-early',
        q: 'Can I calculate before everything is in?',
        a: 'Yes. The result is saved with the points for everything entered, but the level is not final until “Still needed” is empty.',
      },
      {
        id: 'review-zero',
        q: 'Why does an area show 0 points?',
        a: 'Either nothing has been entered there yet, or what is entered earns no points. Procurement stays at 0 until a procurement scorecard is attached. Open the area: “Where you’re losing points” names the lines that miss their targets.',
      },
      {
        id: 'review-below-minimum',
        q: 'Why is a priority sub-minimum “Missed”?',
        a: 'Each priority area must reach 40% of its points: ownership net value 3.20 of 8, skills development 8 of 20, procurement 10 of 25, supplier development 4 of 10 and enterprise development 2 of 5. Missing one or more drops the level by one (never more than one).',
      },
      {
        id: 'review-eap',
        q: 'What if no workforce targets can be attached?',
        a: 'The active set for the scorecard’s year is attached. If there is none, a REAP administrator adds one under Workforce targets.',
      },
      {
        id: 'review-recalculate',
        q: 'Do I need to calculate again after a change?',
        a: 'Yes. The saved result stays as it was until you calculate again. The overview and the result page say when something has changed since.',
      },
    ],
  }),

  // ── Final result ──
  result: page<ResultHelpData>({
    route: '/scorecards/calculator/[assessmentId]/generic/result',
    title: 'Final result',
    topic: 'Full scorecard',
    purpose:
      'The saved result: the B-BBEE level, the points in each area, what dropped the level, and where the most points can still be won. Download the report from here.',
    next: (d) => {
      if (!d.calculated) {
        return { text: 'This scorecard has not been calculated yet. Review it and press Calculate scorecard.', href: d.reviewHref, label: 'Review my scorecard' }
      }
      if (d.outdated) {
        return { text: 'Something changed since this result was saved. Calculate again to include it.', href: d.reviewHref, label: 'Calculate again' }
      }
      if (!d.final) {
        return { text: 'The level is not final: something is still missing. The Review page lists what.', href: d.reviewHref, label: 'See what is missing' }
      }
      if (d.droppedBy.length > 0) {
        const names = d.droppedBy.map((a) => a.label)
        return {
          text: `The level dropped by one because ${list(names)} ${names.length === 1 ? 'is' : 'are'} below the priority sub-minimum. Bringing ${names.length === 1 ? 'it' : 'each one'} up to the minimum removes the drop.`,
          href: d.droppedBy[0].href,
          label: `Go to ${d.droppedBy[0].label}`,
        }
      }
      if (d.topGain) {
        return { text: `The most points still to win: ${d.topGain.area}, ${d.topGain.name}.`, href: d.topGain.href, label: `Go to ${d.topGain.area}` }
      }
      return { text: 'Download the report to share the result.', href: d.reportHref, label: 'Open the printable report' }
    },
    steps: [
      {
        target: 'result-level',
        title: 'The level',
        body: 'The B-BBEE level, the total points and what customers can count of their spend with the company. “Not final yet” while something is missing.',
      },
      {
        target: 'result-export',
        title: 'Report and changes',
        body: 'Download the report as a PDF, open the printable version, or go back to change the figures.',
      },
      {
        target: 'result-areas',
        title: 'Points by area',
        body: 'Each area’s points out of its total. Red means below its minimum, so it dropped the level; amber, under half of its points; green, half or more.',
      },
      {
        target: 'result-gains',
        title: 'Where to gain points',
        body: 'The three lines with the most points still to win, across all areas. Click one to open its area.',
        missing: 'Every scored line has its full points, so there is nothing to show here.',
      },
      {
        target: 'result-minimums',
        title: 'Priority sub-minimums',
        body: 'Open this to see whether each priority area reached its minimum, with the points needed.',
      },
    ],
    terms: ['level', 'recognitionLevel', 'subMinimum', 'priorityElement', 'discounting', 'bonusPoints', 'verification'],
    problems: [
      {
        id: 'result-zero',
        q: 'Why does an area have 0 points?',
        a: 'Either nothing was entered there when the result was saved, or what was entered earns no points. Procurement stays at 0 until a procurement scorecard is attached. Open the area to see which lines miss their targets, then calculate again.',
      },
      {
        id: 'result-below-minimum',
        q: 'Why does an area say “Dropping the level”?',
        a: 'It is a priority area below its sub-minimum: 40% of its points (for ownership, 40% of the 8 net value points). Missing one or more drops the level by one. Bring each one up to its minimum and calculate again to remove the drop.',
      },
      {
        id: 'result-not-final',
        q: 'Why does it say “Not final yet”?',
        a: 'Something a final level needs was missing when the result was saved, or the company size answers rule out a final level. The list under the level names each item; the Review page links to where to fix it.',
      },
      {
        id: 'result-colours',
        q: 'What do the colours mean?',
        a: 'Red: below its priority minimum, so it dropped the level. Amber: under half of its points. Green: half or more. The half-way line is only a guide on this page, not a B-BBEE rule.',
      },
      {
        id: 'result-certificate',
        q: 'Is this a B-BBEE certificate?',
        a: 'No. It is a calculated draft. Only an accredited verification agency issues a certificate, after checking the evidence.',
      },
    ],
  }),

  // ── Printable report (signed in) ──
  report: page<ReportHelpData>({
    route: '/scorecards/calculator/[assessmentId]/report',
    title: 'Printable report',
    topic: 'Full scorecard',
    purpose:
      'The saved result laid out as a report, ready to download as a PDF or print. It only appears once the scorecard has been calculated.',
    next: (d) => {
      if (!d.calculated) {
        return { text: 'There is no report until the scorecard is calculated. Review it and press Calculate scorecard.', href: d.reviewHref, label: 'Review my scorecard' }
      }
      if (!d.fullScorecard) {
        return { text: 'This report covers selected areas only, so it has no B-BBEE level. Download the PDF or print it from the top of this page.', href: d.overviewHref, label: 'Back to the assessment' }
      }
      if (!d.final) {
        return { text: 'This report shows a preliminary result: the level is not final yet. The Review page lists what is missing.', href: d.reviewHref, label: 'See what is missing' }
      }
      return { text: 'The report is ready. Download the PDF or print it from the top of this page.', href: d.overviewHref, label: 'Back to the scorecard' }
    },
    steps: [
      {
        target: 'report-actions',
        title: 'Download or print',
        body: 'Download PDF saves the report as a file. Print / Save as PDF opens your browser’s print window.',
        missing: 'This scorecard has not been calculated, so there is no report to download yet.',
      },
      {
        target: 'report-summary',
        title: 'The result',
        body: 'The B-BBEE level (or the points for selected areas), each area’s points and the priority sub-minimums.',
        missing: 'This appears once the scorecard has been calculated.',
      },
      {
        target: 'report-detail',
        title: 'Each area in detail',
        body: 'Where each area’s figures came from, its points, the rule used and any notes from the calculation.',
        missing: 'This appears once the scorecard has been calculated.',
      },
      {
        target: 'report-still',
        title: 'Still to complete',
        body: 'Any selected area that has not been calculated yet.',
        missing: 'This appears once the scorecard has been calculated.',
      },
    ],
    terms: ['level', 'subMinimum', 'recognitionLevel', 'verification'],
    problems: [
      {
        id: 'report-not-calculated',
        q: 'Why does it say the scorecard has not been calculated?',
        a: 'A report is made from a saved result. Go back to the scorecard, open Review and press Calculate scorecard, then come back here.',
      },
      {
        id: 'report-not-final',
        q: 'Why does the report say “Preliminary result”?',
        a: 'Something a final level needs was still missing when the scorecard was calculated. Finish it, calculate again, and the report shows the final level.',
      },
      {
        id: 'report-below-minimum',
        q: 'What does a missed priority sub-minimum mean?',
        a: 'A priority area did not reach 40% of its points (for ownership, 40% of the 8 net value points), so the level dropped by one.',
      },
      {
        id: 'report-certificate',
        q: 'Can I give this report to a client as their certificate?',
        a: 'No. It is a calculated draft. Only an accredited verification agency issues a B-BBEE certificate.',
      },
    ],
  }),

  // ── Older and specialist tools that can still be opened ──
  'legacy-scorecard-upload': page({
    route: '/scorecard/upload',
    title: 'Scorecard upload has moved',
    topic: 'Full scorecard',
    purpose:
      'This page is retired. It says where its work moved: a full scorecard workbook is now uploaded on a new full scorecard, and a supplier register on a procurement scorecard.',
    steps: [
      { target: 'legacy-upload-notice', title: 'This page is retired', body: 'It was a preview-only upload and never produced a scorecard.' },
      { target: 'legacy-upload-links', title: 'Where to go instead', body: 'Pick the link that matches what you came to do.' },
      { target: 'start-new', title: 'Start new', body: 'Start new, at the top of the menu, begins either kind of scorecard.' },
    ],
    terms: ['workbook'],
    problems: [
      {
        id: 'legacy-scorecard-upload-why',
        q: 'Why did I land here?',
        a: 'You followed an old link or bookmark. Use Start new instead: choose the company, then Full B-BBEE scorecard, and upload the workbook on its overview.',
      },
    ],
  }),
  'legacy-full-workbook-new': page({
    route: '/scorecards/full/new',
    title: 'Older workbook calculator',
    topic: 'Full scorecard',
    purpose:
      'The earlier way of scoring a full scorecard workbook, kept for anyone who still needs it. For new work use a full scorecard (Start new), which the rest of the app and Home follow.',
    steps: [
      { target: 'legacy-workbook-newer', title: 'A newer way', body: 'The full scorecard replaces this page. The link opens it for the same company.' },
      { target: 'legacy-workbook-upload', title: 'Upload a workbook', body: 'Uploads the workbook and reads its figures in one step. Then you run the scoring engine on this page.' },
      {
        target: 'legacy-workbook-result',
        title: 'Latest import',
        body: 'What the last upload found, and the controls to run the scoring engine.',
        missing: 'No workbook has been uploaded on this page yet.',
      },
    ],
    terms: ['workbook'],
    problems: [
      {
        id: 'legacy-full-workbook-new-which',
        q: 'Should I use this page or the full scorecard?',
        a: 'Use the full scorecard. This older calculator is kept for existing work. Its results do not appear on Home or Companies; on the Full scorecards page they are listed only under Older and specialist tools.',
      },
      {
        id: 'legacy-full-workbook-new-procurement',
        q: 'Where is procurement handled?',
        a: 'On a full scorecard, procurement comes from a procurement scorecard you attach on its Procurement area.',
      },
    ],
  }),
  'legacy-full-workbook': page({
    route: '/scorecards/full/[workbookId]',
    title: 'Older workbook calculator: result',
    topic: 'Full scorecard',
    purpose: 'The result of a workbook scored with the older workbook calculator: its level, points, reconciliation and any workbook issues.',
    steps: [
      { target: 'legacy-workbook-header', title: 'The workbook', body: 'Which workbook this is, its status, and the way back to the upload page.' },
      { target: 'legacy-workbook-next', title: 'What to do next', body: 'The next step for this workbook, or what stopped the calculation.' },
      { target: 'legacy-workbook-issues', title: 'Workbook issues', body: 'Problems found in the workbook, sheet by sheet.' },
    ],
    terms: ['workbook', 'level'],
    problems: [
      {
        id: 'legacy-full-workbook-incomplete',
        q: 'Why does it say the calculation is incomplete?',
        a: 'Some sections could not be calculated from the rows found in the workbook. The issues list says which; fix the workbook and upload it again, or start a full scorecard instead.',
      },
    ],
  }),
  'legacy-selected-areas': page({
    route: '/scorecards/calculator/[assessmentId]',
    title: 'Selected areas',
    topic: 'Full scorecard',
    purpose: 'An assessment that scores one or a few areas from separate registers. It adds up their points but gives no B-BBEE level.',
    steps: [
      { target: 'legacy-selected-header', title: 'This assessment', body: 'The company, year and which areas it covers. It is not a complete B-BBEE level.' },
      { target: 'legacy-selected-totals', title: 'Points so far', body: 'How many areas are selected and their combined points.' },
      {
        target: 'legacy-selected-list',
        title: 'The areas',
        body: 'Each selected area with its file and status. Click one to upload its register and calculate it.',
      },
    ],
    terms: ['element', 'level'],
    problems: [
      {
        id: 'legacy-selected-areas-level',
        q: 'Why is there no B-BBEE level?',
        a: 'A level needs all seven areas. For a level, start a full scorecard from Start new.',
      },
    ],
  }),
  'legacy-selected-area': page({
    route: '/scorecards/calculator/[assessmentId]/elements/[elementKey]',
    title: 'Selected area',
    topic: 'Full scorecard',
    purpose: 'One area of a selected-areas assessment: upload its register, check what was read, and calculate its points.',
    steps: [
      { target: 'legacy-area-header', title: 'This area', body: 'What the area measures, and whether its scoring is ready.' },
      { target: 'legacy-area-upload', title: 'Upload the register', body: 'Upload the Excel register for this area. The app reads it and shows a preview.' },
      { target: 'legacy-area-calculate', title: 'Calculate', body: 'Works out the points for this area from the register and saves them.' },
    ],
    terms: ['element'],
    problems: [
      {
        id: 'legacy-selected-area-scaffolded',
        q: 'Why does it say scoring is scaffolded?',
        a: 'For this area the upload and checks work, but verified points are not available here. Use a full scorecard to score it.',
      },
    ],
  }),
  'legacy-manual-scorecard': page({
    route: '/scorecards/[id]',
    title: 'Manual scorecard',
    topic: 'Full scorecard',
    purpose: 'An older scorecard whose points were typed in by hand: its total, its level and the points by category.',
    steps: [
      { target: 'legacy-manual-header', title: 'The scorecard', body: 'The company, the total and the level, with buttons to make a PDF, edit or delete it.' },
      { target: 'legacy-manual-breakdown', title: 'By category', body: 'The points in each category against its maximum.' },
      { target: 'legacy-manual-simulator', title: 'Scenario planning', body: 'Try changes to see how the total and level would move. Nothing is saved.' },
    ],
    terms: ['level'],
    problems: [
      {
        id: 'legacy-manual-scorecard-which',
        q: 'How is this different from a full scorecard?',
        a: 'Here the points were typed in by hand. A full scorecard works the points out from the figures, area by area, with the B-BBEE rules. Use Start new for a full scorecard.',
      },
    ],
  }),
  'legacy-manual-scorecard-edit': page({
    route: '/scorecards/[id]/edit',
    title: 'Edit manual scorecard',
    topic: 'Full scorecard',
    purpose: 'Change the points typed into an older manual scorecard. Saving works out the totals again.',
    steps: [
      { target: 'legacy-manual-edit-header', title: 'Editing', body: 'Which company’s manual scorecard you are changing.' },
      { target: 'legacy-manual-edit-form', title: 'The points', body: 'Change the figures, then press Save changes. Cancel goes back without saving.' },
      { target: 'start-new', title: 'Start new', body: 'For a scorecard worked out from the figures, use Start new and choose Full B-BBEE scorecard.' },
    ],
    terms: [],
    problems: [
      {
        id: 'legacy-manual-scorecard-edit-save',
        q: 'Does saving change the level?',
        a: 'Yes. Saving works out the totals and the result again from the figures you entered.',
      },
    ],
  }),
} satisfies Record<string, PageHelpEntry<never>>

// ─── Scorecard areas: ownership, management control, skills ────────────────

// ─── Data the three area pages pass in (all already loaded by the page) ──────

/** One thing the area still needs, with where to fix it. */
export type AreaHelpGap = { name: string; href: string; label: string }

/**
 * Ownership, Management control and Skills development pass the same shape:
 * the checklist row's status, what is still empty (worked out from the
 * engine's unscored lines and the page's own inputs), whether the priority
 * sub-minimum failed, and the checklist's next area.
 */
export type AreaHelpData = {
  /** "Ownership", as the checklist names it. */
  area: string
  /** The checklist capsule: done, progress, todo (not started) or problem. */
  status: 'done' | 'progress' | 'todo' | 'problem'
  gaps: AreaHelpGap[]
  belowMinimum: boolean
  /** The checklist's next unfinished area, or null when all are finished. */
  next: { label: string; href: string } | null
  reviewHref: string
  /** This area's figures (#inputs). */
  hereHref: string
}
export type OwnershipHelpData = AreaHelpData
export type ManagementControlHelpData = AreaHelpData
export type SkillsDevelopmentHelpData = AreaHelpData

const listNames = (names: string[]) => {
  const shown = names.slice(0, 3)
  const rest = names.length - shown.length
  if (rest > 0) return `${shown.join(', ')} and ${plural(rest, 'more thing')}`
  return shown.length <= 1 ? (shown[0] ?? '') : `${shown.slice(0, -1).join(', ')} and ${shown[shown.length - 1]}`
}

/** The single most useful next step on an area page. */
function areaNext(d: AreaHelpData): NextAction {
  if (d.status === 'todo') {
    return { text: `${d.area} has not been started. Fill in the figures, or upload the workbook to fill them in for you.`, href: d.hereHref, label: 'Go to the figures' }
  }
  if (d.gaps.length > 0) {
    const first = d.gaps[0]
    return { text: `${d.area} still needs ${listNames(d.gaps.map((g) => g.name))}.`, href: first.href, label: first.label }
  }
  if (d.status === 'progress') {
    // Safety net: the engine has an unscored line the page could not name.
    return { text: `${d.area} still has lines that cannot be scored yet. “Where you’re losing points” names them.`, href: d.hereHref, label: 'Go to the figures' }
  }
  const onwards = d.next ? { href: d.next.href, label: `Next: ${d.next.label}` } : { href: d.reviewHref, label: 'Review my scorecard' }
  if (d.belowMinimum) {
    return {
      text: `${d.area} is filled in but below its priority sub-minimum, so the level drops by one. “Where you’re losing points” shows where to gain; otherwise carry on.`,
      ...onwards,
    }
  }
  return d.next
    ? { text: `${d.area} is done.`, ...onwards }
    : { text: `${d.area} is done, and so is every other area. Review the scorecard and calculate the level.`, ...onwards }
}

// ─── Shared steps ────────────────────────────────────────────────────────────

const STEP_CHECKLIST = {
  target: 'area-checklist',
  title: 'Every area, one click away',
  body: 'The two set-up steps and the seven areas, each with its points and status. The white one is the page you are on.',
}
const STEP_LIVE_BAR = {
  target: 'live-score-bar',
  title: 'Level so far, and what is next',
  body: 'The B-BBEE level on the figures entered so far (“Not final” until everything is in), and a button to the next area that still needs something.',
}
const STEP_LOSING = {
  target: 'area-losing',
  title: 'Where you’re losing points',
  body: 'The lines with the most points still to win in this area, largest first, each with the reason.',
  missing: 'Nothing is lost in this area yet, so there is no list. It appears as soon as a line scores below its full points.',
}

// ─── Entries ─────────────────────────────────────────────────────────────────

const AREAS_A_HELP = {
  'area-ownership': page<OwnershipHelpData>({
    route: '/scorecards/calculator/[assessmentId]/generic/ownership',
    title: 'Ownership',
    topic: 'Scorecard areas',
    purpose:
      'Enter how much of the company black people and black women own: their votes, their share of the profits and the net value of their stake. Ownership is worth 25 points, and net value is a priority: below 40% of its 8 points the level drops by one.',
    next: areaNext,
    steps: [
      {
        target: 'area-points',
        title: 'Points in this area',
        body: 'Ownership’s points out of 25, updated as you type. Below it, the priority minimum: net value needs at least 3.20 of its 8 points or the level drops by one.',
      },
      STEP_LOSING,
      {
        target: 'ownership-voting',
        title: 'Start with the percentages',
        body: 'Voting rights first, then economic interest. Enter percentages from the share register; each group shows what it is worth and what it has earned so far.',
      },
      {
        target: 'ownership-net-value',
        title: 'Net value and evidence',
        body: 'Enter the net value your verification agency worked out, the measurement date and where the figures come from. Without the date and the source the level cannot be final.',
      },
      STEP_CHECKLIST,
      STEP_LIVE_BAR,
    ],
    terms: ['element', 'subMinimum', 'priorityElement', 'netValue', 'verification', 'workbook'],
    problems: [
      {
        id: 'area-ownership-zero',
        q: 'Why does Ownership show 0 points?',
        a: 'Every line that can be scored came to 0. Either the percentages entered are 0 (the company has no black shareholders, in which case 0 is right), or the figures entered are not yet enough to score any line, for example total votes without the votes held by black people. “Where you’re losing points” names each line and why.',
      },
      {
        id: 'area-ownership-below-minimum',
        q: 'Why does Ownership say the priority minimum is not met?',
        a: 'Net value is a priority: it needs at least 40% of its 8 points, which is 3.20 points. Net value scores in proportion to a 25% target, so a net value below 10% misses it. Missing it drops the B-BBEE level by one; the points themselves are kept. The other ownership lines do not count towards this minimum.',
      },
      {
        id: 'area-ownership-in-progress',
        q: 'Why is Ownership still “In progress” when every percentage is in?',
        a: 'Two more things are needed: the measurement date and where the figures come from, both under Net value and evidence. They do not change the points, but until they are filled in Ownership is not done and the level cannot be final.',
      },
      {
        id: 'area-ownership-votes',
        q: 'Should I enter vote counts or percentages?',
        a: 'Percentages are enough. If you know the exact number of votes, enter them under “More options: exact votes and notes”: the “25% plus one vote” target is then worked out exactly. Without them the target is taken as 25.1%. Once the total votes are in, a line’s vote count is used instead of its percentage.',
      },
      {
        id: 'area-ownership-net-value',
        q: 'Can the app work out net value for me?',
        a: 'No. Enter the net value percentage your verification agency worked out. The app does not model the share deal, the debt used to buy the shares or the time-based adjustment in the codes; it compares the figure you enter with the 25% target.',
      },
    ],
    todoVerify: [
      'Ownership “Designated groups” — where to find it: “the trust deed or scheme rules, with the share register”.',
      'Ownership “Black new entrants” — where to find it: “the shareholders’ declarations or your verification agency’s ownership analysis”.',
      'Ownership “Measurement date” — “usually the financial year end” (existing copy, kept).',
    ],
  }),

  'area-management-control': page<ManagementControlHelpData>({
    route: '/scorecards/calculator/[assessmentId]/generic/management-control',
    title: 'Management control',
    topic: 'Scorecard areas',
    purpose:
      'Count the black people, and black women, on the board, among the executives and at each level of management. Management control is worth 19 points; senior, middle and junior management are measured against the workforce (EAP) targets.',
    next: areaNext,
    steps: [
      {
        target: 'area-points',
        title: 'Points in this area',
        body: 'Management control’s points out of 19, updated as you type. It has no priority minimum.',
      },
      STEP_LOSING,
      {
        target: 'mc-board',
        title: 'Count people, not percentages',
        body: 'Start with the board, then the executives: everyone, then the black people, then the black women. The app works out each share and compares it with the target.',
      },
      {
        target: 'mc-management',
        title: 'Senior, middle and junior management',
        body: 'Everyone at each level, then the black people by race and gender. These three levels score nothing until the workforce (EAP) targets are attached on the Review page.',
      },
      STEP_CHECKLIST,
      STEP_LIVE_BAR,
    ],
    terms: ['element', 'indicator', 'eap'],
    problems: [
      {
        id: 'area-management-control-zero',
        q: 'Why does Management control show 0 points?',
        a: 'No line has scored yet. The usual reasons: the black headcounts are 0; a total is missing (a share cannot be worked out without everyone in that group); or only senior, middle and junior management are filled in and the workforce (EAP) targets are not attached. “Where you’re losing points” names each line and why.',
      },
      {
        id: 'area-management-control-eap',
        q: 'Why do senior, middle and junior management score nothing?',
        a: 'They are measured against the workforce (EAP) targets, and none are attached to this scorecard yet. Press “Attach the workforce targets” in the notice above those lines; it opens the Review page, where “Attach workforce targets” attaches the active set for the year. If there is none, a REAP administrator adds one under Workforce targets.',
      },
      {
        id: 'area-management-control-count',
        q: 'Do I enter people or percentages?',
        a: 'People. Enter headcounts and the app works out each share. The board and executive directors are compared with fixed targets (half black, a quarter black women); other executives with 60% and 30%.',
      },
      {
        id: 'area-management-control-groups',
        q: 'Why are the management levels split by race and gender?',
        a: 'Each group gets a slice of the target in proportion to its share of the EAP, and earns points only for its own slice. So the points depend on who fills the posts, not only on how many black managers there are: more people in one group do not make up for a group with no one in it.',
      },
      {
        id: 'area-management-control-register',
        q: 'Can I import a list of employees instead of typing headcounts?',
        a: 'Yes. Open “More options: import an employee register”. A register is a list of people by level, race and gender, and the headcounts are worked out from it.',
      },
    ],
    todoVerify: [
      'Management control “Other executives” — where to find it: “the organogram, or the Top management level of the EE report (EEA2)”.',
      'Management control levels — the EE report (EEA2) mapping: senior management = Senior management; middle management = Professionally qualified and middle management; junior management = Skilled technical and junior management.',
      'Management control “Black employees with disabilities” — where to find it: “the EE report (EEA2) or HR records”.',
    ],
  }),

  'area-skills-development': page<SkillsDevelopmentHelpData>({
    route: '/scorecards/calculator/[assessmentId]/generic/skills-development',
    title: 'Skills development',
    topic: 'Scorecard areas',
    purpose:
      'Enter what the company spent training black people, on bursaries and on learners, measured against its leviable payroll. It is worth 20 points plus 5 bonus points, needs at least 8 points or the level drops by one, and scores nothing until three documents are confirmed.',
    next: areaNext,
    steps: [
      {
        target: 'area-points',
        title: 'Points in this area',
        body: 'Skills development’s points out of 20, plus its bonus points. Below it, the priority minimum: at least 8 of the 20 points, or the level drops by one.',
      },
      {
        target: 'skills-confirmations',
        title: 'Confirm the three documents first',
        body: 'No skills points count until the first three are Yes: the SETA-approved skills plan and training report, the Pivotal report and the priority skills programme. Then add the leviable payroll and all employees.',
      },
      {
        target: 'skills-spend',
        title: 'Training spend by group',
        body: 'What was spent training black employees, in rand, for each race and gender group. The target is 3.5% of the leviable payroll.',
      },
      {
        target: 'skills-learners',
        title: 'Learners and the bonus',
        body: 'Black learners, apprentices and interns (target: 5% of all employees). Learners taken on after finishing earn up to 5 bonus points.',
      },
      STEP_LOSING,
      STEP_LIVE_BAR,
    ],
    terms: ['element', 'subMinimum', 'priorityElement', 'leviable', 'eap', 'bonusPoints'],
    problems: [
      {
        id: 'area-skills-development-zero',
        q: 'Why does Skills development show 0 points?',
        a: 'Most often one of the three confirmations at the top is not Yes: the SETA-approved Workplace Skills Plan and Annual Training Report, the Pivotal report, and the priority skills programme. Until all three are Yes, no skills points count. The other common reasons: the workforce (EAP) targets are not attached (attach them on the Review page), or the leviable payroll is empty.',
      },
      {
        id: 'area-skills-development-below-minimum',
        q: 'Why does Skills development say the priority minimum is not met?',
        a: 'Skills development is a priority area: it needs at least 40% of its 20 points, which is 8 points. Bonus points do not count towards it. Below that, the B-BBEE level drops by one; the points themselves are kept. “Where you’re losing points” shows the lines with the most to gain.',
      },
      {
        id: 'area-skills-development-bonus',
        q: 'Why are there no bonus points for learners?',
        a: 'The up to 5 bonus points are for black learners taken on after finishing a learnership, apprenticeship or internship: learners taken on divided by learners who finished. They need “Register of trainees kept” set to Yes and at least one learner who finished. If no register is kept (No), the bonus is 0 but the main 20 points are not affected.',
      },
      {
        id: 'area-skills-development-caps',
        q: 'Why does my training spend count for less than I entered?',
        a: 'Informal workplace learning and training administration (under More options) each count up to 15% of the total skills spend. Anything above that is taken off the training spend on black employees, across every group in proportion.',
      },
      {
        id: 'area-skills-development-targets',
        q: 'What are the targets?',
        a: 'Training spend on black people: 3.5% of the leviable payroll (6 points). Bursaries for black students: 2.5% (4 points). Training black employees with disabilities: 0.3% (4 points). Black learners, apprentices and interns: 5% of all employees (6 points). Points grow in proportion up to each target; spend, bursaries and learners are also split across race and gender groups by EAP.',
      },
    ],
    todoVerify: [
      'Skills “Workplace skills plan and training report approved by the SETA” — where to find it: “the SETA’s acceptance letter or its online portal”.',
      'Skills “Pivotal training report submitted” — where to find it: “the SETA’s confirmation of the submission”.',
      'Skills “Priority skills programme in place” — what it means (“training for the scarce and critical skills the SETA lists”) and where to find it (“the training plan and the SETA’s sector skills plan”).',
      'Skills “Learners taken on afterwards” — “or elsewhere” (existing copy, kept): the engine’s own label is “absorbed into permanent employment”.',
      'Skills learners — where to find it: “the learnership agreements registered with the SETA, and the trainee register”.',
      'Skills “Training administration” — where to find it: “the training budget or the general ledger”.',
      'Skills “Informal workplace learning” — what it covers (“informal or on-the-job learning”).',
    ],
  }),
} satisfies Record<string, PageHelpEntry<never>>

// ─── Scorecard areas: procurement, supplier, enterprise and socio-economic development ────

// ─── Data shapes pages pass in (what each page already has) ──────────────────

/** The full scorecard's Procurement area (procurement/page.tsx). */
export type ProcurementAreaHelpData = {
  /** This page, e.g. /scorecards/calculator/abc/generic/procurement. */
  pageHref: string
  /** A procurement scorecard is attached to this full scorecard. */
  attached: boolean
  /** How many procurement scorecards this company has to choose from. */
  candidates: number
  /** "Create a procurement scorecard", returning here afterwards. */
  createHref: string
  /** The attached procurement scorecard's own page, when one is attached. */
  sourceHref: string | null
  /** The engine's priority sub-minimum for procurement was tested and missed. */
  belowMinimum: boolean
  /** The next area that still needs something (the checklist's own pick). */
  next: { label: string; href: string } | null
  reviewHref: string
}

/** Supplier, enterprise and socio-economic development (ContributionStep.tsx). */
export type ContributionHelpData = {
  /** This page, e.g. /scorecards/calculator/abc/generic/supplier-development. */
  pageHref: string
  /** The engine resolved a positive applicable NPAT, so the area has a target. */
  npatResolved: boolean
  /** Contributions recorded on this area. */
  contributions: number
  /** Contributions whose supporting evidence is not confirmed yet. */
  needEvidence: number
  /** Contributions with evidence confirmed that still do not count (the engine says why on each). */
  notCounted: number
  /** "R 120 000" when recognised contributions are below the target; null when met or unknown. */
  gap: string | null
  /** Enterprise and supplier development only: "Does the bonus apply?" has been answered. Null where there is no bonus. */
  bonusAnswered: boolean | null
  /** The next area that still needs something (the checklist's own pick). */
  next: { label: string; href: string } | null
  reviewHref: string
}

// ─── Next actions ────────────────────────────────────────────────────────────

function moveOn(d: { next: { label: string; href: string } | null; reviewHref: string }, done: string): NextAction {
  return d.next
    ? { text: `${done} Next: ${d.next.label}.`, href: d.next.href, label: `Go to ${d.next.label}` }
    : { text: `${done} Every area has its figures: review the scorecard and calculate the level.`, href: d.reviewHref, label: 'Review my scorecard' }
}

function contributionNext(d: ContributionHelpData): NextAction {
  if (!d.npatResolved) {
    return {
      text: 'Enter profit after tax (NPAT) first. Without it there is no target, so every contribution here scores zero.',
      href: `${d.pageHref}#npat`,
      label: 'Enter NPAT',
    }
  }
  if (d.contributions === 0) {
    return {
      text: 'No contributions yet. Add the first one, with its value and its evidence reference.',
      href: `${d.pageHref}#add-contribution`,
      label: 'Add a contribution',
    }
  }
  if (d.needEvidence > 0) {
    const one = d.needEvidence === 1
    return {
      text: `${plural(d.needEvidence, 'contribution')} still ${one ? 'needs its' : 'need their'} supporting evidence confirmed. Until then ${one ? 'it scores' : 'they score'} nothing.`,
      href: `${d.pageHref}#inputs`,
      label: 'Confirm evidence',
    }
  }
  if (d.notCounted > 0) {
    return {
      text: `${plural(d.notCounted, 'contribution')} ${d.notCounted === 1 ? 'is' : 'are'} not counted. Each one says why, under its name.`,
      href: `${d.pageHref}#inputs`,
      label: 'See why',
    }
  }
  if (d.bonusAnswered === false) {
    return {
      text: 'Answer whether the bonus applies, Yes or No. The area is not finished until you do.',
      href: `${d.pageHref}#bonus`,
      label: 'Answer the bonus question',
    }
  }
  if (d.gap) {
    return {
      text: `${d.gap} short of the target. Add any other contribution made in the year, or move on.`,
      href: `${d.pageHref}#add-contribution`,
      label: 'Add a contribution',
    }
  }
  return moveOn(d, 'Target met: full points here.')
}

// ─── Shared wording for the three contribution areas ─────────────────────────

const ESD_ELIGIBILITY =
  'the beneficiary is at least 51% black-owned and is an EME or QSE (or a Generic business that was an EME or QSE when you first helped it, no more than five years ago)'

const CONTRIBUTION_STEPS = (args: { target: string; points: string }) => [
  {
    target: 'contribution-target',
    title: 'Target, contribution and gap',
    body: `The target is ${args.target} of the company’s profit after tax (NPAT). “Recognised contribution” is what counts so far and “Gap to target” is what is still needed for full points. Until NPAT is entered, this box asks for it instead.`,
  },
  {
    target: 'area-points',
    title: 'Points in this area',
    body: `${args.points} A small “Why?” appears next to it when it is 0 or below its minimum.`,
  },
  {
    target: 'contribution-list',
    title: 'Your contributions',
    body: 'Each contribution with its actual and recognised value. It counts only once you confirm its supporting evidence here; if it still does not count, the reason is shown under its name.',
  },
  {
    target: 'contribution-add',
    title: 'Add a contribution',
    body: 'Beneficiary, value, date and an evidence reference. Tick the evidence box only once you hold the proof; you can also confirm it later from the list.',
  },
]

// ─── Entries ─────────────────────────────────────────────────────────────────

const AREAS_B_HELP = {
  'area-procurement': page<ProcurementAreaHelpData>({
    route: '/scorecards/calculator/[assessmentId]/generic/procurement',
    title: 'Procurement',
    topic: 'Scorecard areas',
    purpose:
      'Procurement scores how much of the company’s buying goes to B-BBEE suppliers. You do not enter spend here: you attach one of the company’s procurement scorecards and its points count in this full scorecard.',
    next: (d) => {
      if (!d.attached && d.candidates === 0) {
        return {
          text: 'This company has no procurement scorecard yet. Create one (total spend and suppliers), then attach it here.',
          href: d.createHref,
          label: 'Create a procurement scorecard',
        }
      }
      if (!d.attached) {
        return {
          text: `Choose one of the company’s ${plural(d.candidates, 'procurement scorecard')} and press Attach.`,
          href: `${d.pageHref}#inputs`,
          label: 'Attach one',
        }
      }
      if (d.belowMinimum && d.sourceHref) {
        return {
          text: 'Procurement is below its priority sub-minimum, which drops the level by one. Open the attached procurement scorecard to see where spend could add points, then attach it again.',
          href: d.sourceHref,
          label: 'Open the procurement scorecard',
        }
      }
      return moveOn(d, 'A procurement scorecard is attached.')
    },
    steps: [
      {
        target: 'area-checklist',
        title: 'Where you are',
        body: 'The two set-up steps and the seven areas, each with its points. Procurement is highlighted. Click any area to go to it.',
      },
      {
        target: 'procurement-attached',
        title: 'The attached procurement scorecard',
        body: 'Which procurement scorecard is in use, when it was copied in, its total spend (TMPS) and whether the 51% flow-through was used.',
        missing: 'Nothing is attached yet. Attach a procurement scorecard below and its details appear here.',
      },
      {
        target: 'area-points',
        title: 'Points in this area',
        body: 'Out of 25, plus up to 2 bonus points for spend with designated group suppliers. A small “Why?” appears next to it when it is 0 or below its minimum.',
      },
      {
        target: 'procurement-attach',
        title: 'Attach or create',
        body: 'Choose one of this company’s procurement scorecards and press Attach, or create a new one: you come straight back here to attach it.',
      },
      {
        target: 'live-score-bar',
        title: 'Level so far',
        body: 'The B-BBEE level on the figures entered so far, and the next area that still needs something.',
      },
    ],
    terms: ['procurementScorecard', 'tmps', 'recognitionLevel', 'recognisedSpend', 'flowThrough', 'bonusPoints', 'designatedGroup', 'subMinimum'],
    problems: [
      {
        id: 'area-procurement-zero',
        q: 'Why does procurement score 0?',
        a: 'The attached procurement scorecard has no total spend (TMPS), or none of its spend is with B-BBEE suppliers. Open it with “Open it”, check the total spend and each supplier’s B-BBEE level, then attach it again here.',
      },
      {
        id: 'area-procurement-below-minimum',
        q: 'Why is procurement below its minimum?',
        a: 'Procurement is a priority area: it needs at least 40% of its 25 points (10 points), or the B-BBEE level drops by one. Bonus points do not count towards the minimum. The biggest indicator is spend with suppliers that are at least 51% black-owned (11 points, for 50% of total spend). Improve the procurement scorecard, then attach it again here.',
      },
      {
        id: 'area-procurement-not-updating',
        q: 'I changed the procurement scorecard. Why did the points here not change?',
        a: 'The full scorecard keeps a copy taken when you attached it. Attach the procurement scorecard again (“Replace and attach”) to bring the changes in, then calculate the scorecard again.',
      },
      {
        id: 'area-procurement-which',
        q: 'Which procurement scorecard should I attach?',
        // TODO-VERIFY: that the procurement scorecard should cover the same measurement period as the full scorecard (the app does not check this).
        a: 'The one that covers the same financial year as this full scorecard. Each choice in the list shows its year, its points and its total spend. The app does not check that the years match.',
      },
      {
        id: 'area-procurement-none',
        q: 'What if the company has no procurement scorecard?',
        a: 'Press “Create a procurement scorecard”, enter the total spend and the suppliers with their B-BBEE levels, and save. You come straight back here with it selected; press Attach.',
      },
    ],
    todoVerify: ['That the attached procurement scorecard should cover the same measurement period as the full scorecard (the app does not check it).'],
  }),

  'area-supplier-development': page<ContributionHelpData>({
    route: '/scorecards/calculator/[assessmentId]/generic/supplier-development',
    title: 'Supplier development',
    topic: 'Scorecard areas',
    purpose:
      'Record the money and help the company gave its own black-owned suppliers to grow. Each contribution counts only once its evidence is confirmed, and the points follow from how close the total comes to 2% of profit after tax (NPAT).',
    next: contributionNext,
    steps: [
      ...CONTRIBUTION_STEPS({
        target: '2%',
        points: 'Out of 10, in proportion to how close the recognised total comes to the target, plus 1 bonus point.',
      }),
      {
        target: 'contribution-bonus',
        title: 'Graduation bonus',
        // TODO-VERIFY: plain wording of the graduation bonus (engine label: graduation of one or more enterprise development beneficiaries to supplier development level).
        body: 'One bonus point when a business you supported through enterprise development has grown to supplier development level. Answer Yes or No: the area is not finished until you do.',
      },
    ],
    terms: ['npat', 'deemedNpat', 'evidence', 'benefitFactor', 'blackOwned', 'eme', 'qse', 'subMinimum', 'bonusPoints', 'esd'],
    problems: [
      {
        id: 'area-supplier-development-zero',
        q: 'Why does supplier development score 0?',
        a: `There is no NPAT yet (the box at the top asks for it), no contribution has been added, or none of them counts yet. A contribution counts only when its supporting evidence is confirmed, it has an actual value, and ${ESD_ELIGIBILITY}. Each one that does not count says why under its name.`,
      },
      {
        id: 'area-supplier-development-below-minimum',
        q: 'Why is supplier development below its minimum?',
        a: 'Supplier development is a priority area: it needs at least 40% of its 10 points (4 points), or the B-BBEE level drops by one. That means recognised contributions of at least 0.8% of NPAT (40% of the 2% target). The bonus point does not count towards it. Add contributions, or confirm the evidence on the ones you have.',
      },
      {
        id: 'area-supplier-development-not-recognised',
        q: 'Why does a contribution say “Not recognised — scores zero”?',
        a: `It is not counted until its evidence is confirmed, it has an actual value, and ${ESD_ELIGIBILITY}. The lines under it name the field to fix. To change a field, delete the contribution and add it again.`,
      },
      {
        id: 'area-supplier-development-npat',
        q: 'Why does this page ask for NPAT?',
        a: 'The target is 2% of NPAT, so without NPAT there is no target and everything scores zero. Enter actual NPAT in the box. If the company made a loss or a very small profit, enter revenue and the industry profit norm on Financial figures: the app then uses deemed NPAT when it is higher.',
      },
      {
        id: 'area-supplier-development-bonus',
        q: 'How do I get the graduation bonus point?',
        a: 'Answer Yes to “Does the bonus apply?” and tick “Supporting evidence recorded”. Yes without the evidence tick gives no point. If it does not apply, answer No.',
      },
    ],
    todoVerify: [
      'Graduation bonus wording: "a business you supported through enterprise development has grown to supplier development level" (engine label: graduation of one or more enterprise development beneficiaries to supplier development level), and the example "a catering business you mentored now supplies your canteen".',
      'Where to find the graduation evidence: "the earlier enterprise development agreement and the current supplier agreement or purchase orders".',
      'Where to find "Was EME/QSE at first assistance?" and "Years since first assistance": "the first agreement or first payment to the beneficiary".',
      'What a consultant should enter for a loan, guarantee or professional services contribution, given the app counts every contribution as a grant at 100%.',
      'That the contribution date should fall inside the measurement period (the engine does not use the date).',
    ],
  }),

  'area-enterprise-development': page<ContributionHelpData>({
    route: '/scorecards/calculator/[assessmentId]/generic/enterprise-development',
    title: 'Enterprise development',
    topic: 'Scorecard areas',
    purpose:
      'Record the money and help the company gave other black-owned businesses to grow. Each contribution counts only once its evidence is confirmed, and the points follow from how close the total comes to 1% of profit after tax (NPAT).',
    next: contributionNext,
    steps: [
      ...CONTRIBUTION_STEPS({
        target: '1%',
        points: 'Out of 5, in proportion to how close the recognised total comes to the target, plus 1 bonus point.',
      }),
      {
        target: 'contribution-bonus',
        title: 'Job creation bonus',
        // TODO-VERIFY: plain wording of the job creation bonus, and whether the codes set a minimum number of jobs (the engine treats it as a plain Yes/No).
        body: 'One bonus point when the company’s enterprise and supplier development work created jobs. Answer Yes or No: the area is not finished until you do.',
      },
    ],
    terms: ['npat', 'deemedNpat', 'evidence', 'benefitFactor', 'blackOwned', 'eme', 'qse', 'subMinimum', 'bonusPoints', 'esd'],
    problems: [
      {
        id: 'area-enterprise-development-zero',
        q: 'Why does enterprise development score 0?',
        a: `There is no NPAT yet (the box at the top asks for it), no contribution has been added, or none of them counts yet. A contribution counts only when its supporting evidence is confirmed, it has an actual value, and ${ESD_ELIGIBILITY}. Each one that does not count says why under its name.`,
      },
      {
        id: 'area-enterprise-development-below-minimum',
        q: 'Why is enterprise development below its minimum?',
        a: 'Enterprise development is a priority area: it needs at least 40% of its 5 points (2 points), or the B-BBEE level drops by one. That means recognised contributions of at least 0.4% of NPAT (40% of the 1% target). The bonus point does not count towards it. Add contributions, or confirm the evidence on the ones you have.',
      },
      {
        id: 'area-enterprise-development-not-recognised',
        q: 'Why does a contribution say “Not recognised — scores zero”?',
        a: `It is not counted until its evidence is confirmed, it has an actual value, and ${ESD_ELIGIBILITY}. The lines under it name the field to fix. To change a field, delete the contribution and add it again.`,
      },
      {
        id: 'area-enterprise-development-npat',
        q: 'Why does this page ask for NPAT?',
        a: 'The target is 1% of NPAT, so without NPAT there is no target and everything scores zero. Enter actual NPAT in the box. If the company made a loss or a very small profit, enter revenue and the industry profit norm on Financial figures: the app then uses deemed NPAT when it is higher.',
      },
      {
        id: 'area-enterprise-development-bonus',
        q: 'How do I get the job creation bonus point?',
        a: 'Answer Yes to “Does the bonus apply?” and tick “Supporting evidence recorded”. Yes without the evidence tick gives no point. If it does not apply, answer No.',
      },
    ],
    todoVerify: [
      'Job creation bonus wording: "your enterprise and supplier development work created new jobs at the businesses you supported", the example, and whether the codes set a minimum number or growth of jobs (the engine treats it as a plain Yes/No worth 1 point; the workbook also carries an "11% more new jobs" row worth 2 points that the engine leaves out).',
      'Where to find the job creation evidence: "the beneficiaries’ payroll or employment records".',
      'Where to find "Was EME/QSE at first assistance?" and "Years since first assistance": "the first agreement or first payment to the beneficiary".',
      'What a consultant should enter for a loan, guarantee or professional services contribution, given the app counts every contribution as a grant at 100%.',
      'That the contribution date should fall inside the measurement period (the engine does not use the date).',
    ],
  }),

  'area-socio-economic-development': page<ContributionHelpData>({
    route: '/scorecards/calculator/[assessmentId]/generic/socio-economic-development',
    title: 'Socio-economic development',
    topic: 'Scorecard areas',
    purpose:
      'Record what the company gave to community projects that help black people, such as grants and bursaries. Each contribution counts only once its evidence is confirmed, and the points follow from how close the total comes to 1% of profit after tax (NPAT).',
    next: contributionNext,
    steps: [
      ...CONTRIBUTION_STEPS({
        target: '1%',
        points: 'Out of 5, in proportion to how close the recognised total comes to the target. This area has no bonus and no minimum.',
      }),
      {
        target: 'contribution-done',
        title: 'Move on',
        body: 'When every contribution is in and its evidence confirmed, go to the next area, or review the scorecard if this was the last.',
      },
    ],
    terms: ['npat', 'deemedNpat', 'evidence', 'benefitFactor'],
    problems: [
      {
        id: 'area-socio-economic-development-zero',
        q: 'Why does socio-economic development score 0?',
        a: 'There is no NPAT yet (the box at the top asks for it), no contribution has been added, or none of them counts yet. A contribution counts only when its supporting evidence is confirmed, it has an actual value, and its “Black beneficiaries %” is above 0. Each one that does not count says why under its name.',
      },
      {
        id: 'area-socio-economic-development-not-recognised',
        q: 'Why does a contribution say “Not recognised — scores zero”?',
        a: 'It is not counted until its evidence is confirmed, it has an actual value, and its “Black beneficiaries %” is filled in and above 0. The lines under it name the field to fix. To change a field, delete the contribution and add it again.',
      },
      {
        id: 'area-socio-economic-development-part-counted',
        q: 'Why is only part of a contribution counted?',
        // TODO-VERIFY: whether a contribution with at least 75% black beneficiaries should count in full (the engine always counts it in proportion).
        a: 'It counts in proportion to its black beneficiaries: R100 000 to a project where 80% of the people helped are black counts as R80 000. At 100 it counts in full.',
      },
      {
        id: 'area-socio-economic-development-npat',
        q: 'Why does this page ask for NPAT?',
        a: 'The target is 1% of NPAT, so without NPAT there is no target and everything scores zero. Enter actual NPAT in the box. If the company made a loss or a very small profit, enter revenue and the industry profit norm on Financial figures: the app then uses deemed NPAT when it is higher.',
      },
      {
        id: 'area-socio-economic-development-loans',
        q: 'Can a loan or an investment count here?',
        a: 'No. Grants, bursaries and direct costs count; loans and equity do not.',
      },
    ],
    todoVerify: [
      'Whether a contribution with at least 75% black beneficiaries should count in full; the engine always counts it in proportion (docs/FOR_STUART.md, 9.6).',
      'Where to find "Black beneficiaries %": "the beneficiary organisation’s letter or register of the people it helps".',
      'That the contribution date should fall inside the measurement period (the engine does not use the date).',
    ],
  }),
} satisfies Record<string, PageHelpEntry<never>>

// ─── Procurement and the Aberdare client workspace ─────────────────────────

// ─── Data shapes the procurement pages pass in (what each page already has) ──

export type ProcurementListHelpData = {
  /** How many procurement scorecards the list shows. */
  count: number
  /** The newest one (the list is newest first). */
  latest: { href: string; label: string } | null
}

/**
 * The supplier form (new and edit share it). Everything here is already worked
 * out by the form for its own checks and "Score so far".
 */
export type ProcurementFormHelpData = {
  step: 'suppliers' | 'check' | 'spend'
  suppliers: number
  /** Open "Needs attention" items. */
  attention: number
  /** Zero or negative amounts: these stop the save. */
  blocking: number
  /** The total measured procurement spend is above zero. */
  spendSet: boolean
  /** Where the total spend comes from right now. */
  spendSource: 'supplier_list' | 'statements'
  /** The words on the save button ("Save and see result" / "Save changes"). */
  saveLabel: string
}

export type ProcurementResultHelpData = {
  /** True when this person owns the scorecard (REAP staff may view others). */
  owner: boolean
  scored: boolean
  attention: number
  editHref: string
  reportHref: string
  /** The full scorecard this is already attached to, if any. */
  fullScorecardHref: string | null
}

export type AberdareHelpData = { liveHref: string }

export type AberdareLiveHelpData = {
  step: 'upload' | 'review' | 'test'
  /** Suppliers changed in the scenario. */
  modified: number
}

// The form's "next" is the same on the new and the edit page.
// The #procurement-step-… links open that step of the form (the form listens for them).
const formNext = (d: ProcurementFormHelpData) => {
  if (d.suppliers === 0) {
    return {
      text: 'Start with the supplier list: upload it, or add suppliers one at a time.',
      href: '#procurement-step-suppliers',
      label: 'Add suppliers',
    }
  }
  if (d.blocking > 0) {
    return {
      text: `${plural(d.blocking, 'supplier')} ${d.blocking === 1 ? 'has' : 'have'} a zero or negative amount. That must be fixed before you can save.`,
      href: '#procurement-step-check',
      label: 'Fix them',
    }
  }
  if (d.attention > 0) {
    return {
      text: `${plural(d.attention, 'thing')} in the supplier list ${d.attention === 1 ? 'needs' : 'need'} attention. Until then the score is marked Incomplete.`,
      href: '#procurement-step-check',
      label: 'Fix them',
    }
  }
  if (!d.spendSet) {
    return { text: 'The total spend is zero, so nothing can be scored yet.', href: '#procurement-step-spend', label: 'Set the total spend' }
  }
  if (d.step !== 'spend' && d.spendSource === 'supplier_list') {
    return {
      text: 'The total spend is still the total of the supplier list. Confirm it, or work it out from the financial statements.',
      href: '#procurement-step-spend',
      label: 'Confirm total spend',
    }
  }
  return { text: `Everything is ready. Press ${d.saveLabel} at the bottom of the Total spend step.`, href: '#procurement-step-spend', label: 'Go to save' }
}

// TODO-VERIFY: certificates are checked against 31 December of the scorecard year (or today if that is earlier).
// That is what the app does (certificateReferenceDate); confirm it matches what verification agencies apply
// for companies whose financial year does not end in December.
const EXPIRED_ANSWER =
  'It is listed under Needs attention and still counts at its level until you act. Press Mark non-compliant (it then counts nothing), or enter the new certificate’s level and expiry date. The app checks certificates against 31 December of the scorecard year, or today if that date has not come yet.'

const ZERO_ANSWER =
  'No supplier counts towards it yet. A supplier with no level, or marked Non-compliant, counts nothing on any line. The other lines need the right details: the EME and QSE lines need the supplier type, and the ownership lines need the ticks under Ownership. If every line is 0, check that the suppliers have levels and that the total spend is right.'

const CANT_SAVE_ANSWER =
  'Saving needs a year between 2000 and 2100, at least one supplier, a name on every supplier, no zero or negative amounts, and a total spend above zero. The message above the save button says which one is missing and takes you to that step.'

const PROCUREMENT_HELP = {
  // ── Procurement ──
  procurement: page<ProcurementListHelpData>({
    route: '/procurement',
    title: 'Procurement scorecards',
    topic: 'Procurement',
    purpose:
      'Every procurement scorecard you have saved, newest first, with its points out of 25 plus bonus. Open one to see its result, or start a new one for a client who needs only procurement.',
    next: (d) =>
      d.count === 0 || !d.latest
        ? { text: 'You have no procurement scorecards yet. Start one with the client’s supplier list.', href: '/start?type=procurement', label: 'Start one' }
        : { text: `Your latest is ${d.latest.label}.`, href: d.latest.href, label: 'Open it' },
    steps: [
      {
        target: 'procurement-intro',
        title: 'What a procurement scorecard is',
        body: 'It scores only supplier spend: up to 25 points, plus 2 bonus points. It is one of the seven areas of the full scorecard.',
      },
      {
        target: 'procurement-start',
        title: 'Start a new one',
        body: 'Choose the company, then upload its supplier list. You need the list and, ideally, the year’s financial statements.',
      },
      {
        target: 'procurement-list',
        title: 'Your procurement scorecards',
        body: 'Each one with its company, year and points. Click a row to open its result.',
        missing: 'You have no procurement scorecards yet. They appear here after you save one.',
      },
      { target: 'help-button', title: 'Help on every page', body: 'This “?” opens help made for the page you are on. The ? key does the same.' },
    ],
    terms: ['procurementScorecard', 'bonusPoints', 'tmps', 'fullScorecard'],
    problems: [
      {
        id: 'procurement-full-or-only',
        q: 'Should I use a procurement scorecard or a full scorecard?',
        a: 'Use a procurement scorecard when the client needs only the procurement score, or to get procurement right first. It does not give a B-BBEE level on its own: open it and press Continue to full scorecard to count it towards the level.',
      },
      {
        id: 'procurement-score-format',
        q: 'What does “22.40 of 25 points, bonus 1.00 of 2” mean?',
        a: 'The five main lines count at most 25 points together. The bonus line, for spend with black designated group suppliers, adds up to 2 more and is shown apart.',
      },
      {
        id: 'procurement-missing',
        q: 'Why is a procurement scorecard I started not listed?',
        a: 'A procurement scorecard is kept only once you press Save on its last step. One you left before saving was not kept, so start it again.',
        link: { href: '/start?type=procurement', label: 'Start a procurement scorecard' },
      },
      {
        id: 'procurement-delete',
        q: 'How do I delete one?',
        a: 'Open it and use Delete at the bottom of its page. Only the person who owns it can delete it.',
      },
    ],
  }),

  'procurement-new': page<ProcurementFormHelpData>({
    route: '/procurement/assessments/new',
    title: 'New procurement scorecard',
    topic: 'Procurement',
    purpose:
      'Score how much of a company’s buying goes to B-BBEE suppliers. Add the supplier list, fix anything that needs attention, set the total spend, then save to see the result.',
    next: formNext,
    steps: [
      {
        target: 'procurement-form-steps',
        title: 'Three steps, then the result',
        body: 'Suppliers, Check suppliers and Total spend. Next moves you on; nothing is saved until you press Save and see result on the last step.',
      },
      {
        target: 'procurement-form-year',
        title: 'The year',
        body: 'The year the spend was in, for example 2025. Certificates are checked against the end of this year.',
        missing: 'This is on the Suppliers step. Press Back to suppliers to see it.',
      },
      {
        target: 'procurement-form-upload',
        title: 'Upload the supplier list',
        body: 'Excel or CSV, one row per supplier. Only the name and the amount without VAT are needed; the level, ownership and certificate expiry are used when they are there. No list yet? Download the template here.',
        missing: 'A supplier list is already loaded. Press Upload a different list to replace it, or go back to the Suppliers step.',
      },
      {
        target: 'procurement-form-suppliers',
        title: 'Check or add suppliers',
        body: 'Every supplier with its spend and level. Open one to change its details, or add suppliers by hand or by pasting rows from a spreadsheet.',
        missing: 'This is on the Suppliers step. Press Back to suppliers to see it.',
      },
      {
        target: 'procurement-form-next',
        title: 'Then check suppliers and set the total spend',
        body: 'The next step lists expired certificates, missing levels, possible duplicates and odd amounts, each with a one-click fix. After that, set the total spend and save.',
        missing: 'You are already past the Suppliers step.',
      },
    ],
    terms: ['tmps', 'recognitionLevel', 'recognisedSpend', 'blackOwned', 'blackWomenOwned', 'designatedGroup', 'flowThrough', 'eme', 'qse', 'bonusPoints'],
    problems: [
      {
        id: 'procurement-new-what-file',
        q: 'What file do I upload?',
        a: 'A list with one row per supplier, usually the client’s purchases or creditors report for the year. The supplier name and the amount spent without VAT are needed. The B-BBEE level, ownership, supplier type, VAT number, registration number and certificate expiry are used when they are there. Excel (.xlsx, .xls) or CSV. If the client has no list, download the Excel or CSV template from the upload box.',
      },
      { id: 'procurement-new-expired', q: 'What happens to a supplier whose certificate has expired?', a: EXPIRED_ANSWER },
      {
        id: 'procurement-new-total-spend',
        q: 'Which total spend should I use?',
        a: 'Total measured procurement spend comes from the financial statements: what counts (such as cost of sales) minus what is left out (such as salaries). Until you set it, the app uses the total of the supplier list, which is only right if the list covers all of the year’s buying. On the Total spend step, open More options to work it out from the statements.',
      },
      { id: 'procurement-new-zero', q: 'Why is the score or a line 0?', a: ZERO_ANSWER },
      { id: 'procurement-new-cant-save', q: 'Why can I not save?', a: CANT_SAVE_ANSWER },
    ],
    todoVerify: [
      'Certificates are checked against 31 December of the scorecard year (or today if earlier). Confirm this matches what verification agencies apply for non-December year ends.',
      'Field guidance for the total spend lines (which statement line each comes from, and when purchases, utilities, service fees, recharges and finance costs should be entered separately so nothing is counted twice).',
      'When a supplier qualifies for the 51% flow-through tick (the app counts its recognised spend at 1.2 times).',
      'What the free-text supplier fields BO etc, FTS, DES and PROP hold (they are kept but not used in the score).',
    ],
  }),

  'procurement-edit': page<ProcurementFormHelpData>({
    route: '/procurement/assessments/[id]/edit',
    title: 'Edit procurement scorecard',
    topic: 'Procurement',
    purpose:
      'Change the suppliers, the year or the total spend of a saved procurement scorecard. Saving works the score out again.',
    next: formNext,
    steps: [
      {
        target: 'procurement-edit-intro',
        title: 'What saving changes',
        body: 'Saving works this score out again. A full scorecard this is attached to keeps its old copy until you attach it again there.',
      },
      {
        target: 'procurement-form-steps',
        title: 'The same three steps',
        body: 'Suppliers, Check suppliers and Total spend. Nothing is saved until you press Save changes on the last step.',
      },
      {
        target: 'procurement-form-suppliers',
        title: 'The saved suppliers',
        body: 'Open a supplier to change its spend, level, certificate expiry or ownership. Upload a different list to replace them all.',
        missing: 'This is on the Suppliers step. Press Back to suppliers to see it.',
      },
      {
        target: 'procurement-form-year',
        title: 'The year',
        body: 'Changing the year changes which certificates count as expired.',
        missing: 'This is on the Suppliers step. Press Back to suppliers to see it.',
      },
      {
        target: 'procurement-form-next',
        title: 'Check, then total spend',
        body: 'Fix anything under Needs attention, confirm the total spend, then press Save changes.',
        missing: 'You are already past the Suppliers step.',
      },
    ],
    terms: ['tmps', 'recognitionLevel', 'recognisedSpend', 'blackOwned', 'blackWomenOwned', 'designatedGroup', 'flowThrough', 'eme', 'qse', 'bonusPoints'],
    problems: [
      {
        id: 'procurement-edit-full',
        q: 'Does the full scorecard change when I save?',
        a: 'No. A full scorecard this is attached to keeps its copy. Attach this procurement scorecard again on the full scorecard’s Procurement area to bring the new points across.',
      },
      {
        id: 'procurement-edit-replace',
        q: 'What happens if I upload a different list?',
        a: 'Once you press Use these suppliers, the new list replaces every supplier on this scorecard, and any “keep both” choices for duplicates start again. Nothing is saved until you press Save changes.',
      },
      { id: 'procurement-edit-expired', q: 'What happens to a supplier whose certificate has expired?', a: EXPIRED_ANSWER },
      { id: 'procurement-edit-zero', q: 'Why is the score or a line 0?', a: ZERO_ANSWER },
      { id: 'procurement-edit-cant-save', q: 'Why can I not save?', a: CANT_SAVE_ANSWER },
    ],
    todoVerify: [
      'Certificates are checked against 31 December of the scorecard year (or today if earlier). Confirm this matches what verification agencies apply for non-December year ends.',
      'Field guidance for the total spend lines (which statement line each comes from, and when to enter lines separately so nothing is counted twice).',
      'When a supplier qualifies for the 51% flow-through tick.',
      'What the free-text supplier fields BO etc, FTS, DES and PROP hold.',
    ],
  }),

  'procurement-result': page<ProcurementResultHelpData>({
    route: '/procurement/assessments/[id]',
    title: 'Procurement scorecard',
    topic: 'Procurement',
    purpose:
      'The saved procurement score: points out of 25 plus bonus, what is holding it back and how each indicator scored. From here, continue to a full scorecard or download the report.',
    next: (d) => {
      if (!d.scored) {
        return d.owner
          ? { text: 'This scorecard has no score yet: it needs suppliers and a total spend above zero.', href: d.editHref, label: 'Add suppliers and total spend' }
          : null
      }
      if (d.attention > 0 && d.owner) {
        return {
          text: `${plural(d.attention, 'thing')} in the supplier list ${d.attention === 1 ? 'needs' : 'need'} attention, so the score is marked Incomplete.`,
          href: d.editHref,
          label: 'Fix the supplier list',
        }
      }
      if (d.fullScorecardHref) {
        return { text: 'These points are attached to a full scorecard. Carry on there.', href: d.fullScorecardHref, label: 'Open the full scorecard' }
      }
      if (d.owner) {
        return {
          text: 'To count these points towards a B-BBEE level, continue to a full scorecard.',
          href: '#procurement-result-next',
          label: 'Continue to full scorecard',
        }
      }
      return { text: 'Open the printable report.', href: d.reportHref, label: 'Open the report' }
    },
    steps: [
      {
        target: 'procurement-result-score',
        title: 'The score',
        body: 'Points out of 25, the bonus out of 2, and the indicator with the most points still to gain.',
        missing: 'This scorecard has no score yet. It needs at least one supplier and a total spend above zero.',
      },
      {
        target: 'procurement-result-attention',
        title: 'What still needs fixing',
        body: 'Anything in the supplier list that makes the score Incomplete, with a link to fix it.',
        missing: 'Nothing needs attention: every supplier has a level, an in-date certificate and a usable amount.',
      },
      {
        target: 'procurement-result-lines',
        title: 'How each indicator scored',
        body: 'Their share against the target, and the points. Open an indicator to see the suppliers that count towards it.',
        missing: 'Shown once the scorecard has a score.',
      },
      {
        target: 'procurement-result-download',
        title: 'The report',
        body: 'Download report gives a PDF to send to the client.',
      },
      {
        target: 'procurement-result-next',
        title: 'Next: the full scorecard',
        body: 'Procurement is one of the seven areas. Continue to full scorecard to count these points towards a B-BBEE level.',
      },
    ],
    terms: ['recognisedSpend', 'recognitionLevel', 'tmps', 'bonusPoints', 'indicator', 'fullScorecard', 'generic'],
    problems: [
      {
        id: 'procurement-result-incomplete',
        q: 'Why is the score marked Incomplete?',
        a: 'Something in the supplier list still needs attention: an expired certificate, a missing level, a possible duplicate or an odd amount. The list under the score says what. A supplier with an expired certificate still counts at its level until it is marked non-compliant, so the score can be too high until it is fixed.',
      },
      { id: 'procurement-result-zero', q: 'Why is the score or an indicator 0?', a: ZERO_ANSWER },
      {
        id: 'procurement-result-full',
        q: 'How do these points count towards the B-BBEE level?',
        a: 'Press Continue to full scorecard. It makes a full scorecard for the same company and year with this procurement scorecard attached. There procurement counts for up to 25 points plus 2 bonus, the same as here.',
      },
      {
        id: 'procurement-result-report',
        q: 'How do I give the client a report?',
        a: 'Download report saves a PDF. Open the printable report shows the same report on screen, ready to print.',
      },
      {
        id: 'procurement-result-qse',
        q: 'Why does it say the QSE procurement scorecard is not in the app?',
        a: 'The app has the targets for large companies (the Generic scorecard) only. For a QSE or EME the score uses those targets, so treat it as a guide.',
      },
    ],
  }),

  // ── Client workspace ──
  aberdare: page<AberdareHelpData>({
    route: '/clients/aberdare/procurement-control-preview',
    title: 'Aberdare workspace',
    topic: 'Client workspace',
    purpose:
      'Aberdare Cables’ own workspace. Use Live procurement control to test supplier changes on the latest monthly spend report, and the formal assessment when a scored report is needed.',
    next: (d) => ({
      text: 'Upload this month’s supplier-spend report to see the current procurement position.',
      href: d.liveHref,
      label: 'Open live procurement',
    }),
    steps: [
      {
        target: 'aberdare-live-card',
        title: 'Live procurement control',
        body: 'Upload the monthly spend report and try supplier changes. The report itself is never changed.',
      },
      {
        target: 'aberdare-formal-card',
        title: 'Formal assessment',
        body: 'The standard procurement scorecard, with its saved score and PDF report.',
      },
      {
        target: 'aberdare-workflow',
        title: 'How they fit together',
        body: 'The monthly report feeds live monitoring during the year; the formal assessment gives the scored report.',
      },
      { target: 'help-button', title: 'Help on every page', body: 'This “?” opens help made for the page you are on. The ? key does the same.' },
    ],
    terms: ['procurementScorecard', 'recognisedSpend', 'tmps'],
    problems: [
      {
        id: 'aberdare-which',
        q: 'Which one do I use?',
        a: 'Live procurement control to see where Aberdare stands this month and to test “what if” changes. The formal assessment when you need a saved score and a report.',
      },
      {
        id: 'aberdare-saved',
        q: 'Is anything saved here?',
        a: 'Live procurement control saves nothing to REAP: the report is read in your browser and kept only while the page is open. The formal assessment is saved like any other procurement scorecard.',
      },
      {
        id: 'aberdare-who',
        q: 'Who can see this workspace?',
        a: 'Anyone signed in to this REAP app who has the link. The Workspaces card on Home that leads here appears only where the client workspace is switched on, and it is never on the public demo.',
      },
    ],
  }),

  'aberdare-live': page<AberdareLiveHelpData>({
    route: '/clients/aberdare/procurement-control-preview/live',
    title: 'Aberdare live procurement',
    topic: 'Client workspace',
    purpose:
      'Upload Aberdare’s monthly spend report to see the current procurement points, then try supplier changes and compare the projected points. Nothing here is saved.',
    next: (d) =>
      d.step === 'upload'
        ? { text: 'Upload the latest monthly spend report (.xlsx). It is read in this browser only.', href: '#aberdare-upload', label: 'Go to the upload' }
        : d.step === 'review'
          ? { text: 'Open a supplier and press Test change, or try one of the Example buttons.', href: '#aberdare-suppliers', label: 'Go to the suppliers' }
          : {
              text: `${plural(d.modified, 'supplier')} changed. Compare the current and projected points.`,
              href: '#aberdare-comparison',
              label: 'See the comparison',
            },
    steps: [
      {
        target: 'aberdare-live-steps',
        title: 'Upload, review, adjust',
        body: 'The highlighted step is where you are. The line under it says what to do now.',
      },
      {
        target: 'aberdare-live-upload',
        title: 'Upload the spend report',
        body: 'Aberdare’s BBBEE spend report as .xlsx, up to 5 MB. It is read in your browser and not sent anywhere.',
        missing: 'A report is already loaded. Press Replace report to upload another.',
      },
      {
        target: 'aberdare-live-position',
        title: 'The current position',
        body: 'Spend from the report, imported spend left out, recognised spend and the current procurement points.',
        missing: 'Upload a report first; the current position appears here.',
      },
      {
        target: 'aberdare-live-comparison',
        title: 'Current against projected',
        body: 'The points as reported, the points with your changes, and the difference.',
        missing: 'Upload a report first; the comparison appears here.',
      },
      {
        target: 'aberdare-live-suppliers',
        title: 'Try a change',
        body: 'Find a supplier and press Test change to try a different level, spend or import status. Undo and Reset adjustments are above.',
        missing: 'Upload a report first; the suppliers appear here.',
      },
    ],
    terms: ['recognisedSpend', 'recognitionLevel', 'tmps', 'procurementScorecard'],
    problems: [
      {
        id: 'aberdare-live-file',
        q: 'What file does it need?',
        a: 'Aberdare’s BBBEE spend report as an Excel workbook (.xlsx), up to 5 MB. The first sheet must have a heading row with Company, Accred level, Vendor Code, Vendor Name and Amount Excl Vat.',
      },
      {
        id: 'aberdare-live-points',
        q: 'Why are the points out of 29, not 25 plus bonus?',
        a: 'Here the six procurement lines are simply added up (5 + 3 + 4 + 11 + 4 + 2 = 29), and the total spend is the report’s spend without imports. The formal assessment counts the five main lines at most 25, adds the bonus apart, and uses the total measured procurement spend from the financial statements. Use this page to see the direction of a change, and the formal assessment for the score.',
      },
      {
        id: 'aberdare-live-imports',
        q: 'Why is imported spend left out?',
        a: 'Suppliers marked Y in the report’s Import column are treated as imported: their spend is shown but left out of the eligible spend and the points. This is a provisional rule; the final treatment of imports is still to be confirmed with Aberdare.',
      },
      {
        id: 'aberdare-live-saved',
        q: 'Are my changes saved?',
        a: 'No. The report and your changes stay in this browser tab. If you reload or leave the page, upload the report again; uploading always starts with no changes.',
      },
      {
        id: 'aberdare-live-undo',
        q: 'How do I take a change back?',
        a: 'Undo takes back the last change. Reset adjustments takes back every change and keeps the report. Clear session removes the report as well.',
      },
    ],
    todoVerify: [
      'Imported spend: the workspace leaves suppliers marked Import = Y out of the eligible spend and the points. The app itself calls this provisional, to be confirmed with the client.',
    ],
  }),
} satisfies Record<string, PageHelpEntry<never>>

// ─── Every page, keyed by page (Home and Settings here; the groups above) ───

export const PAGE_HELP = {
  // ── Getting started ──
  home: page<HomeHelpData>({
    route: '/dashboard',
    title: 'Home',
    topic: 'Getting started',
    purpose:
      'Home shows your latest full scorecard, what still needs you, and every company you work on. Start here each day to see where things stand.',
    next: (d) =>
      d.next && d.next.title !== 'Everything is up to date'
        ? { text: d.next.title, href: d.next.href, label: d.next.button }
        : { text: 'Everything is up to date. Start a new scorecard when you have the next client.', href: '/start', label: 'Start new' },
    steps: [
      {
        target: 'home-score',
        title: 'Your latest score',
        body: 'The teal card is your most recently changed full scorecard: its points out of 109, its B-BBEE level, and each area as a ring.',
        missing: 'You have no full scorecard yet. When you start one, its score and level appear here.',
      },
      {
        target: 'needs-you',
        title: 'What needs you',
        body: 'The next thing to do, and anything that stops a level from being final. Each line links straight to the place to fix it.',
      },
      {
        target: 'home-areas',
        title: 'Points by area',
        body: 'The five groups of areas from the same scorecard, each with its points and status. Click one to open it.',
        missing: 'This appears once you have a full scorecard.',
      },
      {
        target: 'home-companies',
        title: 'Your companies',
        body: 'Every company with its size, scorecard status and live score. Click a row to see all of its work.',
        missing: 'Your companies are listed here once you add the first one.',
      },
      {
        target: 'start-new',
        title: 'Start something new',
        body: 'Start new is always at the top of the menu: choose a company, then a full scorecard or procurement only.',
      },
    ],
    terms: ['level', 'element', 'subMinimum', 'procurementScorecard'],
    problems: [
      {
        id: 'home-which-scorecard',
        q: 'Why does the score card show this company and not another?',
        a: 'Home shows the full scorecard you changed most recently. Open any other company from Your companies to see its score.',
      },
      {
        id: 'home-not-final',
        q: 'Why does it say "Not final"?',
        a: 'Something the level depends on is still missing, such as a figure or confirmed evidence. Needs you lists exactly what, with a link to each one.',
      },
      {
        id: 'home-score-changed',
        q: 'Why is the score different from the last time I calculated?',
        a: 'Home shows the live score: it updates as soon as a figure changes. The saved result only changes when you press Calculate again on the Review page.',
      },
      {
        id: 'home-empty',
        q: 'What if Home is empty?',
        a: 'Nothing has been started yet. Press Start new, choose or add a company, and the score card and lists fill in as you go.',
      },
    ],
  }),

  // ── Account ──
  // /settings itself redirects to /settings/profile, so it has no entry of its own.
  'settings-profile': page<SettingsHelpData>({
    route: '/settings/profile',
    title: 'Profile',
    topic: 'Account',
    purpose: 'How you appear in the app: your photo, full name and display name. Your sign-in email is shown here but cannot be changed here.',
    steps: [
      { target: 'settings-nav', title: 'Settings sections', body: 'Profile, Account, Help and Legal. Pick one to open it.' },
      { target: 'settings-content', title: 'Photo and name', body: 'A photo uploads straight away. Name changes save when you press Save.' },
      { target: 'help-button', title: 'Help on every page', body: 'This “?” opens help made for the page you are on. The ? key does the same.' },
    ],
    terms: [],
    problems: [
      {
        id: 'profile-greeting',
        q: 'Why does Home greet me by only one word?',
        a: 'Home uses the first word of your display name (or full name when there is no display name). Change it here to change the greeting.',
      },
      {
        id: 'profile-email',
        q: 'Why can I not change my email here?',
        a: 'Your sign-in email and sign-in method belong to the sign-in provider, so they are read only in the app. Ask the person who set up your access to change them.',
      },
      {
        id: 'profile-photo',
        q: 'What if my photo does not upload?',
        a: 'Use a JPEG, PNG, WebP or GIF of 5MB or less.',
      },
    ],
  }),
  'settings-account': page<SettingsHelpData>({
    route: '/settings/account',
    title: 'Account',
    topic: 'Account',
    purpose: 'Security and workspace information. Passwords are handled by the sign-in provider, not on this page.',
    steps: [
      { target: 'settings-nav', title: 'Settings sections', body: 'Profile, Account, Help and Legal.' },
      { target: 'settings-content', title: 'Security and workspace', body: 'How your sign-in is managed, and where team and billing settings will appear.' },
      { target: 'help-button', title: 'Help on every page', body: 'This “?” opens help made for the page you are on.' },
    ],
    terms: [],
    problems: [
      {
        id: 'account-password',
        q: 'How do I change or reset my password?',
        a: 'Sign out, then choose “Forgot password?” on the sign-in page. A reset link is sent to your sign-in email.',
      },
      {
        id: 'account-team',
        q: 'Can I add colleagues to my account?',
        a: 'Not yet. Team settings will appear on this page when they are available. Each login sees only its own companies and scorecards.',
      },
      {
        id: 'account-signout',
        q: 'How do I sign out?',
        a: 'Open the menu at the bottom of the sidebar (your name) and choose Sign out.',
      },
    ],
  }),
  'settings-help': page<SettingsHelpData>({
    route: '/settings/help',
    title: 'Help centre',
    topic: 'Account',
    purpose: 'Every guide, every B-BBEE word and the common questions in one place, with search.',
    steps: [
      { target: 'help-search', title: 'Search', body: 'Type a word, such as “NPAT” or “certificate”, to search page help, the glossary and the questions.' },
      { target: 'help-tours', title: 'Guided tours', body: 'The first-time setup and the full platform tour. Each takes a minute or two and moves between pages for you.' },
      { target: 'help-guides', title: 'Guides by page', body: 'What every page is for, with a link to open it and a short tour.' },
      { target: 'help-glossary', title: 'B-BBEE words', body: 'Every term the app uses, in plain words, with an example.' },
      { target: 'help-faqs', title: 'Common questions', body: 'Questions grouped by topic.' },
    ],
    terms: [],
    problems: [
      {
        id: 'help-tour-restart',
        q: 'How do I see a tour again?',
        a: 'Press “Show me” next to any page under Guides by page, or “Start” on a guided tour. Finished tours are marked, but you can always run them again.',
      },
      {
        id: 'help-shortcut',
        q: 'Is there a quick way to open help?',
        a: 'Press the ? key on any page (when you are not typing in a field) to open help for that page.',
      },
      {
        id: 'help-wrong',
        q: 'What if the help says something that does not match what I see?',
        a: 'Tell us using the contact details at the bottom of the help panel, with the page name.',
      },
    ],
  }),
  'settings-legal': page<SettingsHelpData>({
    route: '/settings/legal',
    title: 'Legal',
    topic: 'Account',
    purpose: 'The Terms of Service and the Privacy Policy for REAP Scorecard.',
    steps: [
      { target: 'settings-nav', title: 'Settings sections', body: 'Profile, Account, Help and Legal.' },
      { target: 'settings-content', title: 'Terms and privacy', body: 'Open the Terms of Service or the Privacy Policy in full.' },
      { target: 'help-button', title: 'Help on every page', body: 'This “?” opens help made for the page you are on.' },
    ],
    terms: [],
    problems: [
      {
        id: 'legal-data',
        q: 'Where is my data kept?',
        a: 'The Privacy Policy explains what is collected, how it is used and how it is protected. Ask the contact below if a client needs more detail.',
      },
      {
        id: 'legal-advice',
        q: 'Is the result a B-BBEE certificate?',
        a: 'No. It is a calculation to plan and check a scorecard. Only an accredited verification agency issues a B-BBEE certificate.',
      },
      {
        id: 'legal-questions',
        q: 'Who do I ask about the terms?',
        a: 'Use the contact details at the bottom of this panel.',
      },
    ],
  }),
  ...COMPANIES_HELP,
  ...SCORECARD_FLOW_HELP,
  ...AREAS_A_HELP,
  ...AREAS_B_HELP,
  ...PROCUREMENT_HELP,
} satisfies Record<string, PageHelpEntry<never>>

export type PageKey = keyof typeof PAGE_HELP
export type HelpDataFor<K extends PageKey> = (typeof PAGE_HELP)[K] extends PageHelpEntry<infer D> ? D : never

/** Every entry as the loose type, for the panel, the Help centre and the tests. */
export const PAGE_HELP_LIST: Array<PageHelpEntry<unknown> & { key: PageKey }> = (Object.keys(PAGE_HELP) as PageKey[]).map(
  (key) => ({ key, ...(PAGE_HELP[key] as PageHelpEntry<unknown>) }),
)

// ─── Route matching ──────────────────────────────────────────────────────────

function routeToRegex(route: string) {
  const pattern = route
    .split('/')
    .map((part) => (/^\[.+\]$/.test(part) ? '[^/]+' : part.replace(/[.*+?^${}()|\\]/g, '\\$&')))
    .join('/')
  return new RegExp(`^${pattern}/?$`)
}

const COMPILED = PAGE_HELP_LIST.map((entry) => ({ entry, regex: routeToRegex(entry.route), dynamic: entry.route.includes('[') }))

/** The entry for a pathname. Static routes win over dynamic ones (/companies/new before /companies/[id]). */
export function helpForPath(pathname: string) {
  const path = pathname.split('?')[0]
  return (
    COMPILED.find((c) => !c.dynamic && c.regex.test(path))?.entry ??
    COMPILED.find((c) => c.dynamic && c.regex.test(path))?.entry ??
    null
  )
}

/** A page whose route has no [id] can be opened from anywhere (the Help centre's "Open page"). */
export const staticHref = (entry: { route: string }) => (entry.route.includes('[') ? null : entry.route)

// ─── Multi-page tours ────────────────────────────────────────────────────────

export type TourStepDef = HelpStep & { path: string }
export type TourDef = { id: string; title: string; description: string; steps: TourStepDef[] }

export const TOURS: TourDef[] = [
  {
    id: 'first-time-setup',
    title: 'First-time setup',
    description: 'From an empty account to your first scorecard: where to add a company and how to start.',
    steps: [
      {
        path: '/dashboard',
        target: 'getting-started',
        title: 'Your setup checklist',
        body: 'Five steps from a new account to a finished report. Each one ticks itself as you do it, and links to the right page.',
        missing: 'The checklist is hidden because you finished it or dismissed it. You can show it again from the Help centre.',
      },
      {
        path: '/dashboard',
        target: 'start-new',
        title: 'Click Start new',
        body: 'Everything begins here. Click Start new to continue.',
        action: true,
      },
      {
        path: '/start',
        target: 'start-companies',
        title: 'Choose the company',
        body: 'Every scorecard is saved under a company. Choose one of yours here.',
        missing: 'You have no companies yet, so this list is empty. The “Add your first company” button takes its place.',
      },
      {
        path: '/start',
        target: 'start-add-company',
        title: 'Or add a new one',
        body: 'Only a few details are needed: name, industry, financial year end, turnover and black ownership. You come straight back here afterwards.',
      },
      {
        path: '/companies',
        target: 'companies-list',
        title: 'All your companies',
        body: 'Every company you add is listed here, with its scorecard status and score.',
        missing: 'You have no companies yet. They appear here once you add one.',
      },
      {
        path: '/scorecards',
        target: 'scorecards-list',
        title: 'Your full scorecards',
        body: 'Every full scorecard, how far it has got, and a link to continue where you left off.',
        missing: 'You have no full scorecards yet. They appear here after you start one.',
      },
      {
        path: '/settings/help',
        target: 'help-button',
        title: 'Help is on every page',
        body: 'Press the ? button or the ? key on any page for help made for that page, including a short “Show me” tour.',
      },
    ],
  },
  {
    id: 'full-platform',
    title: 'Full platform tour',
    description: 'Where everything is: Home, starting work, companies, scorecards, procurement, activity and help.',
    steps: [
      {
        path: '/dashboard',
        target: 'home-score',
        title: 'Home: your latest score',
        body: 'Your most recently changed full scorecard, its points out of 109 and its level.',
        missing: 'You have no full scorecard yet. Its score and level appear here once you start one.',
      },
      {
        path: '/dashboard',
        target: 'needs-you',
        title: 'What needs you',
        body: 'The next thing to do and anything stopping a level from being final, each linked to where to fix it.',
      },
      {
        path: '/dashboard',
        target: 'sidebar-nav',
        title: 'The menu',
        body: 'The same places on every page: Home, Companies, Full scorecards, Procurement and Settings.',
      },
      {
        path: '/dashboard',
        target: 'start-new',
        title: 'Start new',
        body: 'Starts a full scorecard or a procurement scorecard for any company.',
      },
      {
        path: '/companies',
        target: 'companies-list',
        title: 'Companies',
        body: 'Every client, with its size, scorecard status and score. Open one to see all of its work.',
        missing: 'You have no companies yet. They appear here once you add one.',
      },
      {
        path: '/scorecards',
        target: 'scorecards-list',
        title: 'Full scorecards',
        body: 'All seven areas and the B-BBEE level. Continue any scorecard from here.',
        missing: 'You have no full scorecards yet. They appear here after you start one.',
      },
      {
        path: '/procurement',
        target: 'procurement-list',
        title: 'Procurement',
        body: 'Procurement-only scorecards: your suppliers, their B-BBEE levels and the score out of 25 plus bonus points.',
        missing: 'You have no procurement scorecards yet. They appear here after you start one.',
      },
      {
        path: '/dashboard/activity',
        target: 'activity-list',
        title: 'Activity',
        body: 'Who changed what, and when. Useful when a score moves and you want to know why.',
        missing: 'Nothing has happened yet. Changes appear here as you work.',
      },
      {
        path: '/settings/help',
        target: 'help-button',
        title: 'Help on every page',
        body: 'Press the ? button or the ? key on any page for help made for that page. The Help centre has every guide and the B-BBEE words.',
      },
    ],
  },
]

export const getTour = (id: string) => TOURS.find((t) => t.id === id) ?? null

// ─── General FAQs (the Help centre groups these with each page's problems) ───

export const FAQS: Array<HelpProblem & { topic: HelpTopic }> = [
  {
    topic: 'Getting started',
    id: 'faq-full-or-procurement',
    q: 'Do I need a full scorecard or only procurement?',
    a: 'A full scorecard scores all seven areas and gives the B-BBEE level. Procurement only scores supplier spend (one of the seven areas). Start with procurement when that is all a client needs; you can attach it to a full scorecard later.',
  },
  {
    topic: 'Getting started',
    id: 'faq-saved',
    q: 'Is my work saved as I go?',
    a: 'Yes. Area pages save as you type (it says “Changes save as you type”). Pages with a Save button save when you press it.',
  },
  {
    topic: 'Full scorecard',
    id: 'faq-live-vs-calculated',
    q: 'What is the difference between the live score and the calculated result?',
    a: 'The live score updates as you type, so you can see the effect of each figure. Calculating on the Review page saves the result and the level, which is what reports use.',
  },
  {
    topic: 'Full scorecard',
    id: 'faq-certificate',
    q: 'Is the result a B-BBEE certificate?',
    a: 'No. It is a calculation to plan and check a scorecard. Only an accredited verification agency issues a certificate.',
  },
  {
    topic: 'Procurement',
    id: 'faq-procurement-attach',
    q: 'How does a procurement scorecard count towards the full scorecard?',
    a: 'Attach it on the full scorecard’s Procurement area. Its points then count towards the level.',
  },
]
