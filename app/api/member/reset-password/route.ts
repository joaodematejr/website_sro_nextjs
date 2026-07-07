import { createHash } from 'node:crypto'

import { verifyCaptchaToken } from '@/lib/captcha'
import { getDbPool, sql } from '@/lib/db'

export const runtime = 'nodejs'

type ResetPasswordPayload = {
  username?: string
  email?: string
  password?: string
  captcha?: string
}

type ParsedPayload =
  | { error: string }
  | {
      username: string
      email: string
      password: string
      captcha: string
    }

const CAPTCHA_COOKIE_NAME = 'sro_captcha_token'
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000
const RATE_LIMIT_MAX_ATTEMPTS = 5

type RateLimitEntry = {
  count: number
  resetAt: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

function md5(value: string) {
  return createHash('md5').update(value).digest('hex')
}

function badRequest(error: string) {
  return Response.json({ ok: false, error }, { status: 400 })
}

function parsePayload(data: ResetPasswordPayload): ParsedPayload {
  const username = data.username?.trim() ?? ''
  const email = data.email?.trim() ?? ''
  const password = data.password ?? ''
  const captcha = data.captcha?.trim() ?? ''

  if (!username || !email || !password) {
    return { error: 'MISSING_REQUIRED_FIELDS' }
  }

  if (password.length < 6 || password.length > 48) {
    return { error: 'INVALID_PASSWORD' }
  }

  if (!email.includes('@') || email.length > 128) {
    return { error: 'INVALID_EMAIL' }
  }

  if (!captcha) {
    return { error: 'MISSING_CAPTCHA' }
  }

  return { username, email, password, captcha }
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

function quoteSqlIdentifier(identifier: string) {
  return `[${identifier.replaceAll(']', ']]')}]`
}

export async function POST(request: Request) {
  let payload: ResetPasswordPayload

  try {
    payload = (await request.json()) as ResetPasswordPayload
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

  const cookieHeader = request.headers.get('cookie') ?? ''
  const captchaCookieValue = cookieHeader
    .split(';')
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${CAPTCHA_COOKIE_NAME}=`))
    ?.slice(CAPTCHA_COOKIE_NAME.length + 1)

  if (!verifyCaptchaToken(captchaCookieValue ? decodeURIComponent(captchaCookieValue) : undefined, parsed.captcha)) {
    return badRequest('INVALID_CAPTCHA')
  }

  const pool = await getDbPool('account')
  const dbTarget = process.env.DB_ACCOUNT_DATABASE
  const accountDb = quoteSqlIdentifier(dbTarget ?? 'SRO_ACCOUNT')
  const userTable = `${accountDb}.[dbo].[TB_User]`

  const checkRequest = pool.request()
  checkRequest.input('username', sql.NVarChar(64), parsed.username)
  checkRequest.input('email', sql.NVarChar(128), parsed.email)

  const existing = await checkRequest.query<{ JID: number }>(`
    SELECT TOP 1 JID FROM ${userTable}
    WHERE StrUserID = @username
      AND email = @email
  `)

  if (existing.recordset.length === 0) {
    return Response.json({ ok: false, error: 'USER_NOT_FOUND' }, { status: 404 })
  }

  const jid = existing.recordset[0].JID
  const newPasswordHash = md5(parsed.password)

  const updateRequest = pool.request()
  updateRequest.input('passwordHash', sql.VarChar(64), newPasswordHash)
  updateRequest.input('jid', sql.Int, jid)

  await updateRequest.query(`
    UPDATE ${userTable}
    SET [password] = @passwordHash
    WHERE JID = @jid
  `)

  return Response.json({ ok: true })
}
