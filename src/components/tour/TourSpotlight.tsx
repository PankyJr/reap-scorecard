'use client'

import { useId, type MouseEvent } from 'react'
import type { Rect } from '@/components/tour/tourGeometry'

const OVERLAY = 'rgba(2, 12, 14, 0.68)'

type PanelRect = { top: number; left: number; width: number; height: number }

function computePanels(rect: Rect, vw: number, vh: number): PanelRect[] {
  const { top, left, width, height } = rect
  const right = left + width
  const bottom = top + height

  return [
    { top: 0, left: 0, width: vw, height: top },
    { top: bottom, left: 0, width: vw, height: vh - bottom },
    { top, left: 0, width: left, height },
    { top, left: right, width: vw - right, height },
  ].filter((p) => p.width > 0 && p.height > 0)
}

function blockClick(event: MouseEvent) {
  event.preventDefault()
  event.stopPropagation()
}

function OverlayPanels({
  rect,
  vw,
  vh,
  interactive,
}: {
  rect: Rect
  vw: number
  vh: number
  interactive: boolean
}) {
  const panels = computePanels(rect, vw, vh)
  return (
    <>
      {panels.map((panel, i) => (
        <div
          key={i}
          aria-hidden
          className={`fixed z-[100] ${interactive ? 'cursor-not-allowed' : ''}`}
          style={{
            top: panel.top,
            left: panel.left,
            width: panel.width,
            height: panel.height,
            background: OVERLAY,
            pointerEvents: interactive ? 'auto' : 'none',
          }}
          onClick={interactive ? blockClick : undefined}
          onMouseDown={interactive ? blockClick : undefined}
        />
      ))}
    </>
  )
}

/**
 * Spotlight overlay for guided tours.
 *
 * Critical: the highlighted cutout must remain interactive so required forms
 * (e.g. New Company → Save company) are never blocked by a full-screen button.
 * Skip/Close live on the tour card; Escape always dismisses.
 */
export function TourSpotlight({
  rect,
  isActionMode,
  onDismiss,
}: {
  rect: Rect | null
  isActionMode: boolean
  onDismiss: () => void
}) {
  const ringId = useId()
  const vw = typeof window !== 'undefined' ? window.innerWidth : 0
  const vh = typeof window !== 'undefined' ? window.innerHeight : 0

  // Centered / missing-target tips: soft non-blocking scrim only.
  if (!rect) {
    return (
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[100] bg-[rgba(2,12,14,0.45)] backdrop-blur-[2px]"
      />
    )
  }

  // Action + info: panel cutouts leave the target clickable (forms stay usable).
  return (
    <>
      <OverlayPanels rect={rect} vw={vw} vh={vh} interactive={isActionMode} />
      {!isActionMode ? (
        // Info mode: panels do not capture clicks — user can type in the form.
        // A transparent dismiss control sits only outside the cutout via panels
        // above with pointer-events none; card Skip/Close handles dismiss.
        <button
          type="button"
          aria-label="Close guide"
          className="sr-only"
          onClick={onDismiss}
        >
          Close guide
        </button>
      ) : null}

      <div
        aria-hidden
        className={`pointer-events-none fixed z-[101] rounded-[14px] ring-2 ring-white/95 transition-all duration-300 ease-out ${
          isActionMode ? 'tour-target-pulse' : ''
        }`}
        style={{
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          boxShadow:
            '0 0 0 1px rgba(255,255,255,0.25), 0 0 32px rgba(6,59,63,0.35), inset 0 0 0 1px rgba(255,255,255,0.08)',
        }}
        data-tour-ring={ringId}
      />
    </>
  )
}
