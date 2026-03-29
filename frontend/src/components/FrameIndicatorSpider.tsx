import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { usePlayback } from '@/context/PlaybackContext'
import phaseBreakdownFrames from '@/data/phaseBreakdownFrames.json'
import {
  buildPossessionTeamIdByFrame,
  possessionAccentColor,
} from '@/lib/possessionByBundleFrame'
import { cn } from '@/lib/utils'

type FramesPayload = {
  player_clusters: number[]
  position_change: number[]
  ball_chaos: number[]
  defensive_line: number[]
  line_to_line_acceleration: number[]
  frameSeriesLength: number
  nFrames?: number
}

const framesPart = phaseBreakdownFrames as FramesPayload

const POSSESSION_TEAM_ID_BY_FRAME = buildPossessionTeamIdByFrame(
  framesPart.nFrames ?? framesPart.frameSeriesLength,
)

const AXES: {
  key: keyof Pick<
    FramesPayload,
    | 'player_clusters'
    | 'position_change'
    | 'ball_chaos'
    | 'defensive_line'
    | 'line_to_line_acceleration'
  >
  subject: string
  color: string
}[] = [
  { key: 'player_clusters', subject: 'Clusters', color: '#a855f7' },
  { key: 'position_change', subject: 'Pos. change', color: '#22c55e' },
  { key: 'ball_chaos', subject: 'Ball chaos', color: '#f97316' },
  { key: 'defensive_line', subject: 'Back line', color: '#38bdf8' },
  {
    key: 'line_to_line_acceleration',
    subject: 'L2L accel.',
    color: '#e11d48',
  },
]

const N = AXES.length
const VB = 100
const CX = 50
const CY = 52
/** Radius (viewBox units) where value === 1. */
const R_MAX = 34
/** Label radius outside the outer ring. */
const R_LABEL = R_MAX * 1.14

function analyticsRowCount(): number {
  return Math.min(
    framesPart.frameSeriesLength,
    framesPart.player_clusters.length,
    framesPart.position_change.length,
    framesPart.ball_chaos.length,
    framesPart.defensive_line.length,
    framesPart.line_to_line_acceleration.length,
  )
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(1, n))
}

function rowValues(row: number): number[] {
  return AXES.map((a) => clamp01(framesPart[a.key][row] ?? 0))
}

/** Radians: first axis at top, then clockwise. */
function axisAngleRad(i: number): number {
  return -Math.PI / 2 + (i * 2 * Math.PI) / N
}

function pointOnAxis(value: number, i: number): { x: number; y: number } {
  const a = axisAngleRad(i)
  const r = R_MAX * clamp01(value)
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) }
}

function polygonPointsString(values: number[]): string {
  return values
    .map((v, i) => {
      const p = pointOnAxis(v, i)
      return `${p.x},${p.y}`
    })
    .join(' ')
}

function ringPolygonPoints(scale: number): string {
  return Array.from({ length: N }, (_, i) => {
    const a = axisAngleRad(i)
    const r = R_MAX * scale
    return `${CX + r * Math.cos(a)},${CY + r * Math.sin(a)}`
  }).join(' ')
}

/** Grid + labels only — never receives live values, avoids tick flicker from chart libs. */
const SpiderRadarChrome = memo(function SpiderRadarChrome() {
  const gridLevels = [0.25, 0.5, 0.75, 1]
  return (
    <g className="spider-radar-chrome pointer-events-none" aria-hidden>
      {gridLevels.map((s) => (
        <polygon
          key={s}
          points={ringPolygonPoints(s)}
          fill="none"
          stroke="rgba(0,0,0,0.07)"
          strokeWidth={0.35}
          vectorEffect="non-scaling-stroke"
          className="dark:stroke-white/12"
        />
      ))}
      {Array.from({ length: N }, (_, i) => {
        const a = axisAngleRad(i)
        const x2 = CX + R_MAX * Math.cos(a)
        const y2 = CY + R_MAX * Math.sin(a)
        return (
          <line
            key={i}
            x1={CX}
            y1={CY}
            x2={x2}
            y2={y2}
            stroke="rgba(0,0,0,0.07)"
            strokeWidth={0.35}
            vectorEffect="non-scaling-stroke"
            className="dark:stroke-white/12"
          />
        )
      })}
      {AXES.map((axis, i) => {
        const a = axisAngleRad(i)
        const x = CX + R_LABEL * Math.cos(a)
        const y = CY + R_LABEL * Math.sin(a)
        const anchor =
          Math.abs(Math.cos(a)) < 0.35 ? 'middle' : Math.cos(a) > 0 ? 'start' : 'end'
        return (
          <text
            key={axis.key}
            x={x}
            y={y}
            textAnchor={anchor}
            dominantBaseline="middle"
            className="fill-[#86868b] text-[3.1px] font-medium dark:fill-[#98989d]"
            style={{ fontSize: '3.1px' }}
          >
            {axis.subject}
          </text>
        )
      })}
    </g>
  )
})

function SpiderDataLayer({
  values,
  vertexDotColor,
}: {
  values: number[]
  vertexDotColor: string
}) {
  const pts = polygonPointsString(values)
  return (
    <g className="spider-radar-data">
      <polygon
        points={pts}
        fill="var(--accent, #fab95b)"
        fillOpacity={0.28}
        stroke="var(--secondary, #547792)"
        strokeWidth={0.9}
        vectorEffect="non-scaling-stroke"
      />
      {values.map((v, i) => {
        const p = pointOnAxis(v, i)
        return (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={1.15}
            fill={vertexDotColor}
            className="transition-[fill] duration-200 ease-out"
          />
        )
      })}
    </g>
  )
}

const SPIDER_RENDER_INTERVAL_MS = 50

function useSmoothedIndicatorRow(
  frameIndex: number,
  rowCap: number,
  blend: number,
): number[] {
  const row = useMemo(
    () => Math.min(Math.max(0, frameIndex), rowCap - 1),
    [frameIndex, rowCap],
  )

  const targetRef = useRef<number[]>(rowValues(row))
  const smoothRef = useRef<number[]>(rowValues(row))
  const [smooth, setSmooth] = useState<number[]>(() => rowValues(row))

  useEffect(() => {
    targetRef.current = rowValues(row)
  }, [row])

  useEffect(() => {
    let raf = 0
    let lastCommit = 0
    const tick = (now: number) => {
      const target = targetRef.current
      const prev = smoothRef.current
      let maxErr = 0
      const next = prev.map((v, i) => {
        const t = target[i]!
        const nv = v + (t - v) * blend
        maxErr = Math.max(maxErr, Math.abs(t - nv))
        return nv
      })
      smoothRef.current = next
      if (maxErr < 0.0012) {
        smoothRef.current = [...target]
        setSmooth([...target])
        return
      }
      if (now - lastCommit >= SPIDER_RENDER_INTERVAL_MS) {
        lastCommit = now
        setSmooth(next)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [row, blend])

  return smooth
}

type Props = {
  className?: string
}

function FrameIndicatorSpiderBody({
  rowCap,
  className,
}: Props & { rowCap: number }) {
  const { frameIndex, playbackFrameCount } = usePlayback()
  const smoothed = useSmoothedIndicatorRow(frameIndex, rowCap, 0.22)

  const possessionTeamId = useMemo(() => {
    if (playbackFrameCount <= 0) return -1
    const f = Math.min(
      Math.max(0, frameIndex),
      POSSESSION_TEAM_ID_BY_FRAME.length - 1,
    )
    return POSSESSION_TEAM_ID_BY_FRAME[f]!
  }, [frameIndex, playbackFrameCount])

  const vertexDotColor = useMemo(
    () => possessionAccentColor(possessionTeamId),
    [possessionTeamId],
  )

  return (
    <div className={cn('h-full min-h-[14rem] w-full', className)}>
      <p className="px-1 pb-2 text-[11px] text-[#86868b] tabular-nums dark:text-[#98989d]">
        Frame{' '}
        {playbackFrameCount > 0
          ? `${Math.min(frameIndex, rowCap - 1)} / ${rowCap - 1}`
          : `— / ${rowCap - 1}`}{' '}
        · indicators 0–1 (smoothed)
      </p>
      <div className="h-[min(18rem,calc(100%-2rem))] min-h-[12rem] w-full">
        <svg
          viewBox={`0 0 ${VB} ${VB}`}
          className="h-full w-full overflow-visible"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Five indicator radar chart, values 0 to 1"
        >
          <title>Match analytics radar (five indicators, 0–1)</title>
          <SpiderRadarChrome />
          <SpiderDataLayer
            values={smoothed}
            vertexDotColor={vertexDotColor}
          />
        </svg>
      </div>
    </div>
  )
}

export function FrameIndicatorSpider({ className }: Props) {
  const rowCap = analyticsRowCount()
  if (rowCap <= 0) {
    return (
      <div
        className={cn(
          'flex min-h-[12rem] items-center justify-center px-4 text-center text-sm text-[#86868b] dark:text-[#98989d]',
          className,
        )}
      >
        No per-frame analytics loaded.
      </div>
    )
  }

  return <FrameIndicatorSpiderBody rowCap={rowCap} className={className} />
}
