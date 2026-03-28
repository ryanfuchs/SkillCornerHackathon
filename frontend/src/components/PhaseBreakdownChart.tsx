import { useEffect, useMemo } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePlayback } from '@/context/PlaybackContext'
import phaseBreakdownPhases from '@/data/phaseBreakdownPhases.json'
import phaseBreakdownFrames from '@/data/phaseBreakdownFrames.json'

type PhaseAnalysis = {
  mean: Record<string, number>
  max: Record<string, number>
  min: Record<string, number>
  frameCount: number
}

type PhaseOfPlayRow = Record<string, unknown>

/** New export shape: full CSV row under phaseOfPlay. */
type PhaseRecord = {
  orderIndex: number
  bundleStart: number | null
  bundleEnd: number | null
  phaseOfPlay: PhaseOfPlayRow
  analysis: PhaseAnalysis | null
}

/** Legacy flat phase meta (older single-file exports). */
type LegacyPhaseMeta = {
  orderIndex: number
  csvIndex?: number
  frameStart?: number
  frameEnd?: number
  bundleStart: number | null
  bundleEnd: number | null
  minuteStart?: number
  secondStart?: number
  period?: number
  phaseType?: string
  phaseOfPlay?: PhaseOfPlayRow
  analysis?: PhaseAnalysis | null
}

type SeriesRow = {
  bundleStart: number | null
  bundleEnd: number | null
  t: number[]
  player_clusters: number[]
  position_change: number[]
  ball_chaos: number[]
  defensive_line: number[]
  line_to_line_acceleration: number[]
}

type FrameSeries = {
  trackingFrameIds: number[]
  player_clusters: number[]
  position_change: number[]
  ball_chaos: number[]
  defensive_line: number[]
  line_to_line_acceleration: number[]
}

type PhasesPayload = {
  phases: (PhaseRecord | LegacyPhaseMeta)[]
  seriesByPhaseOrder: Record<string, SeriesRow>
  nFrames?: number
  frameSeriesLength?: number
  indicatorIds?: string[]
  phaseChartStride?: number
  precomputedPhaseOrderIndices?: number[]
  framesFile?: string
  matchId?: number
}

type FramesPayload = {
  matchId: number
  nFrames: number
  frameSeriesLength: number
  indicatorIds: string[]
  trackingFrameIds: number[]
  player_clusters: number[]
  position_change: number[]
  ball_chaos: number[]
  defensive_line: number[]
  line_to_line_acceleration: number[]
  phasesFile?: string
}

const phasesPart = phaseBreakdownPhases as PhasesPayload
const framesPart = phaseBreakdownFrames as FramesPayload

const frameSeries: FrameSeries = {
  trackingFrameIds: framesPart.trackingFrameIds,
  player_clusters: framesPart.player_clusters,
  position_change: framesPart.position_change,
  ball_chaos: framesPart.ball_chaos,
  defensive_line: framesPart.defensive_line,
  line_to_line_acceleration: framesPart.line_to_line_acceleration,
}

const payload = {
  ...phasesPart,
  frameSeries,
}

const INDICATOR_STYLES: { id: string; label: string; color: string }[] = [
  { id: 'player_clusters', label: 'Player clusters', color: '#a855f7' },
  { id: 'position_change', label: 'Position change', color: '#22c55e' },
  { id: 'ball_chaos', label: 'Ball chaos', color: '#f97316' },
  { id: 'defensive_line', label: 'Defensive line', color: '#38bdf8' },
  { id: 'line_to_line_acceleration', label: 'Line-to-line accel.', color: '#e11d48' },
]

function isPhaseRecord(p: PhaseRecord | LegacyPhaseMeta): p is PhaseRecord {
  return p.phaseOfPlay != null && Object.keys(p.phaseOfPlay).length > 0
}

function phaseLabel(p: PhaseRecord | LegacyPhaseMeta) {
  if (isPhaseRecord(p)) {
    const row = p.phaseOfPlay
    const period = row.period as number
    const minute = row.minute_start as number
    const second = row.second_start as number
    const typ = String(row.team_in_possession_phase_type ?? '')
    return `P${period} ${minute}:${String(second).padStart(2, '0')} · ${typ}`
  }
  const l = p as LegacyPhaseMeta
  return `P${l.period ?? '?'} ${l.minuteStart ?? '?'}:${String(l.secondStart ?? 0).padStart(2, '0')} · ${l.phaseType ?? ''}`
}

function chartRowsFromSeries(series: SeriesRow) {
  if (!series?.t?.length) return []
  return series.t.map((t, i) => ({
    t,
    player_clusters: series.player_clusters[i] ?? 0,
    position_change: series.position_change[i] ?? 0,
    ball_chaos: series.ball_chaos[i] ?? 0,
    defensive_line: series.defensive_line[i] ?? 0,
    line_to_line_acceleration: series.line_to_line_acceleration[i] ?? 0,
  }))
}

function chartRowsFromFrameSlice(
  fs: FrameSeries,
  bundleStart: number,
  bundleEnd: number,
  stride: number,
) {
  const len = fs.player_clusters.length
  if (len === 0 || bundleStart >= len) return []
  const hi = Math.min(bundleEnd, len - 1)
  const rows: ReturnType<typeof chartRowsFromSeries> = []
  let t = 0
  for (let i = bundleStart; i <= hi; i += stride) {
    rows.push({
      t,
      player_clusters: fs.player_clusters[i] ?? 0,
      position_change: fs.position_change[i] ?? 0,
      ball_chaos: fs.ball_chaos[i] ?? 0,
      defensive_line: fs.defensive_line[i] ?? 0,
      line_to_line_acceleration: fs.line_to_line_acceleration[i] ?? 0,
    })
    t += stride
  }
  return rows
}

export function PhaseBreakdownChart() {
  const { phaseIndex, frameIndex, setPhaseIndex, setFrameIndex } = usePlayback()
  const phases = payload.phases
  const n = phases.length
  const frameSeries = payload.frameSeries
  const chartStride = payload.phaseChartStride ?? 1

  const safePhase = n === 0 ? 0 : Math.min(Math.max(0, phaseIndex), n - 1)

  useEffect(() => {
    if (safePhase !== phaseIndex) {
      setPhaseIndex(safePhase)
    }
  }, [phaseIndex, safePhase, setPhaseIndex])

  const phase = phases[safePhase]
  const series = payload.seriesByPhaseOrder[String(safePhase)]

  useEffect(() => {
    const p = phases[safePhase]
    if (!p || p.bundleStart == null) return
    setFrameIndex(p.bundleStart)
  }, [safePhase, phases, setFrameIndex])

  const chartData = useMemo(() => {
    const fromSeries = chartRowsFromSeries(series)
    if (fromSeries.length > 0) return fromSeries
    if (
      frameSeries &&
      phase?.bundleStart != null &&
      phase.bundleEnd != null &&
      phase.bundleStart <= phase.bundleEnd
    ) {
      return chartRowsFromFrameSlice(
        frameSeries,
        phase.bundleStart,
        phase.bundleEnd,
        chartStride,
      )
    }
    return []
  }, [series, frameSeries, phase, chartStride])

  const bundleStart = phase?.bundleStart ?? series?.bundleStart ?? null
  const bundleEnd = phase?.bundleEnd ?? series?.bundleEnd ?? null

  const playheadT =
    bundleStart != null && bundleEnd != null
      ? frameIndex - bundleStart
      : null
  const inPhase =
    playheadT != null &&
    playheadT >= 0 &&
    bundleEnd != null &&
    frameIndex <= bundleEnd

  const frameStartEnd =
    isPhaseRecord(phase) && phase.phaseOfPlay
      ? {
          frameStart: phase.phaseOfPlay.frame_start as number,
          frameEnd: phase.phaseOfPlay.frame_end as number,
        }
      : {
          frameStart: (phase as LegacyPhaseMeta).frameStart,
          frameEnd: (phase as LegacyPhaseMeta).frameEnd,
        }

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground truncate max-w-[min(100%,28rem)]">
          {phase ? phaseLabel(phase) : 'No phase data'}
          {bundleStart != null && frameStartEnd.frameStart != null && frameStartEnd.frameEnd != null && (
            <span className="ml-2 tabular-nums opacity-80">
              frames {frameStartEnd.frameStart}–{frameStartEnd.frameEnd} · bundle {bundleStart}–{bundleEnd}
            </span>
          )}
        </p>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            disabled={safePhase <= 0}
            onClick={() => setPhaseIndex((i) => Math.max(0, i - 1))}
            aria-label="Previous phase"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-xs text-muted-foreground tabular-nums px-1 min-w-[4.5rem] text-center">
            {n === 0 ? '—' : `${safePhase + 1} / ${n}`}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            disabled={safePhase >= n - 1}
            onClick={() => setPhaseIndex((i) => Math.min(n - 1, i + 1))}
            aria-label="Next phase"
          >
            <ChevronRight className="size-4" />
          </Button>
          {bundleStart != null && bundleEnd != null && (
            <>
              <span className="mx-1 h-4 w-px bg-border" aria-hidden />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={frameIndex <= bundleStart}
                onClick={() =>
                  setFrameIndex((f) => Math.max(bundleStart, f - 1))
                }
              >
                −1f
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={frameIndex >= bundleEnd}
                onClick={() =>
                  setFrameIndex((f) => Math.min(bundleEnd, f + 1))
                }
              >
                +1f
              </Button>
            </>
          )}
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="flex min-h-[10rem] items-center justify-center text-muted-foreground/50 text-sm">
          No series for this phase
        </div>
      ) : (
        <div className="h-72 w-full min-h-72 min-w-0 sm:h-80 sm:min-h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <XAxis
                dataKey="t"
                type="number"
                domain={['dataMin', 'dataMax']}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                label={{
                  value: 'Frame offset in phase',
                  position: 'insideBottom',
                  offset: -2,
                  style: { fill: 'hsl(var(--muted-foreground))', fontSize: 10 },
                }}
              />
              <YAxis
                domain={[0, 1]}
                width={36}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickCount={6}
              />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 6,
                  fontSize: 12,
                }}
                formatter={(value) =>
                  typeof value === 'number' ? [value.toFixed(3), ''] : ['', '']
                }
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {INDICATOR_STYLES.map(({ id, label, color }) => (
                <Line
                  key={id}
                  type="monotone"
                  dataKey={id}
                  name={label}
                  stroke={color}
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
              ))}
              {inPhase && playheadT != null && (
                <ReferenceLine
                  x={playheadT}
                  stroke="hsl(var(--foreground))"
                  strokeWidth={1}
                  strokeDasharray="4 3"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
