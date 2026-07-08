import mssql from 'mssql'
import { getDbPool } from '@/lib/db'

export type OnlineSnapshot = {
  onlineNow: number | null
  peak24h: number | null
}

export type JobLeader = {
  rank: number
  charName: string
  jobName: string
  score: number
}

export type FortressSnapshot = {
  fortressName: string
  ownerGuild: string
  taxRate: number | null
  nextSiegeAt: string | null
}

export type SpawnTrackerItem = {
  uniqueName: string
  lastKillAt: string | null
  nextSpawnAt: string | null
}

export type FortressTimelineItem = {
  fortressName: string
  previousOwner: string
  newOwner: string
  changedAt: string | null
}

export type NewCharactersSnapshot = {
  created24h: number | null
  created7d: number | null
}

export type ServiceStatusLevel = 'online' | 'degraded' | 'offline' | 'unknown'

export type ServiceStatusSnapshot = {
  gateway: ServiceStatusLevel
  login: ServiceStatusLevel
  shard: ServiceStatusLevel
  billing: ServiceStatusLevel
  updatedAt: string | null
}

export type LoginQueueSnapshot = {
  queueSize: number | null
  avgWaitSeconds: number | null
}

export type LoginSuccessSnapshot = {
  successRate1h: number | null
  attempts1h: number | null
}

export type UptimeSnapshot = {
  uptime24h: number | null
  uptime7d: number | null
}

export type ServiceLatencySnapshot = {
  gatewayMs: number | null
  loginMs: number | null
  shardMs: number | null
  billingMs: number | null
  updatedAt: string | null
}

export type ActiveEventItem = {
  eventName: string
  startsAt: string | null
  endsAt: string | null
}

export type RetentionSnapshot = {
  retentionD1: number | null
  retentionD7: number | null
  cohort7d: number | null
}

export type LevelDistributionBucket = {
  rangeLabel: string
  players: number
}

export type SilkConsumptionSnapshot = {
  consumed24h: number | null
  consumed7d: number | null
}

export type DauWauSnapshot = {
  dau: number | null
  wau: number | null
  dauWauRatio: number | null
}

export type NewPlayerConversionSnapshot = {
  created24h: number | null
  firstLogin24h: number | null
  firstCharacter24h: number | null
}

export type JobDistributionEntry = {
  jobName: string
  players: number
}

export type PublicHomeStats = {
  online: OnlineSnapshot
  topJobs: JobLeader[]
  fortresses: FortressSnapshot[]
  spawnTracker: SpawnTrackerItem[]
  fortressTimeline: FortressTimelineItem[]
  newCharacters: NewCharactersSnapshot
  serviceStatus: ServiceStatusSnapshot
  loginQueue: LoginQueueSnapshot
  loginSuccess: LoginSuccessSnapshot
  uptime: UptimeSnapshot
  serviceLatency: ServiceLatencySnapshot
  activeEvents: ActiveEventItem[]
  retention: RetentionSnapshot
  levelDistribution: LevelDistributionBucket[]
  silkConsumption: SilkConsumptionSnapshot
  dauWau: DauWauSnapshot
  newPlayerConversion: NewPlayerConversionSnapshot
  jobDistribution: JobDistributionEntry[]
}

const DEFAULT_TOP_LIMIT = 5

function sanitizeIdentifier(value: string) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(value)
}

function toFiniteNumber(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function toIsoString(value: unknown): string | null {
  if (!value) {
    return null
  }

  const parsed = value instanceof Date ? value : new Date(String(value))
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

async function queryConfiguredOnline(): Promise<OnlineSnapshot | null> {
  const table = process.env.PUBLIC_ONLINE_TABLE?.trim()

  if (!table) {
    return null
  }

  const valueColumn = (process.env.PUBLIC_ONLINE_VALUE_COLUMN || 'OnlineCount').trim()
  const timeColumn = (process.env.PUBLIC_ONLINE_TIME_COLUMN || 'RegDate').trim()

  if (![table, valueColumn, timeColumn].every(sanitizeIdentifier)) {
    return { onlineNow: null, peak24h: null }
  }

  const pool = await getDbPool('shard')
  const nowResult = await pool.request().query<{ onlineNow: number }>(`
    SELECT TOP 1
      [${valueColumn}] AS onlineNow
    FROM [dbo].[${table}]
    ORDER BY [${timeColumn}] DESC
  `)

  const peakResult = await pool.request().query<{ peak24h: number }>(`
    SELECT
      MAX([${valueColumn}]) AS peak24h
    FROM [dbo].[${table}]
    WHERE [${timeColumn}] >= DATEADD(HOUR, -24, GETDATE())
  `)

  const onlineNow = toFiniteNumber(nowResult.recordset[0]?.onlineNow)
  const peak24h = toFiniteNumber(peakResult.recordset[0]?.peak24h)

  return {
    onlineNow,
    peak24h: peak24h ?? onlineNow,
  }
}

async function queryFallbackOnline(): Promise<OnlineSnapshot> {
  const pool = await getDbPool('shard')

  const candidates: Array<() => Promise<OnlineSnapshot>> = [
    async () => {
      const nowResult = await pool.request().query<{ onlineNow: number }>(`
        SELECT COUNT(*) AS onlineNow
        FROM [dbo].[_ShardCurrentUser]
      `)

      const onlineNow = toFiniteNumber(nowResult.recordset[0]?.onlineNow)
      return { onlineNow, peak24h: onlineNow }
    },
    async () => {
      const onlineResult = await pool.request().query<{ onlineNow: number }>(`
        SELECT TOP 1 OnlineCount AS onlineNow
        FROM [dbo].[_ServerOnlineHistory]
        ORDER BY RegDate DESC
      `)

      const peakResult = await pool.request().query<{ peak24h: number }>(`
        SELECT MAX(OnlineCount) AS peak24h
        FROM [dbo].[_ServerOnlineHistory]
        WHERE RegDate >= DATEADD(HOUR, -24, GETDATE())
      `)

      const onlineNow = toFiniteNumber(onlineResult.recordset[0]?.onlineNow)
      const peak24h = toFiniteNumber(peakResult.recordset[0]?.peak24h)

      return {
        onlineNow,
        peak24h: peak24h ?? onlineNow,
      }
    },
  ]

  for (const candidate of candidates) {
    try {
      return await candidate()
    } catch {
      // Tabela nao existe neste shard, testar proxima fonte.
    }
  }

  return { onlineNow: null, peak24h: null }
}

async function queryConfiguredTopJobs(limit: number): Promise<JobLeader[] | null> {
  const table = process.env.PUBLIC_JOB_TABLE?.trim()

  if (!table) {
    return null
  }

  const charColumn = (process.env.PUBLIC_JOB_CHAR_COLUMN || 'CharName').trim()
  const jobColumn = (process.env.PUBLIC_JOB_TYPE_COLUMN || 'JobName').trim()
  const scoreColumn = (process.env.PUBLIC_JOB_SCORE_COLUMN || 'Points').trim()

  if (![table, charColumn, jobColumn, scoreColumn].every(sanitizeIdentifier)) {
    return []
  }

  const pool = await getDbPool('shard')
  const result = await pool.request().query<{
    CharName: string
    JobName: string
    Score: number
  }>(`
    SELECT TOP (${limit})
      [${charColumn}] AS CharName,
      [${jobColumn}] AS JobName,
      [${scoreColumn}] AS Score
    FROM [dbo].[${table}]
    ORDER BY [${scoreColumn}] DESC
  `)

  return result.recordset
    .map((row, index) => {
      const charName = String(row.CharName ?? '').trim()
      const jobName = String(row.JobName ?? '').trim()
      const score = toFiniteNumber(row.Score)

      if (!charName || !jobName || score === null) {
        return null
      }

      return {
        rank: index + 1,
        charName,
        jobName,
        score,
      } satisfies JobLeader
    })
    .filter((row): row is JobLeader => row !== null)
}

async function queryFallbackTopJobs(limit: number): Promise<JobLeader[]> {
  const pool = await getDbPool('shard')

  const candidates: Array<() => Promise<JobLeader[]>> = [
    async () => {
      const result = await pool.request().query<{
        CharName16: string
        JobType: number
        JobLevel: number
        JobExp: number
      }>(`
        SELECT TOP (${limit})
          c.CharName16,
          t.JobType,
          t.Level AS JobLevel,
          t.Exp AS JobExp
        FROM [dbo].[_CharTrijob] t
        INNER JOIN [dbo].[_Char] c ON c.CharID = t.CharID
        ORDER BY t.Level DESC, t.Exp DESC
      `)

      return result.recordset
        .map((row, index) => {
          const charName = String(row.CharName16 ?? '').trim()

          if (!charName) {
            return null
          }

          const score = (toFiniteNumber(row.JobLevel) ?? 0) * 100000 + (toFiniteNumber(row.JobExp) ?? 0)
          const jobType = toFiniteNumber(row.JobType) ?? 0
          const jobName = jobType === 1 ? 'Trader' : jobType === 2 ? 'Thief' : jobType === 3 ? 'Hunter' : 'Unknown'

          return {
            rank: index + 1,
            charName,
            jobName,
            score,
          } satisfies JobLeader
        })
        .filter((row): row is JobLeader => row !== null)
    },
    async () => {
      const result = await pool.request().query<{
        CharName: string
        JobName: string
        Points: number
      }>(`
        SELECT TOP (${limit})
          CharName,
          JobName,
          Points
        FROM [dbo].[_JobRanking]
        ORDER BY Points DESC
      `)

      return result.recordset
        .map((row, index) => {
          const charName = String(row.CharName ?? '').trim()
          const jobName = String(row.JobName ?? '').trim() || 'Unknown'
          const score = toFiniteNumber(row.Points)

          if (!charName || score === null) {
            return null
          }

          return {
            rank: index + 1,
            charName,
            jobName,
            score,
          } satisfies JobLeader
        })
        .filter((row): row is JobLeader => row !== null)
    },
  ]

  for (const candidate of candidates) {
    try {
      const rows = await candidate()
      if (rows.length > 0) {
        return rows
      }
    } catch {
      // Estrutura nao encontrada no shard atual.
    }
  }

  return []
}

async function queryConfiguredFortress(limit: number): Promise<FortressSnapshot[] | null> {
  const table = process.env.PUBLIC_FORTRESS_TABLE?.trim()

  if (!table) {
    return null
  }

  const nameColumn = (process.env.PUBLIC_FORTRESS_NAME_COLUMN || 'FortressName').trim()
  const guildColumn = (process.env.PUBLIC_FORTRESS_GUILD_COLUMN || 'OwnerGuild').trim()
  const taxColumn = (process.env.PUBLIC_FORTRESS_TAX_COLUMN || 'TaxRate').trim()
  const siegeColumn = (process.env.PUBLIC_FORTRESS_SIEGE_COLUMN || 'NextSiegeAt').trim()

  if (![table, nameColumn, guildColumn, taxColumn, siegeColumn].every(sanitizeIdentifier)) {
    return []
  }

  const pool = await getDbPool('shard')
  const result = await pool.request().query<{
    FortressName: string
    OwnerGuild: string
    TaxRate: number
    NextSiegeAt: string | Date
  }>(`
    SELECT TOP (${limit})
      [${nameColumn}] AS FortressName,
      [${guildColumn}] AS OwnerGuild,
      [${taxColumn}] AS TaxRate,
      [${siegeColumn}] AS NextSiegeAt
    FROM [dbo].[${table}]
    ORDER BY [${nameColumn}] ASC
  `)

  return result.recordset
    .map((row) => {
      const fortressName = String(row.FortressName ?? '').trim()

      if (!fortressName) {
        return null
      }

      return {
        fortressName,
        ownerGuild: String(row.OwnerGuild ?? '').trim() || '-',
        taxRate: toFiniteNumber(row.TaxRate),
        nextSiegeAt: toIsoString(row.NextSiegeAt),
      } satisfies FortressSnapshot
    })
    .filter((row): row is FortressSnapshot => row !== null)
}

async function queryFallbackFortress(limit: number): Promise<FortressSnapshot[]> {
  const pool = await getDbPool('shard')

  const candidates: Array<() => Promise<FortressSnapshot[]>> = [
    async () => {
      const result = await pool.request().query<{
        FortressName: string
        OwnerGuild: string
        TaxRate: number
        NextSiegeAt: Date | string
      }>(`
        SELECT TOP (${limit})
          f.FortressName,
          ISNULL(g.GuildName, '-') AS OwnerGuild,
          f.TaxRatio AS TaxRate,
          f.NextSiegeTime AS NextSiegeAt
        FROM [dbo].[_SiegeFortress] f
        LEFT JOIN [dbo].[_Guild] g ON g.GuildID = f.OwnerGuildID
        ORDER BY f.FortressName ASC
      `)

      return result.recordset.map((row) => ({
        fortressName: String(row.FortressName ?? '').trim(),
        ownerGuild: String(row.OwnerGuild ?? '').trim() || '-',
        taxRate: toFiniteNumber(row.TaxRate),
        nextSiegeAt: toIsoString(row.NextSiegeAt),
      }))
    },
    async () => {
      const result = await pool.request().query<{
        FortressName: string
        OwnerGuild: string
        TaxRate: number
        NextSiegeAt: Date | string
      }>(`
        SELECT TOP (${limit})
          FortressName,
          ISNULL(OwnerGuildName, '-') AS OwnerGuild,
          TaxRate,
          NextSiegeTime AS NextSiegeAt
        FROM [dbo].[_FortressStatus]
        ORDER BY FortressName ASC
      `)

      return result.recordset.map((row) => ({
        fortressName: String(row.FortressName ?? '').trim(),
        ownerGuild: String(row.OwnerGuild ?? '').trim() || '-',
        taxRate: toFiniteNumber(row.TaxRate),
        nextSiegeAt: toIsoString(row.NextSiegeAt),
      }))
    },
  ]

  for (const candidate of candidates) {
    try {
      const rows = (await candidate()).filter((row) => row.fortressName)
      if (rows.length > 0) {
        return rows
      }
    } catch {
      // Estrutura indisponivel neste shard.
    }
  }

  return []
}

function estimateRespawnMinutes(uniqueName: string) {
  const normalized = uniqueName.toLowerCase()

  if (normalized.includes('tg') || normalized.includes('tiger girl')) {
    return 120
  }

  if (normalized.includes('uruchi') || normalized.includes('isyutaru')) {
    return 180
  }

  if (normalized.includes('lord yarkan') || normalized.includes('demon shaitan')) {
    return 240
  }

  if (normalized.includes('medusa')) {
    return 480
  }

  return Number.isFinite(Number(process.env.PUBLIC_UNIQUE_DEFAULT_RESPAWN_MINUTES))
    ? Number(process.env.PUBLIC_UNIQUE_DEFAULT_RESPAWN_MINUTES)
    : 360
}

function buildSpawnTracker(uniqueName: string, lastKillAt: unknown): SpawnTrackerItem | null {
  const cleanName = String(uniqueName ?? '').trim()

  if (!cleanName) {
    return null
  }

  const parsed = lastKillAt instanceof Date ? lastKillAt : new Date(String(lastKillAt ?? ''))

  if (Number.isNaN(parsed.getTime())) {
    return {
      uniqueName: cleanName,
      lastKillAt: null,
      nextSpawnAt: null,
    }
  }

  const respawnMinutes = Math.max(1, estimateRespawnMinutes(cleanName))
  const nextSpawnAt = new Date(parsed.getTime() + respawnMinutes * 60_000)

  return {
    uniqueName: cleanName,
    lastKillAt: parsed.toISOString(),
    nextSpawnAt: nextSpawnAt.toISOString(),
  }
}

async function queryConfiguredSpawnTracker(limit: number): Promise<SpawnTrackerItem[] | null> {
  const table = process.env.PUBLIC_SPAWN_TABLE?.trim()

  if (!table) {
    return null
  }

  const nameColumn = (process.env.PUBLIC_SPAWN_NAME_COLUMN || 'UniqueName').trim()
  const killAtColumn = (process.env.PUBLIC_SPAWN_KILLED_AT_COLUMN || 'KilledAt').trim()

  if (![table, nameColumn, killAtColumn].every(sanitizeIdentifier)) {
    return []
  }

  const pool = await getDbPool('shard')
  const result = await pool.request().query<{ UniqueName: string; KilledAt: Date | string }>(`
    SELECT TOP (${limit})
      [${nameColumn}] AS UniqueName,
      [${killAtColumn}] AS KilledAt
    FROM [dbo].[${table}]
    ORDER BY [${killAtColumn}] DESC
  `)

  return result.recordset
    .map((row) => buildSpawnTracker(row.UniqueName, row.KilledAt))
    .filter((row): row is SpawnTrackerItem => row !== null)
}

async function queryFallbackSpawnTracker(limit: number): Promise<SpawnTrackerItem[]> {
  const pool = await getDbPool('shard')

  const candidates: Array<() => Promise<SpawnTrackerItem[]>> = [
    async () => {
      const result = await pool.request().query<{ UniqueName: string; KilledAt: Date | string }>(`
        SELECT TOP (${limit})
          UniqueName,
          KilledAt
        FROM [dbo].[_UniqueHistory]
        ORDER BY KilledAt DESC
      `)

      return result.recordset
        .map((row) => buildSpawnTracker(row.UniqueName, row.KilledAt))
        .filter((row): row is SpawnTrackerItem => row !== null)
    },
    async () => {
      const result = await pool.request().query<{ UniqueName: string; KilledAt: Date | string }>(`
        SELECT TOP (${limit})
          UniqueName,
          EventTime AS KilledAt
        FROM [dbo].[_LogUniqueKill]
        ORDER BY EventTime DESC
      `)

      return result.recordset
        .map((row) => buildSpawnTracker(row.UniqueName, row.KilledAt))
        .filter((row): row is SpawnTrackerItem => row !== null)
    },
  ]

  for (const candidate of candidates) {
    try {
      const rows = await candidate()
      if (rows.length > 0) {
        return rows
      }
    } catch {
      // Fonte indisponivel no shard atual.
    }
  }

  return []
}

async function queryConfiguredFortressTimeline(limit: number): Promise<FortressTimelineItem[] | null> {
  const table = process.env.PUBLIC_FORTRESS_TIMELINE_TABLE?.trim()

  if (!table) {
    return null
  }

  const fortressColumn = (process.env.PUBLIC_FORTRESS_TIMELINE_FORTRESS_COLUMN || 'FortressName').trim()
  const previousOwnerColumn = (process.env.PUBLIC_FORTRESS_TIMELINE_PREV_OWNER_COLUMN || 'PreviousOwner').trim()
  const newOwnerColumn = (process.env.PUBLIC_FORTRESS_TIMELINE_NEW_OWNER_COLUMN || 'NewOwner').trim()
  const changedAtColumn = (process.env.PUBLIC_FORTRESS_TIMELINE_CHANGED_AT_COLUMN || 'ChangedAt').trim()

  if (![table, fortressColumn, previousOwnerColumn, newOwnerColumn, changedAtColumn].every(sanitizeIdentifier)) {
    return []
  }

  const pool = await getDbPool('shard')
  const result = await pool.request().query<{
    FortressName: string
    PreviousOwner: string
    NewOwner: string
    ChangedAt: string | Date
  }>(`
    SELECT TOP (${limit})
      [${fortressColumn}] AS FortressName,
      [${previousOwnerColumn}] AS PreviousOwner,
      [${newOwnerColumn}] AS NewOwner,
      [${changedAtColumn}] AS ChangedAt
    FROM [dbo].[${table}]
    ORDER BY [${changedAtColumn}] DESC
  `)

  return result.recordset
    .map((row) => ({
      fortressName: String(row.FortressName ?? '').trim(),
      previousOwner: String(row.PreviousOwner ?? '').trim() || '-',
      newOwner: String(row.NewOwner ?? '').trim() || '-',
      changedAt: toIsoString(row.ChangedAt),
    }))
    .filter((row) => row.fortressName)
}

async function queryFallbackFortressTimeline(limit: number): Promise<FortressTimelineItem[]> {
  const pool = await getDbPool('shard')

  const candidates: Array<() => Promise<FortressTimelineItem[]>> = [
    async () => {
      const result = await pool.request().query<{
        FortressName: string
        PreviousOwner: string
        NewOwner: string
        ChangedAt: string | Date
      }>(`
        SELECT TOP (${limit})
          FortressName,
          ISNULL(PrevOwnerGuildName, '-') AS PreviousOwner,
          ISNULL(NewOwnerGuildName, '-') AS NewOwner,
          RegDate AS ChangedAt
        FROM [dbo].[_FortressSiegeHistory]
        ORDER BY RegDate DESC
      `)

      return result.recordset
        .map((row) => ({
          fortressName: String(row.FortressName ?? '').trim(),
          previousOwner: String(row.PreviousOwner ?? '').trim() || '-',
          newOwner: String(row.NewOwner ?? '').trim() || '-',
          changedAt: toIsoString(row.ChangedAt),
        }))
        .filter((row) => row.fortressName)
    },
    async () => {
      const result = await pool.request().query<{
        FortressName: string
        PreviousOwner: string
        NewOwner: string
        ChangedAt: string | Date
      }>(`
        SELECT TOP (${limit})
          FortressName,
          ISNULL(OldOwnerGuildName, '-') AS PreviousOwner,
          ISNULL(NewOwnerGuildName, '-') AS NewOwner,
          SiegeDate AS ChangedAt
        FROM [dbo].[_SiegeFortressHistory]
        ORDER BY SiegeDate DESC
      `)

      return result.recordset
        .map((row) => ({
          fortressName: String(row.FortressName ?? '').trim(),
          previousOwner: String(row.PreviousOwner ?? '').trim() || '-',
          newOwner: String(row.NewOwner ?? '').trim() || '-',
          changedAt: toIsoString(row.ChangedAt),
        }))
        .filter((row) => row.fortressName)
    },
  ]

  for (const candidate of candidates) {
    try {
      const rows = await candidate()
      if (rows.length > 0) {
        return rows
      }
    } catch {
      // Fonte indisponivel.
    }
  }

  return []
}

async function queryConfiguredNewCharacters(): Promise<NewCharactersSnapshot | null> {
  const table = process.env.PUBLIC_NEW_CHAR_TABLE?.trim()

  if (!table) {
    return null
  }

  const dateColumn = (process.env.PUBLIC_NEW_CHAR_DATE_COLUMN || 'RegDate').trim()

  if (![table, dateColumn].every(sanitizeIdentifier)) {
    return { created24h: null, created7d: null }
  }

  const pool = await getDbPool('shard')
  const result = await pool.request().query<{ created24h: number; created7d: number }>(`
    SELECT
      SUM(CASE WHEN [${dateColumn}] >= DATEADD(HOUR, -24, GETDATE()) THEN 1 ELSE 0 END) AS created24h,
      SUM(CASE WHEN [${dateColumn}] >= DATEADD(DAY, -7, GETDATE()) THEN 1 ELSE 0 END) AS created7d
    FROM [dbo].[${table}]
  `)

  return {
    created24h: toFiniteNumber(result.recordset[0]?.created24h),
    created7d: toFiniteNumber(result.recordset[0]?.created7d),
  }
}

async function queryFallbackNewCharacters(): Promise<NewCharactersSnapshot> {
  const pool = await getDbPool('shard')

  const candidates: Array<() => Promise<NewCharactersSnapshot>> = [
    async () => {
      const result = await pool.request().query<{ created24h: number; created7d: number }>(`
        SELECT
          SUM(CASE WHEN c.RegDate >= DATEADD(HOUR, -24, GETDATE()) THEN 1 ELSE 0 END) AS created24h,
          SUM(CASE WHEN c.RegDate >= DATEADD(DAY, -7, GETDATE()) THEN 1 ELSE 0 END) AS created7d
        FROM [dbo].[_Char] c
        WHERE c.CharType = 0
      `)

      return {
        created24h: toFiniteNumber(result.recordset[0]?.created24h),
        created7d: toFiniteNumber(result.recordset[0]?.created7d),
      }
    },
    async () => {
      const result = await pool.request().query<{ created24h: number; created7d: number }>(`
        SELECT
          SUM(CASE WHEN c.CreateDate >= DATEADD(HOUR, -24, GETDATE()) THEN 1 ELSE 0 END) AS created24h,
          SUM(CASE WHEN c.CreateDate >= DATEADD(DAY, -7, GETDATE()) THEN 1 ELSE 0 END) AS created7d
        FROM [dbo].[_Char] c
        WHERE c.CharType = 0
      `)

      return {
        created24h: toFiniteNumber(result.recordset[0]?.created24h),
        created7d: toFiniteNumber(result.recordset[0]?.created7d),
      }
    },
  ]

  for (const candidate of candidates) {
    try {
      return await candidate()
    } catch {
      // Coluna/tabela nao encontrada.
    }
  }

  return { created24h: null, created7d: null }
}

function normalizeServiceStatus(value: unknown): ServiceStatusLevel {
  const normalized = String(value ?? '').trim().toLowerCase()

  if (['online', 'up', 'ok', 'healthy', '1', 'true'].includes(normalized)) {
    return 'online'
  }

  if (['degraded', 'warn', 'warning', 'slow'].includes(normalized)) {
    return 'degraded'
  }

  if (['offline', 'down', 'error', '0', 'false'].includes(normalized)) {
    return 'offline'
  }

  return 'unknown'
}

async function queryConfiguredServiceStatus(): Promise<ServiceStatusSnapshot | null> {
  const table = process.env.PUBLIC_SERVICE_STATUS_TABLE?.trim()

  if (!table) {
    return null
  }

  const gatewayColumn = (process.env.PUBLIC_SERVICE_GATEWAY_COLUMN || 'GatewayStatus').trim()
  const loginColumn = (process.env.PUBLIC_SERVICE_LOGIN_COLUMN || 'LoginStatus').trim()
  const shardColumn = (process.env.PUBLIC_SERVICE_SHARD_COLUMN || 'ShardStatus').trim()
  const billingColumn = (process.env.PUBLIC_SERVICE_BILLING_COLUMN || 'BillingStatus').trim()
  const timeColumn = (process.env.PUBLIC_SERVICE_TIME_COLUMN || 'UpdatedAt').trim()

  if (![table, gatewayColumn, loginColumn, shardColumn, billingColumn, timeColumn].every(sanitizeIdentifier)) {
    return {
      gateway: 'unknown',
      login: 'unknown',
      shard: 'unknown',
      billing: 'unknown',
      updatedAt: null,
    }
  }

  const pool = await getDbPool('log')
  const result = await pool.request().query<{
    GatewayStatus: unknown
    LoginStatus: unknown
    ShardStatus: unknown
    BillingStatus: unknown
    UpdatedAt: unknown
  }>(`
    SELECT TOP 1
      [${gatewayColumn}] AS GatewayStatus,
      [${loginColumn}] AS LoginStatus,
      [${shardColumn}] AS ShardStatus,
      [${billingColumn}] AS BillingStatus,
      [${timeColumn}] AS UpdatedAt
    FROM [dbo].[${table}]
    ORDER BY [${timeColumn}] DESC
  `)

  const row = result.recordset[0]

  return {
    gateway: normalizeServiceStatus(row?.GatewayStatus),
    login: normalizeServiceStatus(row?.LoginStatus),
    shard: normalizeServiceStatus(row?.ShardStatus),
    billing: normalizeServiceStatus(row?.BillingStatus),
    updatedAt: toIsoString(row?.UpdatedAt),
  }
}

async function queryFallbackServiceStatus(): Promise<ServiceStatusSnapshot> {
  const [shard, account, log] = await Promise.allSettled([
    getDbPool('shard'),
    getDbPool('account'),
    getDbPool('log'),
  ])

  return {
    gateway: process.env.PUBLIC_GATEWAY_STATUS
      ? normalizeServiceStatus(process.env.PUBLIC_GATEWAY_STATUS)
      : log.status === 'fulfilled'
      ? 'online'
      : 'unknown',
    login: account.status === 'fulfilled' ? 'online' : 'unknown',
    shard: shard.status === 'fulfilled' ? 'online' : 'offline',
    billing: account.status === 'fulfilled' ? 'online' : 'unknown',
    updatedAt: new Date().toISOString(),
  }
}

async function queryConfiguredLoginQueue(): Promise<LoginQueueSnapshot | null> {
  const table = process.env.PUBLIC_LOGIN_QUEUE_TABLE?.trim()

  if (!table) {
    return null
  }

  const queueColumn = (process.env.PUBLIC_LOGIN_QUEUE_SIZE_COLUMN || 'QueueSize').trim()
  const waitColumn = (process.env.PUBLIC_LOGIN_QUEUE_WAIT_COLUMN || 'AvgWaitSeconds').trim()
  const timeColumn = (process.env.PUBLIC_LOGIN_QUEUE_TIME_COLUMN || 'RegDate').trim()

  if (![table, queueColumn, waitColumn, timeColumn].every(sanitizeIdentifier)) {
    return { queueSize: null, avgWaitSeconds: null }
  }

  const pool = await getDbPool('log')
  const result = await pool.request().query<{ QueueSize: unknown; AvgWaitSeconds: unknown }>(`
    SELECT TOP 1
      [${queueColumn}] AS QueueSize,
      [${waitColumn}] AS AvgWaitSeconds
    FROM [dbo].[${table}]
    ORDER BY [${timeColumn}] DESC
  `)

  return {
    queueSize: toFiniteNumber(result.recordset[0]?.QueueSize),
    avgWaitSeconds: toFiniteNumber(result.recordset[0]?.AvgWaitSeconds),
  }
}

async function queryFallbackLoginQueue(): Promise<LoginQueueSnapshot> {
  const pool = await getDbPool('shard')

  const candidates: Array<() => Promise<LoginQueueSnapshot>> = [
    async () => {
      const result = await pool.request().query<{ QueueSize: number; AvgWaitSeconds: number }>(`
        SELECT TOP 1
          QueueSize,
          AvgWaitSeconds
        FROM [dbo].[_LoginQueueStatus]
        ORDER BY RegDate DESC
      `)

      return {
        queueSize: toFiniteNumber(result.recordset[0]?.QueueSize),
        avgWaitSeconds: toFiniteNumber(result.recordset[0]?.AvgWaitSeconds),
      }
    },
    async () => {
      const onlineResult = await pool.request().query<{ onlineNow: number }>(`
        SELECT COUNT(*) AS onlineNow
        FROM [dbo].[_ShardCurrentUser]
      `)

      const onlineNow = toFiniteNumber(onlineResult.recordset[0]?.onlineNow)
      const maxOnline = toFiniteNumber(process.env.SERVER_MAX_ONLINE)
      const queueSize = maxOnline !== null && onlineNow !== null ? Math.max(0, onlineNow - maxOnline) : null

      return {
        queueSize,
        avgWaitSeconds: null,
      }
    },
  ]

  for (const candidate of candidates) {
    try {
      return await candidate()
    } catch {
      // Fonte indisponivel no shard/log atual.
    }
  }

  return {
    queueSize: null,
    avgWaitSeconds: null,
  }
}

async function queryConfiguredLoginSuccess(): Promise<LoginSuccessSnapshot | null> {
  const table = process.env.PUBLIC_LOGIN_SUCCESS_TABLE?.trim()

  if (!table) {
    return null
  }

  const successColumn = (process.env.PUBLIC_LOGIN_SUCCESS_VALUE_COLUMN || 'SuccessRate').trim()
  const attemptsColumn = (process.env.PUBLIC_LOGIN_SUCCESS_ATTEMPTS_COLUMN || 'Attempts').trim()
  const timeColumn = (process.env.PUBLIC_LOGIN_SUCCESS_TIME_COLUMN || 'RegDate').trim()

  if (![table, successColumn, attemptsColumn, timeColumn].every(sanitizeIdentifier)) {
    return { successRate1h: null, attempts1h: null }
  }

  const pool = await getDbPool('log')
  const result = await pool.request().query<{ SuccessRate: unknown; Attempts: unknown }>(`
    SELECT TOP 1
      [${successColumn}] AS SuccessRate,
      [${attemptsColumn}] AS Attempts
    FROM [dbo].[${table}]
    ORDER BY [${timeColumn}] DESC
  `)

  return {
    successRate1h: toFiniteNumber(result.recordset[0]?.SuccessRate),
    attempts1h: toFiniteNumber(result.recordset[0]?.Attempts),
  }
}

async function queryFallbackLoginSuccess(): Promise<LoginSuccessSnapshot> {
  const pool = await getDbPool('log')

  const candidates: Array<() => Promise<LoginSuccessSnapshot>> = [
    async () => {
      const result = await pool.request().query<{ attempts: number; success: number }>(`
        SELECT
          COUNT(*) AS attempts,
          SUM(CASE WHEN Result = 1 THEN 1 ELSE 0 END) AS success
        FROM [dbo].[_LogEventCharLogin]
        WHERE RegDate >= DATEADD(HOUR, -1, GETDATE())
      `)

      const attempts = toFiniteNumber(result.recordset[0]?.attempts)
      const success = toFiniteNumber(result.recordset[0]?.success)

      return {
        successRate1h: attempts && success !== null ? (success / attempts) * 100 : null,
        attempts1h: attempts,
      }
    },
    async () => {
      const result = await pool.request().query<{ attempts: number; success: number }>(`
        SELECT
          COUNT(*) AS attempts,
          SUM(CASE WHEN IsSuccess = 1 THEN 1 ELSE 0 END) AS success
        FROM [dbo].[_LoginHistory]
        WHERE EventTime >= DATEADD(HOUR, -1, GETDATE())
      `)

      const attempts = toFiniteNumber(result.recordset[0]?.attempts)
      const success = toFiniteNumber(result.recordset[0]?.success)

      return {
        successRate1h: attempts && success !== null ? (success / attempts) * 100 : null,
        attempts1h: attempts,
      }
    },
    async () => {
      const result = await pool.request().query<{ attempts: number; success: number }>(`
        SELECT
          COUNT(*) AS attempts,
          SUM(CASE WHEN Status IN (1, 'SUCCESS', 'OK') THEN 1 ELSE 0 END) AS success
        FROM [dbo].[_UserLoginLog]
        WHERE RegDate >= DATEADD(HOUR, -1, GETDATE())
      `)

      const attempts = toFiniteNumber(result.recordset[0]?.attempts)
      const success = toFiniteNumber(result.recordset[0]?.success)

      return {
        successRate1h: attempts && success !== null ? (success / attempts) * 100 : null,
        attempts1h: attempts,
      }
    },
  ]

  for (const candidate of candidates) {
    try {
      const data = await candidate()
      if (data.attempts1h !== null) {
        return data
      }
    } catch {
      // Fonte indisponivel.
    }
  }

  return {
    successRate1h: null,
    attempts1h: null,
  }
}

function clampPercent(value: number | null) {
  if (value === null) {
    return null
  }

  return Math.max(0, Math.min(100, value))
}

async function queryConfiguredUptime(): Promise<UptimeSnapshot | null> {
  const table = process.env.PUBLIC_UPTIME_TABLE?.trim()

  if (!table) {
    return null
  }

  const statusColumn = (process.env.PUBLIC_UPTIME_STATUS_COLUMN || 'Status').trim()
  const timeColumn = (process.env.PUBLIC_UPTIME_TIME_COLUMN || 'RegDate').trim()

  if (![table, statusColumn, timeColumn].every(sanitizeIdentifier)) {
    return { uptime24h: null, uptime7d: null }
  }

  const pool = await getDbPool('log')
  const result = await pool.request().query<{ uptime24h: number; uptime7d: number }>(`
    SELECT
      AVG(CASE
        WHEN [${timeColumn}] >= DATEADD(HOUR, -24, GETDATE())
        THEN CASE WHEN LOWER(CONVERT(varchar(32), [${statusColumn}])) IN ('online','up','ok','healthy','1','true') THEN 100.0 ELSE 0.0 END
      END) AS uptime24h,
      AVG(CASE
        WHEN [${timeColumn}] >= DATEADD(DAY, -7, GETDATE())
        THEN CASE WHEN LOWER(CONVERT(varchar(32), [${statusColumn}])) IN ('online','up','ok','healthy','1','true') THEN 100.0 ELSE 0.0 END
      END) AS uptime7d
    FROM [dbo].[${table}]
  `)

  return {
    uptime24h: clampPercent(toFiniteNumber(result.recordset[0]?.uptime24h)),
    uptime7d: clampPercent(toFiniteNumber(result.recordset[0]?.uptime7d)),
  }
}

async function queryFallbackUptime(): Promise<UptimeSnapshot> {
  const pool = await getDbPool('shard')

  const candidates: Array<() => Promise<UptimeSnapshot>> = [
    async () => {
      const result = await pool.request().query<{ uptime24h: number; uptime7d: number }>(`
        SELECT
          AVG(CASE WHEN RegDate >= DATEADD(HOUR, -24, GETDATE()) THEN CASE WHEN OnlineCount > 0 THEN 100.0 ELSE 0.0 END END) AS uptime24h,
          AVG(CASE WHEN RegDate >= DATEADD(DAY, -7, GETDATE()) THEN CASE WHEN OnlineCount > 0 THEN 100.0 ELSE 0.0 END END) AS uptime7d
        FROM [dbo].[_ServerOnlineHistory]
      `)

      return {
        uptime24h: clampPercent(toFiniteNumber(result.recordset[0]?.uptime24h)),
        uptime7d: clampPercent(toFiniteNumber(result.recordset[0]?.uptime7d)),
      }
    },
    async () => {
      const result = await pool.request().query<{ uptime24h: number; uptime7d: number }>(`
        SELECT
          AVG(CASE WHEN EventTime >= DATEADD(HOUR, -24, GETDATE()) THEN CASE WHEN IsOnline = 1 THEN 100.0 ELSE 0.0 END END) AS uptime24h,
          AVG(CASE WHEN EventTime >= DATEADD(DAY, -7, GETDATE()) THEN CASE WHEN IsOnline = 1 THEN 100.0 ELSE 0.0 END END) AS uptime7d
        FROM [dbo].[_ShardStatusHistory]
      `)

      return {
        uptime24h: clampPercent(toFiniteNumber(result.recordset[0]?.uptime24h)),
        uptime7d: clampPercent(toFiniteNumber(result.recordset[0]?.uptime7d)),
      }
    },
  ]

  for (const candidate of candidates) {
    try {
      return await candidate()
    } catch {
      // Fonte indisponivel para este shard.
    }
  }

  return {
    uptime24h: null,
    uptime7d: null,
  }
}

async function queryConfiguredServiceLatency(): Promise<ServiceLatencySnapshot | null> {
  const table = process.env.PUBLIC_SERVICE_LATENCY_TABLE?.trim()

  if (!table) {
    return null
  }

  const gatewayColumn = (process.env.PUBLIC_SERVICE_LATENCY_GATEWAY_COLUMN || 'GatewayMs').trim()
  const loginColumn = (process.env.PUBLIC_SERVICE_LATENCY_LOGIN_COLUMN || 'LoginMs').trim()
  const shardColumn = (process.env.PUBLIC_SERVICE_LATENCY_SHARD_COLUMN || 'ShardMs').trim()
  const billingColumn = (process.env.PUBLIC_SERVICE_LATENCY_BILLING_COLUMN || 'BillingMs').trim()
  const timeColumn = (process.env.PUBLIC_SERVICE_LATENCY_TIME_COLUMN || 'RegDate').trim()

  if (![table, gatewayColumn, loginColumn, shardColumn, billingColumn, timeColumn].every(sanitizeIdentifier)) {
    return { gatewayMs: null, loginMs: null, shardMs: null, billingMs: null, updatedAt: null }
  }

  const pool = await getDbPool('log')
  const result = await pool.request().query<{
    GatewayMs: unknown
    LoginMs: unknown
    ShardMs: unknown
    BillingMs: unknown
    UpdatedAt: unknown
  }>(`
    SELECT TOP 1
      [${gatewayColumn}] AS GatewayMs,
      [${loginColumn}] AS LoginMs,
      [${shardColumn}] AS ShardMs,
      [${billingColumn}] AS BillingMs,
      [${timeColumn}] AS UpdatedAt
    FROM [dbo].[${table}]
    ORDER BY [${timeColumn}] DESC
  `)

  return {
    gatewayMs: toFiniteNumber(result.recordset[0]?.GatewayMs),
    loginMs: toFiniteNumber(result.recordset[0]?.LoginMs),
    shardMs: toFiniteNumber(result.recordset[0]?.ShardMs),
    billingMs: toFiniteNumber(result.recordset[0]?.BillingMs),
    updatedAt: toIsoString(result.recordset[0]?.UpdatedAt),
  }
}

async function queryFallbackServiceLatency(): Promise<ServiceLatencySnapshot> {
  const envGateway = toFiniteNumber(process.env.PUBLIC_SERVICE_LATENCY_GATEWAY_MS)
  const envLogin = toFiniteNumber(process.env.PUBLIC_SERVICE_LATENCY_LOGIN_MS)
  const envShard = toFiniteNumber(process.env.PUBLIC_SERVICE_LATENCY_SHARD_MS)
  const envBilling = toFiniteNumber(process.env.PUBLIC_SERVICE_LATENCY_BILLING_MS)

  if ([envGateway, envLogin, envShard, envBilling].some((value) => value !== null)) {
    return {
      gatewayMs: envGateway,
      loginMs: envLogin,
      shardMs: envShard,
      billingMs: envBilling,
      updatedAt: new Date().toISOString(),
    }
  }

  const pool = await getDbPool('log')
  const candidates: Array<() => Promise<ServiceLatencySnapshot>> = [
    async () => {
      const result = await pool.request().query<{
        GatewayMs: unknown
        LoginMs: unknown
        ShardMs: unknown
        BillingMs: unknown
        UpdatedAt: unknown
      }>(`
        SELECT TOP 1
          GatewayMs,
          LoginMs,
          ShardMs,
          BillingMs,
          RegDate AS UpdatedAt
        FROM [dbo].[_ServiceLatency]
        ORDER BY RegDate DESC
      `)

      return {
        gatewayMs: toFiniteNumber(result.recordset[0]?.GatewayMs),
        loginMs: toFiniteNumber(result.recordset[0]?.LoginMs),
        shardMs: toFiniteNumber(result.recordset[0]?.ShardMs),
        billingMs: toFiniteNumber(result.recordset[0]?.BillingMs),
        updatedAt: toIsoString(result.recordset[0]?.UpdatedAt),
      }
    },
    async () => {
      const result = await pool.request().query<{
        GatewayMs: unknown
        LoginMs: unknown
        ShardMs: unknown
        BillingMs: unknown
        UpdatedAt: unknown
      }>(`
        SELECT TOP 1
          AvgGatewayLatency AS GatewayMs,
          AvgLoginLatency AS LoginMs,
          AvgShardLatency AS ShardMs,
          AvgBillingLatency AS BillingMs,
          SampleTime AS UpdatedAt
        FROM [dbo].[_ServiceMetrics]
        ORDER BY SampleTime DESC
      `)

      return {
        gatewayMs: toFiniteNumber(result.recordset[0]?.GatewayMs),
        loginMs: toFiniteNumber(result.recordset[0]?.LoginMs),
        shardMs: toFiniteNumber(result.recordset[0]?.ShardMs),
        billingMs: toFiniteNumber(result.recordset[0]?.BillingMs),
        updatedAt: toIsoString(result.recordset[0]?.UpdatedAt),
      }
    },
  ]

  for (const candidate of candidates) {
    try {
      return await candidate()
    } catch {
      // Fonte indisponivel.
    }
  }

  return {
    gatewayMs: null,
    loginMs: null,
    shardMs: null,
    billingMs: null,
    updatedAt: null,
  }
}

async function queryConfiguredActiveEvents(limit: number): Promise<ActiveEventItem[] | null> {
  const table = process.env.PUBLIC_ACTIVE_EVENTS_TABLE?.trim()

  if (!table) {
    return null
  }

  const nameColumn = (process.env.PUBLIC_ACTIVE_EVENTS_NAME_COLUMN || 'EventName').trim()
  const startColumn = (process.env.PUBLIC_ACTIVE_EVENTS_START_COLUMN || 'StartAt').trim()
  const endColumn = (process.env.PUBLIC_ACTIVE_EVENTS_END_COLUMN || 'EndAt').trim()
  const activeColumn = (process.env.PUBLIC_ACTIVE_EVENTS_ACTIVE_COLUMN || 'IsActive').trim()

  if (![table, nameColumn, startColumn, endColumn, activeColumn].every(sanitizeIdentifier)) {
    return []
  }

  const pool = await getDbPool('shard')
  const result = await pool.request().query<{
    EventName: unknown
    StartAt: unknown
    EndAt: unknown
  }>(`
    SELECT TOP (${limit})
      [${nameColumn}] AS EventName,
      [${startColumn}] AS StartAt,
      [${endColumn}] AS EndAt
    FROM [dbo].[${table}]
    WHERE [${activeColumn}] IN (1, '1', 'true', 'TRUE', 'online', 'ONLINE')
      OR (GETDATE() BETWEEN [${startColumn}] AND [${endColumn}])
    ORDER BY [${startColumn}] ASC
  `)

  return result.recordset
    .map((row) => ({
      eventName: String(row.EventName ?? '').trim(),
      startsAt: toIsoString(row.StartAt),
      endsAt: toIsoString(row.EndAt),
    }))
    .filter((row) => row.eventName)
}

async function queryFallbackActiveEvents(limit: number): Promise<ActiveEventItem[]> {
  const pool = await getDbPool('shard')
  const candidates: Array<() => Promise<ActiveEventItem[]>> = [
    async () => {
      const result = await pool.request().query<{
        EventName: unknown
        StartAt: unknown
        EndAt: unknown
      }>(`
        SELECT TOP (${limit})
          EventName,
          StartTime AS StartAt,
          EndTime AS EndAt
        FROM [dbo].[_EventSchedule]
        WHERE GETDATE() BETWEEN StartTime AND EndTime
        ORDER BY StartTime ASC
      `)

      return result.recordset
        .map((row) => ({
          eventName: String(row.EventName ?? '').trim(),
          startsAt: toIsoString(row.StartAt),
          endsAt: toIsoString(row.EndAt),
        }))
        .filter((row) => row.eventName)
    },
    async () => {
      const result = await pool.request().query<{
        EventName: unknown
        StartAt: unknown
        EndAt: unknown
      }>(`
        SELECT TOP (${limit})
          Name AS EventName,
          OpenDate AS StartAt,
          CloseDate AS EndAt
        FROM [dbo].[_EventState]
        WHERE GETDATE() BETWEEN OpenDate AND CloseDate
        ORDER BY OpenDate ASC
      `)

      return result.recordset
        .map((row) => ({
          eventName: String(row.EventName ?? '').trim(),
          startsAt: toIsoString(row.StartAt),
          endsAt: toIsoString(row.EndAt),
        }))
        .filter((row) => row.eventName)
    },
  ]

  for (const candidate of candidates) {
    try {
      const rows = await candidate()
      if (rows.length > 0) {
        return rows
      }
    } catch {
      // Fonte indisponivel.
    }
  }

  return []
}

async function queryConfiguredRetention(): Promise<RetentionSnapshot | null> {
  const table = process.env.PUBLIC_RETENTION_TABLE?.trim()

  if (!table) {
    return null
  }

  const d1Column = (process.env.PUBLIC_RETENTION_D1_COLUMN || 'RetentionD1').trim()
  const d7Column = (process.env.PUBLIC_RETENTION_D7_COLUMN || 'RetentionD7').trim()
  const cohortColumn = (process.env.PUBLIC_RETENTION_COHORT_COLUMN || 'CohortUsers').trim()
  const timeColumn = (process.env.PUBLIC_RETENTION_TIME_COLUMN || 'RegDate').trim()

  if (![table, d1Column, d7Column, cohortColumn, timeColumn].every(sanitizeIdentifier)) {
    return { retentionD1: null, retentionD7: null, cohort7d: null }
  }

  const pool = await getDbPool('log')
  const result = await pool.request().query<{
    RetentionD1: unknown
    RetentionD7: unknown
    CohortUsers: unknown
  }>(`
    SELECT TOP 1
      [${d1Column}] AS RetentionD1,
      [${d7Column}] AS RetentionD7,
      [${cohortColumn}] AS CohortUsers
    FROM [dbo].[${table}]
    ORDER BY [${timeColumn}] DESC
  `)

  return {
    retentionD1: clampPercent(toFiniteNumber(result.recordset[0]?.RetentionD1)),
    retentionD7: clampPercent(toFiniteNumber(result.recordset[0]?.RetentionD7)),
    cohort7d: toFiniteNumber(result.recordset[0]?.CohortUsers),
  }
}

async function queryFallbackRetention(): Promise<RetentionSnapshot> {
  const pool = await getDbPool('account')

  const candidates: Array<() => Promise<RetentionSnapshot>> = [
    async () => {
      const result = await pool.request().query<{ d1: number; d7: number; cohort: number }>(`
        WITH cohort AS (
          SELECT
            CAST(RegDate AS datetime) AS CreatedAt,
            CAST(LastLoginDate AS datetime) AS LastLoginAt
          FROM [dbo].[TB_User]
          WHERE RegDate >= DATEADD(DAY, -7, GETDATE())
        )
        SELECT
          SUM(CASE WHEN LastLoginAt >= DATEADD(DAY, 1, CreatedAt) THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0) AS d1,
          SUM(CASE WHEN LastLoginAt >= DATEADD(DAY, 7, CreatedAt) THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0) AS d7,
          COUNT(*) AS cohort
        FROM cohort
      `)

      return {
        retentionD1: clampPercent(toFiniteNumber(result.recordset[0]?.d1)),
        retentionD7: clampPercent(toFiniteNumber(result.recordset[0]?.d7)),
        cohort7d: toFiniteNumber(result.recordset[0]?.cohort),
      }
    },
    async () => {
      const result = await pool.request().query<{ d1: number; d7: number; cohort: number }>(`
        WITH cohort AS (
          SELECT
            CAST(regtime AS datetime) AS CreatedAt,
            CAST(last_login AS datetime) AS LastLoginAt
          FROM [dbo].[TB_User]
          WHERE regtime >= DATEADD(DAY, -7, GETDATE())
        )
        SELECT
          SUM(CASE WHEN LastLoginAt >= DATEADD(DAY, 1, CreatedAt) THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0) AS d1,
          SUM(CASE WHEN LastLoginAt >= DATEADD(DAY, 7, CreatedAt) THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0) AS d7,
          COUNT(*) AS cohort
        FROM cohort
      `)

      return {
        retentionD1: clampPercent(toFiniteNumber(result.recordset[0]?.d1)),
        retentionD7: clampPercent(toFiniteNumber(result.recordset[0]?.d7)),
        cohort7d: toFiniteNumber(result.recordset[0]?.cohort),
      }
    },
  ]

  for (const candidate of candidates) {
    try {
      return await candidate()
    } catch {
      // Colunas nao disponiveis nesta base account.
    }
  }

  return {
    retentionD1: null,
    retentionD7: null,
    cohort7d: null,
  }
}

async function queryConfiguredLevelDistribution(limit: number): Promise<LevelDistributionBucket[] | null> {
  const table = process.env.PUBLIC_LEVEL_DIST_TABLE?.trim()

  if (!table) {
    return null
  }

  const labelColumn = (process.env.PUBLIC_LEVEL_DIST_LABEL_COLUMN || 'RangeLabel').trim()
  const playersColumn = (process.env.PUBLIC_LEVEL_DIST_PLAYERS_COLUMN || 'Players').trim()
  const orderColumn = (process.env.PUBLIC_LEVEL_DIST_ORDER_COLUMN || playersColumn).trim()

  if (![table, labelColumn, playersColumn, orderColumn].every(sanitizeIdentifier)) {
    return []
  }

  const pool = await getDbPool('shard')
  const result = await pool.request().query<{ RangeLabel: unknown; Players: unknown }>(`
    SELECT TOP (${limit})
      [${labelColumn}] AS RangeLabel,
      [${playersColumn}] AS Players
    FROM [dbo].[${table}]
    ORDER BY [${orderColumn}] DESC
  `)

  return result.recordset
    .map((row) => {
      const label = String(row.RangeLabel ?? '').trim()
      const players = toFiniteNumber(row.Players)

      if (!label || players === null) {
        return null
      }

      return {
        rangeLabel: label,
        players,
      } satisfies LevelDistributionBucket
    })
    .filter((row): row is LevelDistributionBucket => row !== null)
}

async function queryFallbackLevelDistribution(): Promise<LevelDistributionBucket[]> {
  const pool = await getDbPool('shard')

  const candidates: Array<() => Promise<LevelDistributionBucket[]>> = [
    async () => {
      const result = await pool.request().query<{ rangeLabel: string; players: number }>(`
        SELECT
          CASE
            WHEN c.Lvl BETWEEN 1 AND 30 THEN '1-30'
            WHEN c.Lvl BETWEEN 31 AND 60 THEN '31-60'
            WHEN c.Lvl BETWEEN 61 AND 90 THEN '61-90'
            WHEN c.Lvl BETWEEN 91 AND 110 THEN '91-110'
            ELSE '111+'
          END AS rangeLabel,
          COUNT(*) AS players
        FROM [dbo].[_Char] c
        WHERE c.CharType = 0
        GROUP BY
          CASE
            WHEN c.Lvl BETWEEN 1 AND 30 THEN '1-30'
            WHEN c.Lvl BETWEEN 31 AND 60 THEN '31-60'
            WHEN c.Lvl BETWEEN 61 AND 90 THEN '61-90'
            WHEN c.Lvl BETWEEN 91 AND 110 THEN '91-110'
            ELSE '111+'
          END
      `)

      return result.recordset
        .map((row) => ({ rangeLabel: String(row.rangeLabel), players: Number(row.players) }))
        .filter((row) => row.rangeLabel && Number.isFinite(row.players) && row.players > 0)
    },
    async () => {
      const result = await pool.request().query<{ rangeLabel: string; players: number }>(`
        SELECT
          CASE
            WHEN c.Level BETWEEN 1 AND 30 THEN '1-30'
            WHEN c.Level BETWEEN 31 AND 60 THEN '31-60'
            WHEN c.Level BETWEEN 61 AND 90 THEN '61-90'
            WHEN c.Level BETWEEN 91 AND 110 THEN '91-110'
            ELSE '111+'
          END AS rangeLabel,
          COUNT(*) AS players
        FROM [dbo].[_Char] c
        WHERE c.CharType = 0
        GROUP BY
          CASE
            WHEN c.Level BETWEEN 1 AND 30 THEN '1-30'
            WHEN c.Level BETWEEN 31 AND 60 THEN '31-60'
            WHEN c.Level BETWEEN 61 AND 90 THEN '61-90'
            WHEN c.Level BETWEEN 91 AND 110 THEN '91-110'
            ELSE '111+'
          END
      `)

      return result.recordset
        .map((row) => ({ rangeLabel: String(row.rangeLabel), players: Number(row.players) }))
        .filter((row) => row.rangeLabel && Number.isFinite(row.players) && row.players > 0)
    },
  ]

  for (const candidate of candidates) {
    try {
      const rows = await candidate()
      if (rows.length > 0) {
        return rows
      }
    } catch {
      // Coluna de level nao encontrada.
    }
  }

  return []
}

async function queryConfiguredSilkConsumption(): Promise<SilkConsumptionSnapshot | null> {
  const table = process.env.PUBLIC_SILK_TABLE?.trim()

  if (!table) {
    return null
  }

  const amountColumn = (process.env.PUBLIC_SILK_AMOUNT_COLUMN || 'SilkAmount').trim()
  const timeColumn = (process.env.PUBLIC_SILK_TIME_COLUMN || 'RegDate').trim()

  if (![table, amountColumn, timeColumn].every(sanitizeIdentifier)) {
    return { consumed24h: null, consumed7d: null }
  }

  const pool = await getDbPool('account')
  const result = await pool.request().query<{ consumed24h: number; consumed7d: number }>(`
    SELECT
      SUM(CASE WHEN [${timeColumn}] >= DATEADD(HOUR, -24, GETDATE()) THEN [${amountColumn}] ELSE 0 END) AS consumed24h,
      SUM(CASE WHEN [${timeColumn}] >= DATEADD(DAY, -7, GETDATE()) THEN [${amountColumn}] ELSE 0 END) AS consumed7d
    FROM [dbo].[${table}]
  `)

  return {
    consumed24h: toFiniteNumber(result.recordset[0]?.consumed24h),
    consumed7d: toFiniteNumber(result.recordset[0]?.consumed7d),
  }
}

async function queryFallbackSilkConsumption(): Promise<SilkConsumptionSnapshot> {
  const pool = await getDbPool('account')

  const candidates: Array<() => Promise<SilkConsumptionSnapshot>> = [
    async () => {
      const result = await pool.request().query<{ consumed24h: number; consumed7d: number }>(`
        SELECT
          SUM(CASE WHEN RegDate >= DATEADD(HOUR, -24, GETDATE()) THEN SilkUsed ELSE 0 END) AS consumed24h,
          SUM(CASE WHEN RegDate >= DATEADD(DAY, -7, GETDATE()) THEN SilkUsed ELSE 0 END) AS consumed7d
        FROM [dbo].[_SilkConsumeLog]
      `)

      return {
        consumed24h: toFiniteNumber(result.recordset[0]?.consumed24h),
        consumed7d: toFiniteNumber(result.recordset[0]?.consumed7d),
      }
    },
    async () => {
      const result = await pool.request().query<{ consumed24h: number; consumed7d: number }>(`
        SELECT
          SUM(CASE WHEN RegDate >= DATEADD(HOUR, -24, GETDATE()) THEN SilkAmount ELSE 0 END) AS consumed24h,
          SUM(CASE WHEN RegDate >= DATEADD(DAY, -7, GETDATE()) THEN SilkAmount ELSE 0 END) AS consumed7d
        FROM [dbo].[_ItemMallPurchaseLog]
      `)

      return {
        consumed24h: toFiniteNumber(result.recordset[0]?.consumed24h),
        consumed7d: toFiniteNumber(result.recordset[0]?.consumed7d),
      }
    },
  ]

  for (const candidate of candidates) {
    try {
      return await candidate()
    } catch {
      // Fonte de consumo nao encontrada.
    }
  }

  return {
    consumed24h: null,
    consumed7d: null,
  }
}

async function queryConfiguredDauWau(): Promise<DauWauSnapshot | null> {
  const table = process.env.PUBLIC_DAU_WAU_TABLE?.trim()

  if (!table) {
    return null
  }

  const accountColumn = (process.env.PUBLIC_DAU_WAU_ACCOUNT_COLUMN || 'AccountJID').trim()
  const timeColumn = (process.env.PUBLIC_DAU_WAU_TIME_COLUMN || 'RegDate').trim()

  if (![table, accountColumn, timeColumn].every(sanitizeIdentifier)) {
    return { dau: null, wau: null, dauWauRatio: null }
  }

  const pool = await getDbPool('account')
  const result = await pool.request().query<{ dau: number; wau: number }>(`
    SELECT
      COUNT(DISTINCT CASE WHEN [${timeColumn}] >= DATEADD(DAY, -1, GETDATE()) THEN [${accountColumn}] END) AS dau,
      COUNT(DISTINCT CASE WHEN [${timeColumn}] >= DATEADD(DAY, -7, GETDATE()) THEN [${accountColumn}] END) AS wau
    FROM [dbo].[${table}]
  `)

  const dau = toFiniteNumber(result.recordset[0]?.dau)
  const wau = toFiniteNumber(result.recordset[0]?.wau)

  return {
    dau,
    wau,
    dauWauRatio: dau != null && wau != null && wau > 0 ? dau / wau : null,
  }
}

async function queryFallbackDauWau(): Promise<DauWauSnapshot> {
  const pool = await getDbPool('account')

  const candidates: Array<() => Promise<DauWauSnapshot>> = [
    async () => {
      const result = await pool.request().query<{ dau: number; wau: number }>(`
        SELECT
          COUNT(DISTINCT CASE WHEN RegDate >= DATEADD(DAY, -1, GETDATE()) THEN AccountJID END) AS dau,
          COUNT(DISTINCT CASE WHEN RegDate >= DATEADD(DAY, -7, GETDATE()) THEN AccountJID END) AS wau
        FROM [dbo].[_LogEventCharLogin]
      `)

      const dau = toFiniteNumber(result.recordset[0]?.dau)
      const wau = toFiniteNumber(result.recordset[0]?.wau)

      return {
        dau,
        wau,
        dauWauRatio: dau != null && wau != null && wau > 0 ? dau / wau : null,
      }
    },
    async () => {
      const result = await pool.request().query<{ dau: number; wau: number }>(`
        SELECT
          COUNT(DISTINCT CASE WHEN LoginDate >= DATEADD(DAY, -1, GETDATE()) THEN UserJID END) AS dau,
          COUNT(DISTINCT CASE WHEN LoginDate >= DATEADD(DAY, -7, GETDATE()) THEN UserJID END) AS wau
        FROM [dbo].[_LoginHistory]
      `)

      const dau = toFiniteNumber(result.recordset[0]?.dau)
      const wau = toFiniteNumber(result.recordset[0]?.wau)

      return {
        dau,
        wau,
        dauWauRatio: dau != null && wau != null && wau > 0 ? dau / wau : null,
      }
    },
  ]

  for (const candidate of candidates) {
    try {
      return await candidate()
    } catch {
      // Fonte de engajamento nao encontrada.
    }
  }

  return {
    dau: null,
    wau: null,
    dauWauRatio: null,
  }
}

async function queryConfiguredNewPlayerConversion(): Promise<NewPlayerConversionSnapshot | null> {
  const userTable = process.env.PUBLIC_CONVERSION_USER_TABLE?.trim()
  const userIdColumn = (process.env.PUBLIC_CONVERSION_USER_ID_COLUMN || 'JID').trim()
  const userCreatedColumn = (process.env.PUBLIC_CONVERSION_USER_CREATED_COLUMN || 'RegDate').trim()

  if (!userTable) {
    return null
  }

  if (![userTable, userIdColumn, userCreatedColumn].every(sanitizeIdentifier)) {
    return {
      created24h: null,
      firstLogin24h: null,
      firstCharacter24h: null,
    }
  }

  const loginTable = process.env.PUBLIC_CONVERSION_LOGIN_TABLE?.trim()
  const loginUserIdColumn = (process.env.PUBLIC_CONVERSION_LOGIN_USER_ID_COLUMN || userIdColumn).trim()
  const loginTimeColumn = (process.env.PUBLIC_CONVERSION_LOGIN_TIME_COLUMN || 'RegDate').trim()

  const charTable = process.env.PUBLIC_CONVERSION_CHAR_TABLE?.trim()
  const charUserIdColumn = (process.env.PUBLIC_CONVERSION_CHAR_USER_ID_COLUMN || userIdColumn).trim()
  const charCreatedColumn = (process.env.PUBLIC_CONVERSION_CHAR_CREATED_COLUMN || 'RegDate').trim()

  const pool = await getDbPool('account')

  const createdResult = await pool.request().query<{ created24h: number }>(`
    SELECT COUNT(*) AS created24h
    FROM [dbo].[${userTable}]
    WHERE [${userCreatedColumn}] >= DATEADD(DAY, -1, GETDATE())
  `)

  let firstLogin24h: number | null = null

  if (loginTable && [loginTable, loginUserIdColumn, loginTimeColumn].every(sanitizeIdentifier)) {
    const loginResult = await pool.request().query<{ firstLogin24h: number }>(`
      SELECT COUNT(*) AS firstLogin24h
      FROM [dbo].[${userTable}] u
      WHERE u.[${userCreatedColumn}] >= DATEADD(DAY, -1, GETDATE())
        AND EXISTS (
          SELECT 1
          FROM [dbo].[${loginTable}] l
          WHERE l.[${loginUserIdColumn}] = u.[${userIdColumn}]
            AND l.[${loginTimeColumn}] >= u.[${userCreatedColumn}]
            AND l.[${loginTimeColumn}] < DATEADD(DAY, 1, u.[${userCreatedColumn}])
        )
    `)
    firstLogin24h = toFiniteNumber(loginResult.recordset[0]?.firstLogin24h)
  }

  let firstCharacter24h: number | null = null

  if (charTable && [charTable, charUserIdColumn, charCreatedColumn].every(sanitizeIdentifier)) {
    const charResult = await pool.request().query<{ firstCharacter24h: number }>(`
      SELECT COUNT(*) AS firstCharacter24h
      FROM [dbo].[${userTable}] u
      WHERE u.[${userCreatedColumn}] >= DATEADD(DAY, -1, GETDATE())
        AND EXISTS (
          SELECT 1
          FROM [dbo].[${charTable}] c
          WHERE c.[${charUserIdColumn}] = u.[${userIdColumn}]
            AND c.[${charCreatedColumn}] >= u.[${userCreatedColumn}]
            AND c.[${charCreatedColumn}] < DATEADD(DAY, 1, u.[${userCreatedColumn}])
        )
    `)
    firstCharacter24h = toFiniteNumber(charResult.recordset[0]?.firstCharacter24h)
  }

  return {
    created24h: toFiniteNumber(createdResult.recordset[0]?.created24h),
    firstLogin24h,
    firstCharacter24h,
  }
}

async function queryFallbackNewPlayerConversion(): Promise<NewPlayerConversionSnapshot> {
  const accountPool = await getDbPool('account')

  const candidates: Array<() => Promise<NewPlayerConversionSnapshot>> = [
    async () => {
      const createdResult = await accountPool.request().query<{ created24h: number }>(`
        SELECT COUNT(*) AS created24h
        FROM [dbo].[TB_User]
        WHERE RegDate >= DATEADD(DAY, -1, GETDATE())
      `)

      let firstLogin24h: number | null = null
      try {
        const loginResult = await accountPool.request().query<{ firstLogin24h: number }>(`
          SELECT COUNT(*) AS firstLogin24h
          FROM [dbo].[TB_User] u
          WHERE u.RegDate >= DATEADD(DAY, -1, GETDATE())
            AND EXISTS (
              SELECT 1
              FROM [dbo].[_LogEventCharLogin] l
              WHERE l.AccountJID = u.JID
                AND l.RegDate >= u.RegDate
                AND l.RegDate < DATEADD(DAY, 1, u.RegDate)
            )
        `)
        firstLogin24h = toFiniteNumber(loginResult.recordset[0]?.firstLogin24h)
      } catch {
        // Login log nao encontrado.
      }

      let firstCharacter24h: number | null = null
      try {
        const shardPool = await getDbPool('shard')
        const charResult = await shardPool.request().query<{ firstCharacter24h: number }>(`
          SELECT COUNT(*) AS firstCharacter24h
          FROM [dbo].[TB_User] u
          WHERE u.RegDate >= DATEADD(DAY, -1, GETDATE())
            AND EXISTS (
              SELECT 1
              FROM [dbo].[_Char] c
              WHERE c.AccountID = u.StrUserID
                AND c.RegDate >= u.RegDate
                AND c.RegDate < DATEADD(DAY, 1, u.RegDate)
            )
        `)
        firstCharacter24h = toFiniteNumber(charResult.recordset[0]?.firstCharacter24h)
      } catch {
        // Tabela de personagens nao encontrada.
      }

      return {
        created24h: toFiniteNumber(createdResult.recordset[0]?.created24h),
        firstLogin24h,
        firstCharacter24h,
      }
    },
  ]

  for (const candidate of candidates) {
    try {
      return await candidate()
    } catch {
      // Fonte de conversao nao encontrada.
    }
  }

  return {
    created24h: null,
    firstLogin24h: null,
    firstCharacter24h: null,
  }
}

async function queryConfiguredJobDistribution(limit: number): Promise<JobDistributionEntry[] | null> {
  const table = process.env.PUBLIC_JOB_DISTRIBUTION_TABLE?.trim()

  if (!table) {
    return null
  }

  const typeColumn = (process.env.PUBLIC_JOB_DISTRIBUTION_TYPE_COLUMN || 'JobType').trim()
  const countColumn = (process.env.PUBLIC_JOB_DISTRIBUTION_COUNT_COLUMN || 'Players').trim()

  if (![table, typeColumn, countColumn].every(sanitizeIdentifier)) {
    return []
  }

  const pool = await getDbPool('shard')
  const req = pool.request()
  req.input('limit', mssql.Int, Math.max(3, Math.min(limit, 10)))

  const result = await req.query<{ jobName: string; players: number }>(`
    SELECT TOP (@limit)
      CAST([${typeColumn}] AS NVARCHAR(32)) AS jobName,
      CAST([${countColumn}] AS INT) AS players
    FROM [dbo].[${table}]
    ORDER BY [${countColumn}] DESC
  `)

  return result.recordset
    .map((row) => ({
      jobName: String(row.jobName || '').trim(),
      players: toFiniteNumber(row.players) ?? 0,
    }))
    .filter((row) => row.jobName.length > 0)
}

async function queryFallbackJobDistribution(limit: number): Promise<JobDistributionEntry[]> {
  const pool = await getDbPool('shard')
  const safeLimit = Math.max(3, Math.min(limit, 10))

  const candidates: Array<() => Promise<JobDistributionEntry[]>> = [
    async () => {
      const req = pool.request()
      req.input('limit', mssql.Int, safeLimit)
      const result = await req.query<{ jobName: string; players: number }>(`
        SELECT TOP (@limit)
          CASE
            WHEN JobType = 1 THEN 'Trader'
            WHEN JobType = 2 THEN 'Thief'
            WHEN JobType = 3 THEN 'Hunter'
            ELSE CONCAT('Job ', JobType)
          END AS jobName,
          COUNT(*) AS players
        FROM [dbo].[_CharTrijob]
        GROUP BY JobType
        ORDER BY players DESC
      `)

      return result.recordset.map((row) => ({
        jobName: String(row.jobName || '').trim(),
        players: toFiniteNumber(row.players) ?? 0,
      }))
    },
    async () => {
      const req = pool.request()
      req.input('limit', mssql.Int, safeLimit)
      const result = await req.query<{ jobName: string; players: number }>(`
        SELECT TOP (@limit)
          CASE
            WHEN Job = 1 THEN 'Trader'
            WHEN Job = 2 THEN 'Thief'
            WHEN Job = 3 THEN 'Hunter'
            ELSE CONCAT('Job ', Job)
          END AS jobName,
          COUNT(*) AS players
        FROM [dbo].[_Char]
        WHERE Job IS NOT NULL
        GROUP BY Job
        ORDER BY players DESC
      `)

      return result.recordset.map((row) => ({
        jobName: String(row.jobName || '').trim(),
        players: toFiniteNumber(row.players) ?? 0,
      }))
    },
  ]

  for (const candidate of candidates) {
    try {
      return await candidate()
    } catch {
      // Fonte de distribuicao de jobs nao encontrada.
    }
  }

  return []
}

async function getOnlineSnapshot() {
  try {
    const configured = await queryConfiguredOnline()

    if (configured) {
      return configured
    }

    return await queryFallbackOnline()
  } catch {
    return { onlineNow: null, peak24h: null }
  }
}

async function getTopJobs(limit: number) {
  try {
    const configured = await queryConfiguredTopJobs(limit)

    if (configured) {
      return configured
    }

    return await queryFallbackTopJobs(limit)
  } catch {
    return []
  }
}

async function getFortressSnapshot(limit: number) {
  try {
    const configured = await queryConfiguredFortress(limit)

    if (configured) {
      return configured
    }

    return await queryFallbackFortress(limit)
  } catch {
    return []
  }
}

async function getSpawnTracker(limit: number) {
  try {
    const configured = await queryConfiguredSpawnTracker(limit)

    if (configured) {
      return configured
    }

    return await queryFallbackSpawnTracker(limit)
  } catch {
    return []
  }
}

async function getFortressTimeline(limit: number) {
  try {
    const configured = await queryConfiguredFortressTimeline(limit)

    if (configured) {
      return configured
    }

    return await queryFallbackFortressTimeline(limit)
  } catch {
    return []
  }
}

async function getNewCharactersSnapshot() {
  try {
    const configured = await queryConfiguredNewCharacters()

    if (configured) {
      return configured
    }

    return await queryFallbackNewCharacters()
  } catch {
    return { created24h: null, created7d: null }
  }
}

async function getServiceStatusSnapshot() {
  try {
    const configured = await queryConfiguredServiceStatus()

    if (configured) {
      return configured
    }

    return await queryFallbackServiceStatus()
  } catch {
    return {
      gateway: 'unknown',
      login: 'unknown',
      shard: 'unknown',
      billing: 'unknown',
      updatedAt: null,
    } satisfies ServiceStatusSnapshot
  }
}

async function getLoginQueueSnapshot() {
  try {
    const configured = await queryConfiguredLoginQueue()

    if (configured) {
      return configured
    }

    return await queryFallbackLoginQueue()
  } catch {
    return {
      queueSize: null,
      avgWaitSeconds: null,
    }
  }
}

async function getLoginSuccessSnapshot() {
  try {
    const configured = await queryConfiguredLoginSuccess()

    if (configured) {
      return configured
    }

    return await queryFallbackLoginSuccess()
  } catch {
    return {
      successRate1h: null,
      attempts1h: null,
    }
  }
}

async function getUptimeSnapshot() {
  try {
    const configured = await queryConfiguredUptime()

    if (configured) {
      return configured
    }

    return await queryFallbackUptime()
  } catch {
    return {
      uptime24h: null,
      uptime7d: null,
    }
  }
}

async function getServiceLatencySnapshot() {
  try {
    const configured = await queryConfiguredServiceLatency()

    if (configured) {
      return configured
    }

    return await queryFallbackServiceLatency()
  } catch {
    return {
      gatewayMs: null,
      loginMs: null,
      shardMs: null,
      billingMs: null,
      updatedAt: null,
    }
  }
}

async function getActiveEvents(limit: number) {
  try {
    const configured = await queryConfiguredActiveEvents(limit)

    if (configured) {
      return configured
    }

    return await queryFallbackActiveEvents(limit)
  } catch {
    return []
  }
}

async function getRetentionSnapshot() {
  try {
    const configured = await queryConfiguredRetention()

    if (configured) {
      return configured
    }

    return await queryFallbackRetention()
  } catch {
    return {
      retentionD1: null,
      retentionD7: null,
      cohort7d: null,
    }
  }
}

async function getLevelDistribution(limit: number) {
  try {
    const configured = await queryConfiguredLevelDistribution(limit)

    if (configured) {
      return configured
    }

    return await queryFallbackLevelDistribution()
  } catch {
    return []
  }
}

async function getSilkConsumptionSnapshot() {
  try {
    const configured = await queryConfiguredSilkConsumption()

    if (configured) {
      return configured
    }

    return await queryFallbackSilkConsumption()
  } catch {
    return {
      consumed24h: null,
      consumed7d: null,
    }
  }
}

async function getDauWauSnapshot() {
  try {
    const configured = await queryConfiguredDauWau()

    if (configured) {
      return configured
    }

    return await queryFallbackDauWau()
  } catch {
    return {
      dau: null,
      wau: null,
      dauWauRatio: null,
    }
  }
}

async function getNewPlayerConversionSnapshot() {
  try {
    const configured = await queryConfiguredNewPlayerConversion()

    if (configured) {
      return configured
    }

    return await queryFallbackNewPlayerConversion()
  } catch {
    return {
      created24h: null,
      firstLogin24h: null,
      firstCharacter24h: null,
    }
  }
}

async function getJobDistribution(limit: number) {
  try {
    const configured = await queryConfiguredJobDistribution(limit)

    if (configured) {
      return configured
    }

    return await queryFallbackJobDistribution(limit)
  } catch {
    return []
  }
}

export async function getPublicHomeStats(limit = DEFAULT_TOP_LIMIT): Promise<PublicHomeStats> {
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(limit, 10)) : DEFAULT_TOP_LIMIT

  const [online, topJobs, fortresses, spawnTracker, fortressTimeline, newCharacters, serviceStatus, loginQueue, loginSuccess, uptime, serviceLatency, activeEvents, retention, levelDistribution, silkConsumption, dauWau, newPlayerConversion, jobDistribution] = await Promise.all([
    getOnlineSnapshot(),
    getTopJobs(safeLimit),
    getFortressSnapshot(Math.max(3, safeLimit)),
    getSpawnTracker(Math.max(5, safeLimit)),
    getFortressTimeline(Math.max(5, safeLimit)),
    getNewCharactersSnapshot(),
    getServiceStatusSnapshot(),
    getLoginQueueSnapshot(),
    getLoginSuccessSnapshot(),
    getUptimeSnapshot(),
    getServiceLatencySnapshot(),
    getActiveEvents(Math.max(5, safeLimit)),
    getRetentionSnapshot(),
    getLevelDistribution(Math.max(5, safeLimit)),
    getSilkConsumptionSnapshot(),
    getDauWauSnapshot(),
    getNewPlayerConversionSnapshot(),
    getJobDistribution(Math.max(3, safeLimit)),
  ])

  return {
    online,
    topJobs,
    fortresses,
    spawnTracker,
    fortressTimeline,
    newCharacters,
    serviceStatus,
    loginQueue,
    loginSuccess,
    uptime,
    serviceLatency,
    activeEvents,
    retention,
    levelDistribution,
    silkConsumption,
    dauWau,
    newPlayerConversion,
    jobDistribution,
  }
}
