import type { Metadata } from 'next'

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

export default function HomePage() {
  return <HomeClient />
}
