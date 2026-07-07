import type { Metadata } from 'next'
import { cookies } from 'next/headers'

import { I18N_COOKIE_NAME, defaultLocale, isLocale } from '@/lib/i18n'
import { getLatestNewsFromDb } from '@/lib/news'
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

export default async function HomePage() {
  const cookieStore = await cookies()
  const localeFromCookie = cookieStore.get(I18N_COOKIE_NAME)?.value
  const locale = isLocale(localeFromCookie) ? localeFromCookie : defaultLocale
  const latestNews = await getLatestNewsFromDb({ locale, limit: 3 })

  return <HomeClient latestNews={latestNews ?? undefined} />
}
