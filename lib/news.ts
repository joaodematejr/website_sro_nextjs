import { getDbPool } from '@/lib/db'
import { defaultLocale, type Locale } from '@/lib/i18n'

type RawNewsRow = Record<string, unknown>

type CandidateTable = {
  schemaName: string
  tableName: string
  titleColumn: string
  dateColumn: string
  typeColumn: string | null
  idColumn: string | null
}

export type NewsItem = {
  title: string
  date: string
  type: string
}

function quoteIdentifier(value: string) {
  return `[${value.replace(/]/g, ']]')}]`
}

function normalizeDate(value: unknown) {
  if (!value) {
    return null
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10)
  }

  const asString = String(value)
  const parsed = new Date(asString)

  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10)
  }

  return asString.slice(0, 10)
}

function defaultTypeByLocale(locale: Locale) {
  return locale === 'pt-BR' ? 'Aviso' : 'Notice'
}

function toNewsItem(row: RawNewsRow, locale: Locale, titleColumn: string, dateColumn: string, typeColumn: string | null) {
  const titleValue = row[titleColumn]
  const dateValue = row[dateColumn]

  if (!titleValue || !dateValue) {
    return null
  }

  const title = String(titleValue).trim()
  const date = normalizeDate(dateValue)

  if (!title || !date) {
    return null
  }

  const rawType = typeColumn ? row[typeColumn] : null

  return {
    title,
    date,
    type: rawType ? String(rawType).trim() : defaultTypeByLocale(locale),
  } satisfies NewsItem
}

async function findNewsTable(): Promise<CandidateTable | null> {
  const pool = await getDbPool('shard')
  const request = pool.request()

  const result = await request.query<{
    schemaName: string
    tableName: string
    titleColumn: string
    dateColumn: string
    typeColumn: string | null
    idColumn: string | null
  }>(`
    WITH table_columns AS (
      SELECT
        c.TABLE_SCHEMA AS schemaName,
        c.TABLE_NAME AS tableName,
        MAX(CASE
          WHEN LOWER(c.COLUMN_NAME) LIKE '%title%'
            OR LOWER(c.COLUMN_NAME) LIKE '%subject%'
            OR LOWER(c.COLUMN_NAME) LIKE '%topic%'
            OR LOWER(c.COLUMN_NAME) LIKE '%name%'
          THEN c.COLUMN_NAME END) AS titleColumn,
        MAX(CASE
          WHEN LOWER(c.COLUMN_NAME) LIKE '%date%'
            OR LOWER(c.COLUMN_NAME) LIKE '%time%'
            OR LOWER(c.COLUMN_NAME) LIKE '%create%'
            OR LOWER(c.COLUMN_NAME) LIKE '%write%'
            OR LOWER(c.COLUMN_NAME) LIKE '%reg%'
          THEN c.COLUMN_NAME END) AS dateColumn,
        MAX(CASE
          WHEN LOWER(c.COLUMN_NAME) LIKE '%type%'
            OR LOWER(c.COLUMN_NAME) LIKE '%category%'
            OR LOWER(c.COLUMN_NAME) LIKE '%kind%'
          THEN c.COLUMN_NAME END) AS typeColumn,
        MAX(CASE
          WHEN LOWER(c.COLUMN_NAME) = 'id'
            OR LOWER(c.COLUMN_NAME) LIKE '%idx%'
            OR LOWER(c.COLUMN_NAME) LIKE '%no%'
            OR LOWER(c.COLUMN_NAME) LIKE '%seq%'
          THEN c.COLUMN_NAME END) AS idColumn,
        SUM(CASE
          WHEN LOWER(c.TABLE_NAME) LIKE '%news%'
            OR LOWER(c.TABLE_NAME) LIKE '%notice%'
            OR LOWER(c.TABLE_NAME) LIKE '%board%'
            OR LOWER(c.TABLE_NAME) LIKE '%inform%'
          THEN 3 ELSE 0 END) AS nameScore,
        SUM(CASE
          WHEN LOWER(c.COLUMN_NAME) LIKE '%title%'
            OR LOWER(c.COLUMN_NAME) LIKE '%subject%'
            OR LOWER(c.COLUMN_NAME) LIKE '%topic%'
          THEN 2 ELSE 0 END) AS titleScore,
        SUM(CASE
          WHEN LOWER(c.COLUMN_NAME) LIKE '%date%'
            OR LOWER(c.COLUMN_NAME) LIKE '%time%'
            OR LOWER(c.COLUMN_NAME) LIKE '%create%'
            OR LOWER(c.COLUMN_NAME) LIKE '%write%'
          THEN 2 ELSE 0 END) AS dateScore
      FROM INFORMATION_SCHEMA.COLUMNS c
      WHERE c.TABLE_SCHEMA = 'dbo'
      GROUP BY c.TABLE_SCHEMA, c.TABLE_NAME
    )
    SELECT TOP 1
      schemaName,
      tableName,
      titleColumn,
      dateColumn,
      typeColumn,
      idColumn
    FROM table_columns
    WHERE titleColumn IS NOT NULL
      AND dateColumn IS NOT NULL
    ORDER BY (nameScore + titleScore + dateScore) DESC, tableName ASC
  `)

  const candidate = result.recordset[0]

  if (!candidate) {
    return null
  }

  return {
    schemaName: candidate.schemaName,
    tableName: candidate.tableName,
    titleColumn: candidate.titleColumn,
    dateColumn: candidate.dateColumn,
    typeColumn: candidate.typeColumn,
    idColumn: candidate.idColumn,
  }
}

export async function getLatestNewsFromDb(options?: { locale?: Locale; limit?: number }) {
  const locale = options?.locale ?? defaultLocale
  const limit = Math.max(1, Math.min(10, options?.limit ?? 3))

  try {
    const candidate = await findNewsTable()

    if (!candidate) {
      return null
    }

    const schemaName = quoteIdentifier(candidate.schemaName)
    const tableName = quoteIdentifier(candidate.tableName)
    const titleColumn = quoteIdentifier(candidate.titleColumn)
    const dateColumn = quoteIdentifier(candidate.dateColumn)
    const typeColumn = candidate.typeColumn ? quoteIdentifier(candidate.typeColumn) : null
    const idColumn = candidate.idColumn ? quoteIdentifier(candidate.idColumn) : null
    const selectType = typeColumn ? `${typeColumn} AS __news_type,` : ''
    const orderById = idColumn ? `, ${idColumn} DESC` : ''

    const pool = await getDbPool('shard')
    const request = pool.request()
    const rows = await request.query<RawNewsRow>(`
      SELECT TOP (${limit})
        ${titleColumn} AS __news_title,
        ${dateColumn} AS __news_date,
        ${selectType}
        ${dateColumn} AS __news_sort_date
      FROM ${schemaName}.${tableName}
      WHERE ${titleColumn} IS NOT NULL
        AND ${dateColumn} IS NOT NULL
      ORDER BY ${dateColumn} DESC${orderById}
    `)

    const mapped = rows.recordset
      .map((row) =>
        toNewsItem(
          row,
          locale,
          '__news_title',
          '__news_date',
          typeColumn ? '__news_type' : null,
        ),
      )
      .filter((item): item is NewsItem => item !== null)

    return mapped.length > 0 ? mapped : null
  } catch {
    return null
  }
}