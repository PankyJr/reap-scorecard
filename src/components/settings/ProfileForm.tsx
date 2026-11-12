'use client'

import { controlStyles } from '@/components/ui/Input'
import { useRef, useState, useTransition, type ChangeEvent, type FormEvent } from 'react'
import { Loader2, Upload } from 'lucide-react'
import { SettingsRow } from './SettingsPanel'
import { useToast } from '@/components/ui/toast'
import { updateProfile, uploadProfileAvatar } from '@/app/(dashboard)/settings/actions'
import { buttonStyles } from '@/components/ui/buttonStyles'

export type ProfileFormInitial = {
  email: string
  fullName: string
  displayName: string
  avatarUrl: string
  authProviderLabel: string
}

const inputEditable = controlStyles()
/** Read-only fields are grey filled (Untitled UI). */
const inputReadonly = controlStyles('cursor-not-allowed bg-sunken text-label')

const MAX_AVATAR_BYTES = 5 * 1024 * 1024

export function ProfileForm({ initial }: { initial: ProfileFormInitial }) {
  const { showToast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()
  const [isUploading, setIsUploading] = useState(false)
  const [avatarRev, setAvatarRev] = useState(0)
  const [fullName, setFullName] = useState(initial.fullName)
  const [displayName, setDisplayName] = useState(initial.displayName)
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl)

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData()
    fd.set('full_name', fullName)
    fd.set('display_name', displayName)
    fd.set('avatar_url', avatarUrl)
    startTransition(async () => {
      const result = await updateProfile(fd)
      if (result.ok) {
        showToast('success', 'Profile updated successfully')
      } else {
        showToast('error', result.error)
      }
    })
  }

  async function handleAvatarFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (file.size > MAX_AVATAR_BYTES) {
      showToast('error', 'Image must be 5MB or smaller.')
      return
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!file.type || !allowed.includes(file.type)) {
      showToast('error', 'Please choose a JPEG, PNG, WebP, or GIF image.')
      return
    }

    setIsUploading(true)
    try {
      const fd = new FormData()
      fd.set('file', file)
      const result = await uploadProfileAvatar(fd)
      if (result.ok) {
        setAvatarUrl(result.publicUrl)
        setAvatarRev(r => r + 1)
        showToast('success', 'Profile photo updated')
      } else {
        showToast('error', result.error)
      }
    } finally {
      setIsUploading(false)
    }
  }

  const initialLetter = (fullName || initial.email).charAt(0).toUpperCase()
  const busy = isPending || isUploading

  return (
    <form onSubmit={handleSubmit}>
      <input
        id="profile-avatar-file"
        ref={fileInputRef}
        aria-label="Profile photo"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        tabIndex={-1}
        onChange={handleAvatarFile}
      />

      <SettingsRow label="Your photo" helper="How you appear across the workspace. JPEG, PNG, WebP or GIF, up to 5MB. Uploads apply right away.">
        <div className="flex flex-wrap items-center gap-4">
          <span className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-sunken">
            {avatarUrl ? (
              <img key={`${avatarUrl}-${avatarRev}`} src={avatarUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <span aria-hidden className="text-section font-semibold text-label">
                {initialLetter}
              </span>
            )}
            {isUploading ? (
              <span className="absolute inset-0 flex items-center justify-center bg-scrim">
                <Loader2 className="h-5 w-5 animate-spin text-on-teal" aria-hidden />
              </span>
            ) : null}
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
            className={buttonStyles({ variant: 'secondary' })}
          >
            <Upload aria-hidden /> <span className="sr-only">Change profile photo: </span>
            {isUploading ? 'Uploading…' : 'Upload'}
          </button>
        </div>
        <details className="group mt-3">
          <summary className="inline-flex min-h-11 cursor-pointer list-none items-center text-meta font-medium text-teal hover:underline sm:min-h-0 [&::-webkit-details-marker]:hidden">
            Use an image link instead
          </summary>
          <div className="mt-2 space-y-1.5">
            <label htmlFor="avatar_url" className="block text-meta font-medium text-ink">
              Image URL <span className="font-normal text-label">(optional)</span>
            </label>
            <input id="avatar_url" name="avatar_url" type="url" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} disabled={busy} placeholder="https://…" className={inputEditable} />
            <p className="text-meta text-label">
              Saves when you click Save changes below. OAuth avatars from Google or Microsoft may already appear here.
            </p>
          </div>
        </details>
      </SettingsRow>

      <SettingsRow label={<>Full name <span className="text-danger">*</span></>} htmlFor="full_name">
        <input id="full_name" name="full_name" required value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={busy} className={inputEditable} />
      </SettingsRow>

      <SettingsRow label="Display name" helper="Optional. How you want to appear in the app." htmlFor="display_name">
        <input id="display_name" name="display_name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} disabled={busy} placeholder="How you want to appear in the app" className={inputEditable} />
      </SettingsRow>

      <SettingsRow label="Email" helper="Email is managed by your sign-in provider." htmlFor="email">
        <input id="email" type="email" value={initial.email} readOnly disabled className={inputReadonly} />
      </SettingsRow>

      <SettingsRow label="Sign-in method" helper="Managed by your identity provider — read only." htmlFor="auth_provider">
        <input id="auth_provider" value={initial.authProviderLabel} readOnly disabled className={inputReadonly} />
      </SettingsRow>

      <div className="flex flex-col-reverse gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-meta text-label">Name and link changes apply everywhere you appear in the dashboard.</p>
        <button type="submit" disabled={busy} className={buttonStyles({ variant: 'primary', className: 'shrink-0' })}>
          {isPending ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}
