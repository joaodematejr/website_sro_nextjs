'use client'

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

import { I18N_COOKIE_NAME, defaultLocale, i18nMessages, isLocale, type I18nMessages, type Locale } from '@/lib/i18n'

type I18nContextValue = {
  locale: Locale
  messages: I18nMessages
  setLocale: (nextLocale: Locale) => void
}

const I18nContext = createContext<I18nContextValue | null>(null)

type I18nProviderProps = {
  initialLocale?: string
  children: ReactNode
}

export function I18nProvider({ initialLocale, children }: I18nProviderProps) {
  const safeInitialLocale = isLocale(initialLocale) ? initialLocale : defaultLocale
  const [locale, setLocaleState] = useState<Locale>(safeInitialLocale)

  function setLocale(nextLocale: Locale) {
    setLocaleState(nextLocale)

    try {
      localStorage.setItem(I18N_COOKIE_NAME, nextLocale)
    } catch {
      // Ignore storage errors in restricted environments.
    }

    document.cookie = `${I18N_COOKIE_NAME}=${encodeURIComponent(nextLocale)}; path=/; max-age=31536000; samesite=lax`
  }

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      messages: i18nMessages[locale],
      setLocale,
    }),
    [locale],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)

  if (!context) {
    throw new Error('useI18n must be used within I18nProvider')
  }

  return context
}
