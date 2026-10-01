'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, HelpCircle, LogOut, Settings, User } from 'lucide-react'

type Props = {
  displayName: string
  email: string
  avatarUrl?: string
  signOutAction: () => void
}

export function HeaderUserMenu({ displayName, email, avatarUrl, signOutAction }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) {
      document.addEventListener('mousedown', handle)
      return () => document.removeEventListener('mousedown', handle)
    }
  }, [open])

  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onEsc)
    return () => document.removeEventListener('keydown', onEsc)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 text-left text-sm text-muted transition hover:bg-sunken"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="h-8 w-8 rounded-full object-cover ring-1 ring-line"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white ring-1 ring-line">
            {(String(displayName ?? '').trim() || '?').charAt(0).toUpperCase()}
          </div>
        )}
        <span className="hidden max-w-[10rem] truncate font-medium text-ink sm:inline">{displayName}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-faint transition ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1.5 w-56 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-lg"
        >
          <div className="border-b border-line px-3 py-2">
            <p className="truncate text-[15px] font-medium text-ink">{displayName}</p>
            <p className="truncate text-sm text-muted">{email}</p>
          </div>
          <Link
            href="/settings/profile"
            role="menuitem"
            className="flex items-center gap-2 px-3 py-2 text-[15px] text-ink hover:bg-sunken"
            onClick={() => setOpen(false)}
          >
            <User className="h-4 w-4 text-faint" aria-hidden />
            Profile
          </Link>
          <Link
            href="/settings/account"
            role="menuitem"
            className="flex items-center gap-2 px-3 py-2 text-[15px] text-ink hover:bg-sunken"
            onClick={() => setOpen(false)}
          >
            <Settings className="h-4 w-4 text-faint" aria-hidden />
            Settings
          </Link>
          <Link
            href="/settings/help"
            role="menuitem"
            className="flex items-center gap-2 px-3 py-2 text-[15px] text-ink hover:bg-sunken"
            onClick={() => setOpen(false)}
          >
            <HelpCircle className="h-4 w-4 text-faint" aria-hidden />
            Help Center
          </Link>
          <div className="border-t border-line pt-1">
            <form action={signOutAction}>
              <button
                type="submit"
                role="menuitem"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[15px] text-ink hover:bg-sunken"
              >
                <LogOut className="h-4 w-4 text-faint" aria-hidden />
                Sign out
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
