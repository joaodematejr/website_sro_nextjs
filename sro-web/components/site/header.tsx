'use client'

import Link from 'next/link'

import { locales } from '@/lib/i18n'
import { useI18n } from '@/components/providers/i18n-provider'

type NavChild = {
  href: string
  label: string
  external?: boolean
}

type NavSection = {
  label: string
  href?: string
  children?: NavChild[]
}

const navSections: NavSection[] = [
  { label: 'Inicio', href: '/' },
  { label: 'Guia', href: 'https://srowiki.digeam.com/' },
  {
    label: 'Download',
    children: [{ href: '/download', label: 'Baixar Jogo' }],
  },
  {
    label: 'Comunidade',
    children: [
      { href: 'https://discord.com/', label: 'Discord', external: true },
      { href: 'https://www.facebook.com/', label: 'Facebook', external: true },
    ],
  },
  {
    label: 'Membro',
    children: [
      { href: '/member/register', label: 'Cadastro' },
      { href: '/member/reset-password', label: 'Redefinir Senha' },
      { href: '/member/charge-center', label: 'Central de Recarga' },
    ],
  },
]

export function SiteHeader() {
  const { locale, messages, setLocale } = useI18n()

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--legacy-panel-border)] bg-[var(--legacy-navbar-bg)] backdrop-blur">
      <div className="mx-auto flex min-h-[var(--legacy-nav-height)] w-full max-w-[var(--legacy-shell-max)] items-center justify-between px-4 py-2 sm:px-6">
        <Link href="/" className="inline-flex items-center">
          <img src="/legacy/img/logo.png" alt="SRO Web" className="h-10 w-auto" />
        </Link>

        <nav className="hidden items-center gap-2 lg:flex">
          {navSections.map((section) => {
            const label =
              section.label === 'Inicio'
                ? messages.header.home
                : section.label === 'Guia'
                  ? messages.header.guide
                  : section.label === 'Download'
                    ? messages.header.download
                    : section.label === 'Comunidade'
                      ? messages.header.community
                      : messages.header.member

            if (section.children?.length) {
              return (
                <div key={section.label} className="group relative">
                  <button
                    type="button"
                    className="rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-200 transition hover:bg-slate-800 hover:text-[var(--legacy-accent-gold-hover)]"
                  >
                    {label}
                  </button>
                  <div className="invisible absolute right-0 top-full z-40 mt-1 min-w-48 rounded-lg border border-slate-700 bg-slate-950/95 p-2 opacity-0 shadow-xl transition-all group-hover:visible group-hover:opacity-100">
                    {section.children.map((child) => {
                      const childLabel =
                        child.label === 'Baixar Jogo'
                          ? messages.header.gameDownload
                          : child.label === 'Cadastro'
                            ? messages.header.register
                            : child.label === 'Redefinir Senha'
                              ? messages.header.resetPassword
                              : child.label === 'Central de Recarga'
                                ? messages.header.chargeCenter
                                : child.label

                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          target={child.external ? '_blank' : undefined}
                          rel={child.external ? 'noreferrer' : undefined}
                          className="block rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:bg-slate-800 hover:text-[var(--legacy-accent-gold-hover)]"
                        >
                          {childLabel}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )
            }

            return (
              <Link
                key={section.label}
                href={section.href ?? '/'}
                target={section.href?.startsWith('http') ? '_blank' : undefined}
                rel={section.href?.startsWith('http') ? 'noreferrer' : undefined}
                className="rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-200 transition hover:bg-slate-800 hover:text-[var(--legacy-accent-gold-hover)]"
              >
                {label}
              </Link>
            )
          })}
          <Link
            href="/actuator/health"
            className="rounded-md border border-slate-700 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-200 transition hover:border-[var(--legacy-accent-gold)] hover:text-[var(--legacy-accent-gold-hover)]"
          >
            {messages.header.health}
          </Link>
          <label className="inline-flex items-center gap-2 rounded-md border border-slate-700 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-200">
            <span>{messages.header.language}</span>
            <select
              value={locale}
              onChange={(event) => setLocale(event.target.value as (typeof locales)[number])}
              className="bg-transparent text-[11px] font-semibold text-slate-100 outline-none"
            >
              {locales.map((item) => (
                <option key={item} value={item} className="bg-slate-900 text-slate-100">
                  {item}
                </option>
              ))}
            </select>
          </label>
        </nav>
      </div>

      <div className="border-t border-slate-800/70 px-4 py-2 lg:hidden sm:px-6">
        <div className="flex flex-wrap gap-2">
          {navSections.map((section) => {
            const label =
              section.label === 'Inicio'
                ? messages.header.home
                : section.label === 'Guia'
                  ? messages.header.guide
                  : section.label === 'Download'
                    ? messages.header.download
                    : section.label === 'Comunidade'
                      ? messages.header.community
                      : messages.header.member

            if (section.children?.length) {
              return section.children.map((child) => {
                const childLabel =
                  child.label === 'Baixar Jogo'
                    ? messages.header.gameDownload
                    : child.label === 'Cadastro'
                      ? messages.header.register
                      : child.label === 'Central de Recarga'
                        ? messages.header.chargeCenter
                        : child.label

                return (
                  <Link
                    key={`${section.label}-${child.href}`}
                    href={child.href}
                    target={child.external ? '_blank' : undefined}
                    rel={child.external ? 'noreferrer' : undefined}
                    className="rounded-md border border-slate-700 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-200 transition hover:border-[var(--legacy-accent-gold)] hover:text-[var(--legacy-accent-gold-hover)]"
                  >
                    {childLabel}
                  </Link>
                )
              })
            }

            return (
              <Link
                key={section.label}
                href={section.href ?? '/'}
                target={section.href?.startsWith('http') ? '_blank' : undefined}
                rel={section.href?.startsWith('http') ? 'noreferrer' : undefined}
                className="rounded-md border border-slate-700 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-200 transition hover:border-[var(--legacy-accent-gold)] hover:text-[var(--legacy-accent-gold-hover)]"
              >
                {label}
              </Link>
            )
          })}
          <Link
            href="/actuator/health"
            className="rounded-md border border-slate-700 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-200 transition hover:border-[var(--legacy-accent-gold)] hover:text-[var(--legacy-accent-gold-hover)]"
          >
            {messages.header.health}
          </Link>
          <label className="inline-flex items-center gap-2 rounded-md border border-slate-700 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-200">
            <span>{messages.header.language}</span>
            <select
              value={locale}
              onChange={(event) => setLocale(event.target.value as (typeof locales)[number])}
              className="bg-transparent text-[11px] font-semibold text-slate-100 outline-none"
            >
              {locales.map((item) => (
                <option key={item} value={item} className="bg-slate-900 text-slate-100">
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </header>
  )
}
