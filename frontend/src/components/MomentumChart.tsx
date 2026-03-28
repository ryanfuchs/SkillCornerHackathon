// Momentum 0–1 per minute, minute 0–90
const momentumData: { minute: number; value: number }[] = [
  { minute: 0,  value: 0.30 },
  { minute: 1,  value: 0.33 },
  { minute: 2,  value: 0.38 },
  { minute: 3,  value: 0.44 },
  { minute: 4,  value: 0.50 },
  { minute: 5,  value: 0.55 },
  { minute: 6,  value: 0.60 },
  { minute: 7,  value: 0.63 },
  { minute: 8,  value: 0.65 },
  { minute: 9,  value: 0.62 },
  { minute: 10, value: 0.58 },
  { minute: 11, value: 0.53 },
  { minute: 12, value: 0.48 },
  { minute: 13, value: 0.44 },
  { minute: 14, value: 0.41 },
  { minute: 15, value: 0.38 },
  { minute: 16, value: 0.36 },
  { minute: 17, value: 0.34 },
  { minute: 18, value: 0.32 },
  { minute: 19, value: 0.30 },
  { minute: 20, value: 0.28 },
  { minute: 21, value: 0.26 },
  { minute: 22, value: 0.24 },
  { minute: 23, value: 0.22 },
  { minute: 24, value: 0.21 },
  { minute: 25, value: 0.20 },
  { minute: 26, value: 0.20 },
  { minute: 27, value: 0.19 },
  { minute: 28, value: 0.18 },
  { minute: 29, value: 0.17 },
  { minute: 30, value: 0.16 },
  { minute: 31, value: 0.17 },
  { minute: 32, value: 0.19 },
  { minute: 33, value: 0.22 },
  { minute: 34, value: 0.26 },
  { minute: 35, value: 0.30 },
  { minute: 36, value: 0.35 },
  { minute: 37, value: 0.40 },
  { minute: 38, value: 0.45 },
  { minute: 39, value: 0.50 },
  { minute: 40, value: 0.54 },
  { minute: 41, value: 0.57 },
  { minute: 42, value: 0.60 },
  { minute: 43, value: 0.62 },
  { minute: 44, value: 0.64 },
  { minute: 45, value: 0.65 },
  { minute: 46, value: 0.68 },
  { minute: 47, value: 0.72 },
  { minute: 48, value: 0.75 },
  { minute: 49, value: 0.78 },
  { minute: 50, value: 0.80 },
  { minute: 51, value: 0.82 },
  { minute: 52, value: 0.83 },
  { minute: 53, value: 0.84 },
  { minute: 54, value: 0.84 },
  { minute: 55, value: 0.83 },
  { minute: 56, value: 0.80 },
  { minute: 57, value: 0.75 },
  { minute: 58, value: 0.69 },
  { minute: 59, value: 0.63 },
  { minute: 60, value: 0.57 },
  { minute: 61, value: 0.52 },
  { minute: 62, value: 0.47 },
  { minute: 63, value: 0.43 },
  { minute: 64, value: 0.40 },
  { minute: 65, value: 0.37 },
  { minute: 66, value: 0.34 },
  { minute: 67, value: 0.31 },
  { minute: 68, value: 0.29 },
  { minute: 69, value: 0.27 },
  { minute: 70, value: 0.25 },
  { minute: 71, value: 0.24 },
  { minute: 72, value: 0.22 },
  { minute: 73, value: 0.21 },
  { minute: 74, value: 0.21 },
  { minute: 75, value: 0.20 },
  { minute: 76, value: 0.22 },
  { minute: 77, value: 0.26 },
  { minute: 78, value: 0.30 },
  { minute: 79, value: 0.35 },
  { minute: 80, value: 0.40 },
  { minute: 81, value: 0.44 },
  { minute: 82, value: 0.47 },
  { minute: 83, value: 0.49 },
  { minute: 84, value: 0.51 },
  { minute: 85, value: 0.52 },
  { minute: 86, value: 0.53 },
  { minute: 87, value: 0.54 },
  { minute: 88, value: 0.54 },
  { minute: 89, value: 0.55 },
  { minute: 90, value: 0.55 },
]

const W = 800
const H = 100
const PAD_TOP = 8
const chartH = H - PAD_TOP
const baseY = PAD_TOP + chartH

function toX(minute: number) {
  return (minute / 90) * W
}
function toY(value: number) {
  return baseY - value * chartH
}

const pts = momentumData.map((d) => ({ x: toX(d.minute), y: toY(d.value) }))
const polyline = pts.map((p) => `${p.x},${p.y}`).join(' ')
const last = pts[pts.length - 1]
const first = pts[0]
const areaPoints = `${polyline} ${last.x},${baseY} ${first.x},${baseY}`

const tickMinutes = [0, 15, 30, 45, 60, 75, 90]

export function MomentumChart() {
  return (
    <div className="w-4/5 mx-auto mt-6">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        preserveAspectRatio="none"
        className="block overflow-visible"
      >
        <defs>
          <linearGradient id="momentumGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0.15" />
          </linearGradient>
        </defs>

        {/* half-time dashed line */}
        <line
          x1={toX(45)} y1={PAD_TOP}
          x2={toX(45)} y2={baseY}
          stroke="hsl(var(--border))" strokeWidth="1" strokeDasharray="4 3"
        />

        {/* filled area */}
        <polygon points={areaPoints} fill="url(#momentumGrad)" />

        {/* line */}
        <polyline
          points={polyline}
          fill="none"
          stroke="#a855f7"
          strokeWidth="2"
          strokeOpacity="0.8"
          strokeLinejoin="round"
        />
      </svg>

      {/* x-axis labels as HTML so they're never clipped */}
      <div className="relative w-full h-5 mt-1">
        {tickMinutes.map((m) => (
          <span
            key={m}
            className="absolute text-xs text-muted-foreground -translate-x-1/2"
            style={{ left: `${(m / 90) * 100}%` }}
          >
            {m}'
          </span>
        ))}
      </div>
    </div>
  )
}
