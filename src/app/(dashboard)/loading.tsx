'use client'

import { usePathname } from 'next/navigation'
import { CardSkeleton, HeaderSkeleton, PageSkeleton, SegmentedSkeleton } from '@/components/ui/PageSkeletons'
import HomeLoading from './dashboard/loading'
import ActivityLoading from './dashboard/activity/loading'
import CompaniesLoading from './companies/loading'
import CompanyDetailLoading from './companies/[id]/loading'
import CompanyFormLoading from './companies/new/loading'
import ScorecardsLoading from './scorecards/loading'
import ProcurementLoading from './procurement/loading'
import ProcurementAssessmentLoading from './procurement/assessments/[id]/loading'
import NewProcurementLoading from './procurement/assessments/new/loading'
import EditProcurementLoading from './procurement/assessments/[id]/edit/loading'
import StartLoading from './start/loading'
import GenericScorecardLoading from './scorecards/calculator/[assessmentId]/generic/loading'
import ReviewLoading from './scorecards/calculator/[assessmentId]/generic/review/loading'
import SettingsRowsLoading from './settings/loading'

/**
 * The loading screen Next.js shows when it has nothing closer: on an in-app
 * jump from one section to a deep page (Settings to a scorecard, say) the
 * page's own loading screen is not known yet, so this one stands in. It
 * picks the skeleton of the page being opened, so the screen never changes
 * shape when the real page arrives. Unknown pages get the plain header and
 * card.
 */
export default function Loading() {
  const path = usePathname() ?? ''
  const is = (re: RegExp) => re.test(path)

  if (is(/^\/dashboard\/activity/)) return <ActivityLoading />
  if (is(/^\/dashboard\/?$/)) return <HomeLoading />
  if (is(/^\/companies\/?$/)) return <CompaniesLoading />
  if (is(/^\/companies\/new/) || is(/^\/companies\/[^/]+\/edit/)) return <CompanyFormLoading />
  if (is(/^\/companies\/[^/]+\/?$/)) return <CompanyDetailLoading />
  if (is(/^\/scorecards\/?$/)) return <ScorecardsLoading />
  if (is(/^\/scorecards\/calculator\/[^/]+\/generic\/review/)) return <ReviewLoading />
  if (is(/^\/scorecards\/calculator\/[^/]+\/generic(\/(applicability|financial|ownership|management-control|skills-development|procurement|enterprise-development|supplier-development|socio-economic-development))?\/?$/)) return <GenericScorecardLoading />
  if (is(/^\/procurement\/?$/)) return <ProcurementLoading />
  if (is(/^\/procurement\/assessments\/new/)) return <NewProcurementLoading />
  if (is(/^\/procurement\/assessments\/[^/]+\/edit/)) return <EditProcurementLoading />
  if (is(/^\/procurement\/assessments\/[^/]+\/?$/)) return <ProcurementAssessmentLoading />
  if (is(/^\/start/)) return <StartLoading />
  if (is(/^\/settings\/(profile|account|help|legal)/)) {
    // The settings header and tabs come from its layout, which has not loaded yet either.
    return (
      <PageSkeleton label="Loading settings…">
        <HeaderSkeleton meta={false} description />
        <SegmentedSkeleton count={4} />
        <SettingsRowsLoading />
      </PageSkeleton>
    )
  }

  return (
    <PageSkeleton label="Loading…">
      <HeaderSkeleton crumbs meta={false} description />
      <CardSkeleton lines={6} />
    </PageSkeleton>
  )
}
