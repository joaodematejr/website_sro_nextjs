import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_TC } from "next/font/google";
import { cookies } from 'next/headers'

import { I18nProvider } from '@/components/providers/i18n-provider'
import { I18N_COOKIE_NAME, defaultLocale, isLocale } from '@/lib/i18n'

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSansTc = Noto_Sans_TC({
  variable: "--font-legacy-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://sro.digeam.com'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Silkroad Online',
    template: '%s | Silkroad Online',
  },
  description: 'Portal oficial de Silkroad Online com download, cadastro e novidades.',
  openGraph: {
    title: 'Silkroad Online',
    description: 'Portal oficial de Silkroad Online com download, cadastro e novidades.',
    type: 'website',
    locale: 'pt_BR',
    images: ['/legacy/img/001.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Silkroad Online',
    description: 'Portal oficial de Silkroad Online com download, cadastro e novidades.',
    images: ['/legacy/img/001.png'],
  },
  icons: {
    icon: '/favicon.ico',
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const cookieStore = await cookies()
  const localeFromCookie = cookieStore.get(I18N_COOKIE_NAME)?.value
  const locale = isLocale(localeFromCookie) ? localeFromCookie : defaultLocale

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} ${notoSansTc.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <I18nProvider initialLocale={locale}>{children}</I18nProvider>
      </body>
    </html>
  )
}
