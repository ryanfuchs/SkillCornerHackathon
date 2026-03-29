import { useMemo, useState } from 'react'
import {
  IndicatorMetricMiniPitch,
  type IndicatorMetricVariant,
} from '@/components/concept/IndicatorMetricMiniPitch'
import { cn } from '@/lib/utils'

const INDICATORS: {
  id: string
  letter: string
  title: string
  accent: string
  metricVariant: IndicatorMetricVariant
  summary: string
}[] = [
  {
    id: 'defensive_line',
    letter: 'A',
    title: 'Defensive line',
    accent: '#38bdf8',
    metricVariant: 'defensive_line',
    summary:
      'The triangulated shape picks out the deepest defensive line for either team. We read depth jaggedness and horizontal gaps from the spread of tactical coordinates, folding midfielders in when fewer than three defenders appear. A higher score describes a broken line and rest defense that looks exposed.',
  },
  {
    id: 'ball_chaos',
    letter: 'B',
    title: 'Ball chaos',
    accent: '#f97316',
    metricVariant: 'ball_chaos',
    summary:
      'Height, speed, and how the path bends between frames all feed this score, including sharp turns, sudden bursts, and awkward bounces. Values near one feel like frantic ping pong while values near zero describe calm, controlled circulation.',
  },
  {
    id: 'position_change',
    letter: 'C',
    title: 'Positional change',
    accent: '#22c55e',
    metricVariant: 'position_change',
    summary:
      'Every player snaps to a discrete tactical grid each frame. We add the Euclidean grid distance for everyone who appears in two consecutive frames, then normalize the total into a zero to one range. A higher value means the whole team churned position together.',
  },
  {
    id: 'line_to_line',
    letter: 'D',
    title: 'Line to line acceleration',
    accent: '#e11d48',
    metricVariant: 'line_to_line_acceleration',
    summary:
      'While the team in possession has the ball we contrast its most advanced line with the deepest opposing line using mean forward acceleration from tenth of a second steps. A higher score means attackers are accelerating harder forward than the retreating defenders.',
  },
  {
    id: 'clusters',
    letter: 'E',
    title: 'Player clustering',
    accent: '#a855f7',
    metricVariant: 'player_clusters',
    summary:
      'Players join a fully connected proximity graph each frame and distances pass through an inverse sigmoid. Tight packs lift the score while stretched shapes pull it down.',
  },
]

export function IndicatorExplorer() {
  const [active, setActive] = useState(0)
  const cur = INDICATORS[active]!

  const demoLevel = useMemo(() => {
    const hash = cur.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
    return 0.35 + (hash % 55) / 100
  }, [cur.id])

  return (
    <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)] lg:items-stretch lg:gap-10">
      <div className="flex min-h-0 min-w-0 flex-col gap-6 lg:gap-8">
        <div
          className="flex w-full flex-col gap-2 rounded-2xl bg-black/[0.035] p-1.5 dark:bg-white/[0.06] sm:inline-flex sm:w-auto sm:flex-row sm:flex-wrap"
          role="tablist"
          aria-label="Chaos indicators"
        >
          {INDICATORS.map((ind, i) => (
            <button
              key={ind.id}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-controls={`indicator-panel-${ind.id}`}
              id={`indicator-tab-${ind.id}`}
              className={cn(
                'rounded-xl px-4 py-2.5 text-left text-[13px] font-medium tracking-[-0.015em] transition-[color,background-color,box-shadow] duration-200 motion-reduce:transition-none sm:px-4',
                i === active
                  ? 'bg-white text-[#1d1d1f] shadow-[0_2px_8px_-2px_rgba(0,0,0,0.12),0_1px_2px_-1px_rgba(0,0,0,0.06)] dark:bg-[#3a3a3c] dark:text-[#f5f5f7] dark:shadow-[0_2px_14px_-4px_rgba(0,0,0,0.55)]'
                  : 'text-[#6e6e73] hover:bg-white/70 hover:text-[#1d1d1f] dark:text-[#a1a1a6] dark:hover:bg-white/[0.12] dark:hover:text-[#f5f5f7]',
              )}
              onClick={() => setActive(i)}
            >
              <span className="mr-1.5 tabular-nums text-[#86868b] dark:text-[#98989d]">
                {ind.letter}.
              </span>
              {ind.title}
            </button>
          ))}
        </div>

        <IndicatorMetricMiniPitch
          key={cur.metricVariant}
          variant={cur.metricVariant}
          className="mx-auto w-full max-w-xl sm:max-w-2xl lg:mx-0 lg:max-w-none"
        />
      </div>

      <div
        role="tabpanel"
        id={`indicator-panel-${cur.id}`}
        aria-labelledby={`indicator-tab-${cur.id}`}
        className="flex min-h-0 min-w-0 flex-col rounded-[1.35rem] border border-black/[0.06] bg-white/75 p-6 shadow-[0_4px_28px_-14px_rgba(0,0,0,0.12)] backdrop-blur-2xl backdrop-saturate-150 dark:border-white/[0.08] dark:bg-white/[0.06] sm:p-8 lg:h-full"
      >
        <div
          className="mb-6 h-1.5 w-full shrink-0 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.1]"
          aria-hidden
        >
          <div
            className="h-full rounded-full motion-safe:transition-[width] motion-safe:duration-700 motion-safe:ease-out"
            style={{
              width: `${demoLevel * 100}%`,
              background: `linear-gradient(90deg, ${cur.accent}99, ${cur.accent})`,
            }}
          />
        </div>
        <h3 className="shrink-0 text-[24px] font-semibold leading-tight tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
          {cur.title}
        </h3>
        <p className="mt-4 min-h-0 flex-1 text-[17px] leading-[1.5] text-[#6e6e73] dark:text-[#a1a1a6]">
          {cur.summary}
        </p>
        <p className="mt-5 shrink-0 text-[12px] font-medium tracking-wide text-[#86868b] dark:text-[#98989d] lg:mt-auto lg:pt-4">
          Illustrative intensity only. Each metric is stored from zero to one on
          every frame.
        </p>
      </div>
    </div>
  )
}
