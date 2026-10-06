import { notFound } from 'next/navigation'
import { ContributionStep } from '../ContributionStep'
import { loadGenericAssessment } from '../load'

type PageProps = {
  params: Promise<{ assessmentId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function SocioEconomicDevelopmentPage({ params, searchParams }: PageProps) {
  const { assessmentId } = await params
  const query = await searchParams
  const loaded = await loadGenericAssessment(assessmentId)
  if (!loaded) notFound()
  return (
    <ContributionStep
      assessmentId={assessmentId}
      elementKey="socio_economic_development"
      loaded={loaded}
      searchParams={query}
    />
  )
}
