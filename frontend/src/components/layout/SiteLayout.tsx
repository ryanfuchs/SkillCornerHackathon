import type { ReactNode } from 'react'
import { SiteNav } from '@/components/layout/SiteNav'

type SiteLayoutProps = {
  children: ReactNode
  /** Marketing-style neutral canvas */
  marketing?: boolean
  /** Same canvas as marketing; use with `.dashboard-apple` for match dashboard */
  dashboard?: boolean
}

export function SiteLayout({ children, marketing, dashboard }: SiteLayoutProps) {
  const appleShell = marketing || dashboard
  return (
    <div
      className={
        appleShell
          ? 'min-h-dvh bg-[#fbfbfd] text-[#1d1d1f] dark:bg-[#000000] dark:text-[#f5f5f7]'
          : 'min-h-dvh'
      }
    >
      <SiteNav />
      {children}
    </div>
  )
}
