import { cookies } from 'next/headers'

import { CAPTCHA_TOKEN_TTL_SECONDS, createCaptchaToken, generateCaptchaValue } from '@/lib/captcha'

export const runtime = 'nodejs'

const CAPTCHA_COOKIE_NAME = 'sro_captcha_token'

function renderCaptchaSvg(code: string) {
  const noiseLines = Array.from({ length: 6 }, (_, index) => {
    const y1 = 6 + index * 6
    const y2 = 30 - index * 4

    return `<line x1=\"0\" y1=\"${y1}\" x2=\"120\" y2=\"${y2}\" stroke=\"#334155\" stroke-width=\"1\" />`
  }).join('')

  const digits = code
    .split('')
    .map((digit, index) => `<text x=\"${16 + index * 20}\" y=\"22\" fill=\"#0f172a\" font-size=\"20\" font-family=\"monospace\">${digit}</text>`)
    .join('')

  return `<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"120\" height=\"32\" viewBox=\"0 0 120 32\" role=\"img\" aria-label=\"captcha\"><rect width=\"120\" height=\"32\" fill=\"#e2e8f0\"/>${noiseLines}${digits}</svg>`
}

export async function GET() {
  const code = generateCaptchaValue()
  const token = createCaptchaToken(code)
  const cookieStore = await cookies()

  cookieStore.set(CAPTCHA_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: CAPTCHA_TOKEN_TTL_SECONDS,
    path: '/',
  })

  const svg = renderCaptchaSvg(code)

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  })
}
