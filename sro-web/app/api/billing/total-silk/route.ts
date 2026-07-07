import { getDbPool } from '@/lib/db'
import { accountDbPrefix, textResponse } from '@/lib/billing'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const pool = await getDbPool('account')
    const result = await pool.request().query<{ total: number }>(`
      SELECT COALESCE(SUM(CAST(silk_own AS BIGINT)), 0) AS total
      FROM ${accountDbPrefix()}.[SK_Silk]
    `)

    const total = Number(result.recordset[0]?.total ?? 0)
    return textResponse(total > 0 ? String(total) : '-1')
  } catch {
    return textResponse('-1', 500)
  }
}
