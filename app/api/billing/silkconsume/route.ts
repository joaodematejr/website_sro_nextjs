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
  const rawJid = searchParams.get('JID')?.trim() ?? ''
  const rawSilkOffsetOwn = searchParams.get('so')?.trim() ?? ''
  const rawSilkOffsetGift = searchParams.get('sg')?.trim() ?? ''
  const rawSilkOffsetPoint = searchParams.get('sp')?.trim() ?? ''
  const rawShardId = searchParams.get('sid')?.trim() ?? ''
  const rawCharId = searchParams.get('cid')?.trim() ?? ''
  const rawItemId = searchParams.get('iid')?.trim() ?? ''
  const jid = asInt(rawJid)
  const silkOffsetOwn = asInt(rawSilkOffsetOwn)
  const silkOffsetGift = asInt(rawSilkOffsetGift)
  const silkOffsetPoint = asInt(rawSilkOffsetPoint)
  const shardId = asInt(rawShardId)
  const charId = asInt(rawCharId)
  const itemId = asInt(rawItemId)
  const ip = searchParams.get('ip')?.trim() ?? ''
  const validKey = searchParams.get('vk')?.trim() ?? ''

  if (!validKey) return textResponse('-10', 400)
  if (!ip) return textResponse('-9', 400)
  if (!itemId) return textResponse('-8', 400)
  if (!charId) return textResponse('-7', 400)
  if (!shardId) return textResponse('-6', 400)
  if (silkOffsetPoint === null) return textResponse('-5', 400)
  if (silkOffsetGift === null) return textResponse('-4', 400)
  if (silkOffsetOwn === null) return textResponse('-3', 400)
  if (jid === null) return textResponse('-2', 400)

  if (jid !== session.jid) {
    return textResponse('AUTH_FORBIDDEN', 403)
  }

  const signText = `${rawJid}.${rawSilkOffsetOwn}.${rawSilkOffsetGift}.${rawSilkOffsetPoint}.${rawShardId}.${rawCharId}.${rawItemId}.${ip}.${BILLING_KEYSTR}`
  const confirmValidKey = md5(signText)

  if (validKey !== confirmValidKey) {
    return textResponse('-12', 401)
  }

  if (jid === 0) return textResponse('-14:-3000', 400)
  if (silkOffsetOwn < 0 || silkOffsetGift < 0 || silkOffsetPoint < 0) return textResponse('-14:-3001', 400)
  if (silkOffsetOwn + silkOffsetGift + silkOffsetPoint < 0) return textResponse('-14:-3002', 400)

  const pool = await getDbPool('account')
  const transaction = new sql.Transaction(pool)
  const db = accountDbPrefix()

  try {
    await transaction.begin()

    const silkResult = await new sql.Request(transaction)
      .input('jid', sql.Int, jid)
      .query<{ silk_own: number; silk_gift: number; silk_point: number }>(`
        SELECT TOP 1 silk_own, silk_gift, silk_point
        FROM ${db}.[SK_Silk] WITH (UPDLOCK, ROWLOCK)
        WHERE JID = @jid
      `)

    const current = normalizeBalance(silkResult.recordset[0])
    let remainOwn = current.own
    let remainGift = current.gift
    let remainPoint = current.point

    if (silkOffsetOwn > 0) {
      if (remainOwn < silkOffsetOwn) {
        await transaction.rollback()
        return textResponse('-14:-4001', 409)
      }

      remainOwn -= silkOffsetOwn
      await new sql.Request(transaction)
        .input('jid', sql.Int, jid)
        .input('remainOwn', sql.Int, remainOwn)
        .query(`UPDATE ${db}.[SK_Silk] SET silk_own = @remainOwn WHERE JID = @jid`)
    }

    if (silkOffsetGift > 0) {
      if (remainGift < silkOffsetGift) {
        await transaction.rollback()
        return textResponse('-14:-5002', 409)
      }

      remainGift -= silkOffsetGift
      await new sql.Request(transaction)
        .input('jid', sql.Int, jid)
        .input('remainGift', sql.Int, remainGift)
        .query(`UPDATE ${db}.[SK_Silk] SET silk_gift = @remainGift WHERE JID = @jid`)
    }

    if (silkOffsetPoint > 0) {
      if (remainPoint < silkOffsetPoint) {
        await transaction.rollback()
        return textResponse('-14:-6002', 409)
      }

      remainPoint -= silkOffsetPoint
      await new sql.Request(transaction)
        .input('jid', sql.Int, jid)
        .input('remainPoint', sql.Int, remainPoint)
        .query(`UPDATE ${db}.[SK_Silk] SET silk_point = @remainPoint WHERE JID = @jid`)
    }

    await new sql.Request(transaction)
      .input('jid', sql.Int, jid)
      .input('shardId', sql.Int, shardId)
      .input('charId', sql.Int, charId)
      .input('itemId', sql.Int, itemId)
      .input('offsetOwn', sql.Int, silkOffsetOwn)
      .input('offsetGift', sql.Int, silkOffsetGift)
      .input('offsetPoint', sql.Int, silkOffsetPoint)
      .input('ip', sql.VarChar(64), ip)
      .query(`
        INSERT INTO ${db}.[SK_ItemSaleLog]
        VALUES
          (@jid, @shardId, @charId, @itemId, @offsetOwn, @offsetGift, @offsetPoint, @ip, GETDATE())
      `)

    await transaction.commit()
    return textResponse(`1:${remainOwn},${remainGift},${remainPoint}`)
  } catch {
    await transaction.rollback().catch(() => undefined)
    return textResponse('-1', 500)
  }
}
