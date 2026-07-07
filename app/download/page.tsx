import type { Metadata } from 'next'

import { DownloadClient } from './download-client'

export const metadata: Metadata = {
  title: 'Download',
  description: 'Baixe o cliente oficial de Silkroad Online e confira os requisitos recomendados.',
  openGraph: {
    title: 'Download | Silkroad Online',
    description: 'Baixe o cliente oficial de Silkroad Online e confira os requisitos recomendados.',
    images: ['/legacy/img/download-sr.png'],
  },
  twitter: {
    title: 'Download | Silkroad Online',
    description: 'Baixe o cliente oficial de Silkroad Online e confira os requisitos recomendados.',
    images: ['/legacy/img/download-sr.png'],
  },
}

export default function DownloadPage() {
  return <DownloadClient />
}
