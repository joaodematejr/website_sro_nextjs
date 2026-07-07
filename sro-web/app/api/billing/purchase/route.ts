import { getDbPool, sql } from '@/lib/db'
import {
  BILLING_NET2E_KEYSTR,
  accountDbPrefix,
  asInt,
  getClientIp,
  md5,
  normalizeBalance,
  textResponse,
} from '@/lib/billing'
import { readMemberSessionFromRequest } from '@/lib/member-auth'

export const runtime = 'nodejs'

type PurchaseInput = {
  orderNo: string
  username: string
  rawPackage: string
  rawNumSilk: string
  eCash: string
  secretStr: string
  ip: string
}

function toTrimmedString(value: unknown) {
  if (value === null || value === undefined) {
    return ''
  }

  return String(value).trim()
}

async function readPurchaseInput(request: Request): Promise<PurchaseInput | null> {
  if (request.method === 'GET') {
    const { searchParams } = new URL(request.url)

    return {
      orderNo: searchParams.get('OrderNo')?.trim() ?? '',
      username: searchParams.get('Username')?.trim() ?? '',
      rawPackage: searchParams.get('Package')?.trim() ?? '',
      rawNumSilk: searchParams.get('NumSilk')?.trim() ?? '',
      eCash: searchParams.get('ECash')?.trim() ?? '',
      secretStr: searchParams.get('SecretStr')?.trim() ?? '',
      ip: searchParams.get('IP')?.trim() ?? '',
    }
  }

  if (request.method === 'POST') {
    try {
      const payload = (await request.json()) as Record<string, unknown>

      return {
        orderNo: toTrimmedString(payload.OrderNo),
        username: toTrimmedString(payload.Username),
        rawPackage: toTrimmedString(payload.Package),
        rawNumSilk: toTrimmedString(payload.NumSilk),
        eCash: toTrimmedString(payload.ECash),
        secretStr: toTrimmedString(payload.SecretStr),
        ip: toTrimmedString(payload.IP),
      }
    } catch {
      return null
    }
  }

  return null
}

async function handlePurchase(request: Request) {
  const session = readMemberSessionFromRequest(request)

  if (!session) {
    return textResponse('AUTH_REQUIRED', 401)
  }

  const input = await readPurchaseInput(request)

  if (!input) {
    return textResponse('INVALID_JSON', 400)
  }

  const orderNo = input.orderNo
  const username = input.username
  const packageId = asInt(input.rawPackage)
  const numSilk = asInt(input.rawNumSilk)
  const eCash = input.eCash
  const secretStr = input.secretStr
  const ip = input.ip || getClientIp(request)

  if (!orderNo) return textResponse('PARA01', 400)
  if (!username) return textResponse('PARA02', 400)
  if (packageId === null) return textResponse('PARA03', 400)
  if (numSilk === null) return textResponse('PARA04', 400)
  if (!eCash) return textResponse('PARA05', 400)
  if (!secretStr) return textResponse('PARA06', 400)

  if (session.username.toLowerCase() !== username.toLowerCase()) {
    return textResponse('AUTH_FORBIDDEN', 403)
  }

  const oldCompatHash = md5(`${orderNo}${username}${input.rawPackage}${input.rawNumSilk}${eCash}${BILLING_NET2E_KEYSTR}`)
  const hashWithIp = md5(`${orderNo}${username}${input.rawPackage}${input.rawNumSilk}${eCash}${ip}${BILLING_NET2E_KEYSTR}`)

  if (secretStr !== oldCompatHash && secretStr !== hashWithIp) {
    return textResponse('INVALID', 401)
  }

  const pool = await getDbPool('account')
  const transaction = new sql.Transaction(pool)
  const db = accountDbPrefix()

  try {
    await transaction.begin()

    const userResult = await new sql.Request(transaction)
      .input('username', sql.VarChar(64), username)
      .query<{ JID: number }>(`SELECT TOP 1 JID FROM ${db}.[TB_User] WHERE StrUserID = @username`)

    const jid = Number(userResult.recordset[0]?.JID ?? 0)

    if (!jid) {
      await transaction.rollback()
      return textResponse('NOUSER', 404)
    }

    if (jid !== session.jid) {
      await transaction.rollback()
      return textResponse('AUTH_FORBIDDEN', 403)
    }

    const orderResult = await new sql.Request(transaction)
      .input('orderNo', sql.VarChar(128), orderNo)
      .query<{ OrderNumber: string }>(`
        SELECT TOP 1 OrderNumber
        FROM ${db}.[SK_SilkBuyList]
        WHERE OrderNumber = @orderNo
      `)

    if (orderResult.recordset.length > 0) {
      await transaction.rollback()
      return textResponse('ORDEREXIST', 409)
    }

    const silkResult = await new sql.Request(transaction)
      .input('jid', sql.Int, jid)
      .query<{ silk_own: number; silk_gift: number; silk_point: number }>(`
        SELECT TOP 1 silk_own, silk_gift, silk_point
        FROM ${db}.[SK_Silk] WITH (UPDLOCK, ROWLOCK)
        WHERE JID = @jid
      `)

    const current = normalizeBalance(silkResult.recordset[0])

    if (silkResult.recordset.length === 0) {
      await new sql.Request(transaction)
        .input('jid', sql.Int, jid)
        .input('numSilk', sql.Int, numSilk)
        .query(`
          INSERT INTO ${db}.[SK_Silk] (JID, silk_own, silk_gift, silk_point)
          VALUES (@jid, @numSilk, 0, 0)
        `)
    } else {
      const nextSilkOwn = current.own + numSilk

      await new sql.Request(transaction)
        .input('jid', sql.Int, jid)
        .input('nextSilkOwn', sql.Int, nextSilkOwn)
        .query(`UPDATE ${db}.[SK_Silk] SET silk_own = @nextSilkOwn WHERE JID = @jid`)
    }

    await new sql.Request(transaction)
      .input('jid', sql.Int, jid)
      .input('numSilk', sql.Int, numSilk)
      .input('packageId', sql.Int, packageId)
      .input('orderNo', sql.VarChar(128), orderNo)
      .query(`
        INSERT INTO ${db}.[SK_SilkBuyList]
          (UserJID, Silk_Type, Silk_Reason, Silk_Offset, Silk_Remain, ID, BuyQuantity, OrderNumber, SlipPaper, RegDate)
        VALUES
          (@jid, 0, 0, @numSilk, @numSilk, @packageId, 1, @orderNo, 'User Purchase Silk from Billing API', GETDATE())
      `)

    await new sql.Request(transaction)
      .input('jid', sql.Int, jid)
      .input('numSilk', sql.Int, numSilk)
      .query(`
        INSERT INTO ${db}.[SK_SilkChange_BY_Web]
          (JID, silk_remain, silk_offset, silk_type, reason)
        VALUES
          (@jid, @numSilk, @numSilk, 0, 0)
      `)

    await transaction.commit()
    return textResponse('SUCCESS')
  } catch {
    await transaction.rollback().catch(() => undefined)
    return textResponse('FAIL', 500)
  }
}

export async function GET(request: Request) {
  return handlePurchase(request)
}

export async function POST(request: Request) {
  return handlePurchase(request)
}
