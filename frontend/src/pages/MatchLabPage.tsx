import { DashboardWidget } from '@/components/layout/DashboardWidget'
import { SiteLayout } from '@/components/layout/SiteLayout'
import { GER_MATCH_COLOR, SUI_MATCH_COLOR } from '@/lib/matchTeamColors'
import { cn } from '@/lib/utils'

const matchData = {
  homeTeam: 'SUI',
  awayTeam: 'GER',
  competition: 'Friendlies',
  date: 'Mar 28, 2026',
}

const FLAG_CH_URL =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Flag_of_Switzerland.svg/960px-Flag_of_Switzerland.svg.png'
const FLAG_DE_URL =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Flag_of_Germany.svg/1280px-Flag_of_Germany.svg.png'

const shell =
  'rounded-[1.35rem] border border-black/[0.06] bg-white/72 shadow-[0_2px_28px_-14px_rgba(0,0,0,0.14)] backdrop-blur-2xl backdrop-saturate-150 dark:border-white/[0.08] dark:bg-white/[0.06] dark:shadow-[0_2px_40px_-12px_rgba(0,0,0,0.65)]'

const CONTACTS: Array<{ name: string; handle: string }> = [
  { name: 'Ryan Fuchs', handle: 'ryan-neil-fuchs' },
  { name: 'Haaroon Hussain', handle: 'haaroon-hussain' },
  { name: 'Gamal Hassan', handle: 'gamalnh' },
]

/** Non-interactive placeholder block used to fake widget content. */
function Filler({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-xl bg-black/[0.05] dark:bg-white/[0.06]',
        className,
      )}
    />
  )
}

/** Static top-down 2D pitch (no data, no animation) for the Live pitch panel. */
function StaticPitch({ className }: { className?: string }) {
  // Pitch in metres, horizontal: x = along (0–105), y = across (0–68).
  const W = 105
  const H = 68
  const boxH = 40.32
  const goalH = 18.32
  // A few static player dots + ball, just for visual texture.
  const home: Array<[number, number]> = [
    [12, 34],
    [30, 18],
    [30, 50],
    [44, 34],
    [40, 9],
    [40, 59],
  ]
  const away: Array<[number, number]> = [
    [93, 34],
    [72, 20],
    [72, 48],
    [60, 34],
    [64, 11],
    [64, 57],
  ]
  return (
    <svg
      viewBox={`-3 -3 ${W + 6} ${H + 6}`}
      preserveAspectRatio="xMidYMid meet"
      className={cn('block h-full w-full', className)}
      role="img"
      aria-label="Pitch"
    >
      <rect
        x={0}
        y={0}
        width={W}
        height={H}
        rx={2.75}
        className="fill-[#2f6f3e]"
      />
      <g fill="none" stroke="#ffffff" strokeOpacity={0.85} strokeWidth={0.3}>
        <rect x={0} y={0} width={W} height={H} rx={2.75} />
        <line x1={W / 2} y1={0} x2={W / 2} y2={H} />
        <circle cx={W / 2} cy={H / 2} r={9.15} />
        {/* penalty boxes */}
        <rect x={0} y={(H - boxH) / 2} width={16.5} height={boxH} />
        <rect x={W - 16.5} y={(H - boxH) / 2} width={16.5} height={boxH} />
        {/* goal areas */}
        <rect x={0} y={(H - goalH) / 2} width={5.5} height={goalH} />
        <rect x={W - 5.5} y={(H - goalH) / 2} width={5.5} height={goalH} />
      </g>
      <circle cx={W / 2} cy={H / 2} r={0.55} fill="#ffffff" fillOpacity={0.9} />
      <circle cx={11} cy={H / 2} r={0.5} fill="#ffffff" fillOpacity={0.9} />
      <circle cx={W - 11} cy={H / 2} r={0.5} fill="#ffffff" fillOpacity={0.9} />
      {home.map(([x, y], i) => (
        <circle
          key={`h-${i}`}
          cx={x}
          cy={y}
          r={1.5}
          fill={SUI_MATCH_COLOR}
          stroke="#fff"
          strokeWidth={0.3}
        />
      ))}
      {away.map(([x, y], i) => (
        <circle
          key={`a-${i}`}
          cx={x}
          cy={y}
          r={1.5}
          fill={GER_MATCH_COLOR}
          stroke="#fff"
          strokeWidth={0.3}
        />
      ))}
      {/* ball */}
      <circle cx={48} cy={31} r={1} fill="#ffffff" stroke="#111" strokeWidth={0.2} />
    </svg>
  )
}

/**
 * MatchLab — gated demo.
 *
 * This page is intentionally self-contained: it loads NO match data (no
 * tracking JSON, no analytics bundles). It renders a static, blurred replica
 * of the dashboard layout purely as a backdrop, with a contact card on top
 * inviting visitors to request demo access. Everything behind the card is
 * inert — the overlay captures all pointer/wheel/touch events.
 */
export function MatchLabPage() {
  return (
    <SiteLayout dashboard>
      <div className="fixed inset-0 overflow-hidden">
        {/* Static, blurred dashboard backdrop — no data, no interactivity. */}
        <div
          aria-hidden
          className="dashboard-apple pointer-events-none w-full select-none px-3 pb-12 pt-6 blur-md sm:px-4 md:px-5 lg:px-6 xl:px-8 lg:pt-8"
        >
          <section className={cn(shell, 'px-5 py-7 sm:px-8 sm:py-8')}>
            <p className="text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-[#86868b] dark:text-[#98989d]">
              {matchData.competition}
              <span className="mx-2 opacity-40">·</span>
              {matchData.date}
            </p>
            <div className="mt-5 flex items-center justify-center gap-3 sm:gap-6">
              <img
                src={FLAG_CH_URL}
                alt=""
                width={48}
                height={48}
                className="h-12 w-12 shrink-0 rounded-2xl border border-black/[0.06] object-cover shadow-sm dark:border-white/10"
                loading="lazy"
                decoding="async"
              />
              <span
                className="text-[2.75rem] font-semibold leading-none tracking-tight sm:text-[3.25rem]"
                style={{ color: SUI_MATCH_COLOR }}
              >
                {matchData.homeTeam}
              </span>
              <span className="px-2 text-[2rem] font-light tracking-tight text-[#d2d2d7] sm:text-[2.35rem] dark:text-[#48484a]">
                –
              </span>
              <span
                className="text-[2.75rem] font-semibold leading-none tracking-tight sm:text-[3.25rem]"
                style={{ color: GER_MATCH_COLOR }}
              >
                {matchData.awayTeam}
              </span>
              <img
                src={FLAG_DE_URL}
                alt=""
                width={48}
                height={48}
                className="h-12 w-12 shrink-0 rounded-2xl border border-black/[0.06] object-cover shadow-sm dark:border-white/10"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="mt-8 border-t border-black/[0.06] pt-7 dark:border-white/[0.08]">
              <div className="mb-3 flex items-center justify-between gap-2 px-1">
                <h2 className="text-[15px] font-semibold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
                  Match timeline
                </h2>
                <p className="text-[12px] text-[#86868b] dark:text-[#98989d]">
                  Scrub to seek · syncs video
                </p>
              </div>
              <Filler className="h-10 w-full" />
            </div>
          </section>

          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3 lg:grid-rows-[minmax(320px,min(58vh,640px))]">
            <DashboardWidget
              title="Live pitch"
              subtitle="Extrapolated tracking · 10 Hz"
              className="lg:col-span-2 lg:min-h-0 lg:h-full"
              contentClassName="flex min-h-[280px] flex-1 flex-col gap-0 p-0 sm:min-h-[320px]"
            >
              <div className="m-3 flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-2xl border border-black/[0.05] bg-[#0a0a0b] p-3 dark:border-white/[0.06]">
                <StaticPitch />
              </div>
            </DashboardWidget>

            <div className="flex flex-col gap-4 lg:h-full lg:min-h-0">
              <DashboardWidget
                title="Broadcast"
                subtitle="Load on demand · sync to timeline"
                className="shrink-0 lg:min-h-0"
                contentClassName="flex min-h-[160px] flex-1 flex-col p-3"
              >
                <Filler className="min-h-[10rem] flex-1 bg-black/[0.08] dark:bg-white/[0.06]" />
              </DashboardWidget>

              <DashboardWidget
                title="Frame indicators"
                subtitle="Five analytics · smoothed vs playback"
                className="lg:min-h-0 lg:flex-1"
                contentClassName="flex min-h-[220px] flex-1 items-center justify-center p-3 sm:min-h-[240px]"
              >
                <div className="h-40 w-40 rounded-full bg-black/[0.05] dark:bg-white/[0.06]" />
              </DashboardWidget>
            </div>
          </div>

          <DashboardWidget
            title="Phase breakdown"
            subtitle="Rolling window · five indicators"
            className="mt-4"
            contentClassName="pt-1"
          >
            <Filler className="h-48 w-full" />
          </DashboardWidget>
        </div>

        {/* Demo-access contact overlay. This layer also captures every
            pointer/wheel/touch event so the blurred dashboard underneath stays
            fully static and non-interactive. */}
        <div className="absolute inset-0 z-10 flex items-start justify-center px-4 pt-20 sm:pt-28">
          <div
            className={cn(
              shell,
              'max-w-md px-7 py-8 text-center sm:px-9 sm:py-10',
            )}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#86868b] dark:text-[#98989d]">
              MatchLab
            </p>
            <h1 className="mt-3 text-[26px] font-semibold leading-tight tracking-tight text-[#1d1d1f] sm:text-[30px] dark:text-[#f5f5f7]">
              Demo access by request
            </h1>
            <p className="mt-4 text-[15px] leading-relaxed text-[#6e6e73] dark:text-[#a1a1a6]">
              The live MatchLab demo isn&apos;t publicly available yet. To get
              access, please reach out &mdash; we&apos;d love to walk you
              through it.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              {CONTACTS.map((p) => (
                <a
                  key={p.handle}
                  href={`https://www.linkedin.com/in/${p.handle}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-black/[0.08] bg-white/80 px-4 py-2.5 text-[14px] font-medium text-[#1d1d1f] shadow-sm transition-colors hover:bg-white dark:border-white/[0.12] dark:bg-white/[0.08] dark:text-[#f5f5f7] dark:hover:bg-white/[0.12]"
                >
                  <span className="font-semibold text-[#0a66c2] dark:text-[#2997ff]">
                    in
                  </span>
                  {p.name}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SiteLayout>
  )
}
