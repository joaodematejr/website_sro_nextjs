import { textResponse } from '@/lib/billing'

export const runtime = 'nodejs'

export async function GET() {
  return textResponse('1')
}
