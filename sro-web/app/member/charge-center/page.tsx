'use client'

import Link from 'next/link'

import { useI18n } from '@/components/providers/i18n-provider'
import { SiteContainer } from '@/components/site/container'

export default function ChargeCenterPage() {
  const { messages } = useI18n()

  return (
    <SiteContainer>
      <section className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-[var(--legacy-accent-gold)]/80 bg-[var(--legacy-panel-bg)]">
        <div className="flex min-h-[var(--legacy-main-top-height)] flex-col justify-center border-b border-[var(--legacy-accent-gold)]/80 px-5 py-4 sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--legacy-accent-cyan)]">{messages.chargeCenter.tag}</p>
          <h1 className="text-[32px] font-bold leading-tight text-white sm:text-[36px]">{messages.chargeCenter.title}</h1>
          <p className="text-sm text-slate-300">{messages.chargeCenter.description}</p>
        </div>

        <div className="space-y-6 px-5 py-6 sm:px-[var(--legacy-main-content-x)] sm:py-[var(--legacy-main-content-y)]">
          <div className="rounded-lg border border-slate-700 bg-slate-950/70 p-4 text-sm text-slate-200">
            {messages.chargeCenter.info}
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-lg bg-[var(--legacy-accent-cyan)] px-4 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-110"
            >
              {messages.chargeCenter.backHome}
            </Link>
            <Link
              href="/member/register"
              className="rounded-lg border border-slate-500 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-[var(--legacy-accent-gold-hover)] hover:text-[var(--legacy-accent-gold-hover)]"
            >
              {messages.chargeCenter.registerAccount}
            </Link>
          </div>
        </div>
      </section>
    </SiteContainer>
  )
}
