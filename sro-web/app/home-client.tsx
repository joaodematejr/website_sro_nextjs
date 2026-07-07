'use client'

import Link from 'next/link'

import { useI18n } from '@/components/providers/i18n-provider'
import { SiteContainer } from '@/components/site/container'
import type { NewsItem } from '@/lib/news'

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
  const allNews = latestNews ?? messages.home.featuredNews

  return (
    <SiteContainer>
      {/* ── Top hero banner ─────────────────────────────────────────── */}
      <div
        className="relative mb-0 h-[220px] w-full overflow-hidden rounded-t-xl border border-b-0 border-[var(--legacy-panel-border)]"
        style={{
          backgroundImage: 'url(/legacy/img/homebk22.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
        }}
      >
        <img
          src="/legacy/img/logo.png"
          alt="Silkroad Online"
          className="absolute left-6 top-6 h-20 w-auto drop-shadow-lg"
        />
      </div>

      {/* ── Three-column body ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-0 border border-t-0 border-[var(--legacy-panel-border)] rounded-b-xl overflow-hidden lg:grid-cols-[200px_1fr_180px]">

        {/* ── Left sidebar ─────────────────────────────────────── */}
        <aside className="border-r border-[var(--legacy-panel-border)] bg-[#0d0c0b]">
          {/* Login / account box */}
          <div className="border-b border-[var(--legacy-panel-border)] p-3 space-y-2">
            <input
              readOnly
              placeholder={messages.home.nav.idPlaceholder}
              className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-300 placeholder:text-slate-600"
            />
            <input
              readOnly
              type="password"
              placeholder={messages.home.nav.passwordPlaceholder}
              className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-300 placeholder:text-slate-600"
            />
            <Link
              href="/member/charge-center"
              className="block w-full rounded border border-[var(--legacy-accent-gold)]/50 bg-[#1f1a10] py-1 text-center text-xs font-semibold uppercase tracking-wider text-[var(--legacy-accent-gold)] transition hover:bg-[#2c2415] hover:text-[var(--legacy-accent-gold-hover)]"
            >
              {messages.home.nav.signIn}
            </Link>
            <Link
              href="/member/reset-password"
              className="block text-center text-[10px] text-slate-500 hover:text-[var(--legacy-accent-gold)] transition"
            >
              {messages.home.nav.passwordSearch}
            </Link>
            <Link
              href="/member/register"
              className="block w-full rounded bg-[var(--legacy-accent-gold)] py-1.5 text-center text-xs font-bold uppercase tracking-wider text-slate-950 transition hover:bg-[var(--legacy-accent-gold-hover)]"
            >
              {messages.home.nav.signUp}
            </Link>
          </div>

          {/* Client download */}
          <Link href="/download" className="flex items-center gap-2 border-b border-[var(--legacy-panel-border)] bg-[#130e09] px-3 py-3 transition hover:bg-[#1c1610]">
            <img src="/legacy/img/download-sr.png" alt="" className="h-10 w-auto" />
            <span className="text-xs font-bold uppercase leading-tight text-[var(--legacy-accent-gold)]">{messages.home.nav.freeDownload}</span>
          </Link>

          {/* Nav links */}
          <nav className="divide-y divide-slate-800/60">
            {messages.home.nav.links.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-300 transition hover:bg-slate-800/40 hover:text-[var(--legacy-accent-gold)]"
              >
                <span>◆ {item.label}</span>
                <span className="text-slate-600">›</span>
              </Link>
            ))}
          </nav>
        </aside>

        {/* ── Center content ───────────────────────────────────── */}
        <main className="border-r border-[var(--legacy-panel-border)] bg-[#0a0907]">
          {/* Feature banner */}
          <div className="relative overflow-hidden border-b border-[var(--legacy-panel-border)]">
            <img src="/legacy/img/001.png" alt="banner" className="w-full object-cover" style={{ maxHeight: '240px' }} />
          </div>

          {/* Latest News */}
          <div>
            <div className="flex items-center justify-between border-b border-[var(--legacy-panel-border)] bg-[#0f0e0c] px-4 py-2">
              <div className="flex items-center gap-2">
                <img src="/legacy/img/news-in-line.png" alt="" className="h-4 w-4 opacity-80" />
                <span className="text-xs font-bold uppercase tracking-widest text-[var(--legacy-accent-gold)]">{messages.home.latestNews}</span>
              </div>
              <span className="rounded border border-[var(--legacy-accent-gold)]/40 px-2 py-0.5 text-[10px] font-semibold uppercase text-[var(--legacy-accent-gold)]/80 hover:text-[var(--legacy-accent-gold)] cursor-pointer">
                + More
              </span>
            </div>

            <ul className="divide-y divide-slate-800/50">
              {allNews.map((item) => (
                <li key={item.title} className="flex items-baseline gap-3 px-4 py-2.5 hover:bg-slate-900/40 transition">
                  <span className="shrink-0 rounded bg-[var(--legacy-accent-blue)]/30 px-1.5 py-0.5 text-[9px] font-bold uppercase text-[var(--legacy-accent-gold)]/80">
                    {item.type}
                  </span>
                  <span className="flex-1 text-xs text-slate-200 leading-snug">{item.title}</span>
                  <span className="shrink-0 text-[10px] text-slate-500">{formatNewsDate(item.date, locale)}</span>
                </li>
              ))}
            </ul>
          </div>
        </main>

        {/* ── Right sidebar ─────────────────────────────────────── */}
        <aside className="bg-[#0d0c0b] divide-y divide-slate-800/60">
          {/* Charge / Buy item */}
          <Link href="/member/charge-center" className="flex flex-col items-center gap-1 px-3 py-4 transition hover:bg-slate-800/30">
            <svg viewBox="0 0 24 24" className="h-10 w-10 text-[var(--legacy-accent-gold)]" fill="currentColor" aria-hidden="true">
              {/* credit_card */}
              <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
            </svg>
            <span className="text-center text-[11px] font-bold uppercase tracking-wider text-[var(--legacy-accent-gold)]">{messages.home.chargeCenter}</span>
            <span className="text-center text-[10px] text-slate-400 leading-snug">{messages.home.nav.chargeDesc}</span>
          </Link>

          {/* Register */}
          <Link href="/member/register" className="flex flex-col items-center gap-1 px-3 py-4 transition hover:bg-slate-800/30">
            <svg viewBox="0 0 24 24" className="h-10 w-10 text-[var(--legacy-accent-gold)]" fill="currentColor" aria-hidden="true">
              {/* person_add */}
              <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-8 1v-2H5v2H3v2h2v2h2v-2h2v-2H7zm8 1c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
            <span className="text-center text-[11px] font-bold uppercase tracking-wider text-[var(--legacy-accent-gold)]">{messages.home.accountRegistration}</span>
            <span className="text-center text-[10px] text-slate-400 leading-snug">{messages.home.nav.registerDesc}</span>
          </Link>

          {/* Download */}
          <Link href="/download" className="flex flex-col items-center gap-1 px-3 py-4 transition hover:bg-slate-800/30">
            <svg viewBox="0 0 24 24" className="h-10 w-10 text-[var(--legacy-accent-gold)]" fill="currentColor" aria-hidden="true">
              {/* download */}
              <path d="M5 20h14v-2H5v2zm7-18L5.33 9h3.84v4h5.66V9h3.84L12 2z" />
            </svg>
            <span className="text-center text-[11px] font-bold uppercase tracking-wider text-[var(--legacy-accent-gold)]">{messages.home.goToDownload}</span>
            <span className="text-center text-[10px] text-slate-400 leading-snug">{messages.home.nav.downloadDesc}</span>
          </Link>
        </aside>
      </div>
    </SiteContainer>
  )
}
