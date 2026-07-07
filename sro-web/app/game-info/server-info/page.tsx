import type { Metadata } from 'next'
import { cookies } from 'next/headers'

import { I18N_COOKIE_NAME, defaultLocale, isLocale, i18nMessages } from '@/lib/i18n'
import { getServerInfo } from '@/lib/server-info'
import { ServerInfoClient } from './server-info-client'

export const metadata: Metadata = {
  title: 'Server Information',
  description: 'Informacoes detalhadas sobre as configuracoes do servidor Silkroad Online.',
}

export const revalidate = 60

export default async function ServerInfoPage() {
  const cookieStore = await cookies()
  const localeFromCookie = cookieStore.get(I18N_COOKIE_NAME)?.value
  const locale = isLocale(localeFromCookie) ? localeFromCookie : defaultLocale
  const messages = i18nMessages[locale].serverInfo

  const info = await getServerInfo()

  return <ServerInfoClient info={info} messages={messages} />
}
