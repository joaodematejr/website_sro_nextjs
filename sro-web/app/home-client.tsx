'use client'

import Link from 'next/link'

import { useI18n } from '@/components/providers/i18n-provider'
import { SiteContainer } from '@/components/site/container'
import type { NewsItem } from '@/lib/news'

type MaterialIconProps = {
  path: string
  className?: string
}

function MaterialIcon({ path, className }: MaterialIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d={path} />
    </svg>
  )
}

const iconPaths = {
  personAdd:
    'M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4Zm-8 1v-2H5v2H3v2h2v2h2v-2h2v-2H7Zm8 1c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4Z',
  creditCard:
    'M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2Zm0 14H4v-6h16v6Zm0-10H4V6h16v2Z',
  campaign:
    'M3 10v4c0 .55.45 1 1 1h2l5 4V5L6 9H4c-.55 0-1 .45-1 1Zm13.5 2c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.26 2.5-4.02ZM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77Z',
} as const

type HomeClientProps = {
  latestNews?: NewsItem[]
}

function formatNewsDate(value: string, locale: string) {
  const isoDateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)

  if (isoDateOnlyMatch) {
    const [, year, month, day] = isoDateOnlyMatch
    const safeDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))

    return new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(safeDate)
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parsed)
}

export function HomeClient({ latestNews }: HomeClientProps) {
  const { messages, locale } = useI18n()
  const dbHotNews = latestNews?.[0]
  const featuredNews = latestNews ?? messages.home.featuredNews

  return (
    <SiteContainer>
      <section className="space-y-8">
        <article
          className="relative overflow-hidden rounded-2xl border border-[var(--legacy-panel-border)] p-6"
          style={{
            backgroundImage:
              'linear-gradient(120deg, rgba(2,6,23,0.9), rgba(15,23,42,0.65)), url(/legacy/img/homebk22.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="space-y-6">
              <img src="/legacy/img/logo.png" alt="Silkroad Online" className="h-16 w-auto" />
              <h1 className="text-3xl font-bold text-white sm:text-4xl">{messages.home.title}</h1>
              <p className="max-w-2xl text-sm leading-relaxed text-slate-200">
                {messages.home.description}
              </p>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/download"
                  className="rounded-lg bg-[var(--legacy-accent-gold)] px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-[var(--legacy-accent-gold-hover)]"
                >
                  {messages.home.goToDownload}
                </Link>
                <Link
                  href="/member/register"
                  className="rounded-lg border border-slate-400/70 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-[var(--legacy-accent-gold)] hover:text-[var(--legacy-accent-gold-hover)]"
                >
                  {messages.home.createAccount}
                </Link>
                <Link
                  href="/member/charge-center"
                  className="rounded-lg border border-[var(--legacy-accent-gold)]/60 px-4 py-2 text-sm font-semibold text-[var(--legacy-accent-gold)] transition hover:border-[var(--legacy-accent-gold-hover)] hover:text-[var(--legacy-accent-gold-hover)]"
                >
                  {messages.home.chargeCenter}
                </Link>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Link
                  href="/member/register"
                  className="group flex items-center gap-3 rounded-xl border border-slate-700/90 bg-slate-950/70 p-3 transition hover:border-[var(--legacy-accent-gold)]"
                >
                  <MaterialIcon
                    path={iconPaths.personAdd}
                    className="h-8 w-8 text-[var(--legacy-accent-gold)]"
                  />
                  <span className="text-sm font-semibold text-slate-200 group-hover:text-[var(--legacy-accent-gold-hover)]">{messages.home.accountRegistration}</span>
                </Link>
                <Link
                  href="/member/charge-center"
                  className="group flex items-center gap-3 rounded-xl border border-slate-700/90 bg-slate-950/70 p-3 transition hover:border-[var(--legacy-accent-gold)]"
                >
                  <MaterialIcon
                    path={iconPaths.creditCard}
                    className="h-8 w-8 text-[var(--legacy-accent-gold)]"
                  />
                  <span className="text-sm font-semibold text-slate-200 group-hover:text-[var(--legacy-accent-gold-hover)]">{messages.home.chargeCenter}</span>
                </Link>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-700/90 bg-slate-950/60 p-2">
              <img src="/legacy/img/001.png" alt="banner" className="h-full w-full rounded-lg object-cover" />
            </div>
          </div>
        </article>

        <aside className="rounded-2xl border border-[var(--legacy-panel-border)] bg-slate-900/70 p-6">
          <div className="mb-4 inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--legacy-panel-border)] bg-slate-950/60 text-[var(--legacy-accent-gold)]">
            <MaterialIcon path={iconPaths.campaign} className="h-5 w-5" />
          </div>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-100">{messages.home.latestNews}</h2>
            <span className="rounded-full border border-[var(--legacy-accent-gold)]/60 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--legacy-accent-gold)]">
              {messages.home.badgeNew}
            </span>
          </div>
          <img src="/legacy/img/news-tab-bg-on.png" alt="news separator" className="mt-3 h-2 w-28 opacity-80" />

          <article className="mt-4 rounded-xl border border-[var(--legacy-panel-border)] bg-slate-950/70 p-4">
            <div className="flex items-center gap-2">
              <span className="rounded bg-[var(--legacy-accent-blue)]/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--legacy-accent-gold)]">
                {dbHotNews?.type ?? messages.home.hotType}
              </span>
              <span className="text-[11px] text-slate-400">
                {formatNewsDate(dbHotNews?.date ?? messages.home.hotDate, locale)}
              </span>
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-100">{dbHotNews?.title ?? messages.home.hotTitle}</p>
          </article>

          <ul className="mt-4 space-y-3">
            {featuredNews.map((item) => (
              <li key={item.title} className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2">
                <p className="text-xs font-semibold text-slate-100">{item.title}</p>
                <p className="mt-1 text-[11px] uppercase tracking-wide text-[var(--legacy-accent-gold)]">
                  {item.type} • {formatNewsDate(item.date, locale)}
                </p>
              </li>
            ))}
          </ul>
        </aside>
      </section>
    </SiteContainer>
  )
}
