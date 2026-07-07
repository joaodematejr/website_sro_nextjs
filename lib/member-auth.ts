import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

export const MEMBER_SESSION_COOKIE_NAME = 'sro_member_session'
export const MEMBER_SESSION_TTL_SECONDS = 60 * 60 * 12

export type MemberSession = {
  username: string
  jid: number
  expiresAt: number
}

function getMemberSessionSecret() {
  return process.env.MEMBER_SESSION_SECRET?.trim() || 'dev-member-session-secret-change-me'
}

function toBase64Url(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url')
}

function fromBase64Url(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8')
}

function signPayload(payload: string) {
  return createHmac('sha256', getMemberSessionSecret()).update(payload).digest('base64url')
}

export function md5(value: string) {
  return createHash('md5').update(value).digest('hex')
}

export function createMemberSessionToken(input: { username: string; jid: number }) {
  const expiresAt = Math.floor(Date.now() / 1000) + MEMBER_SESSION_TTL_SECONDS
  const nonce = randomBytes(8).toString('hex')
  const payload = `${input.username}:${input.jid}:${expiresAt}:${nonce}`
  const signature = signPayload(payload)

  return `${toBase64Url(payload)}.${signature}`
}

export function verifyMemberSessionToken(token: string | undefined): MemberSession | null {
  if (!token) {
    return null
  }

  const parts = token.split('.')

  if (parts.length !== 2) {
    return null
  }

  const [encodedPayload, signature] = parts
  const payload = fromBase64Url(encodedPayload)
  const expectedSignature = signPayload(payload)

  const signatureBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expectedSignature)

  if (signatureBuffer.length !== expectedBuffer.length) {
    return null
  }

  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null
  }

  const [username, jidRaw, expiresAtRaw] = payload.split(':')
  const jid = Number(jidRaw)
  const expiresAt = Number(expiresAtRaw)

  if (!username || !Number.isFinite(jid) || !Number.isFinite(expiresAt)) {
    return null
  }

  if (Math.floor(Date.now() / 1000) > expiresAt) {
    return null
  }

  return { username, jid, expiresAt }
}

function readCookieFromHeader(cookieHeader: string | null, cookieName: string) {
  if (!cookieHeader) {
    return undefined
  }

  const cookieKey = `${cookieName}=`
  const cookiePart = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(cookieKey))

  if (!cookiePart) {
    return undefined
  }

  return decodeURIComponent(cookiePart.slice(cookieKey.length))
}

export function readMemberSessionFromRequest(request: Request) {
  const token = readCookieFromHeader(request.headers.get('cookie'), MEMBER_SESSION_COOKIE_NAME)
  return verifyMemberSessionToken(token)
}
