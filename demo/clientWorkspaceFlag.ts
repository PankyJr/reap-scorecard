/**
 * Demo-build replacement for src/lib/demo/clientWorkspaceFlag.ts.
 *
 * The real file reads an environment variable whose NAME contains a client's
 * name, and a variable name ends up in the bundle just like any other string.
 * The demo has no client workspace at all, so the flag is simply off.
 */
export function isClientWorkspaceEnabled(): boolean {
  return false
}

export const CLIENT_WORKSPACE_FLAG_ENV = 'NEXT_PUBLIC_CLIENT_WORKSPACE' as const
