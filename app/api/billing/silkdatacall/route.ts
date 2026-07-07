import { getDbPool, sql } from '@/lib/db'
import {
  BILLING_KEYSTR,
  accountDbPrefix,
  asInt,
  md5,
  normalizeBalance,
  textResponse,
} from '@/lib/billing'
import { readMemberSessionFromRequest } from '@/lib/member-auth'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const session = readMemberSessionFromRequest(request)

  if (!session) {
    return textResponse('AUTH_REQUIRED', 401)
  }

  const { searchParams } = new URL(request.url)
  const jid = asInt(searchParams.get('JID'))

  if (jid === null) {
    return textResponse('-2', 400)
  }

  if (jid !== session.jid) {
    return textResponse('AUTH_FORBIDDEN', 403)
  }

  try {
    const pool = await getDbPool('account')
    const db = accountDbPrefix()
    const dbResult = await pool.request().input('jid', sql.Int, jid).query<{
      silk_own: number
      silk_gift: number
      silk_point: number
    }>(`
      SELECT TOP 1 silk_own, silk_gift, silk_point
      FROM ${db}.[SK_Silk]
      WHERE JID = @jid
    `)

    const balance = normalizeBalance(dbResult.recordset[0])
    const validKey = md5(`${jid}.${balance.own}.${balance.gift}.${balance.point}.${BILLING_KEYSTR}`)

    if (!validKey) {
      return textResponse('-5', 500)
    }

    return textResponse(`1:${balance.own},${balance.gift},${balance.point},${validKey}`)
  } catch {
    return textResponse('-1', 500)
  }
}
