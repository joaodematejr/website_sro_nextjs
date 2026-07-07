import { cookies } from 'next/headers'

import { MEMBER_SESSION_COOKIE_NAME, verifyMemberSessionToken } from '@/lib/member-auth'

export const runtime = 'nodejs'

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get(MEMBER_SESSION_COOKIE_NAME)?.value
  const session = verifyMemberSessionToken(token)

  if (!session) {
    return Response.json({ ok: true, authenticated: false })
  }

  return Response.json({
    ok: true,
    authenticated: true,
    user: {
      username: session.username,
      jid: session.jid,
    },
  })
}
