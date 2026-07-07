'use client'

import Link from 'next/link'

import { SiteContainer } from '@/components/site/container'
import type { ServerInfo } from '@/lib/server-info'
import type { I18nMessages } from '@/lib/i18n'

type Props = {
  info: ServerInfo
  messages: I18nMessages['serverInfo']
}

type RowProps = {
  label: string
  value: React.ReactNode
}

function Row({ label, value }: RowProps) {
  return (
    <tr className="border-b border-[#c8b87a]/25 last:border-0">
      <td className="py-2.5 pl-5 pr-3 text-[12px] font-semibold uppercase tracking-wider text-[#8a7040]">
        {label}
      </td>
      <td className="py-2.5 pl-3 pr-5 text-right text-[12px] font-semibold text-[#3a2e1a]">
        {value}
      </td>
    </tr>
  )
}

export function ServerInfoClient({ info, messages: m }: Props) {
  const breadcrumbHrefs = ['/', '/game-info', '/game-info/server-info', null]

  const rows: { label: string; value: React.ReactNode }[] = [
    { label: m.race, value: info.race },
    { label: m.cap, value: info.cap },
    { label: m.mastery, value: info.mastery },
    { label: m.expRate, value: info.expRate },
    { label: m.partyExpRate, value: info.partyExpRate },
    { label: m.questExpRate, value: info.questExpRate },
    { label: m.hwidLimit, value: info.hwidLimit },
    { label: m.ipLimit, value: info.ipLimit },
    { label: m.botDetect, value: info.botDetect },
    ...(info.registeredAccounts !== null
      ? [{ label: m.registeredAccounts, value: info.registeredAccounts.toLocaleString() }]
      : []),
  ]

  return (
    <SiteContainer>
      <div className="mx-auto max-w-2xl">
        {/* ── Page title bar ────────────────────────────────── */}
        <div className="mb-4 overflow-hidden rounded-lg border border-[var(--legacy-accent-gold)]/60">
          <div
            className="px-5 py-2.5"
            style={{
              background: 'linear-gradient(90deg, #2a1f0a 0%, #1a1408 60%, #0f0c05 100%)',
              borderBottom: '1px solid rgba(206,187,129,0.35)',
            }}
          >
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-[var(--legacy-accent-gold)]" fill="currentColor" aria-hidden="true">
                {/* info */}
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
              </svg>
              <h1 className="font-serif text-[22px] font-bold italic tracking-wide text-[var(--legacy-accent-gold)]">
                {m.pageTitle}
              </h1>
            </div>
          </div>

          {/* Breadcrumb */}
          <div className="flex items-center gap-1 bg-[#0d0b07] px-5 py-2 text-[11px] text-slate-400">
            {m.breadcrumb.map((crumb, i) => (
              <span key={crumb} className="flex items-center gap-1">
                {i > 0 && <span className="text-slate-600">›</span>}
                {breadcrumbHrefs[i] ? (
                  <Link
                    href={breadcrumbHrefs[i] as string}
                    className="transition hover:text-[var(--legacy-accent-gold)]"
                  >
                    {crumb}
                  </Link>
                ) : (
                  <span className="font-semibold text-[var(--legacy-accent-gold)]">{crumb}</span>
                )}
              </span>
            ))}
          </div>
        </div>

        {/* ── Info panel ────────────────────────────────────── */}
        <div
          className="overflow-hidden rounded-lg border border-[#c8b87a]/60"
          style={{ background: 'linear-gradient(180deg, #e8dfc8 0%, #d8cfa8 100%)' }}
        >
          {/* Panel header */}
          <div
            className="px-5 py-2.5"
            style={{ background: 'linear-gradient(180deg, #c4a95c 0%, #a88830 100%)' }}
          >
            <p className="text-[13px] font-bold uppercase tracking-widest text-[#2a1f0a]">
              {m.panelTitle}
            </p>
          </div>

          {/* Rows */}
          <table className="w-full">
            <tbody>
              {rows.map((row) => (
                <Row key={row.label} label={row.label} value={row.value} />
              ))}
            </tbody>
          </table>

          {/* Footer note */}
          <p className="border-t border-[#c8b87a]/30 px-5 py-2 text-[10px] text-[#8a7040]">
            {m.footerNote}
          </p>
        </div>
      </div>
    </SiteContainer>
  )
}
