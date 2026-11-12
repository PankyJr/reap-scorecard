'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import type { HelpDataFor, PageKey } from '@/content/page-help'
import { helpStore } from './help-store'

/**
 * Hands the page's help panel the data the page ALREADY loaded, so the panel's
 * "next" can name the single most useful action. Renders nothing. Never pass
 * anything secret or large: plain labels, counts and links.
 */
export function PageHelpData<K extends PageKey>({ page, data }: { page: K; data: HelpDataFor<K> }) {
  const pathname = usePathname() ?? ''
  const json = JSON.stringify(data ?? null)
  useEffect(() => {
    helpStore.register({ page, data: JSON.parse(json) as unknown, path: pathname })
    return () => helpStore.unregister(pathname)
  }, [page, json, pathname])
  return null
}
