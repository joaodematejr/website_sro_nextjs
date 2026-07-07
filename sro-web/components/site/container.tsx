import type { ReactNode } from 'react'

import { SiteFooter } from './footer'
import { SiteHeader } from './header'

type SiteContainerProps = {
  children: ReactNode
}

export function SiteContainer({ children }: SiteContainerProps) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#1b2b4c,#020617_45%,#020617)] text-slate-100">
      <SiteHeader />
      <main className="mx-auto w-full max-w-[var(--legacy-shell-max)] px-4 py-10 sm:px-6">{children}</main>
      <SiteFooter />
    </div>
  )
}
