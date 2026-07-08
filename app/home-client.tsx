'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { useI18n } from '@/components/providers/i18n-provider'
import { SiteContainer } from '@/components/site/container'
import type { NewsItem } from '@/lib/news'
import type { PublicHomeStats } from '@/lib/public-home-stats'
import type { RankingData } from '@/lib/rankings'
import type { ServerInfo } from '@/lib/server-info'
import type { UniqueSpawnItem } from '@/lib/unique-spawns'

export type HomeClientProps = {
  latestNews?: NewsItem[]
  serverTimeZone?: string
  serverInfo?: ServerInfo
  rankingData?: RankingData
  uniqueSpawns?: UniqueSpawnItem[]
  publicStats?: PublicHomeStats
}

function formatNumber(value: number | null) {
  return value === null ? '—' : value.toLocaleString()
}

function formatDateTime(value: string | null, locale: string) {
  if (!value) {
    return '—'
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return '—'
  }

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed)
}

function formatRelativeFromNow(value: string | null, locale: string) {
  if (!value) {
    return '—'
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return '—'
  }

  const diffMs = parsed.getTime() - Date.now()
  const absMinutes = Math.round(Math.abs(diffMs) / 60000)

  if (absMinutes < 1) {
    return locale === 'pt-BR' ? 'agora' : 'now'
  }

  const unit = absMinutes < 60 ? 'minute' : 'hour'
  const valueAmount = unit === 'minute' ? absMinutes : Math.round(absMinutes / 60)
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

  return formatter.format(diffMs < 0 ? -valueAmount : valueAmount, unit)
}

function formatSeconds(value: number | null) {
  if (value === null) {
    return '—'
  }

  if (value < 60) {
    return `${Math.round(value)}s`
  }

  const minutes = Math.floor(value / 60)
  const seconds = Math.round(value % 60)
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`
}

function formatPercent(value: number | null) {
  if (value === null) {
    return '—'
  }

  return `${Math.max(0, Math.min(100, value)).toFixed(1)}%`
}

function formatLatency(value: number | null) {
  if (value === null) {
    return '—'
  }

  return `${Math.max(0, Math.round(value))} ms`
}

function statusTone(value: PublicHomeStats['serviceStatus']['gateway']) {
  if (value === 'online') {
    return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
  }

  if (value === 'degraded') {
    return 'bg-amber-500/20 text-amber-300 border-amber-500/40'
  }

  if (value === 'offline') {
    return 'bg-rose-500/20 text-rose-300 border-rose-500/40'
  }

  return 'bg-slate-700/30 text-slate-300 border-slate-600/50'
}

function formatClockDate(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    timeZone,
  }).format(date)
}

function formatClockTime(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone,
  }).format(date)
}

function SilkroadClock({ serverTimeZone }: { serverTimeZone: string }) {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const localLabel = serverTimeZone.replace(/_/g, ' ').split('/').pop() ?? serverTimeZone

  return (
    <div className="border-b border-[var(--legacy-panel-border)] bg-[#0a0807] px-3 py-3">
      <p className="mb-2 text-center text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--legacy-accent-gold)]">
        Silkroad Standard Time
      </p>

      {/* Server time (KST) */}
      <div className="mb-2 rounded border border-[var(--legacy-panel-border)]/50 bg-black/40 px-2 py-1.5">
        <p className="text-[9px] text-slate-500">
          {now ? formatClockDate(now, 'Asia/Seoul') : ''}
        </p>
        <p className="font-mono text-[15px] font-bold tabular-nums text-[var(--legacy-accent-gold)] tracking-wide">
          {now ? formatClockTime(now, 'Asia/Seoul') : '00:00:00 AM'}
        </p>
      </div>

      {/* Server local time */}
      <p className="text-center text-[9px] text-slate-400">{localLabel}</p>
      <div className="mt-1 rounded border border-slate-800 bg-black/30 px-2 py-1.5">
        <p className="text-[9px] text-slate-500">
          {now ? formatClockDate(now, serverTimeZone) : ''}
        </p>
        <p className="font-mono text-[13px] font-semibold tabular-nums text-slate-300 tracking-wide">
          {now ? formatClockTime(now, serverTimeZone) : '00:00:00 PM'}
        </p>
      </div>
    </div>
  )
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

// ── Event schedule default times (KST = UTC+9, day 0=Sun) ────────────────
const DEFAULT_EVENTS = [
  { key: 'ctf',          dayKst: 0, hourKst: 20, minuteKst: 0 },
  { key: 'baFlag',       dayKst: 1, hourKst: 20, minuteKst: 0 },
  { key: 'baScore',      dayKst: 2, hourKst: 20, minuteKst: 0 },
  { key: 'td',           dayKst: 3, hourKst: 20, minuteKst: 0 },
  { key: 'lms',          dayKst: 4, hourKst: 20, minuteKst: 0 },
  { key: 'specialTrade', dayKst: 5, hourKst: 20, minuteKst: 0 },
  { key: 'guildWar',     dayKst: 6, hourKst: 20, minuteKst: 0 },
]

function msUntilNextKst(dayKst: number, hourKst: number, minuteKst: number, now: Date) {
  const KST_OFFSET_MS = 9 * 60 * 60 * 1000
  const nowUtcMs = now.getTime()
  const nowKstMs = nowUtcMs + KST_OFFSET_MS

  // Build target for this week
  const nowKstDate = new Date(nowKstMs)
  const currentDayKst = nowKstDate.getUTCDay()
  const daysAhead = (dayKst - currentDayKst + 7) % 7

  // If same day but already past the time, move to next week
  const targetMs =
    new Date(Date.UTC(
      nowKstDate.getUTCFullYear(),
      nowKstDate.getUTCMonth(),
      nowKstDate.getUTCDate() + daysAhead,
      hourKst - 9,  // convert KST hour to UTC
      minuteKst,
      0,
    )).getTime()

  const diff = targetMs - nowUtcMs
  return diff <= 0 ? diff + 7 * 24 * 3600 * 1000 : diff
}

function formatCountdown(ms: number) {
  const totalSec = Math.floor(ms / 1000)
  const days = Math.floor(totalSec / 86400)
  const hours = Math.floor((totalSec % 86400) / 3600)
  const minutes = Math.floor((totalSec % 3600) / 60)
  const seconds = totalSec % 60

  const hh = String(hours).padStart(2, '0')
  const mm = String(minutes).padStart(2, '0')
  const ss = String(seconds).padStart(2, '0')

  return days > 0 ? `${days}D ${hh}:${mm}:${ss}` : `${hh}:${mm}:${ss}`
}

function EventSchedule({ labels }: { labels: readonly { key: string; label: string }[] }) {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const labelMap = Object.fromEntries(labels.map((l) => [l.key, l.label]))

  return (
    <div className="px-5 py-4">
      <div className="overflow-hidden rounded-md border border-[var(--legacy-panel-border)]">
        <table className="w-full border-collapse text-sm">
          <tbody>
            {DEFAULT_EVENTS.map((ev, i) => {
              const ms = now ? msUntilNextKst(ev.dayKst, ev.hourKst, ev.minuteKst, now) : null
              return (
                <tr key={ev.key} className={i % 2 === 0 ? 'bg-slate-900/60' : 'bg-[#14120f]'}>
                  <td className="border border-[var(--legacy-panel-border)] px-4 py-2 text-[12px] font-semibold text-[var(--legacy-accent-gold)]">
                    {labelMap[ev.key] ?? ev.key}
                  </td>
                  <td className="border border-[var(--legacy-panel-border)] px-4 py-2 text-right font-mono text-[12px] font-bold text-slate-200">
                    {ms !== null ? formatCountdown(ms) : '--:--:--'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}


function GameRanking({ data, labels }: {
  data: RankingData
  labels: {
    player: string; guild: string
    colChar: string; colGuild: string; colPoints: string
    colMembers: string; colMaster: string; empty: string
  }
}) {
  const [tab, setTab] = useState<'player' | 'guild'>('player')

  const btnBase = 'flex-1 rounded-sm border border-[var(--legacy-panel-border)] py-2 text-[11px] font-bold uppercase tracking-wider transition'
  const btnActive = 'border-[var(--legacy-accent-gold)] bg-[#2a2114] text-[var(--legacy-accent-gold)]'
  const btnInactive = 'bg-slate-900/70 text-slate-300 hover:bg-slate-800/80 hover:text-[var(--legacy-accent-gold-hover)]'

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-2 rounded-md border border-[var(--legacy-panel-border)] bg-[var(--legacy-navbar-bg)] px-4 py-2">
        <button
          type="button"
          className={`${btnBase} ${tab === 'player' ? btnActive : btnInactive}`}
          onClick={() => setTab('player')}
        >
          {labels.player}
        </button>
        <button
          type="button"
          className={`${btnBase} ${tab === 'guild' ? btnActive : btnInactive}`}
          onClick={() => setTab('guild')}
        >
          {labels.guild}
        </button>
      </div>

      {/* Table */}
      <div className="px-5 py-4">
        <div className="overflow-hidden rounded-md border border-[var(--legacy-panel-border)]">
          <table className="w-full border-collapse text-sm">
          <thead>
            <tr
              className="border border-[#c8b87a]/60"
              style={{ background: 'linear-gradient(180deg, #d4bc7a 0%, #c4a85c 100%)' }}
            >
              <th className="px-4 py-2 text-center text-[12px] font-bold text-[#2a1f0a]">#</th>
              {tab === 'player' ? (
                <>
                  <th className="px-4 py-2 text-center text-[12px] font-bold text-[#2a1f0a]">{labels.colChar}</th>
                  <th className="px-4 py-2 text-center text-[12px] font-bold text-[#2a1f0a]">{labels.colGuild}</th>
                  <th className="px-4 py-2 text-center text-[12px] font-bold text-[#2a1f0a]">{labels.colPoints}</th>
                </>
              ) : (
                <>
                  <th className="px-4 py-2 text-center text-[12px] font-bold text-[#2a1f0a]">Guild</th>
                  <th className="px-4 py-2 text-center text-[12px] font-bold text-[#2a1f0a]">{labels.colMaster}</th>
                  <th className="px-4 py-2 text-center text-[12px] font-bold text-[#2a1f0a]">{labels.colMembers}</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {tab === 'player'
              ? data.players.map((p, i) => (
                  <tr key={p.charName} className={i % 2 === 0 ? 'bg-slate-900/60' : 'bg-[#14120f]'}>
                    <td className="border border-[var(--legacy-panel-border)] px-4 py-2 text-center text-[12px] font-semibold text-[var(--legacy-accent-gold)]">
                      {p.rank}
                    </td>
                    <td className="border border-[var(--legacy-panel-border)] px-4 py-2 text-center text-[12px] text-slate-200">
                      {p.charName}
                    </td>
                    <td className="border border-[var(--legacy-panel-border)] px-4 py-2 text-center text-[12px] text-slate-200">
                      {p.guildName || '—'}
                    </td>
                    <td className="border border-[var(--legacy-panel-border)] px-4 py-2 text-center text-[12px] text-slate-200">
                      {p.points.toLocaleString()}
                    </td>
                  </tr>
                ))
              : data.guilds.map((g, i) => (
                  <tr key={g.guildName} className={i % 2 === 0 ? 'bg-slate-900/60' : 'bg-[#14120f]'}>
                    <td className="border border-[var(--legacy-panel-border)] px-4 py-2 text-center text-[12px] font-semibold text-[var(--legacy-accent-gold)]">
                      {g.rank}
                    </td>
                    <td className="border border-[var(--legacy-panel-border)] px-4 py-2 text-center text-[12px] text-slate-200">
                      {g.guildName}
                    </td>
                    <td className="border border-[var(--legacy-panel-border)] px-4 py-2 text-center text-[12px] text-slate-200">
                      {g.charName || '—'}
                    </td>
                    <td className="border border-[var(--legacy-panel-border)] px-4 py-2 text-center text-[12px] text-slate-200">
                      {g.points.toLocaleString()}
                    </td>
                  </tr>
                ))
            }
            {((tab === 'player' && data.players.length === 0) || (tab === 'guild' && data.guilds.length === 0)) && (
              <tr className="bg-[#171512]">
                <td colSpan={4} className="border border-[var(--legacy-panel-border)] px-4 py-4 text-center text-[12px] text-slate-400">
                  {labels.empty}
                </td>
              </tr>
            )}
          </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}


// ── Panel header shared style ────────────────────────────────────────────
function PanelHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-[var(--legacy-panel-border)] bg-[var(--legacy-navbar-bg)] px-5 py-3">
      <div className="flex h-5 w-5 items-center justify-center text-[var(--legacy-accent-gold)]">
        {icon}
      </div>
      <h2 className="text-lg font-bold text-slate-100">{title}</h2>
    </div>
  )
}

function LastUniqueSpawnCard({
  title,
  killedByLabel,
  items,
}: {
  title: string
  killedByLabel: string
  items: readonly { name: string; killer: string; elapsed: string }[]
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-[var(--legacy-panel-border)] bg-[var(--legacy-panel-bg)] text-slate-200">
      <PanelHeader
        title={title}
        icon={
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M5.59 3 3 5.59l2.83 2.83L2 12.24 3.76 14l3.82-3.82 2.83 2.83L13 10.41 5.59 3zm12.82 0L11 10.41l2.59 2.59 2.83-2.83L20.24 14 22 12.24l-3.82-3.82L21 5.59 18.41 3z" />
          </svg>
        }
      />

      <div className="max-h-[430px] overflow-y-auto px-5 py-4">
        <div className="space-y-3">
          {items.map((item, i) => (
            <article
              key={`${item.name}-${item.killer}-${i}`}
              className="rounded-xl border border-[var(--legacy-panel-border)] bg-[#15120f] px-3 py-2.5"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-[3px] border-[#64553e] bg-[#3e3528] text-[13px] font-bold text-[var(--legacy-accent-gold)]">
                  {item.name.slice(0, 1)}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-serif text-[32px] leading-[1.05] text-[var(--legacy-accent-gold)] [font-size:clamp(20px,2vw,32px)]">
                    {item.name}
                  </p>
                  <div className="mt-1.5 rounded bg-[#4a3f31] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#eed49a] [font-size:clamp(11px,1.1vw,16px)]">
                    {killedByLabel}. {item.killer}
                  </div>
                  <p className="mt-1 text-[14px] text-slate-300 [font-size:clamp(12px,1.1vw,20px)]">
                    {item.elapsed}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function PublicOnlineCard({
  title,
  onlineLabel,
  peakLabel,
  onlineNow,
  peak24h,
}: {
  title: string
  onlineLabel: string
  peakLabel: string
  onlineNow: number | null
  peak24h: number | null
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-[var(--legacy-panel-border)] bg-[var(--legacy-panel-bg)] text-slate-200">
      <PanelHeader
        title={title}
        icon={
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.98 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
          </svg>
        }
      />
      <div className="space-y-3 px-5 py-4">
        <article className="rounded border border-[var(--legacy-panel-border)] bg-[#15120f] px-4 py-3">
          <p className="text-[10px] uppercase tracking-widest text-slate-400">{onlineLabel}</p>
          <p className="mt-1 text-[28px] font-bold leading-none text-[var(--legacy-accent-gold)]">{formatNumber(onlineNow)}</p>
        </article>
        <article className="rounded border border-[var(--legacy-panel-border)] bg-[#15120f] px-4 py-3">
          <p className="text-[10px] uppercase tracking-widest text-slate-400">{peakLabel}</p>
          <p className="mt-1 text-[28px] font-bold leading-none text-[var(--legacy-accent-gold)]">{formatNumber(peak24h)}</p>
        </article>
      </div>
    </section>
  )
}

function PublicTopJobCard({
  title,
  jobLabel,
  scoreLabel,
  emptyLabel,
  items,
}: {
  title: string
  jobLabel: string
  scoreLabel: string
  emptyLabel: string
  items: PublicHomeStats['topJobs']
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-[var(--legacy-panel-border)] bg-[var(--legacy-panel-bg)] text-slate-200">
      <PanelHeader
        title={title}
        icon={
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M7 2v11h3v9l7-12h-4l4-8z" />
          </svg>
        }
      />
      <div className="px-5 py-4">
        {items.length === 0 ? (
          <p className="rounded border border-[var(--legacy-panel-border)] bg-[#15120f] px-4 py-4 text-center text-[12px] text-slate-400">{emptyLabel}</p>
        ) : (
          <div className="space-y-2.5">
            {items.map((item) => (
              <article key={`${item.rank}-${item.charName}`} className="rounded border border-[var(--legacy-panel-border)] bg-[#15120f] px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[13px] font-semibold text-slate-100">#{item.rank} {item.charName}</p>
                  <p className="text-[11px] uppercase tracking-wide text-[var(--legacy-accent-gold)]">{item.jobName}</p>
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{jobLabel}: {item.jobName}</span>
                  <span>{scoreLabel}: {item.score.toLocaleString()}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function PublicFortressCard({
  title,
  ownerLabel,
  siegeLabel,
  taxLabel,
  emptyLabel,
  items,
  locale,
}: {
  title: string
  ownerLabel: string
  siegeLabel: string
  taxLabel: string
  emptyLabel: string
  items: PublicHomeStats['fortresses']
  locale: string
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-[var(--legacy-panel-border)] bg-[var(--legacy-panel-bg)] text-slate-200">
      <PanelHeader
        title={title}
        icon={
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2 3 7v2h18V7l-9-5zm7 9H5v9h4v-6h6v6h4v-9z" />
          </svg>
        }
      />
      <div className="px-5 py-4">
        {items.length === 0 ? (
          <p className="rounded border border-[var(--legacy-panel-border)] bg-[#15120f] px-4 py-4 text-center text-[12px] text-slate-400">{emptyLabel}</p>
        ) : (
          <div className="space-y-2.5">
            {items.map((item) => (
              <article key={item.fortressName} className="rounded border border-[var(--legacy-panel-border)] bg-[#15120f] px-3 py-2.5">
                <p className="text-[13px] font-semibold text-[var(--legacy-accent-gold)]">{item.fortressName}</p>
                <div className="mt-1.5 space-y-1 text-[11px] text-slate-300">
                  <p>{ownerLabel}: {item.ownerGuild || '-'}</p>
                  <p>{siegeLabel}: {formatDateTime(item.nextSiegeAt, locale)}</p>
                  <p>{taxLabel}: {item.taxRate === null ? '—' : `${item.taxRate}%`}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function SpawnTrackerCard({
  title,
  lastKillLabel,
  nextSpawnLabel,
  emptyLabel,
  locale,
  items,
}: {
  title: string
  lastKillLabel: string
  nextSpawnLabel: string
  emptyLabel: string
  locale: string
  items: PublicHomeStats['spawnTracker']
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-[var(--legacy-panel-border)] bg-[var(--legacy-panel-bg)] text-slate-200">
      <PanelHeader
        title={title}
        icon={
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2a10 10 0 1 0 10 10A10.012 10.012 0 0 0 12 2zm1 11H7v-2h4V6h2z" />
          </svg>
        }
      />
      <div className="px-5 py-4">
        {items.length === 0 ? (
          <p className="rounded border border-[var(--legacy-panel-border)] bg-[#15120f] px-4 py-4 text-center text-[12px] text-slate-400">{emptyLabel}</p>
        ) : (
          <div className="space-y-2.5">
            {items.map((item) => (
              <article key={`${item.uniqueName}-${item.lastKillAt ?? 'none'}`} className="rounded border border-[var(--legacy-panel-border)] bg-[#15120f] px-3 py-2.5">
                <p className="text-[13px] font-semibold text-[var(--legacy-accent-gold)]">{item.uniqueName}</p>
                <div className="mt-1.5 space-y-1 text-[11px] text-slate-300">
                  <p>{lastKillLabel}: {formatDateTime(item.lastKillAt, locale)}</p>
                  <p>{nextSpawnLabel}: {formatRelativeFromNow(item.nextSpawnAt, locale)}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function FortressTimelineCard({
  title,
  previousOwnerLabel,
  newOwnerLabel,
  changedAtLabel,
  emptyLabel,
  locale,
  items,
}: {
  title: string
  previousOwnerLabel: string
  newOwnerLabel: string
  changedAtLabel: string
  emptyLabel: string
  locale: string
  items: PublicHomeStats['fortressTimeline']
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-[var(--legacy-panel-border)] bg-[var(--legacy-panel-bg)] text-slate-200">
      <PanelHeader
        title={title}
        icon={
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2 4 5v6c0 5.25 3.4 10.74 8 12 4.6-1.26 8-6.75 8-12V5l-8-3z" />
          </svg>
        }
      />
      <div className="px-5 py-4">
        {items.length === 0 ? (
          <p className="rounded border border-[var(--legacy-panel-border)] bg-[#15120f] px-4 py-4 text-center text-[12px] text-slate-400">{emptyLabel}</p>
        ) : (
          <div className="space-y-2.5">
            {items.map((item, index) => (
              <article key={`${item.fortressName}-${item.changedAt ?? index}`} className="rounded border border-[var(--legacy-panel-border)] bg-[#15120f] px-3 py-2.5">
                <p className="text-[13px] font-semibold text-[var(--legacy-accent-gold)]">{item.fortressName}</p>
                <div className="mt-1.5 space-y-1 text-[11px] text-slate-300">
                  <p>{previousOwnerLabel}: {item.previousOwner || '-'}</p>
                  <p>{newOwnerLabel}: {item.newOwner || '-'}</p>
                  <p>{changedAtLabel}: {formatDateTime(item.changedAt, locale)}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function NewCharactersCard({
  title,
  label24h,
  label7d,
  created24h,
  created7d,
}: {
  title: string
  label24h: string
  label7d: string
  created24h: number | null
  created7d: number | null
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-[var(--legacy-panel-border)] bg-[var(--legacy-panel-bg)] text-slate-200">
      <PanelHeader
        title={title}
        icon={
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-6 1c-2.67 0-8 1.34-8 4v3h10v-3c0-1.13.39-2.15 1.03-3H9zM17 14v3h-3v2h3v3h2v-3h3v-2h-3v-3h-2z" />
          </svg>
        }
      />
      <div className="space-y-3 px-5 py-4">
        <article className="rounded border border-[var(--legacy-panel-border)] bg-[#15120f] px-4 py-3">
          <p className="text-[10px] uppercase tracking-widest text-slate-400">{label24h}</p>
          <p className="mt-1 text-[28px] font-bold leading-none text-[var(--legacy-accent-gold)]">{formatNumber(created24h)}</p>
        </article>
        <article className="rounded border border-[var(--legacy-panel-border)] bg-[#15120f] px-4 py-3">
          <p className="text-[10px] uppercase tracking-widest text-slate-400">{label7d}</p>
          <p className="mt-1 text-[28px] font-bold leading-none text-[var(--legacy-accent-gold)]">{formatNumber(created7d)}</p>
        </article>
      </div>
    </section>
  )
}

function ServiceStatusCard({
  title,
  gatewayLabel,
  loginLabel,
  shardLabel,
  billingLabel,
  updatedAtLabel,
  locale,
  data,
}: {
  title: string
  gatewayLabel: string
  loginLabel: string
  shardLabel: string
  billingLabel: string
  updatedAtLabel: string
  locale: string
  data: PublicHomeStats['serviceStatus']
}) {
  const rows: Array<[string, PublicHomeStats['serviceStatus']['gateway']]> = [
    [gatewayLabel, data.gateway],
    [loginLabel, data.login],
    [shardLabel, data.shard],
    [billingLabel, data.billing],
  ]

  return (
    <section className="overflow-hidden rounded-xl border border-[var(--legacy-panel-border)] bg-[var(--legacy-panel-bg)] text-slate-200">
      <PanelHeader
        title={title}
        icon={
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M13 2.05v2.02A8.001 8.001 0 0 1 19.93 11H22a10 10 0 0 0-9-8.95zM4.07 13H2a10 10 0 0 0 9 8.95v-2.02A8.001 8.001 0 0 1 4.07 13zM11 2C5.48 2 1 6.48 1 12s4.48 10 10 10 10-4.48 10-10S16.52 2 11 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
          </svg>
        }
      />
      <div className="space-y-2 px-5 py-4">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between rounded border border-[var(--legacy-panel-border)] bg-[#15120f] px-3 py-2">
            <span className="text-[12px] text-slate-300">{label}</span>
            <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusTone(value)}`}>
              {value}
            </span>
          </div>
        ))}

        <p className="pt-1 text-[10px] text-slate-500">
          {updatedAtLabel}: {formatDateTime(data.updatedAt, locale)}
        </p>
      </div>
    </section>
  )
}

function LoginQueueCard({
  title,
  queueLabel,
  waitLabel,
  queueSize,
  avgWaitSeconds,
}: {
  title: string
  queueLabel: string
  waitLabel: string
  queueSize: number | null
  avgWaitSeconds: number | null
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-[var(--legacy-panel-border)] bg-[var(--legacy-panel-bg)] text-slate-200">
      <PanelHeader
        title={title}
        icon={
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 1a9 9 0 0 0-9 9v5a3 3 0 0 0 3 3h1v-8H5v8h14v-8h-2v8h1a3 3 0 0 0 3-3v-5a9 9 0 0 0-9-9z" />
          </svg>
        }
      />
      <div className="space-y-3 px-5 py-4">
        <article className="rounded border border-[var(--legacy-panel-border)] bg-[#15120f] px-4 py-3">
          <p className="text-[10px] uppercase tracking-widest text-slate-400">{queueLabel}</p>
          <p className="mt-1 text-[28px] font-bold leading-none text-[var(--legacy-accent-gold)]">{formatNumber(queueSize)}</p>
        </article>
        <article className="rounded border border-[var(--legacy-panel-border)] bg-[#15120f] px-4 py-3">
          <p className="text-[10px] uppercase tracking-widest text-slate-400">{waitLabel}</p>
          <p className="mt-1 text-[28px] font-bold leading-none text-[var(--legacy-accent-gold)]">{formatSeconds(avgWaitSeconds)}</p>
        </article>
      </div>
    </section>
  )
}

function LoginSuccessCard({
  title,
  rateLabel,
  attemptsLabel,
  successRate1h,
  attempts1h,
}: {
  title: string
  rateLabel: string
  attemptsLabel: string
  successRate1h: number | null
  attempts1h: number | null
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-[var(--legacy-panel-border)] bg-[var(--legacy-panel-bg)] text-slate-200">
      <PanelHeader
        title={title}
        icon={
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M16 6l2.29 2.29-4.88 4.88-3-3L4 16.59 5.41 18l5.59-5.59 3 3L19.71 9.7 22 12V6z" />
          </svg>
        }
      />
      <div className="space-y-3 px-5 py-4">
        <article className="rounded border border-[var(--legacy-panel-border)] bg-[#15120f] px-4 py-3">
          <p className="text-[10px] uppercase tracking-widest text-slate-400">{rateLabel}</p>
          <p className="mt-1 text-[28px] font-bold leading-none text-[var(--legacy-accent-gold)]">{formatPercent(successRate1h)}</p>
        </article>
        <article className="rounded border border-[var(--legacy-panel-border)] bg-[#15120f] px-4 py-3">
          <p className="text-[10px] uppercase tracking-widest text-slate-400">{attemptsLabel}</p>
          <p className="mt-1 text-[28px] font-bold leading-none text-[var(--legacy-accent-gold)]">{formatNumber(attempts1h)}</p>
        </article>
      </div>
    </section>
  )
}

function UptimeCard({
  title,
  label24h,
  label7d,
  uptime24h,
  uptime7d,
}: {
  title: string
  label24h: string
  label7d: string
  uptime24h: number | null
  uptime7d: number | null
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-[var(--legacy-panel-border)] bg-[var(--legacy-panel-bg)] text-slate-200">
      <PanelHeader
        title={title}
        icon={
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1 15-4-4 1.41-1.41L11 13.17l4.59-4.58L17 10l-6 6z" />
          </svg>
        }
      />
      <div className="space-y-3 px-5 py-4">
        <article className="rounded border border-[var(--legacy-panel-border)] bg-[#15120f] px-4 py-3">
          <p className="text-[10px] uppercase tracking-widest text-slate-400">{label24h}</p>
          <p className="mt-1 text-[28px] font-bold leading-none text-[var(--legacy-accent-gold)]">{formatPercent(uptime24h)}</p>
        </article>
        <article className="rounded border border-[var(--legacy-panel-border)] bg-[#15120f] px-4 py-3">
          <p className="text-[10px] uppercase tracking-widest text-slate-400">{label7d}</p>
          <p className="mt-1 text-[28px] font-bold leading-none text-[var(--legacy-accent-gold)]">{formatPercent(uptime7d)}</p>
        </article>
      </div>
    </section>
  )
}

function ServiceLatencyCard({
  title,
  gatewayLabel,
  loginLabel,
  shardLabel,
  billingLabel,
  updatedAtLabel,
  locale,
  data,
}: {
  title: string
  gatewayLabel: string
  loginLabel: string
  shardLabel: string
  billingLabel: string
  updatedAtLabel: string
  locale: string
  data: PublicHomeStats['serviceLatency']
}) {
  const rows: Array<[string, number | null]> = [
    [gatewayLabel, data.gatewayMs],
    [loginLabel, data.loginMs],
    [shardLabel, data.shardMs],
    [billingLabel, data.billingMs],
  ]

  return (
    <section className="overflow-hidden rounded-xl border border-[var(--legacy-panel-border)] bg-[var(--legacy-panel-bg)] text-slate-200">
      <PanelHeader
        title={title}
        icon={
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M3 17h2.59L9 7l4 10 3-6 2.59 6H21v2h-3.59L16 13l-3 6-4-10-1.41 8H3z" />
          </svg>
        }
      />
      <div className="space-y-2 px-5 py-4">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between rounded border border-[var(--legacy-panel-border)] bg-[#15120f] px-3 py-2">
            <span className="text-[12px] text-slate-300">{label}</span>
            <span className="text-[12px] font-semibold text-[var(--legacy-accent-gold)]">{formatLatency(value)}</span>
          </div>
        ))}
        <p className="pt-1 text-[10px] text-slate-500">
          {updatedAtLabel}: {formatDateTime(data.updatedAt, locale)}
        </p>
      </div>
    </section>
  )
}

function ActiveEventsCard({
  title,
  startsAtLabel,
  endsAtLabel,
  emptyLabel,
  locale,
  items,
}: {
  title: string
  startsAtLabel: string
  endsAtLabel: string
  emptyLabel: string
  locale: string
  items: PublicHomeStats['activeEvents']
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-[var(--legacy-panel-border)] bg-[var(--legacy-panel-bg)] text-slate-200">
      <PanelHeader
        title={title}
        icon={
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M19 3h-1V1h-2v2H8V1H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 16H5V10h14zm0-11H5V5h14z" />
          </svg>
        }
      />
      <div className="px-5 py-4">
        {items.length === 0 ? (
          <p className="rounded border border-[var(--legacy-panel-border)] bg-[#15120f] px-4 py-4 text-center text-[12px] text-slate-400">{emptyLabel}</p>
        ) : (
          <div className="space-y-2.5">
            {items.map((item, index) => (
              <article key={`${item.eventName}-${item.startsAt ?? index}`} className="rounded border border-[var(--legacy-panel-border)] bg-[#15120f] px-3 py-2.5">
                <p className="text-[13px] font-semibold text-[var(--legacy-accent-gold)]">{item.eventName}</p>
                <div className="mt-1.5 space-y-1 text-[11px] text-slate-300">
                  <p>{startsAtLabel}: {formatDateTime(item.startsAt, locale)}</p>
                  <p>{endsAtLabel}: {formatDateTime(item.endsAt, locale)}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function RetentionCard({
  title,
  d1Label,
  d7Label,
  cohortLabel,
  retentionD1,
  retentionD7,
  cohort7d,
}: {
  title: string
  d1Label: string
  d7Label: string
  cohortLabel: string
  retentionD1: number | null
  retentionD7: number | null
  cohort7d: number | null
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-[var(--legacy-panel-border)] bg-[var(--legacy-panel-bg)] text-slate-200">
      <PanelHeader
        title={title}
        icon={
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.98 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
          </svg>
        }
      />
      <div className="space-y-3 px-5 py-4">
        <article className="rounded border border-[var(--legacy-panel-border)] bg-[#15120f] px-4 py-3">
          <p className="text-[10px] uppercase tracking-widest text-slate-400">{d1Label}</p>
          <p className="mt-1 text-[28px] font-bold leading-none text-[var(--legacy-accent-gold)]">{formatPercent(retentionD1)}</p>
        </article>
        <article className="rounded border border-[var(--legacy-panel-border)] bg-[#15120f] px-4 py-3">
          <p className="text-[10px] uppercase tracking-widest text-slate-400">{d7Label}</p>
          <p className="mt-1 text-[28px] font-bold leading-none text-[var(--legacy-accent-gold)]">{formatPercent(retentionD7)}</p>
        </article>
        <article className="rounded border border-[var(--legacy-panel-border)] bg-[#15120f] px-4 py-3">
          <p className="text-[10px] uppercase tracking-widest text-slate-400">{cohortLabel}</p>
          <p className="mt-1 text-[28px] font-bold leading-none text-[var(--legacy-accent-gold)]">{formatNumber(cohort7d)}</p>
        </article>
      </div>
    </section>
  )
}

function LevelDistributionCard({
  title,
  playersLabel,
  emptyLabel,
  items,
}: {
  title: string
  playersLabel: string
  emptyLabel: string
  items: PublicHomeStats['levelDistribution']
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-[var(--legacy-panel-border)] bg-[var(--legacy-panel-bg)] text-slate-200">
      <PanelHeader
        title={title}
        icon={
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M3 17h2v-7H3v7zm4 0h2V7H7v10zm4 0h2v-4h-2v4zm4 0h2V4h-2v13zm4 0h2v-9h-2v9z" />
          </svg>
        }
      />
      <div className="px-5 py-4">
        {items.length === 0 ? (
          <p className="rounded border border-[var(--legacy-panel-border)] bg-[#15120f] px-4 py-4 text-center text-[12px] text-slate-400">{emptyLabel}</p>
        ) : (
          <div className="space-y-2.5">
            {items.map((item) => (
              <article key={item.rangeLabel} className="flex items-center justify-between rounded border border-[var(--legacy-panel-border)] bg-[#15120f] px-3 py-2.5">
                <p className="text-[13px] font-semibold text-[var(--legacy-accent-gold)]">{item.rangeLabel}</p>
                <p className="text-[12px] text-slate-200">{playersLabel}: {item.players.toLocaleString()}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function SilkConsumptionCard({
  title,
  label24h,
  label7d,
  consumed24h,
  consumed7d,
}: {
  title: string
  label24h: string
  label7d: string
  consumed24h: number | null
  consumed7d: number | null
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-[var(--legacy-panel-border)] bg-[var(--legacy-panel-bg)] text-slate-200">
      <PanelHeader
        title={title}
        icon={
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M3 6h18v2H3zm2 4h14v8H5zm4 2v4h2v-4zm4 0v4h2v-4z" />
          </svg>
        }
      />
      <div className="space-y-3 px-5 py-4">
        <article className="rounded border border-[var(--legacy-panel-border)] bg-[#15120f] px-4 py-3">
          <p className="text-[10px] uppercase tracking-widest text-slate-400">{label24h}</p>
          <p className="mt-1 text-[28px] font-bold leading-none text-[var(--legacy-accent-gold)]">{formatNumber(consumed24h)}</p>
        </article>
        <article className="rounded border border-[var(--legacy-panel-border)] bg-[#15120f] px-4 py-3">
          <p className="text-[10px] uppercase tracking-widest text-slate-400">{label7d}</p>
          <p className="mt-1 text-[28px] font-bold leading-none text-[var(--legacy-accent-gold)]">{formatNumber(consumed7d)}</p>
        </article>
      </div>
    </section>
  )
}

function DauWauCard({
  title,
  dauLabel,
  wauLabel,
  ratioLabel,
  dau,
  wau,
  ratio,
}: {
  title: string
  dauLabel: string
  wauLabel: string
  ratioLabel: string
  dau: number | null
  wau: number | null
  ratio: number | null
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-[var(--legacy-panel-border)] bg-[var(--legacy-panel-bg)] text-slate-200">
      <PanelHeader
        title={title}
        icon={
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M4 20h16v-2H4zm1-4h3v-5H5zm5 0h3V8h-3zm5 0h3V4h-3z" />
          </svg>
        }
      />
      <div className="space-y-3 px-5 py-4">
        <article className="rounded border border-[var(--legacy-panel-border)] bg-[#15120f] px-4 py-3">
          <p className="text-[10px] uppercase tracking-widest text-slate-400">{dauLabel}</p>
          <p className="mt-1 text-[28px] font-bold leading-none text-[var(--legacy-accent-gold)]">{formatNumber(dau)}</p>
        </article>
        <article className="rounded border border-[var(--legacy-panel-border)] bg-[#15120f] px-4 py-3">
          <p className="text-[10px] uppercase tracking-widest text-slate-400">{wauLabel}</p>
          <p className="mt-1 text-[28px] font-bold leading-none text-[var(--legacy-accent-gold)]">{formatNumber(wau)}</p>
        </article>
        <article className="rounded border border-[var(--legacy-panel-border)] bg-[#15120f] px-4 py-3">
          <p className="text-[10px] uppercase tracking-widest text-slate-400">{ratioLabel}</p>
          <p className="mt-1 text-[28px] font-bold leading-none text-[var(--legacy-accent-gold)]">{ratio === null ? '—' : formatPercent(ratio * 100)}</p>
        </article>
      </div>
    </section>
  )
}

function NewPlayerConversionCard({
  title,
  createdLabel,
  firstLoginLabel,
  firstCharacterLabel,
  loginRateLabel,
  characterRateLabel,
  created,
  firstLogin,
  firstCharacter,
}: {
  title: string
  createdLabel: string
  firstLoginLabel: string
  firstCharacterLabel: string
  loginRateLabel: string
  characterRateLabel: string
  created: number | null
  firstLogin: number | null
  firstCharacter: number | null
}) {
  const loginRate = created && created > 0 && firstLogin != null ? (firstLogin / created) * 100 : null
  const characterRate = created && created > 0 && firstCharacter != null ? (firstCharacter / created) * 100 : null

  return (
    <section className="overflow-hidden rounded-xl border border-[var(--legacy-panel-border)] bg-[var(--legacy-panel-bg)] text-slate-200">
      <PanelHeader
        title={title}
        icon={
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 12c2.76 0 5-2.24 5-5S14.76 2 12 2 7 4.24 7 7s2.24 5 5 5zm0 2c-3.87 0-7 2.24-7 5v1h14v-1c0-2.76-3.13-5-7-5z" />
          </svg>
        }
      />
      <div className="space-y-2.5 px-5 py-4">
        <article className="rounded border border-[var(--legacy-panel-border)] bg-[#15120f] px-3 py-2.5">
          <p className="text-[11px] text-slate-400">{createdLabel}</p>
          <p className="text-[18px] font-semibold text-[var(--legacy-accent-gold)]">{formatNumber(created)}</p>
        </article>
        <article className="rounded border border-[var(--legacy-panel-border)] bg-[#15120f] px-3 py-2.5">
          <p className="text-[11px] text-slate-400">{firstLoginLabel}</p>
          <p className="text-[18px] font-semibold text-[var(--legacy-accent-gold)]">{formatNumber(firstLogin)}</p>
          <p className="text-[11px] text-slate-400">{loginRateLabel}: {formatPercent(loginRate)}</p>
        </article>
        <article className="rounded border border-[var(--legacy-panel-border)] bg-[#15120f] px-3 py-2.5">
          <p className="text-[11px] text-slate-400">{firstCharacterLabel}</p>
          <p className="text-[18px] font-semibold text-[var(--legacy-accent-gold)]">{formatNumber(firstCharacter)}</p>
          <p className="text-[11px] text-slate-400">{characterRateLabel}: {formatPercent(characterRate)}</p>
        </article>
      </div>
    </section>
  )
}

function JobDistributionCard({
  title,
  playersLabel,
  emptyLabel,
  items,
}: {
  title: string
  playersLabel: string
  emptyLabel: string
  items: PublicHomeStats['jobDistribution']
}) {
  const total = items.reduce((sum, item) => sum + item.players, 0)

  return (
    <section className="overflow-hidden rounded-xl border border-[var(--legacy-panel-border)] bg-[var(--legacy-panel-bg)] text-slate-200">
      <PanelHeader
        title={title}
        icon={
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2 2 7l10 5 8-4v6h2V7L12 2zm-8 9v6l8 5 8-5v-6l-8 4-8-4z" />
          </svg>
        }
      />
      <div className="px-5 py-4">
        {items.length === 0 ? (
          <p className="rounded border border-[var(--legacy-panel-border)] bg-[#15120f] px-4 py-4 text-center text-[12px] text-slate-400">{emptyLabel}</p>
        ) : (
          <div className="space-y-2.5">
            {items.map((item) => {
              const percent = total > 0 ? (item.players / total) * 100 : null
              return (
                <article key={item.jobName} className="rounded border border-[var(--legacy-panel-border)] bg-[#15120f] px-3 py-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-[var(--legacy-accent-gold)]">{item.jobName}</p>
                    <p className="text-[11px] text-slate-300">{formatPercent(percent)}</p>
                  </div>
                  <p className="mt-1 text-[12px] text-slate-200">{playersLabel}: {item.players.toLocaleString()}</p>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

export function HomeClient({ latestNews, serverTimeZone = 'UTC', serverInfo, rankingData, uniqueSpawns, publicStats }: HomeClientProps) {
  const { messages, locale } = useI18n()
  const allNews = latestNews ?? messages.home.featuredNews

  return (
    <SiteContainer>
      {/* ── Top hero banner ─────────────────────────────────────────── */}
      <div
        className="relative mb-0 h-[320px] w-full overflow-hidden rounded-t-xl border border-b-0 border-[var(--legacy-panel-border)]"
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
        {/* Bottom fade blur */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24"
          style={{ background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.92) 100%)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', maskImage: 'linear-gradient(to bottom, transparent 0%, black 60%)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 60%)' }}
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
            <img src="/legacy/img/001.png" alt="banner" className="w-full object-cover object-top" />
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
          <SilkroadClock serverTimeZone={serverTimeZone} />
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

          {/* Server Info widget */}
          {serverInfo && (
            <Link href="/game-info/server-info" className="block px-3 py-3 transition hover:bg-slate-800/30">
              <p className="mb-2 text-center text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--legacy-accent-gold)]">
                {messages.serverInfo.panelTitle}
              </p>
              <dl className="space-y-1.5">
                {([
                  [messages.serverInfo.race,         serverInfo.race],
                  [messages.serverInfo.cap,           serverInfo.cap],
                  [messages.serverInfo.mastery,       serverInfo.mastery],
                  [messages.serverInfo.expRate,       serverInfo.expRate],
                  [messages.serverInfo.partyExpRate,  serverInfo.partyExpRate],
                  [messages.serverInfo.questExpRate,  serverInfo.questExpRate],
                  [messages.serverInfo.hwidLimit,     serverInfo.hwidLimit],
                  [messages.serverInfo.ipLimit,       serverInfo.ipLimit],
                  [messages.serverInfo.botDetect,     serverInfo.botDetect],
                  ...(serverInfo.registeredAccounts !== null
                    ? [[messages.serverInfo.registeredAccounts, serverInfo.registeredAccounts.toLocaleString()]]
                    : []),
                ] as [string, string][]).map(([label, val]) => (
                  <div key={label} className="flex items-start justify-between gap-1">
                    <dt className="text-[9px] uppercase tracking-wide text-slate-500 leading-snug">{label}</dt>
                    <dd className="text-right text-[10px] font-semibold text-slate-200 leading-snug max-w-[90px]">{val}</dd>
                  </div>
                ))}
              </dl>
            </Link>
          )}

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

      {/* ── Event Schedule + Ranking ─────────────────────────────────── */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Event Schedule */}
        <div className="overflow-hidden rounded-xl border border-[var(--legacy-panel-border)] bg-[var(--legacy-panel-bg)] text-slate-200">
          <PanelHeader
            title={messages.home.eventScheduleTitle}
            icon={
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M6 2v6l4 4-4 4v6h12v-6l-4-4 4-4V2H6zm10 14.5V20H8v-3.5l4-4 4 4zm-4-5-4-4V4h8v3.5l-4 4z" />
              </svg>
            }
          />
          <EventSchedule labels={messages.home.events} />
        </div>

        {/* Game Ranking */}
        <div className="overflow-hidden rounded-xl border border-[var(--legacy-panel-border)] bg-[var(--legacy-panel-bg)] text-slate-200">
          <PanelHeader
            title={messages.home.rankingTitle}
            icon={
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
              </svg>
            }
          />
          {rankingData ? (
            <GameRanking
              data={rankingData}
              labels={{
                player: messages.home.rankingPlayer,
                guild: messages.home.rankingGuild,
                colChar: messages.home.rankingColChar,
                colGuild: messages.home.rankingColGuild,
                colPoints: messages.home.rankingColPoints,
                colMembers: messages.home.rankingColMembers,
                colMaster: messages.home.rankingColMaster,
                empty: messages.home.rankingEmpty,
              }}
            />
          ) : (
            <div className="px-5 py-4 text-center text-[12px] text-[#7a7060]">{messages.home.rankingEmpty}</div>
          )}
        </div>
      </div>

      <div className="mt-6">
        <LastUniqueSpawnCard
          title={messages.home.lastUniqueSpawnTitle}
          killedByLabel={messages.home.killedBy}
          items={uniqueSpawns ?? []}
        />
      </div>

      <div className="home-stats-grid mt-6 grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <PublicOnlineCard
            title={messages.home.onlineTitle}
            onlineLabel={messages.home.onlineNowLabel}
            peakLabel={messages.home.onlinePeak24hLabel}
            onlineNow={publicStats?.online.onlineNow ?? null}
            peak24h={publicStats?.online.peak24h ?? null}
          />
        </div>
        <div className="lg:col-span-1">
          <PublicTopJobCard
            title={messages.home.topJobTitle}
            jobLabel={messages.home.jobLabel}
            scoreLabel={messages.home.scoreLabel}
            emptyLabel={messages.home.publicDataEmpty}
            items={publicStats?.topJobs ?? []}
          />
        </div>
        <div className="lg:col-span-1">
          <PublicFortressCard
            title={messages.home.fortressTitle}
            ownerLabel={messages.home.fortressOwnerLabel}
            siegeLabel={messages.home.fortressNextSiegeLabel}
            taxLabel={messages.home.fortressTaxLabel}
            emptyLabel={messages.home.publicDataEmpty}
            items={publicStats?.fortresses ?? []}
            locale={locale}
          />
        </div>
      </div>

      <div className="home-stats-grid mt-6 grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <SpawnTrackerCard
            title={messages.home.spawnTrackerTitle}
            lastKillLabel={messages.home.spawnLastKillLabel}
            nextSpawnLabel={messages.home.spawnNextLabel}
            emptyLabel={messages.home.publicDataEmpty}
            locale={locale}
            items={publicStats?.spawnTracker ?? []}
          />
        </div>
        <div className="lg:col-span-1">
          <FortressTimelineCard
            title={messages.home.fortressTimelineTitle}
            previousOwnerLabel={messages.home.fortressPrevOwnerLabel}
            newOwnerLabel={messages.home.fortressNewOwnerLabel}
            changedAtLabel={messages.home.fortressChangedAtLabel}
            emptyLabel={messages.home.publicDataEmpty}
            locale={locale}
            items={publicStats?.fortressTimeline ?? []}
          />
        </div>
        <div className="lg:col-span-1">
          <NewCharactersCard
            title={messages.home.newCharactersTitle}
            label24h={messages.home.newCharacters24hLabel}
            label7d={messages.home.newCharacters7dLabel}
            created24h={publicStats?.newCharacters.created24h ?? null}
            created7d={publicStats?.newCharacters.created7d ?? null}
          />
        </div>
      </div>

      <div className="home-stats-grid mt-6 grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <ServiceStatusCard
            title={messages.home.serviceStatusTitle}
            gatewayLabel={messages.home.serviceGatewayLabel}
            loginLabel={messages.home.serviceLoginLabel}
            shardLabel={messages.home.serviceShardLabel}
            billingLabel={messages.home.serviceBillingLabel}
            updatedAtLabel={messages.home.serviceUpdatedAtLabel}
            locale={locale}
            data={publicStats?.serviceStatus ?? {
              gateway: 'unknown',
              login: 'unknown',
              shard: 'unknown',
              billing: 'unknown',
              updatedAt: null,
            }}
          />
        </div>
        <div className="lg:col-span-1">
          <LoginQueueCard
            title={messages.home.loginQueueTitle}
            queueLabel={messages.home.loginQueueSizeLabel}
            waitLabel={messages.home.loginQueueWaitLabel}
            queueSize={publicStats?.loginQueue.queueSize ?? null}
            avgWaitSeconds={publicStats?.loginQueue.avgWaitSeconds ?? null}
          />
        </div>
        <div className="lg:col-span-1">
          <LoginSuccessCard
            title={messages.home.loginSuccessTitle}
            rateLabel={messages.home.loginSuccessRateLabel}
            attemptsLabel={messages.home.loginSuccessAttemptsLabel}
            successRate1h={publicStats?.loginSuccess.successRate1h ?? null}
            attempts1h={publicStats?.loginSuccess.attempts1h ?? null}
          />
        </div>
      </div>

      <div className="home-stats-grid mt-6 grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <UptimeCard
            title={messages.home.uptimeTitle}
            label24h={messages.home.uptime24hLabel}
            label7d={messages.home.uptime7dLabel}
            uptime24h={publicStats?.uptime.uptime24h ?? null}
            uptime7d={publicStats?.uptime.uptime7d ?? null}
          />
        </div>
        <div className="lg:col-span-1">
          <ServiceLatencyCard
            title={messages.home.serviceLatencyTitle}
            gatewayLabel={messages.home.serviceGatewayLabel}
            loginLabel={messages.home.serviceLoginLabel}
            shardLabel={messages.home.serviceShardLabel}
            billingLabel={messages.home.serviceBillingLabel}
            updatedAtLabel={messages.home.serviceUpdatedAtLabel}
            locale={locale}
            data={publicStats?.serviceLatency ?? {
              gatewayMs: null,
              loginMs: null,
              shardMs: null,
              billingMs: null,
              updatedAt: null,
            }}
          />
        </div>
        <div className="lg:col-span-1">
          <ActiveEventsCard
            title={messages.home.activeEventsTitle}
            startsAtLabel={messages.home.activeEventStartsLabel}
            endsAtLabel={messages.home.activeEventEndsLabel}
            emptyLabel={messages.home.publicDataEmpty}
            locale={locale}
            items={publicStats?.activeEvents ?? []}
          />
        </div>
      </div>

      <div className="home-stats-grid mt-6 grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <RetentionCard
            title={messages.home.retentionTitle}
            d1Label={messages.home.retentionD1Label}
            d7Label={messages.home.retentionD7Label}
            cohortLabel={messages.home.retentionCohortLabel}
            retentionD1={publicStats?.retention.retentionD1 ?? null}
            retentionD7={publicStats?.retention.retentionD7 ?? null}
            cohort7d={publicStats?.retention.cohort7d ?? null}
          />
        </div>
        <div className="lg:col-span-1">
          <LevelDistributionCard
            title={messages.home.levelDistributionTitle}
            playersLabel={messages.home.playersLabel}
            emptyLabel={messages.home.publicDataEmpty}
            items={publicStats?.levelDistribution ?? []}
          />
        </div>
        <div className="lg:col-span-1">
          <SilkConsumptionCard
            title={messages.home.silkConsumptionTitle}
            label24h={messages.home.silkConsumption24hLabel}
            label7d={messages.home.silkConsumption7dLabel}
            consumed24h={publicStats?.silkConsumption.consumed24h ?? null}
            consumed7d={publicStats?.silkConsumption.consumed7d ?? null}
          />
        </div>
      </div>

      <div className="home-stats-grid mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <DauWauCard
          title={messages.home.dauWauTitle}
          dauLabel={messages.home.dauLabel}
          wauLabel={messages.home.wauLabel}
          ratioLabel={messages.home.dauWauRatioLabel}
          dau={publicStats?.dauWau.dau ?? null}
          wau={publicStats?.dauWau.wau ?? null}
          ratio={publicStats?.dauWau.dauWauRatio ?? null}
        />
        <NewPlayerConversionCard
          title={messages.home.newPlayerConversionTitle}
          createdLabel={messages.home.newAccounts24hLabel}
          firstLoginLabel={messages.home.firstLogin24hLabel}
          firstCharacterLabel={messages.home.firstCharacter24hLabel}
          loginRateLabel={messages.home.firstLoginRateLabel}
          characterRateLabel={messages.home.firstCharacterRateLabel}
          created={publicStats?.newPlayerConversion.created24h ?? null}
          firstLogin={publicStats?.newPlayerConversion.firstLogin24h ?? null}
          firstCharacter={publicStats?.newPlayerConversion.firstCharacter24h ?? null}
        />
        <JobDistributionCard
          title={messages.home.jobDistributionTitle}
          playersLabel={messages.home.playersLabel}
          emptyLabel={messages.home.publicDataEmpty}
          items={publicStats?.jobDistribution ?? []}
        />
      </div>
    </SiteContainer>
  )
}
