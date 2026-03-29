import { Link } from 'react-router-dom'
import { SiteLayout } from '@/components/layout/SiteLayout'
import { cn } from '@/lib/utils'

function TopicCard({
  to,
  title,
  description,
}: {
  to: string
  title: string
  description: string
}) {
  return (
    <Link
      to={to}
      className="group block rounded-2xl border border-black/[0.06] bg-white/70 p-8 shadow-[0_2px_24px_-12px_rgba(0,0,0,0.12)] transition-shadow hover:shadow-[0_8px_40px_-16px_rgba(0,0,0,0.18)] dark:border-white/[0.08] dark:bg-white/[0.04]"
    >
      <h2 className="text-[24px] font-semibold tracking-tight text-[#1d1d1f] group-hover:text-[#0066cc] dark:text-[#f5f5f7] dark:group-hover:text-[#2997ff]">
        {title}
      </h2>
      <p className="mt-2 text-[17px] leading-relaxed text-[#6e6e73] dark:text-[#a1a1a6]">
        {description}
      </p>
      <span
        className={cn(
          'mt-4 inline-flex text-[15px] font-medium text-[#0066cc] dark:text-[#2997ff]',
        )}
      >
        Read more
        <span className="ml-1 transition-transform group-hover:translate-x-0.5">
          →
        </span>
      </span>
    </Link>
  )
}

export function MethodologyHubPage() {
  return (
    <SiteLayout marketing>
      <main className="mx-auto max-w-[980px] px-6 pb-24 pt-12 sm:pt-16">
        <h1 className="text-[40px] font-semibold leading-tight tracking-tight text-[#1d1d1f] sm:text-[48px] dark:text-[#f5f5f7]">
          How the analysis works
        </h1>
        <p className="mt-4 max-w-[720px] text-[19px] leading-relaxed text-[#6e6e73] dark:text-[#a1a1a6]">
          The match view layers SkillCorner style tracking, a timeline scrubber,
          and precomputed indicator series. Every metric is scored per frame on a
          scale from zero to one, then rolled up inside phase windows for the
          breakdown chart.
        </p>
        <div className="mt-14 grid gap-6 sm:grid-cols-2">
          <TopicCard
            to="/methodology/timeline"
            title="Timeline & sync"
            description="How we map frames to broadcast minutes, align the momentum strip with playback, and window the phase chart."
          />
          <TopicCard
            to="/methodology/indicators"
            title="The five indicators"
            description="Player clusters, position change, ball chaos, defensive line, and line to line acceleration. Each entry explains in plain language what the score is capturing."
          />
        </div>
      </main>
    </SiteLayout>
  )
}
