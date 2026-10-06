import { redirect } from 'next/navigation'

/**
 * Root of the demonstration build.
 *
 * The demo carries no marketing site, so src/app/(marketing) is removed from
 * the build entirely (see the Dockerfile) and this file takes over "/". There
 * is no home page to land on, so the root is the sign-in page.
 */
export default function DemoRootPage() {
  redirect('/login')
}
