'use client'

import Link from 'next/link'

import { useI18n } from '@/components/providers/i18n-provider'
import { SiteContainer } from '@/components/site/container'

export function HomeClient() {
  const { messages } = useI18n()

  return (
    <SiteContainer>
      <section className="space-y-8">
        <article
          className="relative overflow-hidden rounded-2xl border border-cyan-500/30 p-6"
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
                  className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                >
                  {messages.home.goToDownload}
                </Link>
                <Link
                  href="/member/register"
                  className="rounded-lg border border-slate-400/70 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-cyan-400 hover:text-cyan-300"
                >
                  {messages.home.createAccount}
                </Link>
                <Link
                  href="/member/charge-center"
                  className="rounded-lg border border-amber-300/60 px-4 py-2 text-sm font-semibold text-amber-200 transition hover:border-amber-200 hover:text-amber-100"
                >
                  {messages.home.chargeCenter}
                </Link>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Link
                  href="/member/register"
                  className="group flex items-center gap-3 rounded-xl border border-slate-700/90 bg-slate-950/70 p-3 transition hover:border-cyan-400"
                >
                  <img src="/legacy/img/regis-icn.png" alt="register icon" className="h-8 w-8" />
                  <span className="text-sm font-semibold text-slate-200 group-hover:text-cyan-300">{messages.home.accountRegistration}</span>
                </Link>
                <Link
                  href="/member/charge-center"
                  className="group flex items-center gap-3 rounded-xl border border-slate-700/90 bg-slate-950/70 p-3 transition hover:border-amber-400"
                >
                  <img src="/legacy/img/chargecenter-icn.png" alt="charge icon" className="h-8 w-8" />
                  <span className="text-sm font-semibold text-slate-200 group-hover:text-amber-200">{messages.home.chargeCenter}</span>
                </Link>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-700/90 bg-slate-950/60 p-2">
              <img src="/legacy/img/001.png" alt="banner" className="h-full w-full rounded-lg object-cover" />
            </div>
          </div>
        </article>

        <aside className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6">
          <img src="/legacy/img/hotnews.png" alt="hot news" className="mb-4 h-8 w-auto opacity-90" />
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-100">{messages.home.latestNews}</h2>
            <span className="rounded-full border border-cyan-400/60 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-cyan-200">
              {messages.home.badgeNew}
            </span>
          </div>
          <img src="/legacy/img/news-tab-bg-on.png" alt="news separator" className="mt-3 h-2 w-28 opacity-80" />

          <article className="mt-4 rounded-xl border border-cyan-500/30 bg-slate-950/70 p-4">
            <div className="flex items-center gap-2">
              <span className="rounded bg-cyan-500/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-cyan-200">
                {messages.home.hotType}
              </span>
              <span className="text-[11px] text-slate-400">{messages.home.hotDate}</span>
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-100">{messages.home.hotTitle}</p>
          </article>

          <ul className="mt-4 space-y-3">
            {messages.home.featuredNews.map((item) => (
              <li key={item.title} className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2">
                <p className="text-xs font-semibold text-slate-100">{item.title}</p>
                <p className="mt-1 text-[11px] uppercase tracking-wide text-cyan-300">
                  {item.type} • {item.date}
                </p>
              </li>
            ))}
          </ul>
        </aside>
      </section>
    </SiteContainer>
  )
}
