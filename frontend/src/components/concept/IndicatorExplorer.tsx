import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'

const INDICATORS = [
  {
    id: 'defensive_line',
    letter: 'A',
    title: 'Defensive line',
    accent: '#38bdf8',
    summary:
      'Triangulated shape isolates the deepest defensive line (both teams). Standard deviation of X (depth jaggedness) and Y (horizontal gaps), merged with midfield when fewer than three defenders. Higher = broken shape, vulnerable rest defense.',
  },
  {
    id: 'ball_chaos',
    letter: 'B',
    title: 'Ball chaos',
    accent: '#f97316',
    summary:
      'Ball speed, height, and frame-to-frame trajectory: sharp turns, accelerations, aerial bounces. Near 1.0 = erratic “ping-pong”; near 0 = calm control.',
  },
  {
    id: 'position_change',
    letter: 'C',
    title: 'Positional change',
    accent: '#22c55e',
    summary:
      'Discrete tactical grid per frame; sum Euclidean grid moves for all players seen in both frames, normalized to [0, 1]. Higher = collective churn.',
  },
  {
    id: 'line_to_line',
    letter: 'D',
    title: 'Line-to-line acceleration',
    accent: '#e11d48',
    summary:
      'Possession team’s most advanced line vs. opponents’ deepest line: mean forward acceleration at 0.1 s steps. Higher = attackers pressing the back line kinematically.',
  },
  {
    id: 'clusters',
    letter: 'E',
    title: 'Player clustering',
    accent: '#a855f7',
    summary:
      'Fully connected proximity graph; inverse sigmoid of distances. Tight packs score high; stretched play scores low.',
  },
] as const

export function IndicatorExplorer() {
  const [active, setActive] = useState(0)
  const cur = INDICATORS[active]!

  const demoLevel = useMemo(() => {
    const hash = cur.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
    return 0.35 + (hash % 55) / 100
  }, [cur.id])

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Chaos indicators">
        {INDICATORS.map((ind, i) => (
          <button
            key={ind.id}
            type="button"
            role="tab"
            aria-selected={i === active}
            aria-controls={`indicator-panel-${ind.id}`}
            id={`indicator-tab-${ind.id}`}
            className={cn(
              'rounded-full border px-4 py-2.5 text-left text-[13px] font-semibold transition-all duration-200 sm:px-5',
              i === active
                ? 'border-black/[0.12] bg-[#1d1d1f] text-[#f5f5f7] shadow-md dark:border-white/15 dark:bg-white/95 dark:text-[#1d1d1f]'
                : 'border-black/[0.06] bg-white/60 text-[#424245] hover:bg-white/90 dark:border-white/[0.08] dark:bg-white/[0.06] dark:text-[#d2d2d7] dark:hover:bg-white/10',
            )}
            onClick={() => setActive(i)}
          >
            <span className="mr-2 opacity-70">{ind.letter}.</span>
            {ind.title}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`indicator-panel-${cur.id}`}
        aria-labelledby={`indicator-tab-${cur.id}`}
        className="rounded-[1.35rem] border border-black/[0.06] bg-white/70 p-6 shadow-[0_4px_32px_-16px_rgba(0,0,0,0.15)] backdrop-blur-xl dark:border-white/[0.08] dark:bg-white/[0.06] sm:p-8"
      >
        <div
          className="mb-6 h-3 w-full overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.1]"
          aria-hidden
        >
          <div
            className="h-full rounded-full motion-safe:transition-all motion-safe:duration-700 ease-out"
            style={{
              width: `${demoLevel * 100}%`,
              background: `linear-gradient(90deg, ${cur.accent}88, ${cur.accent})`,
            }}
          />
        </div>
        <h3 className="text-[22px] font-semibold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
          {cur.title}
        </h3>
        <p className="mt-3 text-[17px] leading-relaxed text-[#6e6e73] dark:text-[#a1a1a6]">
          {cur.summary}
        </p>
        <p className="mt-4 text-[13px] font-medium tabular-nums text-[#86868b] dark:text-[#98989d]">
          Illustrative intensity bar · all metrics exported in [0, 1] per frame
        </p>
      </div>
    </div>
  )
}
