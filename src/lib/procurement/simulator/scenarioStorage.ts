import type { SavedLocalScenario, SupplierScenarioOverride } from './types'

const STORAGE_KEY = 'reap-procurement-simulator-scenarios-v1'

function readAll(): SavedLocalScenario[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as SavedLocalScenario[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAll(scenarios: SavedLocalScenario[]): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios))
}

export function listSavedScenarios(): SavedLocalScenario[] {
  return readAll().sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )
}

export function saveLocalScenario(args: {
  id?: string
  name: string
  overrides: Record<string, SupplierScenarioOverride>
}): SavedLocalScenario {
  const now = new Date().toISOString()
  const all = readAll()
  const existing = args.id ? all.find((s) => s.id === args.id) : undefined

  const record: SavedLocalScenario = {
    id: existing?.id ?? `scenario-${Date.now().toString(36)}`,
    name: args.name.trim() || 'Untitled scenario',
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    overrides: structuredClone(args.overrides),
  }

  const next = existing
    ? all.map((s) => (s.id === record.id ? record : s))
    : [record, ...all]

  writeAll(next)
  return record
}

export function duplicateLocalScenario(id: string, newName?: string): SavedLocalScenario | null {
  const source = readAll().find((s) => s.id === id)
  if (!source) return null
  return saveLocalScenario({
    name: newName?.trim() || `${source.name} (copy)`,
    overrides: structuredClone(source.overrides),
  })
}

export function deleteLocalScenario(id: string): boolean {
  const all = readAll()
  const next = all.filter((s) => s.id !== id)
  if (next.length === all.length) return false
  writeAll(next)
  return true
}

export function loadLocalScenario(id: string): SavedLocalScenario | null {
  return readAll().find((s) => s.id === id) ?? null
}
