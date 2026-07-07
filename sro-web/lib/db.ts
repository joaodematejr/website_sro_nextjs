import sql from 'mssql'

export type DbName = 'account' | 'log' | 'shard'

const databaseEnvByName = {
  account: 'DB_ACCOUNT_DATABASE',
  log: 'DB_LOG_DATABASE',
  shard: 'DB_SHARD_DATABASE',
} as const satisfies Record<DbName, string>

const requiredEnv = [
  'DB_SERVER',
  'DB_USER',
  'DB_PASSWORD',
  ...Object.values(databaseEnvByName),
] as const

function readBooleanEnv(envName: string, defaultValue: boolean) {
  const value = process.env[envName]?.trim().toLowerCase()

  if (!value) {
    return defaultValue
  }

  if (['1', 'true', 'yes', 'on'].includes(value)) {
    return true
  }

  if (['0', 'false', 'no', 'off'].includes(value)) {
    return false
  }

  return defaultValue
}

function createDbTarget(database: string) {
  const rawServer = process.env.DB_SERVER!.trim()
  const hasNamedInstance = rawServer.includes('\\')

  let server = rawServer
  let instanceName: string | undefined

  if (hasNamedInstance) {
    const [serverPart, instancePart] = rawServer.split('\\', 2)
    server = serverPart === '.' ? 'localhost' : serverPart
    instanceName = instancePart
  }

  let port: number | undefined = process.env.DB_PORT ? Number(process.env.DB_PORT) : 1433

  // Accept SQL Server host formats like "host,1433" when DB_PORT is not set.
  if (!process.env.DB_PORT && !hasNamedInstance && rawServer.includes(',')) {
    const [serverPart, inlinePort] = rawServer.split(',', 2)
    server = serverPart
    const inlineParsedPort = Number(inlinePort)
    port = Number.isFinite(inlineParsedPort) ? inlineParsedPort : 1433
  }

  const useInstanceName = hasNamedInstance && !process.env.DB_PORT

  if (useInstanceName) {
    port = undefined
  }

  const encrypt = readBooleanEnv('DB_ENCRYPT', false)

  return {
    server: server === '.' ? 'localhost' : server,
    database,
    port,
    encrypt,
    trustServerCertificate: readBooleanEnv('DB_TRUST_SERVER_CERTIFICATE', encrypt),
    ...(useInstanceName && instanceName ? { instanceName } : {}),
  }
}

for (const envName of requiredEnv) {
  if (!process.env[envName]) {
    throw new Error(`Missing environment variable: ${envName}`)
  }
}

function createDbConfig(database: string): sql.config {
  const target = createDbTarget(database)

  return {
    server: target.server,
    database,
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    ...(target.port !== undefined ? { port: target.port } : {}),
    options: {
      encrypt: target.encrypt,
      trustServerCertificate: target.trustServerCertificate,
      ...(target.instanceName ? { instanceName: target.instanceName } : {}),
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  }
}

export function getDbConnectionTarget(dbName: DbName = 'shard') {
  return createDbTarget(process.env[databaseEnvByName[dbName]]!)
}

declare global {
  // eslint-disable-next-line no-var
  var mssqlPools: Partial<Record<DbName, Promise<sql.ConnectionPool>>> | undefined
}

export function getDbPool(dbName: DbName = 'shard') {
  globalThis.mssqlPools ??= {}

  if (!globalThis.mssqlPools[dbName]) {
    const database = process.env[databaseEnvByName[dbName]]!
    globalThis.mssqlPools[dbName] = new sql.ConnectionPool(createDbConfig(database))
      .connect()
      .then((pool) => {
        pool.on('error', () => {
          if (globalThis.mssqlPools?.[dbName]) {
            delete globalThis.mssqlPools[dbName]
          }

          void pool.close().catch(() => undefined)
        })

        return pool
      })
      .catch((error) => {
        if (globalThis.mssqlPools?.[dbName]) {
          delete globalThis.mssqlPools[dbName]
        }

        throw error
      })
  }

  return globalThis.mssqlPools[dbName]
}

export async function resetDbPool(dbName: DbName) {
  const poolPromise = globalThis.mssqlPools?.[dbName]

  if (!poolPromise) {
    return
  }

  delete globalThis.mssqlPools?.[dbName]

  try {
    const pool = await poolPromise
    await pool.close()
  } catch {
    // Ignora erro ao fechar um pool já inválido.
  }
}

export { sql }
