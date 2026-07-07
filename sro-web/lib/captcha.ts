import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

const CAPTCHA_TOKEN_TTL_SECONDS = 300

function getCaptchaSecret() {
  return process.env.CAPTCHA_SECRET?.trim() || 'dev-captcha-secret-change-me'
}

function toBase64Url(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url')
}

function fromBase64Url(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8')
}

function signPayload(payload: string) {
  return createHmac('sha256', getCaptchaSecret()).update(payload).digest('base64url')
}

export function createCaptchaToken(answer: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + CAPTCHA_TOKEN_TTL_SECONDS
  const nonce = randomBytes(8).toString('hex')
  const payload = `${answer}:${expiresAt}:${nonce}`
  const signature = signPayload(payload)

  return `${toBase64Url(payload)}.${signature}`
}

export function verifyCaptchaToken(token: string | undefined, answer: string) {
  if (!token || !answer) {
    return false
  }

  const parts = token.split('.')

  if (parts.length !== 2) {
    return false
  }

  const [encodedPayload, signature] = parts
  const payload = fromBase64Url(encodedPayload)
  const expectedSignature = signPayload(payload)

  const signatureBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expectedSignature)

  if (signatureBuffer.length !== expectedBuffer.length) {
    return false
  }

  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return false
  }

  const [storedAnswer, expiresAtRaw] = payload.split(':')
  const expiresAt = Number(expiresAtRaw)

  if (!storedAnswer || !Number.isFinite(expiresAt)) {
    return false
  }

  if (Math.floor(Date.now() / 1000) > expiresAt) {
    return false
  }

  return storedAnswer === answer.trim()
}

export function generateCaptchaValue() {
  return String(Math.floor(10000 + Math.random() * 90000))
}

export { CAPTCHA_TOKEN_TTL_SECONDS }
