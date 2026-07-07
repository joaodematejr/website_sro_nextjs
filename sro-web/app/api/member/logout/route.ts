import { cookies } from 'next/headers'

import { MEMBER_SESSION_COOKIE_NAME } from '@/lib/member-auth'

export const runtime = 'nodejs'

export async function POST() {
  const cookieStore = await cookies()
  cookieStore.delete(MEMBER_SESSION_COOKIE_NAME)

  return Response.json({ ok: true })
}
