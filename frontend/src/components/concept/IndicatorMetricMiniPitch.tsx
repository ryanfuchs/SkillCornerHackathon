import { useEffect, useId, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Pitch plane in metres: stored as [across, along] (same as PitchView).
 * On screen we draw horizontal: SVG x = along (goal to goal), SVG y = across (touchline to touchline).
 */
const P_ACROSS = 68
const P_ALONG = 105
/** ViewBox for horizontal layout: wide × tall (padding for drop shadow). */
const VB_PAD = 3.5
const VB_W = P_ALONG + 2 * VB_PAD
const VB_H = P_ACROSS + 2 * VB_PAD
/** Corner radius on the pitch outline (metres in local across×along space). */
const PITCH_CORNER_RX = 2.75

export type IndicatorMetricVariant =
  | 'player_clusters'
  | 'position_change'
  | 'ball_chaos'
  | 'defensive_line'
  | 'line_to_line_acceleration'

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

/** Unrotated pitch in stored axes: x = across, y = along; parent group swaps to horizontal view. */
function PitchBase() {
  const midAlong = P_ALONG / 2
  const midAcross = P_ACROSS / 2
  return (
    <>
      <rect
        x={0}
        y={0}
        width={P_ACROSS}
        height={P_ALONG}
        rx={PITCH_CORNER_RX}
        ry={PITCH_CORNER_RX}
        className="fill-[#2f6f3e] stroke-white/90 dark:fill-[#265d33]"
        strokeWidth={0.35}
      />
      <line
        x1={0}
        y1={midAlong}
        x2={P_ACROSS}
        y2={midAlong}
        className="stroke-white/85"
        strokeWidth={0.28}
      />
      <circle
        cx={midAcross}
        cy={midAlong}
        r={9.15}
        fill="none"
        className="stroke-white/85"
        strokeWidth={0.28}
      />
      <circle cx={midAcross} cy={midAlong} r={0.45} className="fill-white/90" />
    </>
  )
}

/** Spread 5-a-side style shape, then everyone collapses to one spot (high clustering). */
const CLUSTER_FORMATION: [number, number][] = [
  [14, 72],
  [54, 72],
  [10, 50],
  [58, 50],
  [34, 24],
]
const CLUSTER_PACK: [number, number][] = [
  [31, 47],
  [37, 47],
  [32.5, 49.5],
  [35.5, 49.5],
  [34, 46],
]
const CLUSTER_PAIR_KEYS: [number, number][] = [
  [0, 1],
  [0, 2],
  [1, 3],
  [2, 4],
  [3, 4],
]
/** Hold spread, ease into pack, hold, ease back, hold (no hard snaps). */
const CLUSTER_KEY_TIMES = '0;0.2;0.5;0.62;0.92;1'
const CLUSTER_KEY_SPLINES =
  '0 0 1 1;0.45 0 0.55 1;0 0 1 1;0.45 0 0.55 1;0 0 1 1'
const CLUSTER_DUR = '6.5s'

function clusterXValues(i: number, formation: [number, number][], pack: [number, number][]): string {
  const fx = formation[i]![0]
  const cx = pack[i]![0]
  return `${fx};${fx};${cx};${cx};${fx};${fx}`
}

function clusterYValues(i: number, formation: [number, number][], pack: [number, number][]): string {
  const fy = formation[i]![1]
  const cy = pack[i]![1]
  return `${fy};${fy};${cy};${cy};${fy};${fy}`
}

function ClustersLayer({ animate }: { animate: boolean }) {
  const accent = '#a855f7'
  const f = CLUSTER_FORMATION
  const p = CLUSTER_PACK

  return (
    <g>
      {CLUSTER_PAIR_KEYS.map(([a, b], i) => {
        const [x1, y1] = f[a]!
        const [x2, y2] = f[b]!
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={accent}
            strokeWidth={0.35}
            strokeOpacity={animate ? 0.14 : 0.2}
          >
            {animate ? (
              <>
                <animate
                  attributeName="x1"
                  values={clusterXValues(a, f, p)}
                  keyTimes={CLUSTER_KEY_TIMES}
                  keySplines={CLUSTER_KEY_SPLINES}
                  calcMode="spline"
                  dur={CLUSTER_DUR}
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="y1"
                  values={clusterYValues(a, f, p)}
                  keyTimes={CLUSTER_KEY_TIMES}
                  keySplines={CLUSTER_KEY_SPLINES}
                  calcMode="spline"
                  dur={CLUSTER_DUR}
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="x2"
                  values={clusterXValues(b, f, p)}
                  keyTimes={CLUSTER_KEY_TIMES}
                  keySplines={CLUSTER_KEY_SPLINES}
                  calcMode="spline"
                  dur={CLUSTER_DUR}
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="y2"
                  values={clusterYValues(b, f, p)}
                  keyTimes={CLUSTER_KEY_TIMES}
                  keySplines={CLUSTER_KEY_SPLINES}
                  calcMode="spline"
                  dur={CLUSTER_DUR}
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="stroke-opacity"
                  values="0.16;0.16;0.72;0.72;0.16;0.16"
                  keyTimes={CLUSTER_KEY_TIMES}
                  keySplines={CLUSTER_KEY_SPLINES}
                  calcMode="spline"
                  dur={CLUSTER_DUR}
                  repeatCount="indefinite"
                />
              </>
            ) : null}
          </line>
        )
      })}
      {f.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={1.15} fill={accent} stroke="#fff" strokeWidth={0.2}>
          {animate ? (
            <>
              <animate
                attributeName="cx"
                values={clusterXValues(i, f, p)}
                keyTimes={CLUSTER_KEY_TIMES}
                keySplines={CLUSTER_KEY_SPLINES}
                calcMode="spline"
                dur={CLUSTER_DUR}
                repeatCount="indefinite"
              />
              <animate
                attributeName="cy"
                values={clusterYValues(i, f, p)}
                keyTimes={CLUSTER_KEY_TIMES}
                keySplines={CLUSTER_KEY_SPLINES}
                calcMode="spline"
                dur={CLUSTER_DUR}
                repeatCount="indefinite"
              />
            </>
          ) : null}
        </circle>
      ))}
    </g>
  )
}

function PositionChangeLayer({ arrowId, animate }: { arrowId: string; animate: boolean }) {
  const accent = '#22c55e'
  const prev: [number, number][] = [
    [20, 44],
    [34, 46],
    [48, 43],
  ]
  const next: [number, number][] = [
    [24, 50],
    [38, 52],
    [44, 48],
  ]
  return (
    <g>
      {[0, 1, 2].map((i) => {
        const [px, py] = prev[i]!
        const [nx, ny] = next[i]!
        return (
          <g key={i}>
            <circle cx={px} cy={py} r={1.05} fill={accent} fillOpacity={0.22} stroke={accent} strokeWidth={0.25} strokeOpacity={0.5}>
              {animate ? (
                <animate
                  attributeName="fill-opacity"
                  values="0.12;0.32;0.12"
                  keyTimes="0;0.5;1"
                  keySplines="0.45 0 0.55 1;0.45 0 0.55 1"
                  calcMode="spline"
                  dur="3.6s"
                  begin={`${i * 0.18}s`}
                  repeatCount="indefinite"
                />
              ) : null}
            </circle>
            <line
              x1={px}
              y1={py}
              x2={nx}
              y2={ny}
              stroke={accent}
              strokeWidth={0.35}
              strokeDasharray="1.2 0.9"
              strokeOpacity={0.75}
              markerEnd={`url(#${arrowId})`}
            >
              {animate ? (
                <animate
                  attributeName="stroke-opacity"
                  values="0.38;0.92;0.38"
                  keyTimes="0;0.5;1"
                  keySplines="0.45 0 0.55 1;0.45 0 0.55 1"
                  calcMode="spline"
                  dur="3.6s"
                  begin={`${i * 0.18}s`}
                  repeatCount="indefinite"
                />
              ) : null}
            </line>
            <circle cx={nx} cy={ny} r={1.15} fill={accent} stroke="#fff" strokeWidth={0.2}>
              {animate ? (
                <>
                  <animate
                    attributeName="cx"
                    values={`${px};${nx};${nx};${px}`}
                    keyTimes="0;0.44;0.56;1"
                    dur="3.6s"
                    begin={`${i * 0.18}s`}
                    repeatCount="indefinite"
                    calcMode="spline"
                    keySplines="0.37 0 0.63 1;0 0 1 1;0.37 0 0.63 1"
                  />
                  <animate
                    attributeName="cy"
                    values={`${py};${ny};${ny};${py}`}
                    keyTimes="0;0.44;0.56;1"
                    dur="3.6s"
                    begin={`${i * 0.18}s`}
                    repeatCount="indefinite"
                    calcMode="spline"
                    keySplines="0.37 0 0.63 1;0 0 1 1;0.37 0 0.63 1"
                  />
                </>
              ) : null}
            </circle>
          </g>
        )
      })}
    </g>
  )
}

function BallChaosLayer({ pathId, animate }: { pathId: string; animate: boolean }) {
  const accent = '#f97316'
  /** Smoothed curve through the same corners so motion reads less robotic. */
  const pathD =
    'M 28 58 C 29.2 54.5 30.5 53 32 52 C 34.5 53.5 36.5 55.5 38 56 C 39.5 53 40.8 49.5 42 48 C 43.8 50.2 45.5 52.5 46 54 C 44.5 57.5 42.5 60 40 62 C 38.8 60.5 37.5 59.2 36 58 C 35.2 60.5 34.5 63.2 34 66'
  if (!animate) {
    return (
      <g>
        <path
          d={pathD}
          fill="none"
          stroke={accent}
          strokeWidth={0.45}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity={0.85}
        />
        <circle cx={34} cy={66} r={1.35} fill={accent} stroke="#fff" strokeWidth={0.25} />
      </g>
    )
  }
  return (
    <g>
      <path id={pathId} d={pathD} fill="none" stroke="none" strokeWidth={0} aria-hidden />
      <path
        d={pathD}
        fill="none"
        stroke={accent}
        strokeWidth={0.45}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity={0.85}
      >
        <animate
          attributeName="stroke-opacity"
          values="0.5;0.95;0.5"
          keyTimes="0;0.5;1"
          keySplines="0.45 0 0.55 1;0.45 0 0.55 1"
          calcMode="spline"
          dur="3.4s"
          repeatCount="indefinite"
        />
      </path>
      <circle r={1.35} fill={accent} stroke="#fff" strokeWidth={0.25}>
        <animateMotion
          dur="3.6s"
          repeatCount="indefinite"
          rotate="auto"
          calcMode="paced"
        >
          <mpath href={`#${pathId}`} />
        </animateMotion>
      </circle>
    </g>
  )
}

function DefensiveLineLayer({ animate }: { animate: boolean }) {
  const accent = '#38bdf8'
  /** Index 0 = left back: wider and deeper so the chord to the next man reads as a big gap. */
  const defX = [10, 26, 36, 50, 60]
  const baseY = [76, 69, 74, 70, 73]
  const d = defX.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x} ${baseY[i]}`).join(' ')
  return (
    <g>
      <path d={d} fill="none" stroke={accent} strokeWidth={0.4} strokeLinejoin="round" strokeOpacity={0.9}>
        {animate ? (
          <animate
            attributeName="opacity"
            values="0.7;0.98;0.7"
            keyTimes="0;0.5;1"
            keySplines="0.45 0 0.55 1;0.45 0 0.55 1"
            calcMode="spline"
            dur="3.6s"
            repeatCount="indefinite"
          />
        ) : null}
      </path>
      {defX.map((x, i) => (
        <circle key={i} cx={x} cy={baseY[i]} r={1.1} fill={accent} stroke="#fff" strokeWidth={0.2}>
          {animate ? (
            <animateTransform
              attributeName="transform"
              type="translate"
              values={
                i === 0
                  ? '0,0;-2.8,1.1;1.2,-0.55;0,0'
                  : '0,0;0,-0.95;0,0.75;0,0'
              }
              keyTimes="0;0.33;0.66;1"
              keySplines="0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1"
              calcMode="spline"
              dur="3.9s"
              begin={`${i * 0.12}s`}
              repeatCount="indefinite"
            />
          ) : null}
        </circle>
      ))}
    </g>
  )
}

const L2L_DUR_MS = 4800

/** Surge 0→1→0 over one cycle (matches prior ease in/out feel). */
function l2lSurge(phase: number): number {
  return Math.sin(Math.PI * phase)
}

function lineToLinePositions(phase: number) {
  const ax0 = [22, 32, 44]
  /** Along-pitch: tight gap between forward line and back line (~12–14m apart in diagram space). */
  const ay0 = [52, 50, 53]
  const dx0 = [18, 30, 42, 54]
  const dy0 = [64, 66, 63, 65]
  const s = l2lSurge(phase)
  const atkCx = 32
  const atkSpread = 1 + 0.14 * s
  const ax = ax0.map((x) => atkCx + (x - atkCx) * atkSpread)
  const ay = ay0.map((y) => y + 3.2 * s)
  const defCx = 36
  const defCompress = 1 - 0.11 * s
  const dx = dx0.map((x) => defCx + (x - defCx) * defCompress)
  const dy = dy0
  return { ax, ay, dx, dy, surge: s }
}

const L2L_OFF_PAIRS: [number, number][] = [
  [0, 1],
  [0, 2],
  [1, 2],
]

function LineToLineLayer({ arrowId, phase }: { arrowId: string; phase: number }) {
  const attack = '#e11d48'
  const defend = '#64748b'
  const { ax, ay, dx, dy, surge } = lineToLinePositions(phase)

  const defOrder = [0, 1, 2, 3].sort((i, j) => dx[i]! - dx[j]!)
  const defPairs: [number, number][] = []
  for (let k = 0; k < defOrder.length - 1; k++) {
    defPairs.push([defOrder[k]!, defOrder[k + 1]!])
  }

  return (
    <g>
      {/* Intra-line segments */}
      <g strokeLinecap="round" pointerEvents="none">
        {L2L_OFF_PAIRS.map(([i, j], k) => (
          <line
            key={`o-${k}`}
            x1={ax[i]!}
            y1={ay[i]!}
            x2={ax[j]!}
            y2={ay[j]!}
            stroke={attack}
            strokeWidth={0.32}
            strokeOpacity={0.55}
          />
        ))}
        {defPairs.map(([i, j], k) => (
          <line
            key={`d-${k}`}
            x1={dx[i]!}
            y1={dy[i]!}
            x2={dx[j]!}
            y2={dy[j]!}
            stroke={defend}
            strokeWidth={0.3}
            strokeOpacity={0.6}
          />
        ))}
      </g>

      {dx.map((x, i) => (
        <circle key={`dc-${i}`} cx={x} cy={dy[i]} r={1.05} fill={defend} stroke="#fff" strokeWidth={0.18} />
      ))}

      {ax.map((x, i) => (
        <g key={`a-${i}`}>
          <circle cx={x} cy={ay[i]} r={1.1} fill={attack} stroke="#fff" strokeWidth={0.2} />
          <line
            x1={x}
            y1={ay[i]}
            x2={x + 2.0 + 0.35 * surge}
            y2={ay[i] - 3.2 - 0.5 * surge}
            stroke={attack}
            strokeWidth={0.35}
            strokeLinecap="round"
            markerEnd={`url(#${arrowId})`}
            strokeOpacity={0.75 + 0.2 * surge}
          />
        </g>
      ))}
    </g>
  )
}

const ARIA_LABELS: Record<IndicatorMetricVariant, string> = {
  player_clusters: 'Player clustering diagram',
  position_change: 'Position change diagram',
  ball_chaos: 'Ball chaos diagram',
  defensive_line: 'Defensive line diagram',
  line_to_line_acceleration: 'Line to line acceleration diagram',
}

export function IndicatorMetricMiniPitch({
  variant,
  className,
}: {
  variant: IndicatorMetricVariant
  className?: string
}) {
  const uid = useId().replace(/:/g, '')
  const arrowPosId = `m-pos-${uid}`
  const arrowL2lId = `m-l2l-${uid}`
  const chaosPathId = `m-chaos-${uid}`
  const pitchShadowId = `m-psh-${uid}`
  const pitchClipId = `m-pcl-${uid}`
  const reducedMotion = usePrefersReducedMotion()
  const animate = !reducedMotion
  const [l2lPhase, setL2lPhase] = useState(0)

  useEffect(() => {
    if (variant !== 'line_to_line_acceleration' || !animate) {
      setL2lPhase(0)
      return
    }
    let raf = 0
    const loop = () => {
      setL2lPhase((performance.now() % L2L_DUR_MS) / L2L_DUR_MS)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [variant, animate])

  return (
    <figure className={cn('w-full', className)}>
      <svg
        viewBox={`${-VB_PAD} ${-VB_PAD} ${VB_W} ${VB_H}`}
        className="block w-full max-h-[min(200px,48vw)] overflow-visible sm:max-h-[190px]"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={ARIA_LABELS[variant]}
      >
        <defs>
          <filter
            id={pitchShadowId}
            x="-45%"
            y="-45%"
            width="190%"
            height="190%"
            colorInterpolationFilters="sRGB"
          >
            <feDropShadow
              dx="0"
              dy="1.35"
              stdDeviation="2.35"
              floodColor="#000000"
              floodOpacity="0.2"
            />
          </filter>
          <clipPath id={pitchClipId} clipPathUnits="userSpaceOnUse">
            <rect
              x={0}
              y={0}
              width={P_ACROSS}
              height={P_ALONG}
              rx={PITCH_CORNER_RX}
              ry={PITCH_CORNER_RX}
            />
          </clipPath>
          <marker id={arrowPosId} markerWidth="3" markerHeight="3" refX="2.2" refY="1.5" orient="auto">
            <polygon points="0 0, 3 1.5, 0 3" fill="#22c55e" fillOpacity={0.85} />
          </marker>
          <marker id={arrowL2lId} markerWidth="3" markerHeight="3" refX="2.4" refY="1.5" orient="auto">
            <polygon points="0 0, 3 1.5, 0 3" fill="#e11d48" fillOpacity={0.9} />
          </marker>
        </defs>
        {/*
          Local: x = across (0–68), y = along (0–105). Matrix maps to screen (along, across).
          Offset by VB_PAD so shadow fits inside viewBox.
        */}
        <g transform={`translate(${VB_PAD} ${VB_PAD})`}>
          <g filter={`url(#${pitchShadowId})`}>
            <g transform="matrix(0,1,1,0,0,0)">
              <g clipPath={`url(#${pitchClipId})`}>
                <PitchBase />
                {variant === 'player_clusters' ? <ClustersLayer animate={animate} /> : null}
                {variant === 'position_change' ? (
                  <PositionChangeLayer arrowId={arrowPosId} animate={animate} />
                ) : null}
                {variant === 'ball_chaos' ? <BallChaosLayer pathId={chaosPathId} animate={animate} /> : null}
                {variant === 'defensive_line' ? <DefensiveLineLayer animate={animate} /> : null}
                {variant === 'line_to_line_acceleration' ? (
                  <LineToLineLayer arrowId={arrowL2lId} phase={l2lPhase} />
                ) : null}
              </g>
            </g>
          </g>
        </g>
      </svg>
    </figure>
  )
}
