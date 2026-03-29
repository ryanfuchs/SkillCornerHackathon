import { MatchTimeline } from '@/components/MatchTimeline'
import { PhaseBreakdownChart } from '@/components/PhaseBreakdownChart'
import { PitchView } from '@/components/PitchView'
import { VideoPlayer } from '@/components/VideoPlayer'
import { DashboardWidget } from '@/components/layout/DashboardWidget'
import { SiteLayout } from '@/components/layout/SiteLayout'
import { useMatchTracking } from '@/hooks/useMatchTracking'
import { scoreAtBundleFrame } from '@/lib/scoreAtBundleFrame'
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

export function MatchDashboardPage() {
  const { players, ball, loadError, loaded, momentumTimeline, frame } =
    useMatchTracking()
  const { home: homeScore, away: awayScore } = scoreAtBundleFrame(frame)

  return (
    <SiteLayout dashboard>
      <div className="dashboard-apple w-full px-3 pb-12 pt-6 sm:px-4 md:px-5 lg:px-6 xl:px-8 lg:pt-8">
        <section className={cn(shell, 'px-5 py-7 sm:px-8 sm:py-8')}>
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-[#86868b] dark:text-[#98989d]">
            {matchData.competition}
            <span className="mx-2 opacity-40">·</span>
            {matchData.date}
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-6 sm:gap-10">
            <div className="flex items-center gap-3">
              <img
                src={FLAG_CH_URL}
                alt=""
                width={48}
                height={48}
                className="h-12 w-12 shrink-0 rounded-2xl border border-black/[0.06] object-cover shadow-sm dark:border-white/10"
                loading="lazy"
                decoding="async"
              />
              <span className="text-[2.75rem] font-semibold leading-none tracking-tight text-[#1d1d1f] sm:text-[3.25rem] dark:text-[#f5f5f7]">
                {matchData.homeTeam}
              </span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <span className="text-[13px] font-medium text-[#86868b] dark:text-[#98989d]">
                Score
              </span>
              <span className="text-[2rem] font-light tabular-nums tracking-tight text-[#1d1d1f] sm:text-[2.35rem] dark:text-[#f5f5f7]">
                {homeScore}
                <span className="mx-2 text-[#d2d2d7] dark:text-[#48484a]">
                  –
                </span>
                {awayScore}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[2.75rem] font-semibold leading-none tracking-tight text-[#1d1d1f] sm:text-[3.25rem] dark:text-[#f5f5f7]">
                {matchData.awayTeam}
              </span>
              <img
                src={FLAG_DE_URL}
                alt=""
                width={73}
                height={44}
                className="h-12 w-auto shrink-0 rounded-2xl border border-black/[0.06] object-cover shadow-sm dark:border-white/10 aspect-[5/3]"
                loading="lazy"
                decoding="async"
              />
            </div>
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
            <MatchTimeline
              timeline={momentumTimeline}
              className="mt-2 w-full max-w-none"
            />
          </div>
        </section>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3 lg:grid-rows-[minmax(320px,min(58vh,640px))]">
          <DashboardWidget
            title="Live pitch"
            subtitle="Extrapolated tracking · 10 Hz"
            className="lg:col-span-2 lg:min-h-0 lg:h-full"
            contentClassName="flex min-h-[280px] flex-1 flex-col p-0 sm:min-h-[320px]"
          >
            {loadError ? (
              <p className="px-4 py-2 text-xs text-[var(--destructive)]">
                Failed to load tracking: {loadError}
              </p>
            ) : null}
            <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-black/[0.05] bg-[#0a0a0b] dark:border-white/[0.06]">
              <PitchView
                players={loaded ? players : undefined}
                ballPosition={loaded ? ball : undefined}
              />
            </div>
          </DashboardWidget>

          <DashboardWidget
            title="Broadcast"
            subtitle="SRF player · clock-locked"
            className="lg:min-h-0 lg:h-full"
            contentClassName="flex min-h-[240px] flex-1 flex-col p-0"
          >
            <VideoPlayer
              timeline={momentumTimeline}
              className="min-h-[16rem] flex-1 rounded-2xl border border-black/[0.06] dark:border-white/[0.08]"
            />
          </DashboardWidget>
        </div>

        <DashboardWidget
          title="Phase breakdown"
          subtitle="Rolling window · five indicators"
          className="mt-4"
          contentClassName="pt-1"
        >
          <PhaseBreakdownChart />
        </DashboardWidget>
      </div>
    </SiteLayout>
  )
}
