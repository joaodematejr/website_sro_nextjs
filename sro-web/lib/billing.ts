import { createHash } from 'node:crypto'

import { getDbConnectionTarget } from '@/lib/db'

export const BILLING_RUNTIME = 'nodejs'

export const BILLING_KEYSTR = 'SROG8Z_CDE1210598DK_AKD3HW1K04DL2-'
export const BILLING_NET2E_KEYSTR = 'VDC-Net2E-CGI'

export type SilkBalance = {
  own: number
  gift: number
  point: number
}

export function md5(value: string) {
  return createHash('md5').update(value).digest('hex')
}

export function asInt(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const normalized = value.trim()

  if (!/^-?\d+$/.test(normalized)) {
    return null
  }

  const parsed = Number.parseInt(normalized, 10)
  return Number.isFinite(parsed) ? parsed : null
}

export function quoteSqlIdentifier(identifier: string) {
  return `[${identifier.replaceAll(']', ']]')}]`
}

export function accountDbPrefix() {
  const target = getDbConnectionTarget('account')
  return `${quoteSqlIdentifier(target.database)}.[dbo]`
}

export function getClientIp(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '0.0.0.0'
}

export function textResponse(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

export function normalizeBalance(record: { silk_own?: unknown; silk_gift?: unknown; silk_point?: unknown } | undefined): SilkBalance {
  const own = Number(record?.silk_own ?? 0)
  const gift = Number(record?.silk_gift ?? 0)
  const point = Number(record?.silk_point ?? 0)

  return {
    own: Number.isFinite(own) ? own : 0,
    gift: Number.isFinite(gift) ? gift : 0,
    point: Number.isFinite(point) ? point : 0,
  }
}
