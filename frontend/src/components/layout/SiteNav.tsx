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

export function SiteNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-black/[0.08] bg-[#fbfbfd]/80 backdrop-blur-xl backdrop-saturate-150 dark:border-white/[0.08] dark:bg-black/55">
      <div className="flex w-full flex-wrap items-center gap-4 px-3 py-3 sm:gap-6 sm:px-4 sm:py-3.5 md:px-5 lg:px-6 xl:px-8">
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
          <NavLink to="/match-lab" className={navLinkClass}>
            MatchLab
          </NavLink>
          <NavLink to="/methodology" className={navLinkClass}>
            Concept
          </NavLink>
        </nav>
      </div>
    </header>
  )
}
