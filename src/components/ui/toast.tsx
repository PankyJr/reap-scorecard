'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { CheckCircle2, X, XCircle } from 'lucide-react'

type ToastKind = 'success' | 'error'

type ToastItem = { id: number; kind: ToastKind; message: string }

type ToastContextValue = {
  showToast: (kind: ToastKind, message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const idRef = useRef(0)

  const showToast = useCallback((kind: ToastKind, message: string) => {
    const id = ++idRef.current
    setItems((prev) => [...prev, { id, kind, message }])
    const duration = kind === 'error' && message.includes('\n') ? 14000 : 4500
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id))
    }, duration)
  }, [])

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(100vw-2rem,24rem)] max-w-none flex-col gap-2 sm:bottom-6 sm:right-6"
        aria-live="polite"
      >
        {/* Design rule 20: only for things not otherwise visible on the page. */}
        {items.map((t) => {
          const Icon = t.kind === 'success' ? CheckCircle2 : XCircle
          return (
            <div
              key={t.id}
              className="reap-pop-in pointer-events-auto flex items-start gap-3 rounded-control border border-line bg-raised px-4 py-3 text-sm text-ink shadow-pop"
              role={t.kind === 'error' ? 'alert' : 'status'}
            >
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${t.kind === 'success' ? 'text-success' : 'text-danger'}`} aria-hidden />
              <p className="min-w-0 flex-1 whitespace-pre-line leading-snug">{t.message}</p>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="-m-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-label transition-colors duration-150 hover:bg-sunken hover:text-ink focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand/30"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
