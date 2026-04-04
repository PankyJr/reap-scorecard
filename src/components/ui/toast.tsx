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
import { X } from 'lucide-react'

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
        className="pointer-events-none fixed bottom-6 right-6 z-[100] flex w-[min(100vw-2rem,24rem)] max-w-none flex-col gap-2 sm:max-w-md"
        aria-live="polite"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className={[
              'pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg',
              t.kind === 'success'
                ? 'border-emerald-200 bg-white text-emerald-900'
                : 'border-red-200 bg-white text-red-900',
            ].join(' ')}
            role="status"
          >
            <p className="min-w-0 flex-1 whitespace-pre-line leading-snug">{t.message}</p>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="shrink-0 rounded-md p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
