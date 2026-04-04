/** Right-hand marketing / dashboard preview — shared by login and auth helper pages */
export function AuthMarketingPanel() {
  return (
    <div className="relative hidden flex-1 overflow-hidden lg:flex">
      <div className="absolute inset-0 bg-[#051e21]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(45,212,191,0.18),transparent),radial-gradient(ellipse_60%_50%_at_80%_100%,rgba(16,185,129,0.12),transparent)]" />
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.24)_100%)]" />

      <div className="absolute -top-32 right-[10%] h-[500px] w-[500px] rounded-full bg-cyan-400/8 blur-[140px]" />
      <div className="absolute -bottom-40 -left-20 h-[400px] w-[400px] rounded-full bg-emerald-400/8 blur-[140px]" />

      <div className="relative z-10 flex w-full flex-col items-center justify-center px-10 py-14 xl:px-16">
        <div className="mb-8 w-full max-w-[520px]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-white/32">
            Internal scorecard platform
          </p>
          <h2 className="mt-3 text-[26px] font-semibold leading-[1.2] tracking-[-0.02em] text-white xl:text-[30px]">
            Track progress with clarity.
          </h2>
          <p className="mt-2 text-[13px] leading-[1.7] text-white/44">
            Monitor scorecards, maturity levels, and reporting performance from one focused dashboard.
          </p>
        </div>

        <div className="w-full max-w-[520px] rounded-2xl border border-white/[0.09] bg-white/[0.06] p-5 shadow-[0_24px_64px_rgba(0,0,0,0.24)] backdrop-blur-xl">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/36">Team Progress</p>
              <p className="mt-2 text-[40px] font-semibold leading-none tracking-[-0.04em] text-white">84.6%</p>
            </div>
            <div className="rounded-full border border-emerald-300/15 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-200/80">
              +12.4%
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {[
              { label: 'Operations', pct: 91, color: 'bg-white/75' },
              { label: 'Compliance', pct: 86, color: 'bg-cyan-300/65' },
              { label: 'Delivery', pct: 74, color: 'bg-emerald-300/65' },
            ].map(b => (
              <div key={b.label}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-white/50">{b.label}</span>
                  <span className="text-[11px] font-medium tabular-nums text-white/36">{b.pct}%</span>
                </div>
                <div className="h-[5px] rounded-full bg-white/[0.06]">
                  <div className={`h-[5px] rounded-full ${b.color}`} style={{ width: `${b.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3.5 grid w-full max-w-[520px] grid-cols-2 gap-3.5">
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.05] p-4 shadow-[0_12px_36px_rgba(0,0,0,0.18)] backdrop-blur-xl">
            <p className="text-[9px] font-medium uppercase tracking-[0.22em] text-white/32">Active Reviews</p>
            <p className="mt-2 text-[32px] font-semibold leading-none tracking-[-0.03em] text-white">12</p>
            <p className="mt-2 text-[11px] text-white/40">Across departments</p>
          </div>
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.05] p-4 shadow-[0_12px_36px_rgba(0,0,0,0.18)] backdrop-blur-xl">
            <p className="text-[9px] font-medium uppercase tracking-[0.22em] text-white/32">Avg Score Level</p>
            <div className="mt-2 flex items-baseline gap-1.5">
              <p className="text-[32px] font-semibold leading-none tracking-[-0.03em] text-white">3</p>
              <p className="text-[14px] font-medium text-white/30">/5</p>
            </div>
            <div className="mt-3 flex gap-1">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className={`h-1 flex-1 rounded-full ${i <= 3 ? 'bg-emerald-400/60' : 'bg-white/8'}`} />
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.05] p-4 shadow-[0_12px_36px_rgba(0,0,0,0.18)] backdrop-blur-xl">
            <p className="text-[9px] font-medium uppercase tracking-[0.22em] text-white/32">Reporting</p>
            <div className="mt-2.5 flex items-center gap-1.5">
              <div className="h-[6px] w-[6px] rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]" />
              <span className="text-[11px] font-medium text-white/55">All systems live</span>
            </div>
            <div className="mt-3 flex h-[32px] items-end gap-[3px]">
              {[30, 55, 42, 74, 90, 62, 96].map((h, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-[2px] ${i >= 5 ? 'bg-cyan-300/50' : i >= 3 ? 'bg-white/40' : 'bg-white/18'}`}
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.05] p-4 shadow-[0_12px_36px_rgba(0,0,0,0.18)] backdrop-blur-xl">
            <p className="text-[9px] font-medium uppercase tracking-[0.22em] text-white/32">Companies</p>
            <p className="mt-2 text-[32px] font-semibold leading-none tracking-[-0.03em] text-white">48</p>
            <div className="mt-2.5 flex items-center gap-1.5">
              <div className="flex -space-x-1">
                {['bg-cyan-400/60', 'bg-emerald-400/60', 'bg-white/40', 'bg-teal-400/50'].map((c, i) => (
                  <div key={i} className={`h-4 w-4 rounded-full ${c} ring-[1.5px] ring-[#051e21]`} />
                ))}
              </div>
              <span className="text-[10px] text-white/32">+44 more</span>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
    </div>
  )
}
