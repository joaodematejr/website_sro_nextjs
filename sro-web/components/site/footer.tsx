'use client'

import { useI18n } from '@/components/providers/i18n-provider'

export function SiteFooter() {
  const { messages } = useI18n()

  return (
    <footer className="mt-16 border-t border-[var(--legacy-panel-border)] bg-[#0b0f16]">
      <div className="mx-auto w-full max-w-[var(--legacy-shell-max)] px-4 py-8 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-6 rounded-2xl border border-[var(--legacy-panel-border)] bg-[var(--legacy-panel-bg)] px-6 py-6 md:flex-row">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 items-center rounded-md border border-slate-600 bg-slate-900 px-4 text-xs font-bold tracking-[0.22em] text-slate-200">
              DIGEAM
            </span>
            <span className="inline-flex h-10 items-center rounded-md border border-slate-600 bg-slate-900 px-4 text-xs font-bold tracking-[0.22em] text-slate-200">
              JOYMAX
            </span>
          </div>

          <div className="text-center text-[11px] leading-relaxed text-slate-400 md:text-left">
            <p className="font-semibold text-slate-300">Copyright © Wemade Max Co., Ltd. All Rights Reserved.</p>
            <p>{messages.footer.legal}</p>
          </div>

          <div className="inline-flex h-12 min-w-16 items-center justify-center rounded-md border border-rose-400/40 bg-rose-950/20 px-3 text-sm font-bold text-rose-200">
            18+
          </div>
        </div>
      </div>
    </footer>
  )
}
