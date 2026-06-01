import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { IndicatorMetricMiniPitch } from '@/components/concept/IndicatorMetricMiniPitch'
import { SiteLayout } from '@/components/layout/SiteLayout'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  INDICATOR_CATALOG,
} from '@/data/indicatorCatalog'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'phasing-indicator-hub-installed'

function formatDownloads(n: number) {
  return new Intl.NumberFormat(undefined, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(n)
}

function truncate(s: string, max: number) {
  if (s.length <= max) return s
  return `${s.slice(0, Math.max(0, max - 1))}…`
}

function readInstalled(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

function writeInstalled(ids: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
}

type FilterTab = 'all' | 'core' | 'community' | 'installed'

export function IndicatorHubPage() {
  const [installed, setInstalled] = useState<string[]>(() =>
    typeof window === 'undefined' ? [] : readInstalled(),
  )
  const [filter, setFilter] = useState<FilterTab>('all')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(
    INDICATOR_CATALOG[0]?.id ?? null,
  )

  useEffect(() => {
    writeInstalled(installed)
  }, [installed])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return INDICATOR_CATALOG.filter((e) => {
      if (filter === 'core' && e.kind !== 'core') return false
      if (filter === 'community' && e.kind !== 'community') return false
      if (filter === 'installed' && !installed.includes(e.id)) return false
      if (!q) return true
      const blob = [
        e.title,
        e.summary,
        e.listBlurb,
        e.author ?? '',
        ...(e.tags ?? []),
      ]
        .join(' ')
        .toLowerCase()
      return blob.includes(q)
    })
  }, [filter, query, installed])

  const selected = selectedId
    ? INDICATOR_CATALOG.find((e) => e.id === selectedId) ?? null
    : null

  const toggleInstall = (id: string) => {
    setInstalled((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  return (
    <SiteLayout marketing>
      <main className="mx-auto max-w-[1200px] px-6 pb-24 pt-12 sm:pt-16">
        <p className="text-[15px] font-medium text-[#86868b] dark:text-[#98989d]">
          <Link
            to="/methodology"
            className="text-[#0066cc] hover:underline dark:text-[#2997ff]"
          >
            ← Concept
          </Link>
          <span className="mx-2 opacity-40" aria-hidden>
            ·
          </span>
          <Link
            to="/methodology/indicators"
            className="text-[#0066cc] hover:underline dark:text-[#2997ff]"
          >
            Indicator reference
          </Link>
        </p>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[40px] font-semibold leading-tight tracking-tight text-[#1d1d1f] sm:text-[44px] dark:text-[#f5f5f7]">
              Indicator Hub
            </h1>
            <p className="mt-3 max-w-[640px] text-[19px] leading-relaxed text-[#6e6e73] dark:text-[#a1a1a6]">
              Browse core MatchLab metrics and community plugins. Install packs
              locally to curate what you want to try, download manifests, and
              run a live pitch sandbox before opening a full match in{' '}
              <span
                aria-disabled="true"
                title="MatchLab is temporarily unavailable"
                className="font-medium text-[#86868b] dark:text-[#98989d]"
              >
                MatchLab
              </span>
              .
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {(
              [
                ['all', 'All'],
                ['core', 'Core'],
                ['community', 'Community'],
                ['installed', 'Installed'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={cn(
                  'rounded-full px-4 py-2 text-[13px] font-medium transition-colors',
                  filter === id
                    ? 'bg-[#1d1d1f] text-white dark:bg-[#f5f5f7] dark:text-[#1d1d1f]'
                    : 'bg-black/[0.05] text-[#6e6e73] hover:bg-black/[0.08] dark:bg-white/[0.08] dark:text-[#a1a1a6] dark:hover:bg-white/[0.12]',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8">
          <label className="sr-only" htmlFor="hub-search">
            Search indicators
          </label>
          <input
            id="hub-search"
            type="search"
            placeholder="Search by name, tag, or description…"
            value={query}
            onChange={(ev) => setQuery(ev.target.value)}
            className="w-full max-w-md rounded-2xl border border-black/[0.08] bg-white/80 px-4 py-3 text-[15px] text-[#1d1d1f] shadow-sm outline-none placeholder:text-[#86868b] focus:border-[#0066cc]/40 focus:ring-2 focus:ring-[#0066cc]/20 dark:border-white/[0.12] dark:bg-white/[0.06] dark:text-[#f5f5f7] dark:placeholder:text-[#86868b] dark:focus:border-[#2997ff]/50 dark:focus:ring-[#2997ff]/20"
          />
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-start">
          <div className="flex flex-col gap-4">
            <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-[#86868b] dark:text-[#98989d]">
              {filtered.length} indicator
              {filtered.length === 1 ? '' : 's'}
            </p>
            <ul className="flex flex-col gap-3">
              {filtered.map((e) => {
                const isSel = e.id === selectedId
                const isIn = installed.includes(e.id)
                return (
                  <li key={e.id}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedId(e.id)}
                      onKeyDown={(ev) => {
                        if (ev.key === 'Enter' || ev.key === ' ') {
                          ev.preventDefault()
                          setSelectedId(e.id)
                        }
                      }}
                      className={cn(
                        'rounded-[1.25rem] border p-4 transition-[border-color,box-shadow] sm:p-5',
                        isSel
                          ? 'border-[#0066cc]/35 bg-white shadow-[0_8px_40px_-24px_rgba(0,102,204,0.45)] dark:border-[#2997ff]/35 dark:bg-white/[0.07]'
                          : 'border-black/[0.06] bg-white/60 dark:border-white/[0.08] dark:bg-white/[0.04]',
                      )}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 text-left">
                          <span className="flex flex-wrap items-center gap-2">
                            <span
                              className="inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-lg text-[12px] font-semibold tabular-nums text-white"
                              style={{ backgroundColor: e.accent }}
                            >
                              {e.letter}
                            </span>
                            <span className="text-[17px] font-semibold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
                              {e.title}
                            </span>
                            {e.kind === 'community' ? (
                              <span className="rounded-md bg-violet-500/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                                Plugin
                              </span>
                            ) : (
                              <span className="rounded-md bg-black/[0.06] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#6e6e73] dark:bg-white/[0.12] dark:text-[#a1a1a6]">
                                Core
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={isIn ? 'secondary' : 'default'}
                            onClick={(ev) => {
                              ev.stopPropagation()
                              toggleInstall(e.id)
                            }}
                          >
                            {isIn ? 'Installed' : 'Install'}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={(ev) => {
                              ev.stopPropagation()
                              setSelectedId(e.id)
                            }}
                          >
                            Try in MatchLab
                          </Button>
                        </div>
                      </div>
                      <p className="mt-3 text-[14px] leading-snug text-[#6e6e73] dark:text-[#a1a1a6]">
                        {e.listBlurb}
                      </p>
                      <p className="mt-2 text-[13px] leading-relaxed text-[#86868b] dark:text-[#98989d]">
                        {truncate(e.summary, 130)}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-[#86868b] dark:text-[#98989d]">
                        <span className="whitespace-nowrap">By {e.author ?? '—'}</span>
                        <span className="whitespace-nowrap">
                          v{e.version ?? '1.0.0'}
                        </span>
                        <span className="whitespace-nowrap">
                          {formatDownloads(e.downloads)} downloads
                        </span>
                      </div>
                      {e.tags && e.tags.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {e.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-black/[0.04] px-2.5 py-0.5 text-[12px] text-[#6e6e73] dark:bg-white/[0.08] dark:text-[#a1a1a6]"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </li>
                )
              })}
            </ul>
            {filtered.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-black/[0.12] bg-black/[0.02] px-6 py-10 text-center text-[15px] text-[#6e6e73] dark:border-white/[0.15] dark:bg-white/[0.03] dark:text-[#a1a1a6]">
                No indicators match this filter. Try another tab or clear the
                search.
              </p>
            ) : null}
          </div>

          <aside
            id="indicator-sandbox"
            className="lg:sticky lg:top-24 lg:self-start"
          >
            <div className="rounded-[1.35rem] border border-black/[0.06] bg-white/75 p-6 shadow-[0_4px_28px_-14px_rgba(0,0,0,0.12)] backdrop-blur-2xl dark:border-white/[0.08] dark:bg-white/[0.06] sm:p-8">
              {selected ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-[26px] font-semibold leading-tight tracking-tight text-[#1d1d1f] sm:text-[28px] dark:text-[#f5f5f7]">
                      {selected.title}
                    </h2>
                    {selected.kind === 'community' ? (
                      <span className="rounded-md bg-violet-500/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                        Plugin
                      </span>
                    ) : (
                      <span className="rounded-md bg-black/[0.06] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#6e6e73] dark:bg-white/[0.12] dark:text-[#a1a1a6]">
                        Core
                      </span>
                    )}
                  </div>
                  <p className="mt-5 text-[17px] leading-relaxed text-[#6e6e73] dark:text-[#a1a1a6]">
                    {selected.summary}
                  </p>
                  <dl className="mt-6 flex flex-col gap-3 border-t border-black/[0.06] pt-6 text-[15px] dark:border-white/[0.08]">
                    <div className="flex flex-wrap gap-x-6 gap-y-1">
                      <div>
                        <dt className="text-[12px] font-medium uppercase tracking-[0.08em] text-[#86868b] dark:text-[#98989d]">
                          Author
                        </dt>
                        <dd className="mt-0.5 font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                          {selected.author ?? '—'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[12px] font-medium uppercase tracking-[0.08em] text-[#86868b] dark:text-[#98989d]">
                          Version
                        </dt>
                        <dd className="mt-0.5 font-medium tabular-nums text-[#1d1d1f] dark:text-[#f5f5f7]">
                          {selected.version ?? '1.0.0'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[12px] font-medium uppercase tracking-[0.08em] text-[#86868b] dark:text-[#98989d]">
                          Downloads
                        </dt>
                        <dd className="mt-0.5 font-medium tabular-nums text-[#1d1d1f] dark:text-[#f5f5f7]">
                          {formatDownloads(selected.downloads)}
                        </dd>
                      </div>
                    </div>
                  </dl>
                  <div className="mt-8 overflow-hidden rounded-2xl border border-black/[0.06] bg-black/[0.02] dark:border-white/[0.08] dark:bg-black/20">
                    <IndicatorMetricMiniPitch
                      key={selected.metricVariant + selected.id}
                      variant={selected.metricVariant}
                      className="w-full"
                    />
                  </div>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled
                      aria-disabled="true"
                      title="MatchLab is temporarily unavailable"
                      className={cn(
                        buttonVariants({ size: 'lg' }),
                        'h-11 rounded-full px-6 text-[15px]',
                        'cursor-not-allowed opacity-50',
                      )}
                    >
                      Open MatchLab
                    </button>
                    <Link
                      to="/methodology/indicators"
                      className={cn(
                        buttonVariants({ variant: 'outline', size: 'lg' }),
                        'h-11 rounded-full px-6 text-[15px] dark:border-white/15',
                      )}
                    >
                      Read definitions
                    </Link>
                  </div>
                </>
              ) : (
                <p className="text-[15px] text-[#86868b] dark:text-[#98989d]">
                  Select an indicator from the list to see the full description
                  and preview.
                </p>
              )}
            </div>
          </aside>
        </div>
      </main>
    </SiteLayout>
  )
}
