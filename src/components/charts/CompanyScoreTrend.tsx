'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface TrendPoint {
  dateLabel: string
  score: number
}

interface CompanyScoreTrendProps {
  data: TrendPoint[]
}

export function CompanyScoreTrend({ data }: CompanyScoreTrendProps) {
  if (!data.length) {
    return (
      <div className="h-[220px] flex items-center justify-center text-sm text-slate-500">
        No assessments yet. Create a first scorecard to start the timeline.
      </div>
    )
  }

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 16, right: 24, left: 0, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          <XAxis
            dataKey="dateLabel"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748B', fontSize: 12 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748B', fontSize: 12 }}
            domain={[0, 'auto']}
          />
          <Tooltip
            cursor={{ stroke: '#CBD5F5' }}
            contentStyle={{
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            }}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#0F172A"
            strokeWidth={2}
            dot={{ r: 3, strokeWidth: 1, stroke: '#0F172A', fill: 'white' }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

