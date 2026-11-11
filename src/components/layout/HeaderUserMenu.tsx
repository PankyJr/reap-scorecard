'use client'

import Link from 'next/link'
import { ChevronDown, HelpCircle, LogOut, Settings, User } from 'lucide-react'
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '@/components/ui/DropdownMenu'

type Props = {
  displayName: string
  email: string
  avatarUrl?: string
  signOutAction: () => void
}

/** The person's menu (Untitled UI): who is signed in, their pages, sign out. */
export function HeaderUserMenu({ displayName, email, avatarUrl, signOutAction }: Props) {
  const initial = (String(displayName ?? '').trim() || '?').charAt(0).toUpperCase()

  return (
    <Menu>
      <MenuTrigger
        className="flex min-h-10 items-center gap-2 rounded-control py-1 pl-1 pr-2 text-left text-sm text-label transition-colors duration-150 hover:bg-sunken focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand/30 data-[state=open]:bg-sunken"
        aria-label={`Account menu for ${displayName}`}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover ring-1 ring-line" referrerPolicy="no-referrer" />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-sm font-semibold text-brand-ink">{initial}</span>
        )}
        <span className="hidden max-w-[10rem] truncate font-medium text-ink sm:inline">{displayName}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-subtle" aria-hidden />
      </MenuTrigger>
      <MenuContent>
        <div className="px-2.5 pb-2 pt-1.5">
          <p className="truncate text-sm font-semibold text-ink">{displayName}</p>
          <p className="truncate text-sm text-label">{email}</p>
        </div>
        <MenuSeparator />
        <MenuItem asChild>
          <Link href="/settings/profile">
            <User aria-hidden />
            Profile
          </Link>
        </MenuItem>
        <MenuItem asChild>
          <Link href="/settings/account">
            <Settings aria-hidden />
            Settings
          </Link>
        </MenuItem>
        <MenuItem asChild>
          <Link href="/settings/help">
            <HelpCircle aria-hidden />
            Help Center
          </Link>
        </MenuItem>
        <MenuSeparator />
        <form action={signOutAction}>
          <MenuItem asChild>
            <button type="submit">
              <LogOut aria-hidden />
              Sign out
            </button>
          </MenuItem>
        </form>
      </MenuContent>
    </Menu>
  )
}
