import type { Locale } from '@/lib/i18n'
import { getDbPool } from '@/lib/db'

export type UniqueSpawnItem = {
  name: string
  killer: string
  elapsed: string
}

const DEFAULT_LIMIT = 10

function sanitizeIdentifier(value: string) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(value)
}

function formatElapsed(value: Date, locale: Locale) {
  const diffMs = Date.now() - value.getTime()

  if (!Number.isFinite(diffMs) || diffMs < 0) {
    return locale === 'pt-BR' ? 'agora' : 'just now'
  }

  const totalMinutes = Math.floor(diffMs / 60000)

  if (totalMinutes < 60) {
    if (locale === 'pt-BR') {
      return totalMinutes <= 1 ? '1 min' : `${totalMinutes} mins`
    }

    return totalMinutes <= 1 ? '1 min' : `${totalMinutes} mins`
  }

  const totalHours = Math.floor(totalMinutes / 60)

  if (locale === 'pt-BR') {
    return totalHours <= 1 ? '1 hora' : `${totalHours} horas`
  }

  return totalHours <= 1 ? '1 hour' : `${totalHours} hours`
}

function normalizeRows(
  rows: Array<{ UniqueName?: string; KillerName?: string; KilledAt?: Date | string }>,
  locale: Locale,
) {
  return rows
    .map((row) => {
      const name = row.UniqueName?.trim()
      const killer = row.KillerName?.trim()

      if (!name || !killer) {
        return null
      }

      const parsedDate = row.KilledAt instanceof Date ? row.KilledAt : new Date(row.KilledAt ?? '')

      if (Number.isNaN(parsedDate.getTime())) {
        return null
      }

      return {
        name,
        killer,
        elapsed: formatElapsed(parsedDate, locale),
      } satisfies UniqueSpawnItem
    })
    .filter((item): item is UniqueSpawnItem => item !== null)
}

async function queryConfiguredSource(limit: number, locale: Locale) {
  const table = process.env.UNIQUE_SPAWN_TABLE?.trim()

  if (!table) {
    return null
  }

  const uniqueNameColumn = (process.env.UNIQUE_SPAWN_NAME_COLUMN || 'UniqueName').trim()
  const killerNameColumn = (process.env.UNIQUE_SPAWN_KILLER_COLUMN || 'KillerName').trim()
  const killedAtColumn = (process.env.UNIQUE_SPAWN_KILLED_AT_COLUMN || 'KilledAt').trim()

  if (![table, uniqueNameColumn, killerNameColumn, killedAtColumn].every(sanitizeIdentifier)) {
    return []
  }

  const pool = await getDbPool('shard')
  const result = await pool.request().query<{
    UniqueName: string
    KillerName: string
    KilledAt: Date | string
  }>(`
    SELECT TOP (${limit})
      [${uniqueNameColumn}] AS UniqueName,
      [${killerNameColumn}] AS KillerName,
      [${killedAtColumn}] AS KilledAt
    FROM [dbo].[${table}]
    ORDER BY [${killedAtColumn}] DESC
  `)

  return normalizeRows(result.recordset, locale)
}

async function queryFallbackSources(limit: number, locale: Locale) {
  const pool = await getDbPool('shard')

  const candidates: Array<() => Promise<UniqueSpawnItem[]>> = [
    async () => {
      const result = await pool.request().query<{
        UniqueName: string
        KillerName: string
        KilledAt: Date | string
      }>(`
        SELECT TOP (${limit})
          UniqueName,
          KillerName,
          KilledAt
        FROM [dbo].[_UniqueHistory]
        ORDER BY KilledAt DESC
      `)
      return normalizeRows(result.recordset, locale)
    },
    async () => {
      const result = await pool.request().query<{
        UniqueName: string
        KillerName: string
        KilledAt: Date | string
      }>(`
        SELECT TOP (${limit})
          UniqueName,
          CharName16 AS KillerName,
          EventTime AS KilledAt
        FROM [dbo].[_LogUniqueKill]
        ORDER BY EventTime DESC
      `)
      return normalizeRows(result.recordset, locale)
    },
    async () => {
      const result = await pool.request().query<{
        UniqueName: string
        KillerName: string
        KilledAt: Date | string
      }>(`
        SELECT TOP (${limit})
          UniqueName,
          CharName AS KillerName,
          RegDate AS KilledAt
        FROM [dbo].[_UniqueKillLog]
        ORDER BY RegDate DESC
      `)
      return normalizeRows(result.recordset, locale)
    },
  ]

  for (const candidate of candidates) {
    try {
      const rows = await candidate()
      if (rows.length > 0) {
        return rows
      }
    } catch {
      // Tabela/coluna nao encontrada para este shard, tentar proxima fonte.
    }
  }

  return []
}

export async function getLastUniqueSpawns(locale: Locale, limit = DEFAULT_LIMIT) {
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(limit, 30)) : DEFAULT_LIMIT

  try {
    const configured = await queryConfiguredSource(safeLimit, locale)

    if (configured) {
      return configured
    }

    return await queryFallbackSources(safeLimit, locale)
  } catch {
    return []
  }
}
