'use client'

import { useId } from 'react'
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

function blockClick(event: React.MouseEvent) {
  event.preventDefault()
  event.stopPropagation()
}

export function TourSpotlight({
  rect,
  isActionMode,
  onDismiss,
}: {
  rect: Rect | null
  isActionMode: boolean
  onDismiss: () => void
}) {
  const maskId = useId()
  const vw = typeof window !== 'undefined' ? window.innerWidth : 0
  const vh = typeof window !== 'undefined' ? window.innerHeight : 0

  if (!rect) {
    return (
      <button
        type="button"
        aria-label="Close guide"
        className="fixed inset-0 z-[100] cursor-default border-0 bg-[rgba(2,12,14,0.72)] p-0 backdrop-blur-[3px]"
        onClick={onDismiss}
      />
    )
  }

  if (isActionMode) {
    const panels = computePanels(rect, vw, vh)
    return (
      <>
        {panels.map((panel, i) => (
          <div
            key={i}
            aria-hidden
            className="fixed z-[100] cursor-not-allowed"
            style={{
              top: panel.top,
              left: panel.left,
              width: panel.width,
              height: panel.height,
              background: OVERLAY,
            }}
            onClick={blockClick}
            onMouseDown={blockClick}
          />
        ))}

        <div
          aria-hidden
          className="pointer-events-none fixed z-[101] rounded-[14px] ring-2 ring-white/95 tour-target-pulse transition-all duration-300 ease-out"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            boxShadow:
              '0 0 0 1px rgba(255,255,255,0.25), 0 0 32px rgba(6,59,63,0.35), inset 0 0 0 1px rgba(255,255,255,0.08)',
          }}
        />
      </>
    )
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close guide"
        className="fixed inset-0 z-[100] cursor-default border-0 bg-transparent p-0"
        onClick={onDismiss}
      >
        <svg
          className="pointer-events-none h-full w-full"
          aria-hidden
          viewBox={`0 0 ${vw} ${vh}`}
          preserveAspectRatio="none"
        >
          <defs>
            <mask id={maskId}>
              <rect width={vw} height={vh} fill="white" />
              <rect
                x={rect.left}
                y={rect.top}
                width={rect.width}
                height={rect.height}
                rx={14}
                ry={14}
                fill="black"
              />
            </mask>
          </defs>
          <rect width={vw} height={vh} fill={OVERLAY} mask={`url(#${maskId})`} />
        </svg>
      </button>

      <div
        aria-hidden
        className="pointer-events-none fixed z-[101] rounded-[14px] ring-2 ring-white/95 transition-all duration-300 ease-out"
        style={{
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          boxShadow:
            '0 0 0 1px rgba(255,255,255,0.25), 0 0 32px rgba(6,59,63,0.35), inset 0 0 0 1px rgba(255,255,255,0.08)',
        }}
      />
    </>
  )
}
