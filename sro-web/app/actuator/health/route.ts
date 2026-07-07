import { type DbName, getDbConnectionTarget, getDbPool, resetDbPool } from '@/lib/db'

export const runtime = 'nodejs'

const databaseNames = ['account', 'log', 'shard'] as const satisfies readonly DbName[]

function isTransientSocketError(error: unknown) {
  if (!(error instanceof Error)) {
    return false
  }

  const e = error as Error & { code?: string; originalError?: { code?: string } }
  const codes = [e.code, e.originalError?.code]

  return codes.includes('ECONNRESET') || codes.includes('ESOCKET')
}

function serializeDbError(error: unknown) {
  if (!(error instanceof Error)) {
    return { message: 'Unknown SQL Server error' }
  }

  const e = error as Error & {
    code?: string
    originalError?: { code?: string; message?: string }
  }

  return {
    name: error.name,
    code: e.code,
    message: error.message,
    originalCode: e.originalError?.code,
    originalMessage: e.originalError?.message,
  }
}

function quoteSqlIdentifier(identifier: string) {
  return `[${identifier.replaceAll(']', ']]')}]`
}

async function queryHealthcheck(database: DbName) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const target = getDbConnectionTarget(database)

    try {
      const pool = await getDbPool('account')
      const result = await pool
        .request()
        .query(`SELECT TOP 1 1 AS ok FROM ${quoteSqlIdentifier(target.database)}.sys.database_principals`)

      return {
        database,
        connected: true,
        target,
        result: result.recordset,
      }
    } catch (error) {
      const canRetry = attempt === 0 && isTransientSocketError(error)

      if (!canRetry) {
        return {
          database,
          connected: false,
          target,
          error: serializeDbError(error),
        }
      }

      await resetDbPool('account')
    }
  }

  throw new Error(`Failed to query database: ${database}`)
}

async function queryDatabaseStatuses() {
  try {
    const pool = await getDbPool('account')
    const configuredDatabases = databaseNames.map((database) => getDbConnectionTarget(database).database)
    const request = pool.request()

    configuredDatabases.forEach((database, index) => {
      request.input(`database${index}`, database)
    })

    const placeholders = configuredDatabases.map((_, index) => `@database${index}`).join(', ')
    const result = await request.query(`
      SELECT name, state_desc, user_access_desc, is_read_only
      FROM sys.databases
      WHERE name IN (${placeholders})
      ORDER BY name
    `)

    return result.recordset
  } catch (error) {
    return { error: serializeDbError(error) }
  }
}

async function queryDatabaseAccessChecks() {
  const pool = await getDbPool('account')
  const checks = []

  for (const database of databaseNames) {
    const databaseName = getDbConnectionTarget(database).database

    try {
      const result = await pool
        .request()
        .query(`SELECT TOP 1 DB_NAME() AS current_database FROM ${quoteSqlIdentifier(databaseName)}.sys.objects`)

      checks.push({
        database,
        databaseName,
        accessible: true,
        result: result.recordset,
      })
    } catch (error) {
      checks.push({
        database,
        databaseName,
        accessible: false,
        error: serializeDbError(error),
      })
    }
  }

  return checks
}

export async function GET() {
  const results = []

  for (const database of databaseNames) {
    results.push(await queryHealthcheck(database))
  }

  const connected = results.every((result) => result.connected)

  if (!connected) {
    const databaseStatuses = await queryDatabaseStatuses()
    const databaseAccessChecks = await queryDatabaseAccessChecks()

    console.error('SQL Server healthcheck failed:', {
      results,
      databaseStatuses,
      databaseAccessChecks,
    })
    return Response.json(
      { connected, results, databaseStatuses, databaseAccessChecks },
      { status: 500 },
    )
  }

  return Response.json({ connected, results })
}
