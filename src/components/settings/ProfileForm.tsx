'use client'

import { useRef, useState, useTransition, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { Camera, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { updateProfile, uploadProfileAvatar } from '@/app/(dashboard)/settings/actions'

export type ProfileFormInitial = {
  email: string
  fullName: string
  displayName: string
  avatarUrl: string
  authProviderLabel: string
}

const inputEditable =
  'block w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-[14px] text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-[#063b3f]/40 focus:outline-none focus:ring-2 focus:ring-[#063b3f]/15 disabled:opacity-60'
const inputReadonly =
  'block w-full cursor-not-allowed rounded-xl border border-slate-200/80 bg-slate-50/90 px-3.5 py-2.5 text-[14px] text-slate-600'

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{children}</p>
  )
}

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

  return (
    <form onSubmit={handleSubmit} className="space-y-0">
      <div className="space-y-10">
        <section className="space-y-6">
          <div>
            <SectionLabel>Public profile</SectionLabel>
            <p className="mt-1 text-sm text-slate-500">
              How you appear across the workspace — same idea as changing a photo on social apps.
            </p>
          </div>

          <input
            id="profile-avatar-file"
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            tabIndex={-1}
            onChange={handleAvatarFile}
          />

          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:gap-10 lg:gap-14">
            {/* Avatar — primary control (tap / click to change) */}
            <div className="flex flex-col items-center sm:items-start">
              <button
                type="button"
                disabled={isPending || isUploading}
                onClick={() => fileInputRef.current?.click()}
                aria-label={isUploading ? 'Uploading profile photo' : 'Change profile photo'}
                className="group relative shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-[#063b3f]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:pointer-events-none disabled:opacity-70"
              >
                <div
                  className={[
                    'relative h-[7.75rem] w-[7.75rem] overflow-hidden rounded-full',
                    'bg-gradient-to-br from-slate-100 to-slate-200/90',
                    'shadow-[0_12px_40px_rgba(15,23,42,0.12),0_2px_8px_rgba(15,23,42,0.06)]',
                    'ring-[3px] ring-white ring-offset-0',
                    'transition duration-300 ease-out',
                    'group-hover:shadow-[0_16px_48px_rgba(6,59,63,0.18)] group-hover:ring-[#063b3f]/15',
                    isUploading && 'scale-[0.98]',
                  ].join(' ')}
                >
                  {avatarUrl ? (
                    <img
                      key={`${avatarUrl}-${avatarRev}`}
                      src={avatarUrl}
                      alt=""
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#063b3f] via-[#0a4d52] to-slate-900 text-[2.35rem] font-semibold tracking-tight text-white">
                      {initialLetter}
                    </div>
                  )}

                  {/* Hover / focus overlay — social-style “change photo” */}
                  <div
                    className={[
                      'absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-full',
                      'bg-gradient-to-t from-black/65 via-black/35 to-black/20',
                      'opacity-0 transition duration-200 group-hover:opacity-100',
                      'group-focus-visible:opacity-100',
                      isUploading && 'opacity-100',
                    ].join(' ')}
                  >
                    {isUploading ? (
                      <Loader2 className="h-8 w-8 animate-spin text-white drop-shadow-sm" aria-hidden />
                    ) : (
                      <>
                        <Camera className="h-7 w-7 text-white drop-shadow-md" strokeWidth={1.75} aria-hidden />
                        <span className="px-2 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-white/95">
                          Change
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Camera badge — always visible hint (mobile-friendly) */}
                <span
                  className={[
                    'absolute -bottom-0.5 -right-0.5 flex h-9 w-9 items-center justify-center rounded-full',
                    'border-[3px] border-white bg-[#063b3f] text-white shadow-md',
                    'transition group-hover:scale-105 group-hover:bg-[#052f32]',
                    isUploading && 'opacity-50',
                  ].join(' ')}
                  aria-hidden
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-[1.05rem] w-[1.05rem]" strokeWidth={2.2} />
                  )}
                </span>
              </button>

              <p className="mt-4 max-w-[14rem] text-center text-[13px] leading-snug text-slate-500 sm:max-w-none sm:text-left">
                <span className="font-medium text-slate-700">Tap the photo</span> to pick a new one from your gallery.
                Uploads apply right away.
              </p>
              <p className="mt-1.5 text-center text-[11px] text-slate-400 sm:text-left">JPEG · PNG · WebP · GIF · max 5MB</p>

              <details className="mt-5 w-full max-w-xs rounded-xl border border-slate-200/80 bg-slate-50/50 px-3 py-2 sm:max-w-none">
                <summary className="cursor-pointer list-none text-center text-[12px] font-medium text-[#063b3f] transition hover:text-[#052a2e] sm:text-left [&::-webkit-details-marker]:hidden">
                  <span className="underline decoration-[#063b3f]/25 underline-offset-2 hover:decoration-[#063b3f]/50">
                    Use an image link instead
                  </span>
                </summary>
                <div className="mt-3 border-t border-slate-200/80 pt-3">
                  <label htmlFor="avatar_url" className="mb-1.5 block text-[12px] font-medium text-slate-600">
                    Image URL <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <input
                    id="avatar_url"
                    name="avatar_url"
                    type="url"
                    value={avatarUrl}
                    onChange={e => setAvatarUrl(e.target.value)}
                    disabled={isPending || isUploading}
                    placeholder="https://…"
                    className={inputEditable}
                  />
                  <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                    Saves when you click <span className="font-medium text-slate-600">Save changes</span> below. OAuth
                    avatars from Google or Microsoft may already appear here.
                  </p>
                </div>
              </details>
            </div>

            <div className="min-w-0 flex-1 space-y-5 pt-0 sm:pt-1">
              <div>
                <label htmlFor="full_name" className="mb-1.5 block text-[13px] font-medium text-slate-700">
                  Full name <span className="text-red-600">*</span>
                </label>
                <input
                  id="full_name"
                  name="full_name"
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  disabled={isPending || isUploading}
                  className={inputEditable}
                />
              </div>

              <div>
                <label htmlFor="display_name" className="mb-1.5 block text-[13px] font-medium text-slate-700">
                  Display name <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <input
                  id="display_name"
                  name="display_name"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  disabled={isPending || isUploading}
                  placeholder="How you want to appear in the app"
                  className={inputEditable}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-slate-100 pt-10">
          <div className="space-y-4">
            <div>
              <SectionLabel>Account</SectionLabel>
              <p className="mt-1 text-sm text-slate-500">Managed by your identity provider — read only.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                <label htmlFor="email" className="mb-1.5 block text-[12px] font-medium text-slate-500">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={initial.email}
                  readOnly
                  disabled
                  className={inputReadonly}
                />
                <p className="mt-2 text-[12px] leading-relaxed text-slate-500">
                  Email is managed by your sign-in provider.
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                <label htmlFor="auth_provider" className="mb-1.5 block text-[12px] font-medium text-slate-500">
                  Sign-in method
                </label>
                <input
                  id="auth_provider"
                  value={initial.authProviderLabel}
                  readOnly
                  disabled
                  className={inputReadonly}
                />
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-10 flex flex-col gap-3 border-t border-slate-100 bg-slate-50/60 -mx-6 px-6 py-5 sm:-mx-8 sm:px-8">
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">Name and link changes apply everywhere you appear in the dashboard.</p>
          <button
            type="submit"
            disabled={isPending || isUploading}
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-[#063b3f] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#052f32] disabled:opacity-60 sm:min-w-[9rem]"
          >
            {isPending ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </form>
  )
}
