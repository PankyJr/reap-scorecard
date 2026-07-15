'use client'

import { useState } from 'react'
import { buttonStyles } from '@/components/ui/buttonStyles'
import type { SavedLocalScenario, SupplierScenarioOverride } from '@/lib/procurement/simulator'
import {
  deleteLocalScenario,
  duplicateLocalScenario,
  listSavedScenarios,
  loadLocalScenario,
  saveLocalScenario,
} from '@/lib/procurement/simulator'

interface SimulatorControlsProps {
  scenarioName: string
  onScenarioNameChange(name: string): void
  hasUnsavedChanges: boolean
  modifiedCount: number
  viewMode: 'compare' | 'actual' | 'scenario'
  onViewModeChange(mode: 'compare' | 'actual' | 'scenario'): void
  onResetAll(): void
  onUndo(): void
  canUndo: boolean
  overrides: Record<string, SupplierScenarioOverride>
  onLoadOverrides(overrides: Record<string, SupplierScenarioOverride>, name: string): void
}

export function SimulatorControls({
  scenarioName,
  onScenarioNameChange,
  hasUnsavedChanges,
  modifiedCount,
  viewMode,
  onViewModeChange,
  onResetAll,
  onUndo,
  canUndo,
  overrides,
  onLoadOverrides,
}: SimulatorControlsProps) {
  const [saved, setSaved] = useState<SavedLocalScenario[]>(() => listSavedScenarios())

  function refreshSaved() {
    setSaved(listSavedScenarios())
  }

  function handleSave() {
    saveLocalScenario({ name: scenarioName, overrides })
    refreshSaved()
  }

  function handleLoad(id: string) {
    const record = loadLocalScenario(id)
    if (!record) return
    onLoadOverrides(record.overrides, record.name)
  }

  function handleDuplicate(id: string) {
    const copy = duplicateLocalScenario(id)
    if (copy) refreshSaved()
  }

  function handleDelete(id: string) {
    deleteLocalScenario(id)
    refreshSaved()
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Scenario controls</h2>
          <p className="mt-1 text-base text-slate-600">
            Test changes without affecting your uploaded baseline.
          </p>
        </div>
        {hasUnsavedChanges && (
          <span className="rounded-full bg-amber-100 px-4 py-2 text-base font-medium text-amber-900">
            Unsaved scenario changes
          </span>
        )}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <label>
          <span className="mb-2 block text-base font-medium text-slate-800">Scenario name</span>
          <input
            type="text"
            value={scenarioName}
            onChange={(e) => onScenarioNameChange(e.target.value)}
            placeholder="e.g. ICM becomes non-compliant"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base"
          />
        </label>

        <label>
          <span className="mb-2 block text-base font-medium text-slate-800">View</span>
          <select
            value={viewMode}
            onChange={(e) =>
              onViewModeChange(e.target.value as 'compare' | 'actual' | 'scenario')
            }
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base"
          >
            <option value="compare">Compare actual vs scenario</option>
            <option value="actual">Actual position only</option>
            <option value="scenario">Scenario position only</option>
          </select>
        </label>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onResetAll}
          disabled={modifiedCount === 0}
          className={buttonStyles({ variant: 'secondary', size: 'md', className: 'text-base px-5 py-3' })}
        >
          Reset all changes
        </button>
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          className={buttonStyles({ variant: 'secondary', size: 'md', className: 'text-base px-5 py-3' })}
        >
          Undo last change
        </button>
        <button
          type="button"
          onClick={handleSave}
          className={buttonStyles({ variant: 'primary', size: 'md', className: 'text-base px-5 py-3' })}
        >
          Save scenario locally
        </button>
      </div>

      {saved.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-slate-900">Saved scenarios (local only)</h3>
          <ul className="mt-3 space-y-2">
            {saved.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3"
              >
                <div>
                  <p className="text-base font-medium text-slate-900">{s.name}</p>
                  <p className="text-sm text-slate-600">
                    {Object.keys(s.overrides).length} supplier changes · updated{' '}
                    {new Date(s.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleLoad(s.id)}
                    className={buttonStyles({ variant: 'secondary', size: 'sm' })}
                  >
                    Load
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDuplicate(s.id)}
                    className={buttonStyles({ variant: 'ghost', size: 'sm' })}
                  >
                    Duplicate
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(s.id)}
                    className={buttonStyles({ variant: 'danger', size: 'sm' })}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
