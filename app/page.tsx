import type { Metadata } from 'next'
import { cookies } from 'next/headers'

import { I18N_COOKIE_NAME, defaultLocale, isLocale } from '@/lib/i18n'
import { getLatestNewsFromDb } from '@/lib/news'
import { getRankingData } from '@/lib/rankings'
import { getServerInfo } from '@/lib/server-info'
import { getLastUniqueSpawns } from '@/lib/unique-spawns'
import { HomeClient } from './home-client'

export const metadata: Metadata = {
  title: 'Inicio',
  description: 'Acompanhe as ultimas noticias e acesse as principais areas do portal Silkroad Online.',
  openGraph: {
    title: 'Silkroad Online',
    description: 'Acompanhe as ultimas noticias e acesse as principais areas do portal Silkroad Online.',
    images: ['/legacy/img/homebk22.png'],
  },
  twitter: {
    title: 'Silkroad Online',
    description: 'Acompanhe as ultimas noticias e acesse as principais areas do portal Silkroad Online.',
    images: ['/legacy/img/homebk22.png'],
  },
}

export const revalidate = 60

export default async function HomePage() {
  const cookieStore = await cookies()
  const localeFromCookie = cookieStore.get(I18N_COOKIE_NAME)?.value
  const locale = isLocale(localeFromCookie) ? localeFromCookie : defaultLocale

  const [latestNews, serverInfo, rankingData, uniqueSpawns] = await Promise.all([
    getLatestNewsFromDb({ locale, limit: 3 }),
    getServerInfo(),
    getRankingData(),
    getLastUniqueSpawns(locale, 12),
  ])

  const serverTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

  return (
    <HomeClient
      latestNews={latestNews ?? undefined}
      serverTimeZone={serverTimeZone}
      serverInfo={serverInfo}
      rankingData={rankingData}
      uniqueSpawns={uniqueSpawns}
    />
  )
}
