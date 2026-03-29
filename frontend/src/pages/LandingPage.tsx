import { Link } from 'react-router-dom'
import { buttonVariants } from '@/components/ui/button'
import { SiteLayout } from '@/components/layout/SiteLayout'
import { cn } from '@/lib/utils'

export function LandingPage() {
  return (
    <SiteLayout marketing>
      <main>
        <section className="mx-auto max-w-[980px] px-6 pb-20 pt-16 text-center sm:pt-24">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#86868b]">
            SkillCorner tracking
          </p>
          <h1 className="mt-3 text-[42px] font-semibold leading-[1.05] tracking-tight text-[#1d1d1f] sm:text-[56px] dark:text-[#f5f5f7]">
            Phases, momentum,
            <br />
            and the story of a match.
          </h1>
          <p className="mx-auto mt-5 max-w-[640px] text-[19px] leading-relaxed text-[#6e6e73] sm:text-[21px] dark:text-[#a1a1a6]">
            Explore broadcast-synced player and ball positions, then dig into
            how we score compactness, movement, ball volatility, defensive
            shape, and line dynamics across each phase.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/match-lab"
              className={cn(
                buttonVariants({ size: 'lg' }),
                'h-11 rounded-full px-8 text-[15px] shadow-sm',
              )}
            >
              Open MatchLab
            </Link>
            <Link
              to="/methodology"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'lg' }),
                'h-11 rounded-full border-black/10 bg-white/80 px-8 text-[15px] dark:border-white/15 dark:bg-white/5',
              )}
            >
              The concept
            </Link>
          </div>
        </section>

        <section className="border-t border-black/[0.06] bg-white/60 py-20 dark:border-white/[0.08] dark:bg-white/[0.03]">
          <div className="mx-auto grid max-w-[980px] gap-12 px-6 sm:grid-cols-3 sm:gap-8">
            {[
              {
                title: 'Live pitch & video',
                body: '10 Hz tracking aligned to match time, with a draggable momentum strip to scrub the timeline.',
              },
              {
                title: 'Phase breakdown',
                body: 'Stacked indicators per phase, with a moving window so you can compare shape inside each passage of play.',
              },
              {
                title: 'Documented metrics',
                body: 'Every series is defined in plain language with the same names you see in the charts.',
              },
            ].map((item) => (
              <div key={item.title} className="text-center sm:text-left">
                <h2 className="text-[21px] font-semibold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
                  {item.title}
                </h2>
                <p className="mt-2 text-[17px] leading-relaxed text-[#6e6e73] dark:text-[#a1a1a6]">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </SiteLayout>
  )
}
