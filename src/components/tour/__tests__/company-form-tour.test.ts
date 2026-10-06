import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const spotlight = readFileSync(
  resolve(process.cwd(), 'src/components/tour/TourSpotlight.tsx'),
  'utf8',
)
const guidedTour = readFileSync(
  resolve(process.cwd(), 'src/components/tour/GuidedTour.tsx'),
  'utf8',
)
const firstTimeSetup = readFileSync(
  resolve(process.cwd(), 'src/components/tour/guides/firstTimeSetup.ts'),
  'utf8',
)
const companiesGuide = readFileSync(
  resolve(process.cwd(), 'src/components/tour/guides/companies.ts'),
  'utf8',
)
const newCompanyForm = readFileSync(
  resolve(process.cwd(), 'src/app/(dashboard)/companies/new/NewCompanyForm.tsx'),
  'utf8',
)
const newCompanyPage = readFileSync(
  resolve(process.cwd(), 'src/app/(dashboard)/companies/new/page.tsx'),
  'utf8',
)

describe('guided tour must not block company creation', () => {
  it('New Company page and Save company control exist for browser flows', () => {
    expect(newCompanyPage).toContain('company-form')
    expect(newCompanyForm).toContain('company-form-save')
    expect(newCompanyForm).toMatch(/Save company|saveLabel/)
  })

  it('does not use a full-screen blocking Close guide button over form cutouts', () => {
    expect(spotlight).toContain('pointer-events-none fixed inset-0')
    expect(spotlight).toContain('OverlayPanels')
    expect(spotlight).toContain('pointerEvents: interactive ? \'auto\' : \'none\'')
    // Missing-target / centered tips must be non-blocking scrims.
    expect(spotlight).toMatch(/if \(!rect\) \{[\s\S]*?pointer-events-none fixed inset-0/)
    expect(spotlight).not.toContain('fixed inset-0 z-[100] cursor-default border-0 bg-[rgba(2,12,14,0.72)]')
  })

  it('always wires spotlight dismiss to skip (never a no-op on action steps)', () => {
    expect(guidedTour).toContain('onDismiss={onSkip}')
    expect(guidedTour).not.toContain('onDismiss={isActionStep ? () => {} : onSkip}')
  })

  it('does not lock body scroll on create-company form routes', () => {
    expect(guidedTour).toContain("/companies/new")
    expect(guidedTour).toMatch(/isFormRoute/)
  })

  it('uses a non-blocking center tip on create-company instead of a form spotlight', () => {
    expect(firstTimeSetup).toMatch(/id: 'company-form'[\s\S]*?placement: 'center'[\s\S]*?mode: 'info'/)
    expect(firstTimeSetup).not.toMatch(
      /id: 'company-form'[\s\S]*?target: 'company-form'[\s\S]*?mode: 'info'/,
    )
    expect(companiesGuide).toMatch(/id: 'company-form'[\s\S]*?placement: 'center'[\s\S]*?mode: 'info'/)
  })

  it('keeps Skip/Close available via Escape and the tour card', () => {
    expect(guidedTour).toContain("event.key === 'Escape'")
    expect(guidedTour).toContain('onSkip')
  })
})
