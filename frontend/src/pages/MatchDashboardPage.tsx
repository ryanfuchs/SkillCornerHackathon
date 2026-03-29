import { useMemo, useState } from 'react'
import { LivePitchPlayerBar } from '@/components/LivePitchPlayerBar'
import { FrameIndicatorSpider } from '@/components/FrameIndicatorSpider'
import { MatchTimeline } from '@/components/MatchTimeline'
import { PhaseBreakdownChart } from '@/components/PhaseBreakdownChart'
import { PitchView } from '@/components/PitchView'
import { VideoPlayer } from '@/components/VideoPlayer'
import { DashboardWidget } from '@/components/layout/DashboardWidget'
import { SiteLayout } from '@/components/layout/SiteLayout'
import { useMatchTracking } from '@/hooks/useMatchTracking'
import { scoreAtBundleFrame } from '@/lib/scoreAtBundleFrame'
import { cn } from '@/lib/utils'
import timelineKeyMoments from '@/data/timelineKeyMoments.json'

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

/** e.g. broadcast `16:30` → `17'` (ceil minute, football-style). */
function broadcastClockToMinuteMark(clock: string): string {
  if (clock === '—' || !clock.includes(':')) return '—'
  const parts = clock.split(':')
  const m = Number(parts[0])
  const s = Number(parts[1] ?? 0)
  if (!Number.isFinite(m) || !Number.isFinite(s)) return '—'
  const minuteMark = Math.ceil(m + s / 60)
  return `${minuteMark}'`
}

/** `Player (Switzerland)` → home; `Player (Germany)` → away. */
function goalSideFromLabel(who: string): 'home' | 'away' | null {
  const open = who.lastIndexOf('(')
  const close = who.lastIndexOf(')')
  if (open < 0 || close <= open) return null
  const team = who.slice(open + 1, close).trim()
  if (team === 'Switzerland') return 'home'
  if (team === 'Germany') return 'away'
  return null
}

function playerNameFromGoalLabel(who: string): string {
  const open = who.lastIndexOf('(')
  if (open < 0) return who.trim()
  return who.slice(0, open).trim()
}

type RightAsidePanel = 'broadcast' | 'analytics'

export function MatchDashboardPage() {
  const { players, ball, loadError, loaded, momentumTimeline, frame } =
    useMatchTracking()
  const { home: homeScore, away: awayScore } = scoreAtBundleFrame(frame)
  const goalsBySide = useMemo(() => {
    const home: Array<{ minute: string; player: string }> = []
    const away: Array<{ minute: string; player: string }> = []
    if (!momentumTimeline) return { home, away }
    for (const m of timelineKeyMoments.moments) {
      if (m.kind !== 'goal' || m.frame > frame) continue
      const idx = momentumTimeline.rowIndexForBundleFrame(m.frame)
      const clock =
        idx != null ? momentumTimeline.formatClockForFrame(idx) : '—'
      const raw = m.label.replace(/^Goal · /, '')
      const side = goalSideFromLabel(raw)
      if (side == null) continue
      const minute = broadcastClockToMinuteMark(clock)
      const player = playerNameFromGoalLabel(raw)
      const row = { minute, player }
      if (side === 'home') home.push(row)
      else away.push(row)
    }
    return { home, away }
  }, [momentumTimeline, frame])
  const [openAside, setOpenAside] = useState<RightAsidePanel>('analytics')
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)

  return (
    <SiteLayout dashboard>
      <div className="dashboard-apple w-full px-3 pb-12 pt-6 sm:px-4 md:px-5 lg:px-6 xl:px-8 lg:pt-8">
        <section className={cn(shell, 'px-5 py-7 sm:px-8 sm:py-8')}>
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-[#86868b] dark:text-[#98989d]">
            {matchData.competition}
            <span className="mx-2 opacity-40">·</span>
            {matchData.date}
          </p>

          <div className="mt-5 w-full">
            <div className="mx-auto grid w-full max-w-3xl grid-cols-[1fr_auto_1fr] items-start gap-x-3 gap-y-3 sm:gap-x-6">
              <div className="col-start-1 row-start-1 flex min-w-0 flex-col items-end gap-1">
                <span
                  className="invisible text-[13px] font-medium"
                  aria-hidden
                >
                  Score
                </span>
                <div className="flex items-center justify-end gap-3">
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
              </div>

              <div className="col-start-2 row-start-1 flex flex-col items-center gap-1 px-1 sm:px-2">
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

              <div className="col-start-3 row-start-1 flex min-w-0 flex-col items-start gap-1">
                <span
                  className="invisible text-[13px] font-medium"
                  aria-hidden
                >
                  Score
                </span>
                <div className="flex items-center justify-start gap-3">
                  <span className="text-[2.75rem] font-semibold leading-none tracking-tight text-[#1d1d1f] sm:text-[3.25rem] dark:text-[#f5f5f7]">
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
              </div>

              {goalsBySide.home.length + goalsBySide.away.length > 0 ? (
                <>
                  <ul className="col-start-1 row-start-2 min-w-0 max-w-[13rem] justify-self-end space-y-0.5 text-left text-[11px] leading-snug text-[#6e6e73] dark:text-[#a1a1a6]">
                    {goalsBySide.home.map((g, i) => (
                      <li key={`h-${g.minute}-${g.player}-${i}`}>
                        <span className="tabular-nums text-[#86868b] dark:text-[#98989d]">
                          {g.minute}
                        </span>
                        <span className="mx-1.5 text-[#d2d2d7] dark:text-[#48484a]">
                          ·
                        </span>
                        <span>{g.player}</span>
                      </li>
                    ))}
                  </ul>
                  <ul className="col-start-3 row-start-2 min-w-0 max-w-[13rem] justify-self-start space-y-0.5 text-right text-[11px] leading-snug text-[#6e6e73] dark:text-[#a1a1a6]">
                    {goalsBySide.away.map((g, i) => (
                      <li key={`a-${g.minute}-${g.player}-${i}`}>
                        <span>{g.player}</span>
                        <span className="mx-1.5 text-[#d2d2d7] dark:text-[#48484a]">
                          ·
                        </span>
                        <span className="tabular-nums text-[#86868b] dark:text-[#98989d]">
                          {g.minute}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
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
            contentClassName="flex min-h-[280px] flex-1 flex-col gap-0 p-0 sm:min-h-[320px]"
          >
            {loadError ? (
              <p className="px-4 py-2 text-xs text-[var(--destructive)]">
                Failed to load tracking: {loadError}
              </p>
            ) : null}
            <LivePitchPlayerBar
              pitchPlayerIds={
                loaded ? players.map((p) => p.id) : []
              }
              selectedId={selectedPlayerId}
              onSelectedIdChange={setSelectedPlayerId}
            />
            <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-black/[0.05] bg-[#0a0a0b] dark:border-white/[0.06]">
              <PitchView
                players={loaded ? players : undefined}
                ballPosition={loaded ? ball : undefined}
                selectedPlayerId={selectedPlayerId}
                onSelectedPlayerIdChange={setSelectedPlayerId}
              />
            </div>
          </DashboardWidget>

          <div className="flex flex-col gap-4 lg:h-full lg:min-h-0">
            <DashboardWidget
              title="Broadcast"
              subtitle="Load on demand · sync to timeline"
              className={cn(
                'lg:min-h-0',
                openAside === 'broadcast' ? 'lg:flex-1' : 'shrink-0',
              )}
              contentClassName="flex min-h-[240px] flex-1 flex-col p-0"
              collapsible
              open={openAside === 'broadcast'}
              onOpenChange={(next) => {
                if (next) setOpenAside('broadcast')
                else setOpenAside('analytics')
              }}
            >
              <VideoPlayer
                timeline={momentumTimeline}
                className="min-h-[16rem] flex-1 rounded-2xl border border-black/[0.06] dark:border-white/[0.08]"
              />
            </DashboardWidget>

            <DashboardWidget
              title="Frame indicators"
              subtitle="Five analytics · smoothed vs playback"
              className={cn(
                'lg:min-h-0',
                openAside === 'analytics' ? 'lg:flex-1' : 'shrink-0',
              )}
              contentClassName="flex min-h-[220px] flex-1 flex-col p-0 sm:min-h-[240px]"
              collapsible
              open={openAside === 'analytics'}
              onOpenChange={(next) => {
                if (next) setOpenAside('analytics')
                else setOpenAside('broadcast')
              }}
            >
              <FrameIndicatorSpider className="flex-1 px-2 pb-2 pt-0 sm:px-3" />
            </DashboardWidget>
          </div>
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
