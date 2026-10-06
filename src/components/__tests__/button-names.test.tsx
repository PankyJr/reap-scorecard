import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({ usePathname: () => '/dashboard' }))
vi.mock('@/components/tour/TourProvider', () => ({ useTour: () => ({ openGuide: vi.fn(), isOpen: false }) }))
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ toast: vi.fn() }) }))
vi.mock('@/app/(dashboard)/settings/actions', () => ({ updateProfile: vi.fn(), uploadProfileAvatar: vi.fn() }))

import { mismatchedButtons } from '@/test-utils/button-names'
import { HelpLauncher } from '../tour/HelpLauncher'
import { ProfileForm } from '../settings/ProfileForm'

describe('buttons are named by the words they show', () => {
  it('the Need help? button', () => {
    const html = renderToStaticMarkup(<HelpLauncher />)
    expect(html).toContain('Need help?')
    expect(mismatchedButtons(html)).toEqual([])
  })

  it('the profile photo button, whose letter avatar is decoration', () => {
    const html = renderToStaticMarkup(
      <ProfileForm
        initial={{ email: 'a@example.com', fullName: 'Lerato M', displayName: '', avatarUrl: '', authProviderLabel: 'Email' }}
      />,
    )
    expect(html).toContain('Change profile photo')
    expect(mismatchedButtons(html)).toEqual([])
  })
})
