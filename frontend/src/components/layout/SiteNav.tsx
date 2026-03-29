import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'

const linkBase =
  'text-[13px] font-medium tracking-wide transition-colors duration-200 rounded-full px-3 py-1.5'

function navLinkClass({ isActive }: { isActive: boolean }) {
  return cn(
    linkBase,
    isActive
      ? 'bg-black/[0.06] text-[#1d1d1f] dark:bg-white/[0.12] dark:text-[#f5f5f7]'
      : 'text-[#424245] hover:text-[#1d1d1f] dark:text-[#a1a1a6] dark:hover:text-[#f5f5f7]',
  )
}

const subLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'text-[12px] font-normal tracking-wide px-2.5 py-1 rounded-md transition-colors',
    isActive
      ? 'text-[#0066cc] dark:text-[#2997ff]'
      : 'text-[#6e6e73] hover:text-[#1d1d1f] dark:text-[#86868b] dark:hover:text-[#f5f5f7]',
  )

export function SiteNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-black/[0.08] bg-[#fbfbfd]/80 backdrop-blur-xl backdrop-saturate-150 dark:border-white/[0.08] dark:bg-black/55">
      <div className="flex w-full flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4 sm:py-3.5 md:px-5 lg:px-6 xl:px-8">
        <div className="flex items-center justify-between gap-6">
          <NavLink
            to="/"
            className="text-[17px] font-semibold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]"
          >
            Phasing
          </NavLink>
          <nav
            className="flex flex-wrap items-center gap-1 sm:gap-0.5"
            aria-label="Primary"
          >
            <NavLink to="/" end className={navLinkClass}>
              Home
            </NavLink>
            <NavLink to="/match" className={navLinkClass}>
              Match
            </NavLink>
            <NavLink to="/methodology" className={navLinkClass}>
              Analysis
            </NavLink>
          </nav>
        </div>
        <nav
          className="flex flex-wrap items-center gap-x-1 gap-y-1 border-t border-black/[0.06] pt-3 sm:border-t-0 sm:pt-0"
          aria-label="Analysis topics"
        >
          <span className="mr-1 hidden text-[11px] font-medium uppercase tracking-wider text-[#86868b] sm:inline">
            Explain
          </span>
          <NavLink to="/methodology" end className={subLinkClass}>
            Overview
          </NavLink>
          <NavLink to="/methodology/timeline" className={subLinkClass}>
            Timeline
          </NavLink>
          <NavLink to="/methodology/indicators" className={subLinkClass}>
            Indicators
          </NavLink>
        </nav>
      </div>
    </header>
  )
}
