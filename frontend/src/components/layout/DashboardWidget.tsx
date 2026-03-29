import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type DashboardWidgetProps = {
  title: string
  subtitle?: string
  children: ReactNode
  className?: string
  contentClassName?: string
  /** Omit header chrome (e.g. nested chart strip) */
  bare?: boolean
}

export function DashboardWidget({
  title,
  subtitle,
  children,
  className,
  contentClassName,
  bare,
}: DashboardWidgetProps) {
  if (bare) {
    return (
      <div
        className={cn(
          'flex min-h-0 flex-col overflow-hidden rounded-[1.35rem] border border-black/[0.06] bg-white/72 shadow-[0_2px_28px_-14px_rgba(0,0,0,0.14)] backdrop-blur-2xl backdrop-saturate-150 dark:border-white/[0.08] dark:bg-white/[0.06] dark:shadow-[0_2px_40px_-12px_rgba(0,0,0,0.65)]',
          className,
        )}
      >
        <div className={cn('min-h-0 flex-1', contentClassName)}>{children}</div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex min-h-0 flex-col overflow-hidden rounded-[1.35rem] border border-black/[0.06] bg-white/72 shadow-[0_2px_28px_-14px_rgba(0,0,0,0.14)] backdrop-blur-2xl backdrop-saturate-150 dark:border-white/[0.08] dark:bg-white/[0.06] dark:shadow-[0_2px_40px_-12px_rgba(0,0,0,0.65)]',
        className,
      )}
    >
      <header className="shrink-0 border-b border-black/[0.06] px-4 py-3 sm:px-5 dark:border-white/[0.08]">
        <h2 className="text-[15px] font-semibold leading-tight tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-0.5 text-[12px] leading-snug text-[#86868b] dark:text-[#98989d]">
            {subtitle}
          </p>
        ) : null}
      </header>
      <div className={cn('min-h-0 flex-1 p-3 sm:p-4', contentClassName)}>
        {children}
      </div>
    </div>
  )
}
