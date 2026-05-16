"use client"

import React, { useMemo } from "react"

type Milestone = {
  year: number
  text: string
  detail?: string // extra line shown on mobile
  side: "above" | "below" // used for desktop only
  posPct?: number // desktop only
}

const milestones: Milestone[] = [
  { year: 2013, text: "B-BBEE Codes of Good Practice amended & gazetted (Oct 2013).", detail: "New milestones introduced for sustainable transformation planning.", side: "above" },
  { year: 2018, text: "Deep verification & advisory experience built across sectors.", detail: "B-BBEE verifications aligned to SANAS/IRBA requirements for listed entities, SOEs, SMEs and large enterprises.", side: "below" },
  { year: 2021, text: "REAP Solutions delivers end-to-end transformation solutions.", detail: "Strategy-to-model approach: translate business strategy into a commercially sound transformation plan.", side: "above" },
  { year: 2023, text: "Transaction Advisory strengthened.", detail: "Shareholder profiling, funding model guidance (net value focus), plus tax, accounting and legal advisory via associates.", side: "below" },
  { year: 2025, text: "Educational & training programs offered to the market.", detail: "Understanding the B-BBEE Codes, ESD sessions, and transformation and corporate identity training & coaching.", side: "above" },
]

const TEAL = "#0B6F73"
const GREY = "#C9CED6"
const TEXT = "#0B0F14"
const MUTED = "#6B7280"

function DesktopTimeline() {
  const years = useMemo(() => milestones.map((m) => m.year).sort((a, b) => a - b), [])
  const minYear = years[0]
  const maxYear = years[years.length - 1]

  const yearPoints = useMemo(() => {
    return years.map((y, idx) => {
      const pct = maxYear === minYear ? 0 : ((y - minYear) / (maxYear - minYear)) * 100
      return { year: y, pct, labelSide: (idx % 2 === 0 ? "above" : "below") as "above" | "below" }
    })
  }, [years, minYear, maxYear])

  const placedMilestones = useMemo(() => {
    return milestones.map((m) => {
      const pct =
        typeof m.posPct === "number"
          ? m.posPct
          : maxYear === minYear
            ? 0
            : ((m.year - minYear) / (maxYear - minYear)) * 100
      return { ...m, pct }
    })
  }, [minYear, maxYear])

  const W = 1400
  const H = 380
  const PAD = 70
  const innerW = W - PAD * 2

  const axisY = 220
  const tickTop = axisY - 18
  const tickBottom = axisY + 18

  const pctToX = (pct: number) => PAD + (pct / 100) * innerW

  const TICKS = 76
  const tickXs = Array.from({ length: TICKS }, (_, i) => PAD + (i / (TICKS - 1)) * innerW)

  return (
    <div className="w-full">
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" className="block h-auto w-full">
        {tickXs.map((x, i) => {
          const isLong = i % 8 === 0
          const y1 = isLong ? axisY - 28 : tickTop
          const y2 = isLong ? axisY + 28 : tickBottom
          const opacity = isLong ? 0.95 : 0.7
          return <line key={`t-${i}`} x1={x} x2={x} y1={y1} y2={y2} stroke={GREY} strokeWidth={1} opacity={opacity} />
        })}

        {yearPoints.map((p) => {
          const x = pctToX(p.pct)
          return (
            <line
              key={`sep-${p.year}`}
              x1={x}
              x2={x}
              y1={axisY - 90}
              y2={axisY + 90}
              stroke={GREY}
              strokeWidth={1}
              opacity={0.55}
            />
          )
        })}

        {yearPoints.map((p) => {
          const x = pctToX(p.pct)
          return <rect key={`bar-${p.year}`} x={x - 2} y={axisY - 26} width={4} height={52} rx={1} fill={TEAL} />
        })}

        {yearPoints.map((p) => {
          const x = pctToX(p.pct)
          const isAbove = p.labelSide === "above"
          const labelY = isAbove ? axisY - 56 : axisY + 56
          return (
            <g key={`year-${p.year}`}>
              <circle cx={x - 18} cy={labelY} r={4} fill={TEXT} />
              <text
                x={x}
                y={labelY}
                fill={MUTED}
                fontSize={14}
                fontWeight={600}
                textAnchor="start"
                dominantBaseline="middle"
              >
                {p.year}
              </text>
              <line x1={x} x2={x} y1={isAbove ? axisY - 34 : axisY + 34} y2={axisY} stroke={GREY} strokeWidth={1} opacity={0.55} />
            </g>
          )
        })}

        {placedMilestones.map((m, idx) => {
          const x = pctToX(m.pct)
          const boxW = 320
          const edgePad = 16
          const boxX = Math.max(edgePad, Math.min(W - boxW - edgePad, x - boxW / 2))
          const isAbove = m.side === "above"
          const boxY = isAbove ? 56 : axisY + 96
          const connectorStartY = isAbove ? axisY - 92 : axisY + 92
          const connectorEndY = isAbove ? boxY + 78 : boxY - 12

          return (
            <g key={`ms-${idx}`}>
              <line x1={x} x2={x} y1={connectorStartY} y2={connectorEndY} stroke={GREY} strokeWidth={1} opacity={0.9} />
              <foreignObject x={boxX} y={boxY} width={boxW} height={100}>
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    color: TEXT,
                    fontSize: 14,
                    lineHeight: 1.25,
                    fontWeight: 600,
                    padding: "0 12px",
                  }}
                >
                  {m.text}
                </div>
              </foreignObject>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function MobileTimeline() {
  return (
    <div className="w-full">
      {/* Left rail */}
      <div className="relative">
        {/* vertical line */}
        <div
          className="absolute left-3 top-0 h-full w-px"
          style={{ backgroundColor: GREY, opacity: 0.9 }}
          aria-hidden="true"
        />
        {/* teal accents (optional small bars on the rail) */}
        <div
          className="absolute left-[11px] top-1 h-10 w-1 rounded-[1px]"
          style={{ backgroundColor: TEAL }}
          aria-hidden="true"
        />

        <ul className="space-y-8 pl-6">
          {milestones
            .slice()
            .sort((a, b) => a.year - b.year)
            .map((m, idx) => (
              <li key={`${m.year}-${idx}`} className="relative">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold" style={{ color: MUTED }}>
                      {m.year}
                    </span>
                    <span className="h-6 w-1 rounded-[1px]" style={{ backgroundColor: TEAL }} aria-hidden="true" />
                  </div>

                  <p className="text-[14px] font-semibold leading-snug" style={{ color: TEXT }}>
                    {m.text}
                  </p>
                  {m.detail && (
                    <p className="text-[13px] font-normal leading-relaxed text-slate-600">
                      {m.detail}
                    </p>
                  )}
                </div>
              </li>
            ))}
        </ul>
      </div>
    </div>
  )
}

export default function MarketingTimelineSection({ heading = "Our Journey" }: { heading?: string }) {
  return (
    <section className="w-full bg-white">
      {/* full width container (your About page standard) */}
      <div className="mx-auto w-full px-6 py-16 sm:px-10 lg:px-16">
        <h2 className="mb-12 text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl lg:text-6xl">{heading}</h2>

        {/* Mobile: vertical timeline */}
        <div className="block lg:hidden">
          <MobileTimeline />
        </div>

        {/* Desktop: Lionsoul horizontal */}
        <div className="hidden lg:block">
          <DesktopTimeline />
        </div>
      </div>
    </section>
  )
}