'use client'

import Link from 'next/link'

import { useI18n } from '@/components/providers/i18n-provider'
import { SiteContainer } from '@/components/site/container'

export default function AreasPage() {
  const { messages } = useI18n()
  const m = messages.areas

  const breadcrumbHrefs = ['/', '/game-info', '/game-info/areas', null]

  return (
    <SiteContainer>
      <div className="mx-auto max-w-4xl">
        {/* ── Page title bar ─────────────────────────────────────── */}
        <div className="mb-4 overflow-hidden rounded-lg border border-[var(--legacy-accent-gold)]/60">
          <div
            className="px-5 py-2.5"
            style={{
              background: 'linear-gradient(90deg, #2a1f0a 0%, #1a1408 60%, #0f0c05 100%)',
              borderBottom: '1px solid rgba(206,187,129,0.35)',
            }}
          >
            <h1 className="font-serif text-[22px] font-bold italic tracking-wide text-[var(--legacy-accent-gold)]">
              Game Info
            </h1>
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

        {/* ── Content panel ──────────────────────────────────────── */}
        <div className="overflow-hidden rounded-lg border border-[var(--legacy-panel-border)] bg-[#f5f0e4] text-[#3a2e1a]">
          {/* Overall Areas heading */}
          <div className="flex items-center gap-2 border-b border-[#c8b87a]/40 px-5 py-3">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#6a5220]" fill="currentColor" aria-hidden="true">
              {/* public / globe */}
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
            </svg>
            <h2 className="text-xl font-bold text-[#3a2e1a]">{m.pageTitle}</h2>
          </div>

          {/* Global Map */}
          <div className="border-b border-[#c8b87a]/40 px-5 py-4">
            <div className="mb-2 flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#6a5220]" fill="currentColor" aria-hidden="true">
                {/* map */}
                <path d="M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z" />
              </svg>
              <span className="text-sm font-bold text-[#3a2e1a]">{m.globalMap}</span>
            </div>
            <div className="overflow-hidden rounded border border-[#c8b87a]/60 bg-[#e8dfc8]">
              {/* Map image — place world-map.png in public/legacy/img/ to display it */}
              <img
                src="/legacy/img/world-map.png.jpg"
                alt="Silkroad World Map"
                className="w-full object-cover"
                onError={(e) => {
                  ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                }}
              />
              <noscript>
                <div className="flex h-40 items-center justify-center text-sm text-[#7a6a40]">
                  {m.globalMap}
                </div>
              </noscript>
            </div>
          </div>

          {/* Areas table */}
          <div className="overflow-x-auto px-5 py-4">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th
                    colSpan={2}
                    className="border border-[#c8b87a]/60 px-4 py-2 text-center text-[13px] font-bold text-[#2a1f0a]"
                    style={{ background: 'linear-gradient(180deg, #d4bc7a 0%, #c4a85c 100%)' }}
                  >
                    {m.tableHeader}
                  </th>
                </tr>
              </thead>
              <tbody>
                {m.items.map((item, i) => (
                  <tr
                    key={item.name}
                    className={i % 2 === 0 ? 'bg-[#f0e8d0]' : 'bg-[#e8dfc8]'}
                  >
                    <td className="w-32 border border-[#c8b87a]/40 px-4 py-2 text-center text-[12px] font-semibold text-[#5a4010]">
                      {item.name}
                    </td>
                    <td className="border border-[#c8b87a]/40 px-4 py-2 text-[12px] text-[#3a2e1a]">
                      {item.description}
                    </td>
                  </tr>
                ))}
                {/* Unavailable row */}
                <tr className="bg-[#d8d0b8]">
                  <td className="w-32 border border-[#c8b87a]/40 px-4 py-2" />
                  <td className="border border-[#c8b87a]/40 px-4 py-2 text-[12px] text-[#7a7060]">
                    {m.unavailable}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </SiteContainer>
  )
}
