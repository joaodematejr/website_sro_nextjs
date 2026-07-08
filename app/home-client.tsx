'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { useI18n } from '@/components/providers/i18n-provider'
import { SiteContainer } from '@/components/site/container'
import type { NewsItem } from '@/lib/news'
import type { RankingData } from '@/lib/rankings'
import type { ServerInfo } from '@/lib/server-info'

export type HomeClientProps = {
  latestNews?: NewsItem[]
  serverTimeZone?: string
  serverInfo?: ServerInfo
  rankingData?: RankingData
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

export function HomeClient({ latestNews, serverTimeZone = 'UTC', serverInfo, rankingData }: HomeClientProps) {
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
    </SiteContainer>
  )
}
