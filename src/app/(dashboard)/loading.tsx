import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div className="flex h-[50vh] w-full items-center justify-center" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3 text-muted">
        <Loader2 className="h-8 w-8 animate-spin text-brand" aria-hidden />
        <p className="text-base">Loading…</p>
      </div>
    </div>
  )
}
