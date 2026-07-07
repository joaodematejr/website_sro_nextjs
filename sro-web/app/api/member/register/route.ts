import { createHash } from 'node:crypto'
import { cookies } from 'next/headers'

import { verifyCaptchaToken } from '@/lib/captcha'
import { getDbConnectionTarget, getDbPool, sql } from '@/lib/db'

export const runtime = 'nodejs'

type RegisterPayload = {
  username?: string
  password?: string
  email?: string
  captcha?: string
}

type ParsedPayload =
  | { error: string }
  | {
      username: string
      password: string
      email: string
      captcha: string
    }

const usernamePattern = /^[A-Za-z0-9]+$/
const CAPTCHA_COOKIE_NAME = 'sro_captcha_token'
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000
const RATE_LIMIT_MAX_ATTEMPTS = 8

type RateLimitEntry = {
  count: number
  resetAt: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

function md5(value: string) {
  return createHash('md5').update(value).digest('hex')
}

function quoteSqlIdentifier(identifier: string) {
  return `[${identifier.replaceAll(']', ']]')}]`
}

function badRequest(error: string) {
  return Response.json({ ok: false, error }, { status: 400 })
}

function parsePayload(data: RegisterPayload): ParsedPayload {
  const username = data.username?.trim() ?? ''
  const password = data.password ?? ''
  const email = data.email?.trim() ?? ''
  const captcha = data.captcha?.trim() ?? ''

  if (!username || !password || !email) {
    return { error: 'MISSING_REQUIRED_FIELDS' as const }
  }

  if (!usernamePattern.test(username) || username.length < 4 || username.length > 16) {
    return { error: 'INVALID_USERNAME' as const }
  }

  if (password.length < 6 || password.length > 48) {
    return { error: 'INVALID_PASSWORD' as const }
  }

  if (!email.includes('@') || email.length > 128) {
    return { error: 'INVALID_EMAIL' as const }
  }

  if (!captcha) {
    return { error: 'MISSING_CAPTCHA' as const }
  }

  return { username, password, email, captcha }
}

function getClientIp(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '0.0.0.0'
}

function isRateLimited(ipAddress: string) {
  const now = Date.now()
  const current = rateLimitStore.get(ipAddress)

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(ipAddress, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }

  if (current.count >= RATE_LIMIT_MAX_ATTEMPTS) {
    return true
  }

  current.count += 1
  return false
}

export async function POST(request: Request) {
  let payload: RegisterPayload

  try {
    payload = (await request.json()) as RegisterPayload
  } catch {
    return badRequest('INVALID_JSON')
  }

  const parsed = parsePayload(payload)

  if ('error' in parsed) {
    return badRequest(parsed.error)
  }

  const ipAddress = getClientIp(request)

  if (isRateLimited(ipAddress)) {
    return Response.json({ ok: false, error: 'TOO_MANY_ATTEMPTS' }, { status: 429 })
  }

  const cookieStore = await cookies()
  const captchaToken = cookieStore.get(CAPTCHA_COOKIE_NAME)?.value

  if (!verifyCaptchaToken(captchaToken, parsed.captcha)) {
    return badRequest('INVALID_CAPTCHA')
  }

  cookieStore.delete(CAPTCHA_COOKIE_NAME)

  const target = getDbConnectionTarget('account')
  const accountDb = quoteSqlIdentifier(target.database)
  const userTable = `${accountDb}.[dbo].[TB_User]`
  const silkTable = `${accountDb}.[dbo].[SK_Silk]`

  const pool = await getDbPool('account')
  const transaction = new sql.Transaction(pool)

  try {
    await transaction.begin()

    const checkRequest = new sql.Request(transaction)
    checkRequest.input('username', sql.VarChar(64), parsed.username)
    const existing = await checkRequest.query(`SELECT TOP 1 JID FROM ${userTable} WHERE StrUserID = @username`)

    if (existing.recordset.length > 0) {
      await transaction.rollback()
      return Response.json({ ok: false, error: 'USERNAME_TAKEN' }, { status: 409 })
    }

    const insertUserRequest = new sql.Request(transaction)
    insertUserRequest.input('username', sql.VarChar(64), parsed.username)
    insertUserRequest.input('passwordHash', sql.VarChar(64), md5(parsed.password))
    insertUserRequest.input('email', sql.VarChar(128), parsed.email)
    insertUserRequest.input('ipAddress', sql.VarChar(64), ipAddress)

    await insertUserRequest.query(`
      INSERT INTO ${userTable}
      (StrUserID, password, Status, GMrank, Email, regtime, reg_ip, freetime, sec_primary, sec_content, AccPlayTime, LatestUpdateTime_ToPlayTime)
      VALUES (@username, @passwordHash, 1, 0, @email, GETDATE(), @ipAddress, 0, 3, 3, 0, 0)
    `)

    const selectUserRequest = new sql.Request(transaction)
    selectUserRequest.input('username', sql.VarChar(64), parsed.username)
    const createdUser = await selectUserRequest.query(`
      SELECT TOP 1 JID
      FROM ${userTable}
      WHERE StrUserID = @username
      ORDER BY JID DESC
    `)

    const jid = createdUser.recordset[0]?.JID

    if (!jid) {
      throw new Error('FAILED_TO_FETCH_CREATED_USER')
    }

    const silkRequest = new sql.Request(transaction)
    silkRequest.input('jid', sql.Int, jid)
    silkRequest.input('gift', sql.Int, 5000)
    await silkRequest.query(`
      INSERT INTO ${silkTable} (JID, silk_own, silk_gift, silk_point)
      VALUES (@jid, 0, @gift, 0)
    `)

    await transaction.commit()

    return Response.json({ ok: true })
  } catch (error) {
    await transaction.rollback().catch(() => undefined)

    const e = error as Error & { code?: string }

    if (e.code === 'EREQUEST') {
      return Response.json({ ok: false, error: 'DATABASE_REQUEST_FAILED' }, { status: 500 })
    }

    return Response.json({ ok: false, error: 'REGISTER_FAILED' }, { status: 500 })
  }
}
