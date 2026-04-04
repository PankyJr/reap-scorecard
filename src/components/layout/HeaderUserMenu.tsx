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
        className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 text-left text-sm text-slate-600 transition hover:bg-slate-100"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="h-8 w-8 rounded-full object-cover ring-1 ring-slate-200"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white ring-1 ring-slate-200">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="hidden max-w-[10rem] truncate font-medium text-slate-700 sm:inline">{displayName}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1.5 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          <div className="border-b border-slate-100 px-3 py-2">
            <p className="truncate text-[13px] font-medium text-slate-900">{displayName}</p>
            <p className="truncate text-[11px] text-slate-500">{email}</p>
          </div>
          <Link
            href="/settings/profile"
            role="menuitem"
            className="flex items-center gap-2 px-3 py-2 text-[13px] text-slate-700 hover:bg-slate-50"
            onClick={() => setOpen(false)}
          >
            <User className="h-4 w-4 text-slate-400" aria-hidden />
            Profile
          </Link>
          <Link
            href="/settings/account"
            role="menuitem"
            className="flex items-center gap-2 px-3 py-2 text-[13px] text-slate-700 hover:bg-slate-50"
            onClick={() => setOpen(false)}
          >
            <Settings className="h-4 w-4 text-slate-400" aria-hidden />
            Settings
          </Link>
          <Link
            href="/settings/help"
            role="menuitem"
            className="flex items-center gap-2 px-3 py-2 text-[13px] text-slate-700 hover:bg-slate-50"
            onClick={() => setOpen(false)}
          >
            <HelpCircle className="h-4 w-4 text-slate-400" aria-hidden />
            Help Center
          </Link>
          <div className="border-t border-slate-100 pt-1">
            <form action={signOutAction}>
              <button
                type="submit"
                role="menuitem"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50"
              >
                <LogOut className="h-4 w-4 text-slate-400" aria-hidden />
                Sign out
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
