'use client'

import Link from 'next/link'

import { useI18n } from '@/components/providers/i18n-provider'
import { SiteContainer } from '@/components/site/container'

const clientDownloadUrl =
  'https://cdnapk.digeam.com/cdnapk/sro/SilkroadOnlineTaiwan_Official_v1_030.exe'

const requirements = [
  ['CPU', 'Intel Pentium 4 2.4GHZ', 'Intel I3-8100 3.6GHZ'],
  ['RAM', '512MB', '4GB'],
  ['GPU', 'Geforce FX5600 / ATI9500+', 'GT 1030'],
  ['Storage', '15GB+', '20GB+'],
  ['OS', 'Windows 7 SP1+', 'Windows 7 SP1+'],
] as const

export function DownloadClient() {
  const { messages } = useI18n()

  return (
    <SiteContainer>
      <section className="space-y-8">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">{messages.download.step}</p>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{messages.download.title}</h1>
          <p className="max-w-2xl text-sm text-slate-300">{messages.download.description}</p>
        </div>

        <div className="rounded-2xl border border-cyan-500/30 bg-slate-900/70 p-6">
          <div className="flex flex-wrap items-center gap-4">
            <img src="/legacy/img/download-sr.png" alt="download silkroad" className="h-10 w-auto" />
            <Link
              href={clientDownloadUrl}
              className="inline-flex items-center rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
              target="_blank"
              rel="noreferrer"
            >
              {messages.download.downloadClient}
            </Link>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/70">
          <img src="/legacy/img/news-in-line.png" alt="separator" className="h-3 w-full object-cover opacity-70" />
          <table className="min-w-full divide-y divide-slate-800 text-sm">
            <thead className="bg-slate-800/70 text-left text-slate-200">
              <tr>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">{messages.download.minimum}</th>
                <th className="px-4 py-3">{messages.download.recommended}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {requirements.map(([name, minimum, recommended]) => (
                <tr key={name}>
                  <td className="px-4 py-3 font-semibold text-slate-100">{name}</td>
                  <td className="px-4 py-3">{minimum}</td>
                  <td className="px-4 py-3">{recommended}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </SiteContainer>
  )
}
