import type { ReactNode } from 'react'
import { useId, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

type DashboardWidgetProps = {
  title: string
  subtitle?: string
  /** For guided tours (react-joyride targets). */
  dataTour?: string
  children: ReactNode
  className?: string
  contentClassName?: string
  /** Omit header chrome (e.g. nested chart strip) */
  bare?: boolean
  /** Click header to show / hide body */
  collapsible?: boolean
  /** When `collapsible`, body starts hidden */
  defaultCollapsed?: boolean
  /** Controlled open state (requires `onOpenChange` to toggle) */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function DashboardWidget({
  title,
  subtitle,
  dataTour,
  children,
  className,
  contentClassName,
  bare,
  collapsible = false,
  defaultCollapsed = false,
  open: openControlled,
  onOpenChange,
}: DashboardWidgetProps) {
  const [internalOpen, setInternalOpen] = useState(!defaultCollapsed)
  const controlled = typeof openControlled === 'boolean'
  const open = controlled ? openControlled : internalOpen
  const panelId = useId()
  const headingId = `${panelId}-heading`

  const setOpen = (next: boolean) => {
    if (controlled) {
      onOpenChange?.(next)
    } else {
      setInternalOpen(next)
    }
  }

  if (bare) {
    return (
      <div
        data-tour={dataTour}
        className={cn(
          'flex min-h-0 flex-col overflow-hidden rounded-[1.35rem] border border-black/[0.06] bg-white/72 shadow-[0_2px_28px_-14px_rgba(0,0,0,0.14)] backdrop-blur-2xl backdrop-saturate-150 dark:border-white/[0.08] dark:bg-white/[0.06] dark:shadow-[0_2px_40px_-12px_rgba(0,0,0,0.65)]',
          className,
        )}
      >
        <div className={cn('min-h-0 flex-1', contentClassName)}>{children}</div>
      </div>
    )
  }

  const showBody = !collapsible || open

  return (
    <div
      data-tour={dataTour}
      className={cn(
        'flex min-h-0 flex-col overflow-hidden rounded-[1.35rem] border border-black/[0.06] bg-white/72 shadow-[0_2px_28px_-14px_rgba(0,0,0,0.14)] backdrop-blur-2xl backdrop-saturate-150 dark:border-white/[0.08] dark:bg-white/[0.06] dark:shadow-[0_2px_40px_-12px_rgba(0,0,0,0.65)]',
        className,
        collapsible && !open && 'h-auto max-h-none w-full lg:h-auto',
      )}
    >
      <header
        className={cn(
          'shrink-0 border-black/[0.06] px-4 py-3 sm:px-5 dark:border-white/[0.08]',
          showBody && 'border-b',
        )}
      >
        {collapsible ? (
          <button
            type="button"
            className="flex w-full items-start justify-between gap-3 rounded-lg text-left outline-none transition-colors hover:bg-black/[0.03] focus-visible:ring-2 focus-visible:ring-[#1d1d1f]/20 dark:hover:bg-white/[0.06] dark:focus-visible:ring-white/30"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-controls={panelId}
            id={headingId}
          >
            <div className="min-w-0 flex-1">
              <h2 className="text-[15px] font-semibold leading-tight tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
                {title}
              </h2>
              {subtitle ? (
                <p className="mt-0.5 text-[12px] leading-snug text-[#86868b] dark:text-[#98989d]">
                  {subtitle}
                </p>
              ) : null}
            </div>
            <ChevronDown
              className={cn(
                'mt-0.5 size-5 shrink-0 text-[#86868b] transition-transform duration-200 dark:text-[#98989d]',
                open && 'rotate-180',
              )}
              aria-hidden
            />
          </button>
        ) : (
          <>
            <h2 className="text-[15px] font-semibold leading-tight tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-0.5 text-[12px] leading-snug text-[#86868b] dark:text-[#98989d]">
                {subtitle}
              </p>
            ) : null}
          </>
        )}
      </header>
      {showBody ? (
        <div
          id={panelId}
          role="region"
          aria-labelledby={headingId}
          className={cn('min-h-0 flex-1 p-3 sm:p-4', contentClassName)}
        >
          {children}
        </div>
      ) : null}
    </div>
  )
}
